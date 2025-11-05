import {PlatformTypes, SettingIds} from '../../constants.js';
import colors from '../../utils/colors.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import watcher from '../../watcher.js';
import chat from '../chat/index.js';
import nicknames from '../chat_nicknames/index.js';
import splitChat from '../split_chat/index.js';
import settings from '../../settings.js';
import {LinkPreviewProcessor} from '../../utils/link_preview.js';

const CHAT_MESSAGE_SELECTOR = '.video-chat__message span[data-a-target="chat-message-text"]';
const CHAT_FROM_SELECTOR = '.video-chat__message-author';
const CHAT_USER_SELECTOR = '.chat-author__display-name,.chat-author__intl-login';
const SCROLL_INDICATOR_SELECTOR = '.video-chat__sync-button';
const SCROLL_CONTAINER_SELECTOR = '.video-chat__message-list-wrapper';
const COLOR_REGEX = /rgb\(([0-9]+), ([0-9]+), ([0-9]+)\)/;

function scrollOnEmoteLoad(el) {
  const indicator = document.querySelector(SCROLL_INDICATOR_SELECTOR) != null;
  if (indicator) return;

  el.querySelectorAll('img').forEach((image) => {
    image.addEventListener('load', () => {
      const scrollContainer = document.querySelector(SCROLL_CONTAINER_SELECTOR);
      if (scrollContainer == null) return;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
  });
}

class VODChatModule {
  constructor() {
    this.enabled = settings.get(SettingIds.LINK_PREVIEW);
    this.processor = new LinkPreviewProcessor();
    this.processor.updateSettings();
    
    watcher.on('vod.message', (el) => this.parseMessage(el));
    settings.on(`changed.${SettingIds.LINK_PREVIEW}`, () => {
      this.enabled = settings.get(SettingIds.LINK_PREVIEW);
    });
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_HEIGHT}`, () => {
      this.processor.updateSettings();
    });
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_WIDTH}`, () => {
      this.processor.updateSettings();
    });
  }

  parseMessage(element) {
    const from = element.querySelector(CHAT_FROM_SELECTOR);
    const username = element.querySelector(CHAT_USER_SELECTOR);

    const colorRaw = username.style.color;
    const colorRgb = COLOR_REGEX.exec(colorRaw);
    const color = colorRgb ? colors.getHex({r: colorRgb[1], g: colorRgb[2], b: colorRgb[3]}) : null;

    const mockUser = {
      name: (from.getAttribute('href') || '').split('?')[0].split('/').pop(),
      color,
    };

    if (mockUser.color) {
      const newColor = chat.calculateColor(mockUser.color);
      username.style.color = newColor;

      if (element.style.color) {
        element.style.color = newColor;
      }
    }

    const nickname = nicknames.get(mockUser.name);
    if (nickname) {
      username.innerText = nickname;
    }

    splitChat.render(element);

    const messageChunks = element.querySelectorAll(CHAT_MESSAGE_SELECTOR);
    chat.messageReplacer(messageChunks, mockUser);

    if (this.enabled) {
      this.processLinks(element);
    }

    scrollOnEmoteLoad(element);
  }

  processLinks(element) {
    const messageTextElements = element.querySelectorAll(CHAT_MESSAGE_SELECTOR);
    
    for (const messageText of messageTextElements) {
      const links = messageText.querySelectorAll('a');
      
      for (const link of links) {
        if (link.dataset.linkPreviewProcessed) continue;
        
        this.processor.processElement(link);
      }
      
      for (const child of messageText.childNodes) {
        if (child.nodeType !== Node.TEXT_NODE) continue;
        if (child.parentElement?.dataset?.linkPreviewProcessed) continue;
        
        const text = child.textContent.trim();
        if (!text) continue;
        
        const wrapper = this.wrapTextNode(child);
        this.processor.processElement(wrapper);
      }
    }
  }

  wrapTextNode(textNode) {
    const span = document.createElement('span');
    span.textContent = textNode.textContent;
    textNode.parentNode.replaceChild(span, textNode);
    return span;
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new VODChatModule()]);

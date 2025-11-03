import { PlatformTypes, SettingIds } from '../../constants.js';
import settings from '../../settings.js';
import { loadModuleForPlatforms } from '../../utils/modules.js';
import { getProxyUrl } from '../../utils/proxy.js';
import watcher from '../../watcher.js';

const IMG_REGEX = /https?:\/\/[a-zA-Z0-9\.\/\-\_\%\@\?\&\=\:\+\~]+(?:\.jpg|\.jpeg|\.png|\.gif|\.bmp|\.tif|\.tiff|\.webp|\.jfif)/i;
const VID_REGEX = /https?:\/\/[a-zA-Z0-9\.\/\-\_\%\@\?\&\=\:\+\~]+(?:\.mp4|\.mov)/i;
const SEVENTV_EMOTE_REGEX = /https?:\/\/7tv\.app\/emotes\/([a-zA-Z0-9]+)/i;
const IMGUR_REGEX = /https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)/i;
const KAPPALOL_REGEX = /https?:\/\/(?:www\.)?kappa\.lol\/([a-zA-Z0-9]+)/i;
const DISCORD_CDN_REGEX = /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//i;

class LinkPreviewModule {
  constructor() {
    this.enabled = false;
    this.maxHeight = 250;
    this.maxWidth = 300;
    watcher.on('load.chat', () => this.setup());
    settings.on(`changed.${SettingIds.LINK_PREVIEW}`, () => this.setup());
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_HEIGHT}`, () => this.setup());
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_WIDTH}`, () => this.setup());
  }

  setup() {
    this.enabled = settings.get(SettingIds.LINK_PREVIEW);
    this.maxHeight = settings.get(SettingIds.LINK_PREVIEW_MAX_HEIGHT) || 250;
    this.maxWidth = settings.get(SettingIds.LINK_PREVIEW_MAX_WIDTH) || 300;
    
    if (this.enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  startMonitoring() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.processMessages();
    }, 1000);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  processMessages() {
    const querySelection = 'span[data-a-target="chat-line-message-body"]:has(a),span.seventv-chat-message-body:has(a)';
    const messagesList = document.querySelectorAll(querySelection) ?? [];
    
    for (const messageBody of messagesList) {
      for (const messagePart of messageBody.children) {
        if (messagePart.dataset.linkPreviewProcessed) continue;
        
        const text = messagePart.textContent.trim();
        
        const seventvMatch = text.match(SEVENTV_EMOTE_REGEX);
        const imgurMatch = text.match(IMGUR_REGEX);
        const kappaLolMatch = text.match(KAPPALOL_REGEX);
        
        if (seventvMatch) {
          this.replace7TVEmote(messagePart, seventvMatch[1]);
        } else if (imgurMatch) {
          this.replaceImgurImage(messagePart, imgurMatch[1]);
        } else if (kappaLolMatch) {
          this.replaceKappaLolImage(messagePart, kappaLolMatch[1]);
        } else if (IMG_REGEX.test(text)) {
          this.replaceImage(messagePart);
        } else if (VID_REGEX.test(text)) {
          this.replaceVideo(messagePart);
        }
      }
    }
  }

  replaceImage(messagePart) {
    const url = messagePart.textContent.trim();
    
    messagePart.dataset.linkPreviewProcessed = 'true';
    
    const proxyUrl = getProxyUrl();
    let imageUrl = url;
    if (proxyUrl && DISCORD_CDN_REGEX.test(url)) {
      imageUrl = `${proxyUrl}${url}`;
    }
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Link Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        messagePart.innerHTML = '';
        messagePart.appendChild(previewContainer);
      } else {
        messagePart.appendChild(document.createElement('br'));
        messagePart.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replaceVideo(messagePart) {
    const videoUrl = messagePart.textContent.trim();
    
    messagePart.dataset.linkPreviewProcessed = 'true';
    
    const previewContainer = document.createElement('span');
    previewContainer.className = 'bttv-link-preview-container';
    
    const video = document.createElement('video');
    video.src = videoUrl;
    video.className = 'bttv-link-preview-video';
    video.controls = true;
    video.preload = 'metadata';
    video.style.maxHeight = `${this.maxHeight}px`;
    video.style.maxWidth = `${this.maxWidth}px`;
    
    previewContainer.appendChild(video);
    
    const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
    
    if (hideLink) {
      messagePart.innerHTML = '';
      messagePart.appendChild(previewContainer);
    } else {
      messagePart.appendChild(document.createElement('br'));
      messagePart.appendChild(previewContainer);
    }
  }

  replaceImgurImage(messagePart, imgurId) {
    const originalUrl = messagePart.textContent.trim();
    const imageUrl = `https://i.imgur.com/${imgurId}.jpg`;
    
    messagePart.dataset.linkPreviewProcessed = 'true';
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = originalUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Imgur Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        messagePart.innerHTML = '';
        messagePart.appendChild(previewContainer);
      } else {
        messagePart.appendChild(document.createElement('br'));
        messagePart.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replaceKappaLolImage(messagePart, kappaLolId) {
    const originalUrl = messagePart.textContent.trim();
    
    messagePart.dataset.linkPreviewProcessed = 'true';
    
    const proxyUrl = getProxyUrl();
    const imageUrl = proxyUrl ? `${proxyUrl}${originalUrl}` : originalUrl;
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = originalUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Kappa.lol Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        messagePart.innerHTML = '';
        messagePart.appendChild(previewContainer);
      } else {
        messagePart.appendChild(document.createElement('br'));
        messagePart.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replace7TVEmote(messagePart, emoteId) {
    const proxyUrl = getProxyUrl();
    
    let emoteImageUrl = `https://cdn.7tv.app/emote/${emoteId}/2x.webp`;
    
    if (proxyUrl) {
      emoteImageUrl = `${proxyUrl}${emoteImageUrl}`;
    }
    
    messagePart.dataset.linkPreviewProcessed = 'true';
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = messagePart.textContent.trim();
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = emoteImageUrl;
      imgElement.className = 'bttv-link-preview-emote';
      imgElement.alt = '7TV Emote';
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        messagePart.innerHTML = '';
        messagePart.appendChild(previewContainer);
      } else {
        messagePart.appendChild(document.createElement('br'));
        messagePart.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = emoteImageUrl;
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new LinkPreviewModule()]);

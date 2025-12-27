import {getCurrentUser} from '../../utils/user.js';
import emotes from '../emotes/index.js';
import EmoteInfoWindow from './EmoteInfoModal.jsx';
import {deserializeEmoteFromURL} from '../emote_autocomplete/twitch/EmoteAutocomplete.jsx';
import watcher from '../../watcher.js';

const emoteInfoWindow = new EmoteInfoWindow();

function getEmoteFromElement(element) {
  if (element.__bttvEmote) {
    return element.__bttvEmote;
  }

  let container = element.closest('.bttv-emote, .bttv-emoji-container');
  if (container && container.__bttvEmote) {
    return container.__bttvEmote;
  }

  if (element.classList && (element.classList.contains('bttv-emote') || element.classList.contains('bttv-emoji-container'))) {
    container = element;
    if (container.__bttvEmote) {
      return container.__bttvEmote;
    }
  }

  const emoteButton = element.closest('div[data-test-selector="emote-button"]');
  if (emoteButton) {
    if (emoteButton.__bttvEmote) {
      return emoteButton.__bttvEmote;
    }
    
    const img = emoteButton.querySelector('img');
    if (img) {
      const url = String(img.srcset || img.src);
      const deserializedEmote = deserializeEmoteFromURL(url);
      if (deserializedEmote) {
        const user = getCurrentUser();
        return emotes.getEligibleEmote(deserializedEmote.code, user);
      }
    }
  }

  if (container) {
    const classes = Array.from(container.classList);
    for (const className of classes) {
      const match = className.match(/^(.+)-emo-(.+)$/);
      if (match) {
        const [, categoryId, emoteId] = match;
        const img = container.querySelector('img');
        if (img && img.alt) {
          const code = img.alt.trim().split(/\s+/)[0];
          const user = getCurrentUser();
          const emote = emotes.getEligibleEmote(code, user);
          if (emote && emote.id === emoteId) {
            return emote;
          }
        }
      }
    }
  }

  return null;
}

function handleEmoteClick(e) {
  if (e.button === 1) {
    return;
  }

  if (e.button !== 0) {
    return;
  }

  const target = e.target;
  
  const emoteElement = target.closest('.bttv-emote, .bttv-emoji-container, div[data-test-selector="emote-button"]');
  
  if (!emoteElement) {
    return;
  }

  const nativeEmoteContainer = target.closest('.chat-image__container');
  if (nativeEmoteContainer && !nativeEmoteContainer.classList.contains('bttv-emote')) {
    return;
  }

  const emote = getEmoteFromElement(emoteElement);
  
  if (!emote) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  emoteInfoWindow.open(emote);
}

class EmoteInfoModule {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    this.initialized = false;
  }

  handleClick(e) {
    handleEmoteClick(e);
  }

  load() {
    if (this.initialized) {
      return;
    }
    
    document.addEventListener('click', this.handleClick, true);
    this.initialized = true;
  }

  cleanup() {
    if (this.initialized) {
      document.removeEventListener('click', this.handleClick, true);
      this.initialized = false;
    }
  }
}

const emoteInfoModule = new EmoteInfoModule();

watcher.on('load', () => {
  emoteInfoModule.load();
});

export default emoteInfoModule;


import {PlatformTypes, SettingIds} from '../../constants.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import watcher from '../../watcher.js';

class EmoteSizeModule {
  constructor() {
    this.styleElement = null;
    this.currentSize = null;

    this.load();
    watcher.on('load', () => this.load());
    settings.on(`changed.${SettingIds.EMOTE_SIZE}`, () => this.load());
  }

  load() {
    const emoteSize = settings.get(SettingIds.EMOTE_SIZE);

    if (this.currentSize === emoteSize) {
      return;
    }

    this.currentSize = emoteSize;
    this.updateStyles();

    setTimeout(() => {
      this.updateStyles();
    }, 100);
  }

  updateStyles() {
    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'bttv-emote-size-styles';

    const css = `
      .bttv-emote-image {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      .bttv-emote img {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      .bttv-emote.seventv-channel img {
        max-height: ${this.currentSize}px !important;
        width: auto !important;
      }
      
      .bttv-emote-modifier-rotate-left img,
      .bttv-emote-modifier-rotate-right img {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
      }
      
      .bttv-emote-modifier-wide img {
        width: ${this.currentSize * 4}px !important;
        height: ${this.currentSize}px !important;
        max-width: ${this.currentSize * 4}px !important;
        max-height: ${this.currentSize}px !important;
        object-fit: fill !important;
      }
      
      /* Override existing styles with higher specificity */
      .bttv-emote.seventv-channel img.bttv-emote-image {
        max-height: ${this.currentSize}px !important;
        width: auto !important;
      }
      
      /* Override any existing max-height constraints */
      .chat-line__message .bttv-emote img,
      .vod-message .bttv-emote img,
      .pinned-chat__message .bttv-emote img,
      .thread-message__message .bttv-emote img {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Ensure our styles take precedence */
      .bttv-emote-image,
      .bttv-emote img {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
    `;

    this.styleElement.textContent = css;

    if (document.head.lastChild) {
      document.head.insertBefore(this.styleElement, document.head.lastChild.nextSibling);
    } else {
      document.head.appendChild(this.styleElement);
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new EmoteSizeModule()]);

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
      .bttv-emote-image:not(.chat-line__message--ffz-giant-emote img) {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      .bttv-emote img:not(.chat-line__message--ffz-giant-emote img) {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      .bttv-emote.seventv-channel img:not(.chat-line__message--ffz-giant-emote img) {
        max-height: ${this.currentSize}px !important;
        width: auto !important;
      }
      
      .bttv-emote-modifier-rotate-left img:not(.chat-line__message--ffz-giant-emote img),
      .bttv-emote-modifier-rotate-right img:not(.chat-line__message--ffz-giant-emote img) {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
      }
      
      .bttv-emote-modifier-wide img:not(.chat-line__message--ffz-giant-emote img) {
        width: ${this.currentSize * 4}px !important;
        height: ${this.currentSize}px !important;
        max-width: ${this.currentSize * 4}px !important;
        max-height: ${this.currentSize}px !important;
        object-fit: fill !important;
      }
      
      /* Override existing styles with higher specificity */
      .bttv-emote.seventv-channel img.bttv-emote-image:not(.chat-line__message--ffz-giant-emote img) {
        max-height: ${this.currentSize}px !important;
        width: auto !important;
      }
      
      /* Override any existing max-height constraints */
      .chat-line__message .bttv-emote img:not(.chat-line__message--ffz-giant-emote img),
      .vod-message .bttv-emote img:not(.chat-line__message--ffz-giant-emote img),
      .pinned-chat__message .bttv-emote img:not(.chat-line__message--ffz-giant-emote img),
      .thread-message__message .bttv-emote img:not(.chat-line__message--ffz-giant-emote img) {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Ensure our styles take precedence */
      .bttv-emote-image:not(.chat-line__message--ffz-giant-emote img),
      .bttv-emote img:not(.chat-line__message--ffz-giant-emote img) {
        max-width: ${this.currentSize}px !important;
        max-height: ${this.currentSize}px !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Giant emote styles */
      .chat-line__message--ffz-giant-emote {
        display: inline-block;
        vertical-align: middle;
        margin: 0 2px;
      }
      
      .chat-line__message--ffz-giant-emote img {
        max-width: 512px !important;
        max-height: 512px !important;
        width: auto !important;
        height: auto !important;
        vertical-align: middle;
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

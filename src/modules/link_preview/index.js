import { PlatformTypes, SettingIds } from '../../constants.js';
import settings from '../../settings.js';
import { loadModuleForPlatforms } from '../../utils/modules.js';
import { LinkPreviewProcessor } from '../../utils/link_preview.js';
import watcher from '../../watcher.js';

class LinkPreviewModule {
  constructor() {
    this.enabled = false;
    this.processor = new LinkPreviewProcessor();
    watcher.on('load.chat', () => this.setup());
    settings.on(`changed.${SettingIds.LINK_PREVIEW}`, () => this.setup());
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_HEIGHT}`, () => this.updateProcessorSettings());
    settings.on(`changed.${SettingIds.LINK_PREVIEW_MAX_WIDTH}`, () => this.updateProcessorSettings());
  }

  setup() {
    this.enabled = settings.get(SettingIds.LINK_PREVIEW);
    this.updateProcessorSettings();
    
    if (this.enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  updateProcessorSettings() {
    this.processor.updateSettings();
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
        
        this.processor.processElement(messagePart);
      }
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new LinkPreviewModule()]);

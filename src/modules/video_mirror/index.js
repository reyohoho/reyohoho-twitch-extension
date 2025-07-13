import {PlatformTypes, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import playerButtonManager from '../../utils/player-button-manager.js';
import watcher from '../../watcher.js';

class VideoMirror {
  constructor() {
    this.isFlipped = false;
    this.initialized = false;

    settings.on(`changed.${SettingIds.VIDEO_MIRROR}`, (value) => {
      if (!value) {
        this.removeMirrorButton();
      } else {
        this.ensureMirrorButton();
      }
    });
  }

  addMirrorButton() {
    if (!settings.get(SettingIds.VIDEO_MIRROR)) {
      return;
    }

    // Check if button already exists
    if (document.querySelector('.bttv-video-mirror-container')) {
      return;
    }

    const videoPlayer = playerButtonManager.findPlayerContainer();
    if (!videoPlayer) {
      return false;
    }

    const controlsContainer = playerButtonManager.findControlsContainer(videoPlayer);
    const rightControls = playerButtonManager.findRightControls(controlsContainer);

    const flipButtonContainer = document.createElement('div');
    flipButtonContainer.className = 'bttv-video-mirror-container';

    const flipButton = document.createElement('button');
    flipButton.id = 'bttv-video-mirror-button';
    flipButton.className = 'bttv-video-mirror-button';
    flipButton.setAttribute('aria-label', formatMessage({defaultMessage: 'Mirror Video Horizontally'}));

    flipButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/>
      </svg>
    `;

    const tooltip = document.createElement('div');
    tooltip.className = 'bttv-video-mirror-tooltip';
    tooltip.textContent = formatMessage({defaultMessage: 'Mirror Video Horizontally'});

    flipButtonContainer.appendChild(flipButton);
    flipButtonContainer.appendChild(tooltip);

    flipButton.addEventListener('click', () => {
      this.toggleVideoMirror();
    });

    return playerButtonManager.addButtonToRightControls(flipButtonContainer, rightControls, controlsContainer);
  }

  removeMirrorButton() {
    const mirrorButton = document.querySelector('.bttv-video-mirror-container');
    if (mirrorButton) {
      mirrorButton.remove();
    }

    // Reset video mirror state
    const video = document.querySelector('video');
    if (video) {
      video.style.transform = 'scaleX(1)';
      this.isFlipped = false;
      this.updateButtonState();
    }
  }

  toggleVideoMirror() {
    const video = document.querySelector('video');
    if (video) {
      this.isFlipped = !this.isFlipped;
      if (this.isFlipped) {
        video.style.transform = 'scaleX(-1)';
      } else {
        video.style.transform = 'scaleX(1)';
      }
      this.updateButtonState();
    }
  }

  updateButtonState() {
    const flipButton = document.querySelector('.bttv-video-mirror-button');
    if (flipButton) {
      flipButton.classList.toggle('active', this.isFlipped);
    }
  }

  ensureMirrorButton() {
    if (!document.querySelector('.bttv-video-mirror-container')) {
      const hasPlayer =
        document.querySelector('#channel-player') ||
        document.querySelector('[data-a-target="player"]') ||
        document.querySelector('[class*="video-player"]') ||
        document.querySelector('.persistent-player');

      if (hasPlayer) {
        this.addMirrorButton();
      }
    }
  }

  initialize() {
    if (this.initialized) return;

    // Register button with player button manager
    playerButtonManager.registerButton('video-mirror', {
      shouldAdd: () => settings.get(SettingIds.VIDEO_MIRROR) && !document.querySelector('.bttv-video-mirror-container'),
      add: () => this.addMirrorButton(),
    });

    watcher.on('load.player', () => {
      this.ensureMirrorButton();
    });

    // Initial attempt
    this.addMirrorButton();
    this.initialized = true;
  }
}

export default loadModuleForPlatforms([
  PlatformTypes.TWITCH,
  () => {
    const videoMirror = new VideoMirror();
    videoMirror.initialize();
    return videoMirror;
  },
]);

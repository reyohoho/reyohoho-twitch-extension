import {PlatformTypes, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import playerButtonManager from '../../utils/player-button-manager.js';
import watcher from '../../watcher.js';

const VIDEO_PLAYER_SELECTOR = '.video-player__container';

class PictureInPicture {
  constructor() {
    this.isInPictureInPicture = false;
    this.initialized = false;

    settings.on(`changed.${SettingIds.PICTURE_IN_PICTURE}`, (value) => {
      if (!value) {
        this.removePipButton();
      } else {
        this.ensurePipButton();
      }
    });
  }

  createPipButton(toggled) {
    const label = formatMessage({defaultMessage: 'Picture in Picture'});

    const container = document.createElement('div');
    container.className = 'bttv-pip-container';

    const button = document.createElement('button');
    button.className = 'bttv-pip-button';
    button.setAttribute('aria-label', label);
    container.appendChild(button);

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '100%');
    icon.setAttribute('height', '100%');
    icon.setAttribute('transform', 'scale(1.3)');
    icon.setAttribute('viewBox', '0 0 128 128');
    icon.setAttribute('x', '0px');
    icon.setAttribute('y', '0px');
    button.appendChild(icon);

    const iconPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath1.setAttribute(
      'd',
      'M22 30c-1.9 1.9-2 3.3-2 34s.1 32.1 2 34c1.9 1.9 3.3 2 42 2s40.1-.1 42-2c1.9-1.9 2-3.3 2-34 0-31.6 0-31.9-2.2-34-2.1-1.9-3.3-2-42-2-38.5 0-39.9.1-41.8 2zm78 34v28H28V36h72v28z'
    );
    icon.appendChild(iconPath1);

    if (toggled) {
      const iconPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      iconPath2.setAttribute('d', 'M60 72v12h32V60H60v12z');
      icon.appendChild(iconPath2);
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'bttv-pip-tooltip';
    tooltip.textContent = label;
    container.appendChild(tooltip);

    return container;
  }

  addPipButton() {
    if (!settings.get(SettingIds.PICTURE_IN_PICTURE)) {
      return;
    }

    if (!document.pictureInPictureEnabled) {
      return;
    }

    if (document.querySelector('.bttv-pip-container')) {
      return;
    }

    const videoPlayer = playerButtonManager.findPlayerContainer();
    if (!videoPlayer) {
      return false;
    }

    const controlsContainer = playerButtonManager.findControlsContainer(videoPlayer);
    const rightControls = playerButtonManager.findRightControls(controlsContainer);

    const pipButton = this.createPipButton(this.isInPictureInPicture);
    pipButton.addEventListener('click', () => this.togglePictureInPicture());

    return playerButtonManager.addButtonToRightControls(pipButton, rightControls, controlsContainer);
  }

  removePipButton() {
    const pipButton = document.querySelector('.bttv-pip-container');
    if (pipButton) {
      pipButton.remove();
    }
  }

  togglePictureInPicture() {
    const video = document.querySelector(VIDEO_PLAYER_SELECTOR)?.querySelector('video');
    if (!video) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture();
    }
  }

  updateButtonState() {
    const pipButton = document.querySelector('.bttv-pip-button');
    if (pipButton) {
      pipButton.classList.toggle('active', this.isInPictureInPicture);
    }
  }

  ensurePipButton() {
    if (!document.querySelector('.bttv-pip-container')) {
      const hasPlayer =
        document.querySelector('#channel-player') ||
        document.querySelector('[data-a-target="player"]') ||
        document.querySelector('[class*="video-player"]') ||
        document.querySelector('.persistent-player');

      if (hasPlayer) {
        this.addPipButton();
      }
    }
  }

  initialize() {
    if (this.initialized) return;

    if (!document.pictureInPictureEnabled) {
      return;
    }

    const video = document.querySelector(VIDEO_PLAYER_SELECTOR)?.querySelector('video');
    if (video) {
      video.addEventListener('enterpictureinpicture', () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        this.isInPictureInPicture = true;
        this.updateButtonState();
      });

      video.addEventListener('leavepictureinpicture', () => {
        this.isInPictureInPicture = false;
        this.updateButtonState();
      });
    }

    document.addEventListener('fullscreenchange', () => {
      if (document.pictureInPictureElement && document.fullscreenElement) {
        document.exitPictureInPicture();
      }
    });

    playerButtonManager.registerButton('picture-in-picture', {
      shouldAdd: () => settings.get(SettingIds.PICTURE_IN_PICTURE) && !document.querySelector('.bttv-pip-container'),
      add: () => this.addPipButton(),
    });

    watcher.on('load.player', () => {
      this.ensurePipButton();
    });

    this.addPipButton();
    this.initialized = true;
  }
}

export default loadModuleForPlatforms([
  PlatformTypes.TWITCH,
  () => {
    const pictureInPicture = new PictureInPicture();
    pictureInPicture.initialize();
    return pictureInPicture;
  },
]);

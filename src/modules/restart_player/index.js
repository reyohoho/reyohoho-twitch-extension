import {PlatformTypes, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import playerButtonManager from '../../utils/player-button-manager.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';

class RestartPlayer {
  constructor() {
    this.initialized = false;

    settings.on(`changed.${SettingIds.RESTART_PLAYER}`, (value) => {
      if (!value) {
        this.removeRestartButton();
      } else {
        this.ensureRestartButton();
      }
    });
  }

  createRestartButton() {
    const label = formatMessage({defaultMessage: 'Restart Player'});

    const container = document.createElement('div');
    container.className = 'bttv-restart-player-container';

    const button = document.createElement('button');
    button.className = 'bttv-restart-player-button';
    button.setAttribute('aria-label', label);
    container.appendChild(button);

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '100%');
    icon.setAttribute('height', '100%');
    icon.setAttribute('transform', 'scale(1.3)');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('x', '0px');
    icon.setAttribute('y', '0px');
    button.appendChild(icon);

    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute(
      'd',
      'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
    );
    icon.appendChild(iconPath);

    const tooltip = document.createElement('div');
    tooltip.className = 'bttv-restart-player-tooltip';
    tooltip.textContent = label;
    container.appendChild(tooltip);

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.restartPlayer();
    });

    return container;
  }

  addRestartButton() {
    if (!settings.get(SettingIds.RESTART_PLAYER)) {
      return;
    }

    if (document.querySelector('.bttv-restart-player-container')) {
      return;
    }

    const videoPlayer = playerButtonManager.findPlayerContainer();
    if (!videoPlayer) {
      return false;
    }

    const controlsContainer = playerButtonManager.findControlsContainer(videoPlayer);
    const rightControls = playerButtonManager.findRightControls(controlsContainer);

    const restartButton = this.createRestartButton();

    return playerButtonManager.addButtonToRightControls(restartButton, rightControls, controlsContainer);
  }

  removeRestartButton() {
    const restartButton = document.querySelector('.bttv-restart-player-container');
    if (restartButton) {
      restartButton.remove();
    }
  }

  findPlayerInstance() {
    const video = document.querySelector('video');
    if (!video) return null;

    let reactRoot = video;
    while (reactRoot && !Object.keys(reactRoot).some((key) => key.startsWith('__reactFiber$'))) {
      reactRoot = reactRoot.parentElement;
    }

    if (!reactRoot) return null;

    const fiberKey = Object.keys(reactRoot).find((key) => key.startsWith('__reactFiber$'));
    const fiber = reactRoot[fiberKey];

    if (!fiber) return null;

    const stack = [fiber];
    const seen = new Set();

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);

      if (node.stateNode && typeof node.stateNode.setSrc === 'function' && node.stateNode.props?.mediaPlayerInstance) {
        return node.stateNode;
      }

      if (node.child) stack.push(node.child);
      if (node.sibling) stack.push(node.sibling);
      if (node.return) stack.push(node.return);
    }

    return null;
  }

  async resetTwitchPlayer(inst) {
    if (!inst.props?.mediaPlayerInstance) {
      return;
    }

    const player = inst.props.mediaPlayerInstance;

    try {
      await inst.setSrc({
        isNewMediaPlayerInstance: false,
      });
    } catch (err) {
      console.log('BTTV: setSrc failed, falling back to manual reset');

      const video = player.mediaSinkManager?.video || player.core?.mediaSinkManager?.video;
      if (!video) return;

      const wasPlaying = !player.core?.state?.ended && !player.core?.state?.paused;
      const old_src = video.src;

      video.src = '';
      video.load();

      await new Promise((r) => setTimeout(r, 0));

      video.src = old_src;
      video.load();

      if (wasPlaying) {
        video.play();
      }
    }
  }

  async restartPlayer() {
    console.log('BTTV: Restarting player...');

    const currentPlayer = twitch.getCurrentPlayer();
    if (!currentPlayer) {
      console.log('BTTV: No current player found');
      return;
    }

    const currentTime = currentPlayer.getPosition();
    const videoQuality = currentPlayer.getQuality();
    const playerVolume = currentPlayer.getVolume();

    console.log('BTTV: Player state:', {
      currentTime,
      videoQuality,
      playerVolume,
    });

    const instance = this.findPlayerInstance();
    if (!instance) {
      console.log('BTTV: Player instance not found');
      return;
    }

    try {
      await this.resetTwitchPlayer(instance);
    } catch (error) {
      console.error('BTTV: Error during player restart:', error);
    }
  }

  ensureRestartButton() {
    if (!document.querySelector('.bttv-restart-player-container')) {
      const hasPlayer =
        document.querySelector('#channel-player') ||
        document.querySelector('[data-a-target="player"]') ||
        document.querySelector('[class*="video-player"]') ||
        document.querySelector('.persistent-player');

      if (hasPlayer) {
        this.addRestartButton();
      }
    }
  }

  initialize() {
    if (this.initialized) return;

    playerButtonManager.registerButton('restart-player', {
      shouldAdd: () =>
        settings.get(SettingIds.RESTART_PLAYER) && !document.querySelector('.bttv-restart-player-container'),
      add: () => this.addRestartButton(),
    });

    watcher.on('load.player', () => {
      this.ensureRestartButton();
    });

    this.addRestartButton();
    this.initialized = true;
  }
}

export default loadModuleForPlatforms([
  PlatformTypes.TWITCH,
  () => {
    const restartPlayer = new RestartPlayer();
    restartPlayer.initialize();
    return restartPlayer;
  },
]);

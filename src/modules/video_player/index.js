import {off, on} from 'delegated-events';
import debounce from 'lodash.debounce';
import {AutoPlayFlags, PlatformTypes, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import domWatcher from '../../observers/dom.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';

const VIDEO_PLAYER_SELECTOR = '.video-player__container';
const CANCEL_VOD_RECOMMENDATION_SELECTOR =
  '.recommendations-overlay .pl-rec__cancel.pl-button, .autoplay-vod__content-container button';
const BTTV_PICTURE_IN_PICTURE_SELECTOR = '#bttv-picture-in-picture';
const BTTV_RESTART_PLAYER_SELECTOR = '#bttv-restart-player';

function createPictureInPictureButton(toggled) {
  const label = formatMessage({defaultMessage: 'Picture in Picture'});

  const container = document.createElement('div');
  container.setAttribute('id', 'bttv-picture-in-picture');
  container.classList.add('bttv-picture-in-picture-wrapper', 'bttv-tooltip-wrapper');

  const button = document.createElement('button');
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
  tooltip.classList.add('bttv-tooltip', 'bttv-tooltip--align-right', 'bttv-tooltip--up');
  tooltip.setAttribute('role', 'tooltip');
  tooltip.innerText = label;
  container.appendChild(tooltip);

  return container;
}

function createRestartPlayerButton() {
  const label = formatMessage({defaultMessage: 'Restart Player'});

  const container = document.createElement('div');
  container.setAttribute('id', 'bttv-restart-player');
  container.classList.add('bttv-restart-player-wrapper', 'bttv-tooltip-wrapper');

  const button = document.createElement('button');
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
  tooltip.classList.add('bttv-tooltip', 'bttv-tooltip--align-right', 'bttv-tooltip--up');
  tooltip.setAttribute('role', 'tooltip');
  tooltip.innerText = label;
  container.appendChild(tooltip);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    restartPlayer();
  });

  return container;
}

function findPlayerInstance() {
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

async function resetTwitchPlayer(inst) {
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

async function restartPlayer() {
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

  const instance = findPlayerInstance();
  if (!instance) {
    console.log('BTTV: Player instance not found');
    return;
  }

  try {
    currentPlayer.pause();

    await resetTwitchPlayer(instance);

    setTimeout(() => {
      const player = twitch.getCurrentPlayer();
      if (!player) {
        console.log('BTTV: Could not get player after reload');
        return;
      }

      console.log('BTTV: Restoring player state...');

      player.setQuality(videoQuality);
      player.setVolume(playerVolume);
      player.seekTo(currentTime);
      player.play();

      console.log('BTTV: Player state restored');
    }, 500);
  } catch (error) {
    console.error('BTTV: Error during player restart:', error);
  }
}

let removeRecommendationWatcher;

function watchPlayerRecommendationVodsAutoplay() {
  if (hasFlag(settings.get(SettingIds.AUTO_PLAY), AutoPlayFlags.VOD_RECOMMENDATION_AUTOPLAY)) {
    if (removeRecommendationWatcher) removeRecommendationWatcher();
    return;
  }

  removeRecommendationWatcher = domWatcher.on(CANCEL_VOD_RECOMMENDATION_SELECTOR, (node, isConnected) => {
    if (!isConnected) return;
    node.click();
  });
}

let clicks = 0;

function handlePlayerClick() {
  const currentPlayer = twitch.getCurrentPlayer();
  if (!currentPlayer) return;
  const {paused} = currentPlayer;
  clicks++;
  setTimeout(() => {
    if (clicks === 1) {
      if (!paused) {
        currentPlayer.pause();
      }
    }
    clicks = 0;
  }, 250);
}

function maybeSeek(event) {
  // Default seek time is 2 seconds for VODs
  const delta = event.deltaY > 0 ? -2 : 2;

  const currentPlayer = twitch.getCurrentPlayer();
  if (!currentPlayer || currentPlayer.getDuration() === Infinity) return;

  currentPlayer.seekTo(currentPlayer.getPosition() + delta);

  event.preventDefault();
  event.stopPropagation();
}

function maybeControlVolume(event) {
  const delta = event.deltaY > 0 ? -0.025 : 0.025;

  const currentPlayer = twitch.getCurrentPlayer();
  if (!currentPlayer) return;

  currentPlayer.setVolume(Math.min(Math.max(currentPlayer.getVolume() + delta, 0), 1));

  event.preventDefault();
  event.stopPropagation();
}

function handlePlayerScroll(event) {
  if (!settings.get(SettingIds.SCROLL_PLAYER_CONTROLS)) return;

  // Alt scrolling controls video seeking
  if (event.altKey) {
    maybeSeek(event);
  } else {
    maybeControlVolume(event);
  }
}

function togglePlayerCursor(hide) {
  document.body.classList.toggle('bttv-hide-player-cursor', hide);
}

let isMuted = false;
document.addEventListener('visibilitychange', () => {
  if (!settings.get(SettingIds.MUTE_INVISIBLE_PLAYER)) return;
  // set raw video element volume to not edit persisted player volume state
  const video = document.querySelector(VIDEO_PLAYER_SELECTOR)?.querySelector('video');
  if (!video) return;
  if (document.visibilityState === 'visible') {
    if (isMuted) {
      video.muted = false;
      isMuted = false;
    }
  } else if (!document.pictureInPictureElement) {
    video.muted = true;
    isMuted = true;
  }
});

document.addEventListener('fullscreenchange', () => {
  if (document.pictureInPictureElement && document.fullscreenElement) {
    document.exitPictureInPicture();
  }
});

function togglePictureInPicture() {
  const video = document.querySelector(VIDEO_PLAYER_SELECTOR)?.querySelector('video');
  if (!video) return;

  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else {
    video.requestPictureInPicture();
  }
}

class VideoPlayerModule {
  constructor() {
    watcher.on('load.player', () => {
      this.clickToPause();
      watchPlayerRecommendationVodsAutoplay();
      this.loadScrollControl();
      this.loadPictureInPicture();
    });
    settings.on(`changed.${SettingIds.PLAYER_EXTENSIONS}`, () => this.toggleHidePlayerExtensions());
    settings.on(`changed.${SettingIds.VOD_RECOMMENDATION_AUTOPLAY}`, () => watchPlayerRecommendationVodsAutoplay());
    settings.on(`changed.${SettingIds.CLICK_TO_PLAY}`, () => this.clickToPause());
    this.toggleHidePlayerExtensions();
    this.loadHidePlayerCursorFullscreen();
  }

  loadScrollControl() {
    const videoPlayerOverlay = document
      .querySelector(VIDEO_PLAYER_SELECTOR)
      ?.querySelector('div[data-a-target="player-overlay-click-handler"]');
    if (videoPlayerOverlay == null) return;
    videoPlayerOverlay.removeEventListener('wheel', handlePlayerScroll);
    videoPlayerOverlay.addEventListener('wheel', handlePlayerScroll);
  }

  toggleHidePlayerExtensions() {
    document.body.classList.toggle('bttv-hide-player-extensions', !settings.get(SettingIds.PLAYER_EXTENSIONS));
  }

  clickToPause() {
    off('click', '.video-player__overlay div[data-a-target="player-overlay-click-handler"]', handlePlayerClick);

    if (settings.get(SettingIds.CLICK_TO_PLAY) === true) {
      on('click', '.video-player__overlay div[data-a-target="player-overlay-click-handler"]', handlePlayerClick);
    }
  }

  loadHidePlayerCursorFullscreen() {
    const hidePlayerCursor = debounce(() => togglePlayerCursor(true), 5000);
    on('mousemove', 'div[data-test-selector="video-player__video-layout"]', () => {
      togglePlayerCursor(false);
      hidePlayerCursor();
    });
  }

  loadPictureInPicture() {
    if (!document.pictureInPictureEnabled || document.querySelector(BTTV_PICTURE_IN_PICTURE_SELECTOR) != null) {
      console.log('PiP not enabled or button already exists');
      return;
    }

    const video = document.querySelector(VIDEO_PLAYER_SELECTOR)?.querySelector('video');
    if (video == null) {
      console.log('No video element found');
      return;
    }

    video.addEventListener('enterpictureinpicture', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      const button = createPictureInPictureButton(true);
      document.querySelector(BTTV_PICTURE_IN_PICTURE_SELECTOR)?.replaceWith(button);
      button.addEventListener('click', togglePictureInPicture);
    });

    video.addEventListener('leavepictureinpicture', () => {
      const button = createPictureInPictureButton(false);
      document.querySelector(BTTV_PICTURE_IN_PICTURE_SELECTOR)?.replaceWith(button);
      button.addEventListener('click', togglePictureInPicture);
    });

    const anchor = document.querySelector(
      '.player-controls__right-control-group > div:has(button[data-a-target="player-settings-button"])'
    );
    if (anchor == null) {
      console.log('No anchor element found for buttons');
      return;
    }

    const pipButton = createPictureInPictureButton(false);
    pipButton.addEventListener('click', togglePictureInPicture);
    anchor.after(pipButton);

    if (!document.querySelector(BTTV_RESTART_PLAYER_SELECTOR)) {
      const restartButton = createRestartPlayerButton();
      pipButton.after(restartButton);
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new VideoPlayerModule()]);

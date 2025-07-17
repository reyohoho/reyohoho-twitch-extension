import {off, on} from 'delegated-events';
import debounce from 'lodash.debounce';
import {AutoPlayFlags, PlatformTypes, SettingIds} from '../../constants.js';
import domWatcher from '../../observers/dom.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';

const VIDEO_PLAYER_SELECTOR = '.video-player__container';
const CANCEL_VOD_RECOMMENDATION_SELECTOR =
  '.recommendations-overlay .pl-rec__cancel.pl-button, .autoplay-vod__content-container button';

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

class VideoPlayerModule {
  constructor() {
    watcher.on('load.player', () => {
      this.clickToPause();
      watchPlayerRecommendationVodsAutoplay();
      this.loadScrollControl();
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
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new VideoPlayerModule()]);

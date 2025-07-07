import domObserver from '../observers/dom.js';
import watcher from '../watcher.js';

class PlayerButtonManager {
  constructor() {
    this.initialized = false;
    this.buttonHandlers = new Map();
  }

  initialize() {
    if (this.initialized) return;

    // Listen for player load events
    watcher.on('load.player', () => {
      this.ensureAllButtons();
    });

    // Listen for DOM changes
    domObserver.on('[data-a-target="player-controls"]', () => {
      setTimeout(() => this.ensureAllButtons(), 100);
    });

    domObserver.on('.player-controls', () => {
      setTimeout(() => this.ensureAllButtons(), 100);
    });

    domObserver.on('.player-controls__right', () => {
      setTimeout(() => this.ensureAllButtons(), 100);
    });

    domObserver.on('.volume-slider', () => {
      setTimeout(() => this.ensureAllButtons(), 100);
    });

    this.initialized = true;
  }

  registerButton(buttonId, handler) {
    this.buttonHandlers.set(buttonId, handler);
  }

  unregisterButton(buttonId) {
    this.buttonHandlers.delete(buttonId);
  }

  ensureAllButtons() {
    for (const [buttonId, handler] of this.buttonHandlers) {
      if (handler.shouldAdd && handler.shouldAdd()) {
        handler.add();
      }
    }
  }

  findPlayerContainer() {
    return (
      document.querySelector('[data-a-target="player-overlay-video"]') ||
      document.querySelector('.video-player__container') ||
      document.querySelector('[data-a-target="player-controls"]') ||
      document.querySelector('.persistent-player')
    );
  }

  findControlsContainer(videoPlayer) {
    return (
      videoPlayer.querySelector('[data-a-target="player-controls"]') ||
      videoPlayer.querySelector('.player-controls') ||
      videoPlayer.querySelector('.player-controls__container') ||
      videoPlayer
    );
  }

  findRightControls(controlsContainer) {
    return (
      controlsContainer.querySelector('[data-a-target="player-controls-right"]') ||
      controlsContainer.querySelector('.player-controls__right') ||
      controlsContainer.querySelector('.player-controls__right-control-group') ||
      controlsContainer.querySelector('[class*="right"]') ||
      controlsContainer.querySelector('[class*="controls-right"]')
    );
  }

  findVolumeSlider() {
    return (
      document.querySelector('[data-a-target="volume-slider"]') ||
      document.querySelector('.volume-slider__slider-container') ||
      document.querySelector('[class*="volume-slider"]')
    );
  }

  addButtonToRightControls(buttonElement, rightControls, controlsContainer) {
    if (rightControls) {
      const firstChild = rightControls.firstElementChild;
      if (firstChild) {
        rightControls.insertBefore(buttonElement, firstChild);
      } else {
        rightControls.appendChild(buttonElement);
      }
      buttonElement.style.display = 'inline-flex';
      buttonElement.style.verticalAlign = 'middle';
      return true;
    } else if (controlsContainer) {
      controlsContainer.appendChild(buttonElement);
      buttonElement.style.display = 'inline-flex';
      buttonElement.style.verticalAlign = 'middle';
      return true;
    }
    return false;
  }

  addButtonNearVolumeSlider(buttonElement, volumeSlider) {
    const parentContainer =
      volumeSlider.parentNode ||
      volumeSlider.closest('[class*="player-controls"]') ||
      volumeSlider.closest('[class*="volume"]');

    if (parentContainer) {
      parentContainer.insertBefore(buttonElement, volumeSlider.nextSibling);
      return true;
    }
    return false;
  }

  retryWithTimeout(operation, maxRetries = 10, interval = 500) {
    let retryCount = 0;

    const attempt = () => {
      if (retryCount >= maxRetries) {
        return false;
      }

      if (operation()) {
        return true;
      }

      retryCount++;
      setTimeout(attempt, interval);
      return false;
    };

    return attempt();
  }
}

export default new PlayerButtonManager();

import {PlatformTypes, SettingIds} from '../../constants.js';
import domObserver from '../../observers/dom.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import playerButtonManager from '../../utils/player-button-manager.js';

const HAS_COMPRESSOR = window.AudioContext && window.DynamicsCompressorNode != null;
const HAS_GAIN = HAS_COMPRESSOR && window.GainNode != null;

const COMPRESSOR_DEFAULTS = {
  threshold: -50,
  knee: 40,
  ratio: 12,
  attack: 0,
  release: 0.25,
};

class AudioCompressor {
  constructor() {
    this.isIconEnabled = settings.get(SettingIds.AUDIO_COMPRESSOR);
    this.isCompressorActive = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);
    this.videoElements = new WeakMap();
    this.initialized = false;

    console.log('BTTV: Audio compressor initialized with icon setting:', this.isIconEnabled);
    console.log('BTTV: Audio compressor state setting:', this.isCompressorActive);
    console.log('BTTV: Raw icon setting value:', settings.get(SettingIds.AUDIO_COMPRESSOR));
    console.log('BTTV: Raw state setting value:', settings.get(SettingIds.AUDIO_COMPRESSOR_STATE));

    // Ensure the settings have default values
    if (this.isIconEnabled === undefined || this.isIconEnabled === null) {
      console.log('BTTV: Setting default value for audio compressor icon');
      settings.set(SettingIds.AUDIO_COMPRESSOR, true);
      this.isIconEnabled = true;
    }

    if (this.isCompressorActive === undefined || this.isCompressorActive === null) {
      console.log('BTTV: Setting default value for audio compressor state');
      settings.set(SettingIds.AUDIO_COMPRESSOR_STATE, true);
      this.isCompressorActive = true;
    }

    settings.on(`changed.${SettingIds.AUDIO_COMPRESSOR}`, (value) => {
      console.log('BTTV: Audio compressor icon setting changed:', value);
      this.isIconEnabled = value;
      this.ensureCompressorIcon();
    });

    settings.on(`changed.${SettingIds.AUDIO_COMPRESSOR_STATE}`, (value) => {
      console.log('BTTV: Audio compressor state setting changed:', value);
      this.isCompressorActive = value;
      this.updateAllVideos();
      this.updateUI();
    });
  }

  getAudioSupport() {
    return {
      AudioContext: !!window.AudioContext,
      DynamicsCompressorNode: !!window.DynamicsCompressorNode,
      MediaElementAudioSourceNode: !!window.MediaElementAudioSourceNode,
      HAS_COMPRESSOR,
      HAS_GAIN,
    };
  }

  createCompressor(video) {
    if (!HAS_COMPRESSOR || !video) {
      console.log('BTTV: Cannot create compressor:', {
        HAS_COMPRESSOR,
        hasVideo: !!video,
      });
      return null;
    }

    if (video.readyState === 0) {
      console.log('BTTV: Video is not ready, will retry later:', {
        readyState: video.readyState,
        paused: video.paused,
        currentSrc: video.currentSrc,
      });

      // Retry after a delay if video is not ready
      setTimeout(() => {
        if (this.isCompressorActive && !this.videoElements.has(video)) {
          console.log('BTTV: Retrying compressor creation for video');
          this.createCompressor(video);
        }
      }, 1000);

      return null;
    }

    try {
      console.log('BTTV: Creating new AudioContext');
      const ctx = new AudioContext();

      if (ctx.state === 'suspended') {
        console.log('BTTV: AudioContext suspended, attempting to resume');
        ctx.resume().catch((err) => console.error('BTTV: Failed to resume AudioContext:', err));
      }

      console.log('BTTV: Creating audio nodes');
      const source = new MediaElementAudioSourceNode(ctx, {
        mediaElement: video,
      });

      const compressor = new DynamicsCompressorNode(ctx, {
        threshold: COMPRESSOR_DEFAULTS.threshold,
        knee: COMPRESSOR_DEFAULTS.knee,
        ratio: COMPRESSOR_DEFAULTS.ratio,
        attack: COMPRESSOR_DEFAULTS.attack,
        release: COMPRESSOR_DEFAULTS.release,
      });

      console.log('BTTV: Connecting audio nodes');
      source.connect(compressor);
      compressor.connect(ctx.destination);

      const compressorData = {
        context: ctx,
        source: source,
        compressor: compressor,
        isActive: false,
      };

      this.videoElements.set(video, compressorData);
      video._bttv_compressed = false;

      // Always start with compressor disabled, then activate if needed
      source.disconnect(compressor);
      source.connect(ctx.destination);

      if (this.isCompressorActive) {
        console.log('BTTV: Activating compressor after creation');
        source.disconnect(ctx.destination);
        source.connect(compressor);
        compressor.connect(ctx.destination);
        compressorData.isActive = true;
        video._bttv_compressed = true;
        console.log('BTTV: Compressor activated successfully');
      } else {
        console.log('BTTV: Compressor created but not activated');
      }

      return compressorData;
    } catch (err) {
      console.error('BTTV: Failed to create compressor:', err);
      return null;
    }
  }

  toggleCompressor(video) {
    console.log('BTTV: Toggling compressor for video:', video);
    if (!video || !HAS_COMPRESSOR) {
      console.log('BTTV: Cannot toggle compressor:', {
        hasVideo: !!video,
        HAS_COMPRESSOR,
      });
      return false;
    }

    const compressorData = this.videoElements.get(video);

    if (!compressorData) {
      console.log('BTTV: No existing compressor, creating new one');
      const result = this.createCompressor(video);
      if (!result) return false;

      // The compressor was created but not activated, so activate it
      const newCompressorData = this.videoElements.get(video);
      if (newCompressorData && !newCompressorData.isActive) {
        const {source, compressor, context} = newCompressorData;
        source.disconnect(context.destination);
        source.connect(compressor);
        compressor.connect(context.destination);
        newCompressorData.isActive = true;
        video._bttv_compressed = true;
        console.log('BTTV: Compressor activated after creation');
      }

      this.isCompressorActive = true;
      console.log('BTTV: Setting audio compressor state to true');
      settings.set(SettingIds.AUDIO_COMPRESSOR_STATE, true);
      return true;
    } else {
      console.log('BTTV: Existing compressor found, toggling state');
      const {source, compressor, context, isActive} = compressorData;

      if (isActive) {
        console.log('BTTV: Disabling compressor');
        source.disconnect(compressor);
        compressor.disconnect(context.destination);
        source.connect(context.destination);
        compressorData.isActive = false;
        video._bttv_compressed = false;
        this.isCompressorActive = false;
      } else {
        console.log('BTTV: Enabling compressor');
        source.disconnect(context.destination);
        source.connect(compressor);
        compressor.connect(context.destination);
        compressorData.isActive = true;
        video._bttv_compressed = true;
        this.isCompressorActive = true;
      }

      console.log('BTTV: Setting audio compressor state to:', this.isCompressorActive);
      settings.set(SettingIds.AUDIO_COMPRESSOR_STATE, this.isCompressorActive);
      return compressorData.isActive;
    }
  }

  addVideoListener(video) {
    if (!video || video._bttv_has_listener) return;

    video._bttv_has_listener = true;
    console.log('BTTV: Adding play event listener to video');

    video.addEventListener('play', () => {
      console.log('BTTV: Video play event, checking compressor state:', this.isCompressorActive);
      if (this.isCompressorActive && settings.get(SettingIds.AUDIO_COMPRESSOR_STATE)) {
        console.log('BTTV: Auto-enabling compressor on play');
        const compressorData = this.videoElements.get(video);
        if (compressorData && !compressorData.isActive) {
          const {source, compressor, context} = compressorData;
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
          console.log('BTTV: Compressor activated on play');
        } else if (!compressorData) {
          console.log('BTTV: Creating compressor on play');
          this.createCompressor(video);
        }
        this.updateUI();
      }
    });

    video.addEventListener('loadedmetadata', () => {
      console.log('BTTV: Video metadata loaded, checking compressor state:', this.isCompressorActive);
      if (this.isCompressorActive && settings.get(SettingIds.AUDIO_COMPRESSOR_STATE)) {
        console.log('BTTV: Auto-enabling compressor on metadata load');
        const compressorData = this.videoElements.get(video);
        if (compressorData && !compressorData.isActive) {
          const {source, compressor, context} = compressorData;
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
          console.log('BTTV: Compressor activated on metadata load');
        } else if (!compressorData) {
          console.log('BTTV: Creating compressor on metadata load');
          this.createCompressor(video);
        }
        this.updateUI();
      }
    });
  }

  updateUI() {
    const icon = document.querySelector('.bttv-compressor-icon');
    const tooltip = document.querySelector('.bttv-compressor-tooltip');

    if (icon && tooltip) {
      const isActive = this.isCompressorActive;
      icon.classList.toggle('off', !isActive);
      tooltip.textContent = `Audio Compressor: ${isActive ? 'On' : 'Off'}`;
      console.log('BTTV: Updated UI - compressor state:', isActive);
    }
  }

  updateAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      const compressorData = this.videoElements.get(video);
      if (compressorData) {
        const {source, compressor, context} = compressorData;

        if (this.isCompressorActive && !compressorData.isActive) {
          console.log('BTTV: Activating compressor for video');
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
        } else if (!this.isCompressorActive && compressorData.isActive) {
          console.log('BTTV: Deactivating compressor for video');
          source.disconnect(compressor);
          compressor.disconnect(context.destination);
          source.connect(context.destination);
          compressorData.isActive = false;
          video._bttv_compressed = false;
        }
      }
    });

    // Update UI after changing all videos
    setTimeout(() => {
      this.updateUI();
    }, 50);
  }

  addCompressorIcon() {
    if (!settings.get(SettingIds.AUDIO_COMPRESSOR)) {
      console.log('BTTV: Audio compressor icon setting is disabled, not adding icon');
      return false;
    }

    // Check if button already exists
    if (document.querySelector('.bttv-compressor-container')) {
      return false;
    }

    const volumeSlider = playerButtonManager.findVolumeSlider();
    if (!volumeSlider) {
      return false;
    }

    console.log('BTTV: Creating compressor button');

    const iconContainer = document.createElement('div');
    iconContainer.className = 'bttv-compressor-container';

    const button = document.createElement('button');
    button.className = 'bttv-compressor-icon';
    button.setAttribute('aria-label', 'Audio Compressor');
    if (!this.isCompressorActive) {
      button.classList.add('off');
    }
    console.log('BTTV: Created compressor button with state:', this.isCompressorActive);

    // SVG icon for compressor
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
      </svg>
    `;

    const tooltip = document.createElement('div');
    tooltip.className = 'bttv-compressor-tooltip';
    tooltip.textContent = `Audio Compressor: ${this.isCompressorActive ? 'On' : 'Off'}`;

    iconContainer.appendChild(button);
    iconContainer.appendChild(tooltip);

    button.addEventListener('click', () => {
      const video =
        document.querySelector('.video-player__container video') ||
        document.querySelector('.video-ref video') ||
        document.querySelector('video');

      console.log('BTTV: Video element found:', video);

      if (!video) {
        console.error('BTTV: Video element not found');
        return;
      }

      try {
        const isCompressed = this.toggleCompressor(video);
        console.log('BTTV: Compressor toggled:', isCompressed);

        // Update UI after a short delay to ensure state is synced
        setTimeout(() => {
          this.updateUI();
        }, 50);
      } catch (err) {
        console.error('BTTV: Error toggling compressor:', err);
      }
    });

    return playerButtonManager.addButtonNearVolumeSlider(iconContainer, volumeSlider);
  }

  ensureCompressorIcon() {
    const existingContainer = document.querySelector('.bttv-compressor-container');
    const iconSettingValue = settings.get(SettingIds.AUDIO_COMPRESSOR);

    console.log(
      'BTTV: ensureCompressorIcon - icon setting value:',
      iconSettingValue,
      'existing container:',
      !!existingContainer
    );

    if (iconSettingValue) {
      if (!existingContainer) {
        const hasPlayer =
          document.querySelector('#channel-player') ||
          document.querySelector('[data-a-target="player"]') ||
          document.querySelector('[class*="video-player"]') ||
          document.querySelector('.persistent-player');

        if (hasPlayer) {
          this.addCompressorIcon();
          // Update UI after adding icon
          setTimeout(() => {
            this.updateUI();
          }, 100);
        }
      }
    } else {
      if (existingContainer) {
        console.log('BTTV: Removing compressor button due to disabled icon setting');
        existingContainer.remove();
      }
    }
  }

  initialize() {
    if (this.initialized) return;

    console.log('BTTV: Audio API Support:', this.getAudioSupport());
    console.log('BTTV: Current audio compressor icon setting:', settings.get(SettingIds.AUDIO_COMPRESSOR));
    console.log('BTTV: Current audio compressor state setting:', settings.get(SettingIds.AUDIO_COMPRESSOR_STATE));
    console.log('BTTV: Internal compressor state:', this.isCompressorActive);

    // Register button with player button manager
    playerButtonManager.registerButton('audio-compressor', {
      shouldAdd: () =>
        settings.get(SettingIds.AUDIO_COMPRESSOR) && !document.querySelector('.bttv-compressor-container'),
      add: () => this.addCompressorIcon(),
    });

    domObserver.on('video', (video) => {
      this.addVideoListener(video);

      if (this.isCompressorActive && settings.get(SettingIds.AUDIO_COMPRESSOR_STATE)) {
        console.log('BTTV: Restoring compressor state for new video');
        this.createCompressor(video);
        // Update UI after a delay to ensure everything is set up
        setTimeout(() => {
          this.updateUI();
        }, 100);
      }
    });

    // Check for existing videos on initialization
    const existingVideos = document.querySelectorAll('video');
    existingVideos.forEach((video) => {
      this.addVideoListener(video);

      if (this.isCompressorActive && settings.get(SettingIds.AUDIO_COMPRESSOR_STATE)) {
        console.log('BTTV: Restoring compressor state for existing video');
        this.createCompressor(video);
      }
    });

    this.addCompressorIcon();

    // Update UI after initialization to ensure correct state
    setTimeout(() => {
      this.updateUI();
    }, 200);

    // Additional check for videos after a longer delay
    setTimeout(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        if (!this.videoElements.has(video) && this.isCompressorActive) {
          console.log('BTTV: Late initialization - creating compressor for video');
          this.createCompressor(video);
        }
      });
      this.updateUI();
    }, 1000);

    this.initialized = true;
  }

  getState() {
    return this.isCompressorActive;
  }
}

export default loadModuleForPlatforms([
  PlatformTypes.TWITCH,
  () => {
    const audioCompressor = new AudioCompressor();
    audioCompressor.initialize();
    return audioCompressor;
  },
]);

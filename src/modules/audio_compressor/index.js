import { PlatformTypes, SettingIds } from '../../constants.js';
import domObserver from '../../observers/dom.js';
import settings from '../../settings.js';
import { loadModuleForPlatforms } from '../../utils/modules.js';
import playerButtonManager from '../../utils/player-button-manager.js';
import watcher from '../../watcher.js';

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
    this.isLoading = false;
    this.lastPageType = null;
    this.audioContextState = 'unknown';
    this.userInteractionRequired = false;

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

  isClipPage() {
    return window.location.hostname === 'clips.twitch.tv' || window.location.pathname.includes('/clip/');
  }

  getPageType() {
    if (this.isClipPage()) {
      return 'clip';
    } else if (window.location.hostname === 'www.twitch.tv' || window.location.hostname === 'twitch.tv') {
      return 'stream';
    }
    return 'other';
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

  async checkAudioContextState() {
    if (!HAS_COMPRESSOR) {
      this.audioContextState = 'unsupported';
      return;
    }

    try {
      const testContext = new AudioContext();
      this.audioContextState = testContext.state;

      if (testContext.state === 'suspended') {
        this.userInteractionRequired = true;
        console.log('BTTV: AudioContext is suspended, user interaction required');
      } else {
        this.userInteractionRequired = false;
        console.log('BTTV: AudioContext is ready:', testContext.state);
      }

      await testContext.close();
    } catch (err) {
      console.error('BTTV: Error checking AudioContext state:', err);
      this.audioContextState = 'error';
      this.userInteractionRequired = true;
    }
  }

  isAudioPlaying(video) {
    if (!video) return false;

    return (
      !video.paused &&
      !video.ended &&
      video.currentTime > 0 &&
      video.volume > 0 &&
      !video.muted &&
      video.readyState >= 2
    );
  }

  hasUserInteractedWithAudio() {
    const videos = document.querySelectorAll('video');
    return Array.from(videos).some((video) => this.isAudioPlaying(video));
  }

  async createCompressor(video) {
    if (this.isClipPage()) {
      console.log('BTTV: Compressor not available on clips due to CORS.');
      return null;
    }
    if (!HAS_COMPRESSOR || !video) {
      console.log('BTTV: Cannot create compressor:', {
        HAS_COMPRESSOR,
        hasVideo: !!video,
      });
      return null;
    }

    if (this.userInteractionRequired && !this.hasUserInteractedWithAudio()) {
      console.log(
        'BTTV: User interaction required for AudioContext and no audio playing, deferring compressor creation'
      );
      return null;
    }

    if (this.userInteractionRequired && this.hasUserInteractedWithAudio()) {
      console.log('BTTV: User interaction required but audio is playing, attempting to create compressor');
    }

    this.isLoading = true;
    this.updateUI();

    if (video.readyState === 0) {
      console.log('BTTV: Video is not ready, will retry later:', {
        readyState: video.readyState,
        paused: video.paused,
        currentSrc: video.currentSrc,
      });

      // Retry after a delay if video is not ready
      setTimeout(async () => {
        if (
          (this.isCompressorActive || settings.get(SettingIds.AUDIO_COMPRESSOR_STATE)) &&
          !this.videoElements.has(video)
        ) {
          console.log('BTTV: Retrying compressor creation for video');
          await this.createCompressor(video);
        }
      }, 1000);

      this.isLoading = false;
      this.updateUI();
      return null;
    }

    if (video.paused || video.ended || video.currentTime === 0) {
      console.log('BTTV: Video is not playing, deferring compressor creation:', {
        paused: video.paused,
        ended: video.ended,
        currentTime: video.currentTime,
      });
      this.isLoading = false;
      this.updateUI();
      return null;
    }

    try {
      console.log('BTTV: Creating new AudioContext');
      const ctx = new AudioContext();

      // Try to resume AudioContext if it's suspended and audio is playing
      if (ctx.state === 'suspended' && this.hasUserInteractedWithAudio()) {
        console.log('BTTV: Attempting to resume suspended AudioContext');
        try {
          await ctx.resume();
          console.log('BTTV: AudioContext resumed successfully, state:', ctx.state);
        } catch (resumeErr) {
          console.warn('BTTV: Failed to resume AudioContext:', resumeErr);
        }
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

      const compressorData = {
        context: ctx,
        source: source,
        compressor: compressor,
        isActive: false,
      };

      this.videoElements.set(video, compressorData);
      video._bttv_compressed = false;

      // Always start with compressor disabled, then activate if needed
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

      this.isLoading = false;
      this.updateUI();
      return compressorData;
    } catch (err) {
      console.error('BTTV: Failed to create compressor:', err);
      this.isLoading = false;
      this.updateUI();
      return null;
    }
  }

  async toggleCompressor(video) {
    if (this.isClipPage()) {
      console.log('BTTV: Compressor cannot be toggled on clips due to CORS.');
      return false;
    }
    console.log('BTTV: Toggling compressor for video:', video);
    if (!video || !HAS_COMPRESSOR) {
      console.log('BTTV: Cannot toggle compressor:', {
        hasVideo: !!video,
        HAS_COMPRESSOR,
      });
      return false;
    }

    if (this.isLoading) {
      console.log('BTTV: Compressor is currently loading, cannot toggle');
      return false;
    }

    const compressorData = this.videoElements.get(video);

    if (!compressorData) {
      console.log('BTTV: No existing compressor, creating new one');

      if (video.paused || video.ended || video.currentTime === 0) {
        console.log('BTTV: Video is not playing, cannot create compressor:', {
          paused: video.paused,
          ended: video.ended,
          currentTime: video.currentTime,
        });
        return false;
      }

      const result = await this.createCompressor(video);
      if (!result) return false;

      const newCompressorData = this.videoElements.get(video);
      if (newCompressorData && newCompressorData.context.state === 'suspended') {
        console.log('BTTV: AudioContext suspended, resuming after user interaction');
        newCompressorData.context
          .resume()
          .then(() => {
            console.log('BTTV: AudioContext resumed successfully');
          })
          .catch((err) => {
            console.error('BTTV: Failed to resume AudioContext:', err);
          });
      }

      if (newCompressorData && !newCompressorData.isActive) {
        const { source, compressor, context } = newCompressorData;
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
      const { source, compressor, context, isActive } = compressorData;

      if (context.state === 'suspended') {
        console.log('BTTV: AudioContext suspended, resuming after user interaction');
        context
          .resume()
          .then(() => {
            console.log('BTTV: AudioContext resumed successfully');
          })
          .catch((err) => {
            console.error('BTTV: Failed to resume AudioContext:', err);
          });
      }

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

    video.addEventListener('play', async () => {
      console.log('BTTV: Video play event, checking compressor state:', this.isCompressorActive);

      // Ensure compressor icon exists when video plays (in case of stream restart)
      this.ensureCompressorIcon();

      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting) {
        console.log('BTTV: Auto-enabling compressor on play');
        const compressorData = this.videoElements.get(video);
        if (compressorData && !compressorData.isActive) {
          const { source, compressor, context } = compressorData;
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
          console.log('BTTV: Compressor activated on play');
        } else if (!compressorData) {
          console.log('BTTV: Attempting to create compressor on play');
          await this.createCompressor(video);
        }
        this.updateUI();
      } else if (compressorStateSetting && !this.isCompressorActive) {
        console.log('BTTV: Restoring compressor state from settings on play');
        this.isCompressorActive = true;
        await this.createCompressor(video);
        this.updateUI();
      }
    });

    video.addEventListener('playing', async () => {
      console.log('BTTV: Video playing event, checking compressor state');
      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting) {
        const compressorData = this.videoElements.get(video);
        if (!compressorData) {
          console.log('BTTV: Attempting to create compressor on playing');
          await this.createCompressor(video);
        }
      } else if (compressorStateSetting && !this.isCompressorActive) {
        console.log('BTTV: Restoring compressor state from settings on playing');
        this.isCompressorActive = true;
        await this.createCompressor(video);
      }
    });

    video.addEventListener('loadedmetadata', async () => {
      console.log('BTTV: Video metadata loaded, checking compressor state:', this.isCompressorActive);
      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting) {
        console.log('BTTV: Auto-enabling compressor on metadata load');
        const compressorData = this.videoElements.get(video);
        if (compressorData && !compressorData.isActive) {
          const { source, compressor, context } = compressorData;
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
          console.log('BTTV: Compressor activated on metadata load');
        } else if (!compressorData) {
          console.log('BTTV: Attempting to create compressor on metadata load');
          await this.createCompressor(video);
        }
        this.updateUI();
      } else if (compressorStateSetting && !this.isCompressorActive) {
        console.log('BTTV: Restoring compressor state from settings on metadata load');
        this.isCompressorActive = true;
        await this.createCompressor(video);
        this.updateUI();
      }
    });

    video.addEventListener('canplay', async () => {
      console.log('BTTV: Video can play, checking compressor state:', this.isCompressorActive);
      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting) {
        console.log('BTTV: Auto-enabling compressor on canplay');
        const compressorData = this.videoElements.get(video);
        if (compressorData && !compressorData.isActive) {
          const { source, compressor, context } = compressorData;
          source.disconnect(context.destination);
          source.connect(compressor);
          compressor.connect(context.destination);
          compressorData.isActive = true;
          video._bttv_compressed = true;
          console.log('BTTV: Compressor activated on canplay');
        } else if (!compressorData) {
          console.log('BTTV: Attempting to create compressor on canplay');
          await this.createCompressor(video);
        }
        this.updateUI();
      } else if (compressorStateSetting && !this.isCompressorActive) {
        console.log('BTTV: Restoring compressor state from settings on canplay');
        this.isCompressorActive = true;
        await this.createCompressor(video);
        this.updateUI();
      }
    });
  }

  updateUI() {
    const icon = document.querySelector('.bttv-compressor-icon');
    const tooltip = document.querySelector('.bttv-compressor-tooltip');

    if (icon && tooltip) {
      const videos = document.querySelectorAll('video');
      const hasPlayingVideo = Array.from(videos).some((video) => this.isAudioPlaying(video));

      if (this.isClipPage()) {
        icon.classList.add('off');
        icon.classList.remove('loading');
        icon.setAttribute('disabled', 'disabled');
        tooltip.textContent = 'Audio Compressor unavailable in clips due to CORS.';
        return;
      }

      if (this.isLoading) {
        icon.classList.add('loading');
        icon.classList.remove('off');
        icon.setAttribute('disabled', 'disabled');
        tooltip.textContent = 'Audio Compressor: Starting...';
        return;
      }

      let hasActiveCompressor = false;

      videos.forEach((video) => {
        const compressorData = this.videoElements.get(video);
        if (compressorData && compressorData.isActive) {
          hasActiveCompressor = true;
        }
      });

      if (this.isCompressorActive && hasPlayingVideo && !hasActiveCompressor) {
        if (this.userInteractionRequired && !this.hasUserInteractedWithAudio()) {
          icon.classList.add('off');
          icon.classList.remove('loading');
          icon.removeAttribute('disabled');
          tooltip.textContent = 'Audio Compressor: Click to activate (requires user interaction)';
        } else if (this.userInteractionRequired && this.hasUserInteractedWithAudio()) {
          icon.classList.add('loading');
          icon.classList.remove('off');
          icon.setAttribute('disabled', 'disabled');
          tooltip.textContent = 'Audio Compressor: Starting... (Firefox mode)';
        } else {
          icon.classList.add('loading');
          icon.classList.remove('off');
          icon.setAttribute('disabled', 'disabled');
          tooltip.textContent = 'Audio Compressor: Starting...';
        }
        return;
      }

      if (this.isCompressorActive && !hasActiveCompressor && hasPlayingVideo) {
        console.log(
          'BTTV: UI showed compressor as active but no active compressor found on playing video, correcting state'
        );
        this.isCompressorActive = false;
        settings.set(SettingIds.AUDIO_COMPRESSOR_STATE, false);
      } else if (this.isCompressorActive && !hasActiveCompressor && !hasPlayingVideo) {
        console.log('BTTV: No playing videos, keeping compressor state as active for when video starts');
      }

      const isActive = this.isCompressorActive;
      icon.classList.remove('loading');
      icon.classList.toggle('off', !isActive);
      icon.removeAttribute('disabled');
      tooltip.textContent = `Audio Compressor: ${isActive ? 'On' : 'Off'}`;
      console.log(
        'BTTV: Updated UI - compressor state:',
        isActive,
        'real state:',
        hasActiveCompressor,
        'page type:',
        this.getPageType()
      );
    }
  }

  updateAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      const compressorData = this.videoElements.get(video);
      if (compressorData) {
        const { source, compressor, context } = compressorData;

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
    if (this.isClipPage()) {
      button.classList.add('off');
      button.setAttribute('disabled', 'disabled');
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
    if (this.isClipPage()) {
      tooltip.textContent = 'Audio Compressor unavailable in clips due to CORS.';
    } else {
      tooltip.textContent = `Audio Compressor: ${this.isCompressorActive ? 'On' : 'Off'}`;
    }

    iconContainer.appendChild(button);
    iconContainer.appendChild(tooltip);

    button.addEventListener('click', async () => {
      if (this.isClipPage() || this.isLoading) {
        return;
      }

      await this.checkAudioContextState();

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
        // In Firefox, if AudioContext is suspended but audio is playing,
        // we need to force resume the context
        if (this.userInteractionRequired && this.hasUserInteractedWithAudio()) {
          console.log('BTTV: Firefox mode - audio is playing but AudioContext suspended, attempting to resume');
          const testContext = new AudioContext();
          if (testContext.state === 'suspended') {
            try {
              await testContext.resume();
              console.log('BTTV: AudioContext resumed successfully in Firefox');
            } catch (resumeErr) {
              console.warn('BTTV: Failed to resume AudioContext in Firefox:', resumeErr);
            }
          }
          await testContext.close();
        }

        const isCompressed = await this.toggleCompressor(video);
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
          const added = this.addCompressorIcon();
          if (added) {
            // Update UI after adding icon
            setTimeout(() => {
              this.updateUI();
            }, 100);
          } else {
            console.log('BTTV: Volume slider not ready, retrying compressor button addition in 200ms');
            setTimeout(() => {
              if (!document.querySelector('.bttv-compressor-container')) {
                const retryAdded = this.addCompressorIcon();
                if (retryAdded) {
                  setTimeout(() => this.updateUI(), 100);
                } else {
                  console.log('BTTV: Volume slider still not ready, retrying in 500ms');
                  setTimeout(() => {
                    if (!document.querySelector('.bttv-compressor-container')) {
                      const finalAdded = this.addCompressorIcon();
                      if (finalAdded) {
                        setTimeout(() => this.updateUI(), 100);
                      }
                    }
                  }, 500);
                }
              }
            }, 200);
          }
        }
      } else {
        this.updateUI();
      }
    } else {
      if (existingContainer) {
        console.log('BTTV: Removing compressor button due to disabled icon setting');
        existingContainer.remove();
      }
    }
  }

  async initialize() {
    if (this.initialized) return;

    console.log('BTTV: Audio API Support:', this.getAudioSupport());
    console.log('BTTV: Current audio compressor icon setting:', settings.get(SettingIds.AUDIO_COMPRESSOR));
    console.log('BTTV: Current audio compressor state setting:', settings.get(SettingIds.AUDIO_COMPRESSOR_STATE));
    console.log('BTTV: Internal compressor state:', this.isCompressorActive);

    this.lastPageType = this.getPageType();
    console.log('BTTV: Current page type:', this.lastPageType);

    await this.checkAudioContextState();

    // Register button with player button manager
    playerButtonManager.registerButton('audio-compressor', {
      shouldAdd: () =>
        settings.get(SettingIds.AUDIO_COMPRESSOR) && !document.querySelector('.bttv-compressor-container'),
      add: () => this.addCompressorIcon(),
    });

    watcher.on('load.player', () => {
      this.ensureCompressorIcon();
    });

    domObserver.on('.volume-slider', () => {
      console.log('BTTV: Volume slider detected, ensuring compressor icon');
      setTimeout(() => {
        this.ensureCompressorIcon();
      }, 100);
    });

    domObserver.on('video', (video) => {
      this.addVideoListener(video);

      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting && this.isAudioPlaying(video)) {
        console.log('BTTV: Attempting to create compressor for new playing video');
        this.createCompressor(video).then(() => {
          setTimeout(() => {
            this.updateUI();
          }, 100);
        });
      } else if (compressorStateSetting && !this.isCompressorActive && this.isAudioPlaying(video)) {
        console.log('BTTV: Restoring compressor state from settings for new playing video');
        this.isCompressorActive = true;
        this.createCompressor(video);
      }
    });

    // Check for existing videos on initialization
    const existingVideos = document.querySelectorAll('video');
    existingVideos.forEach((video) => {
      this.addVideoListener(video);

      const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

      if (this.isCompressorActive && compressorStateSetting && this.isAudioPlaying(video)) {
        console.log('BTTV: Attempting to create compressor for existing playing video');
        this.createCompressor(video);
      } else if (compressorStateSetting && !this.isCompressorActive && this.isAudioPlaying(video)) {
        console.log('BTTV: Restoring compressor state from settings for existing playing video');
        this.isCompressorActive = true;
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
        const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);

        if (
          !this.videoElements.has(video) &&
          this.isCompressorActive &&
          compressorStateSetting &&
          this.isAudioPlaying(video)
        ) {
          console.log('BTTV: Late initialization - attempting to create compressor');
          this.createCompressor(video);
        } else if (
          !this.videoElements.has(video) &&
          !this.isCompressorActive &&
          compressorStateSetting &&
          this.isAudioPlaying(video)
        ) {
          console.log('BTTV: Late initialization - restoring compressor state from settings');
          this.isCompressorActive = true;
          this.createCompressor(video);
        }
      });
      this.updateUI();
    }, 1000);

    setInterval(() => {
      if (!this.isLoading) {
        this.checkAndFixState();
      }
    }, 5000);

    setInterval(async () => {
      await this.checkAudioContextState();
    }, 10000);

    setInterval(() => {
      this.checkPageTransition();
    }, 2000);

    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.checkPageTransition();
      }, 100);
    });

    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          this.checkPageTransition();
        }, 100);
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.initialized = true;
  }

  getState() {
    return this.isCompressorActive;
  }

  checkAndFixState() {
    const videos = document.querySelectorAll('video');
    let hasActiveCompressor = false;

    videos.forEach((video) => {
      const compressorData = this.videoElements.get(video);
      if (compressorData && compressorData.isActive) {
        hasActiveCompressor = true;
      }
    });

    const hasPlayingVideo = Array.from(videos).some((video) => this.isAudioPlaying(video));

    if (this.isCompressorActive !== hasActiveCompressor) {
      if (hasPlayingVideo) {
        console.log('BTTV: State mismatch detected on playing video, fixing:', {
          expected: this.isCompressorActive,
          actual: hasActiveCompressor,
        });
        this.isCompressorActive = hasActiveCompressor;
        settings.set(SettingIds.AUDIO_COMPRESSOR_STATE, hasActiveCompressor);
        this.updateUI();
        return true;
      } else {
        console.log('BTTV: State mismatch detected but no playing video, keeping state for when video starts');
      }
    }
    return false;
  }

  scheduleCompressorCreation(video, reason = 'unknown') {
    if (this.isLoading) {
      console.log(`BTTV: Scheduling compressor creation for ${reason} - currently loading`);
      setTimeout(() => {
        const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);
        if (
          this.isCompressorActive &&
          compressorStateSetting &&
          this.isAudioPlaying(video) &&
          !this.videoElements.has(video)
        ) {
          console.log(`BTTV: Retrying compressor creation for ${reason} after loading`);
          this.createCompressor(video);
        } else if (
          !this.isCompressorActive &&
          compressorStateSetting &&
          this.isAudioPlaying(video) &&
          !this.videoElements.has(video)
        ) {
          console.log(`BTTV: Retrying compressor restoration for ${reason} after loading`);
          this.isCompressorActive = true;
          this.createCompressor(video);
        }
      }, 2000);
      return false;
    }
    return true;
  }

  checkPageTransition() {
    const currentPageType = this.getPageType();

    if (this.lastPageType !== currentPageType) {
      console.log('BTTV: Page transition detected:', {
        from: this.lastPageType,
        to: currentPageType,
      });

      if (currentPageType === 'clip') {
        console.log('BTTV: Transitioning to clips page, compressor will be disabled due to CORS');
      }

      if (this.lastPageType === 'clip' && currentPageType === 'stream') {
        const compressorStateSetting = settings.get(SettingIds.AUDIO_COMPRESSOR_STATE);
        if (compressorStateSetting && !this.isCompressorActive) {
          console.log('BTTV: Restoring compressor state after transition from clips to stream');
          this.isCompressorActive = true;
          this.updateUI();

          setTimeout(() => {
            const videos = document.querySelectorAll('video');
            videos.forEach((video) => {
              if (this.isAudioPlaying(video) && !this.videoElements.has(video)) {
                console.log('BTTV: Attempting to create compressor after page transition');
                this.createCompressor(video);
              }
            });
          }, 500);
        }
      }

      this.lastPageType = currentPageType;
    }
  }
}

export default loadModuleForPlatforms([
  PlatformTypes.TWITCH,
  async () => {
    const audioCompressor = new AudioCompressor();
    await audioCompressor.initialize();
    return audioCompressor;
  },
]);

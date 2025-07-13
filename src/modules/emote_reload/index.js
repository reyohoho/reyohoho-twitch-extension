import React from 'react';
import {createRoot} from 'react-dom/client';
import formatMessage from '../../i18n/index.js';
import domObserver from '../../observers/dom.js';
import watcher from '../../watcher.js';
import globalEmotes from '../emotes/global-emotes.js';
import channelEmotes from '../emotes/channel-emotes.js';
import personalEmotes from '../emotes/personal-emotes.js';
import seventvGlobalEmotes from '../seventv/global-emotes.js';
import seventvChannelEmotes from '../seventv/channel-emotes.js';
import frankerfacezGlobalEmotes from '../frankerfacez/global-emotes.js';
import frankerfacezChannelEmotes from '../frankerfacez/channel-emotes.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import {PlatformTypes} from '../../constants.js';
import {initializeProxyCheck} from '../../utils/proxy.js';
import './style.css';

const CHAT_SETTINGS_BUTTON_CONTAINER_SELECTOR = '.chat-input div[data-test-selector="chat-input-buttons-container"]';
const EMOTE_RELOAD_BUTTON_CONTAINER_ID = 'bttv-emote-reload-button-container';
const EMOTE_RELOAD_BUTTON_ID = 'bttv-emote-reload-button';

let mountedRoot;
let isReloading = false;
let reloadTimeout = null;

function EmoteReloadButton() {
  const [reloading, setReloading] = React.useState(false);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isReloading || reloading) {
      console.log('[BTTV] Emote reload already in progress, ignoring click');
      return;
    }

    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
    }

    console.log('[BTTV] Starting emote reload...');
    isReloading = true;
    setReloading(true);

    reloadTimeout = setTimeout(async () => {
      try {
        await reloadAllEmotes();
        console.log('[BTTV] Emote reload completed successfully');
      } catch (error) {
        console.error('[BTTV] Error during emote reload:', error);
      }

      isReloading = false;
      setReloading(false);
      reloadTimeout = null;
    }, 100);
  };

  return (
    <button
      id={EMOTE_RELOAD_BUTTON_ID}
      className="bttv-emote-reload-button"
      onClick={handleClick}
      disabled={reloading}
      aria-label={formatMessage({defaultMessage: 'Reload Emotes'})}
      title={formatMessage({defaultMessage: 'Reload Emotes'})}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path fill="currentColor" d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2zm0 2v3l3-3-3-3v3z" />
      </svg>
    </button>
  );
}

async function reloadAllEmotes() {
  try {
    console.log('[BTTV] Reloading all emotes...');

    try {
      console.log('[BTTV] Checking proxy availability...');
      await initializeProxyCheck(true);
      console.log('[BTTV] Proxy check completed');
    } catch (proxyError) {
      console.error('[BTTV] Error during proxy check:', proxyError);
    }

    await Promise.all([
      globalEmotes.updateGlobalEmotes(),
      reloadChannelEmotes(),
      reloadPersonalEmotes(),
      reloadSevenTVEmotes(),
      reloadFFZEmotes(),
    ]);
    console.log('[BTTV] All emotes reloaded successfully');
  } catch (error) {
    console.error('[BTTV] Error reloading emotes:', error);
  }
}

async function reloadChannelEmotes() {
  try {
    console.log('[BTTV] Reloading channel emotes...');
    watcher.emit('channel.updated');
  } catch (error) {
    console.error('[BTTV] Error reloading channel emotes:', error);
  }
}

async function reloadPersonalEmotes() {
  try {
    console.log('[BTTV] Reloading personal emotes...');
    personalEmotes.broadcastMe();
  } catch (error) {
    console.error('[BTTV] Error reloading personal emotes:', error);
  }
}

async function reloadSevenTVEmotes() {
  try {
    console.log('[BTTV] Reloading 7TV emotes...');
    if (seventvGlobalEmotes.updateGlobalEmotes) {
      await seventvGlobalEmotes.updateGlobalEmotes();
    }
    if (seventvChannelEmotes.updateChannelEmotes) {
      await seventvChannelEmotes.updateChannelEmotes();
    }
  } catch (error) {
    console.error('[BTTV] Error reloading 7TV emotes:', error);
  }
}

async function reloadFFZEmotes() {
  try {
    console.log('[BTTV] Reloading FFZ emotes...');
    if (frankerfacezGlobalEmotes.updateGlobalEmotes) {
      await frankerfacezGlobalEmotes.updateGlobalEmotes();
    }
    if (frankerfacezChannelEmotes.updateChannelEmotes) {
      await frankerfacezChannelEmotes.updateChannelEmotes();
    }
  } catch (error) {
    console.error('[BTTV] Error reloading FFZ emotes:', error);
  }
}

function loadButton() {
  const container = document.getElementById(EMOTE_RELOAD_BUTTON_CONTAINER_ID);
  if (container != null) {
    console.log('[BTTV] Emote reload button already exists, skipping');
    return;
  }

  const chatInputButtonsContainer = document.querySelector(CHAT_SETTINGS_BUTTON_CONTAINER_SELECTOR);
  if (chatInputButtonsContainer == null) {
    console.log('[BTTV] Chat input buttons container not found');
    return;
  }

  const chatSettingsButton = chatInputButtonsContainer.querySelector('button[data-a-target="chat-settings"]');
  if (chatSettingsButton == null) {
    console.log('[BTTV] Chat settings button not found');
    return;
  }

  const rightContainer = chatInputButtonsContainer.lastChild;
  if (rightContainer == null) {
    console.log('[BTTV] Right container not found');
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.setAttribute('id', EMOTE_RELOAD_BUTTON_CONTAINER_ID);
  buttonContainer.classList.add('bttv-emote-reload-container');

  rightContainer.insertBefore(buttonContainer, rightContainer.lastChild);

  if (mountedRoot != null) {
    mountedRoot.unmount();
  }

  mountedRoot = createRoot(buttonContainer);
  mountedRoot.render(<EmoteReloadButton />);
  console.log('[BTTV] Emote reload button successfully loaded');
}

function unloadButton() {
  const container = document.getElementById(EMOTE_RELOAD_BUTTON_CONTAINER_ID);
  if (container != null) {
    container.remove();
  }
  if (mountedRoot != null) {
    mountedRoot.unmount();
  }
}

class EmoteReloadModule {
  constructor() {
    domObserver.on(CHAT_SETTINGS_BUTTON_CONTAINER_SELECTOR, (node, isConnected) => {
      if (!isConnected) {
        return;
      }

      setTimeout(() => {
        loadButton();
      }, 100);
    });

    watcher.on('load.chat', () => {
      setTimeout(() => {
        loadButton();
      }, 100);
    });
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new EmoteReloadModule()]);

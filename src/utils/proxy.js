import settings from '../settings.js';
import {SettingIds} from '../constants.js';

let proxyCheckPromise = null;
let proxyAvailable = true;

export async function checkProxyAvailability(proxyUrl) {
  if (!proxyUrl) return false;

  try {
    const testUrl = `${proxyUrl}https://google.com`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function initializeProxyCheck(force = false) {
  if (proxyCheckPromise && !force) return proxyCheckPromise;

  if (force) {
    proxyCheckPromise = null;
  }

  proxyCheckPromise = (async () => {
    if (!settings.get(SettingIds.PROXY_ENABLED)) {
      proxyAvailable = false;
      return;
    }

    const proxyUrl = settings.get(SettingIds.PROXY_URL);
    if (!proxyUrl) {
      proxyAvailable = false;
      return;
    }

    proxyAvailable = await checkProxyAvailability(proxyUrl);

    if (!proxyAvailable) {
      try {
        const {default: sendChatMessage} = await import('./send-chat-message.js');
        const {default: formatMessage} = await import('../i18n/index.js');

        sendChatMessage(
          formatMessage({
            defaultMessage: 'Proxy is not available. Emotes may not load properly.',
            id: 'proxyUnavailable',
          })
        );
      } catch (error) {
        console.warn('BTTV: Failed to send proxy availability message:', error);
      }
    }
  })();

  return proxyCheckPromise;
}

export function getProxyUrl() {
  if (!settings.get(SettingIds.PROXY_ENABLED)) {
    return '';
  }

  if (!proxyAvailable) {
    return '';
  }

  const proxyUrl = settings.get(SettingIds.PROXY_URL);
  return proxyUrl || '';
}

export function getDefaultProxyUrl() {
  return 'https://starege.rhhhhhhh.live/';
}

export function resetProxyUrl() {
  settings.set(SettingIds.PROXY_URL, getDefaultProxyUrl());
  proxyAvailable = true;
  proxyCheckPromise = null;
}

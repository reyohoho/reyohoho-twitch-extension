import settings from '../settings.js';
import {SettingIds} from '../constants.js';
import {initializeStaregeDomain, getStaregeDomain} from './starege-domain.js';

const CDN_DOMAIN = 'https://cdn.rhhhhhhh.live';

let proxyCheckPromise = null;
let proxyAvailable = false;
let cdnCheckPromise = null;
let cdnAvailable = false;

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

    const domain = await initializeStaregeDomain(force);
    proxyAvailable = !!domain;

    if (!proxyAvailable) {
      setTimeout(async () => {
        try {
          const {default: sendChatMessage} = await import('./send-chat-message.js');
          const {default: formatMessage} = await import('../i18n/index.js');

          sendChatMessage(
            formatMessage({
              defaultMessage: 'Proxy is not available. Emotes and internal API may not load properly.',
              id: 'proxyUnavailable',
            })
          );
        } catch (error) {
          console.warn('BTTV: Failed to send proxy availability message:', error);
        }
      }, 3000);
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

  const domain = getStaregeDomain();
  return domain ? `${domain}/` : '';
}

async function checkCdnAvailability() {
  try {
    const testUrl = `${CDN_DOMAIN}/https://google.com`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

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

export async function initializeCdnCheck(force = false) {
  if (cdnCheckPromise && !force) return cdnCheckPromise;

  if (force) {
    cdnCheckPromise = null;
    cdnAvailable = false;
  }

  cdnCheckPromise = (async () => {
    if (!settings.get(SettingIds.PROXY_ENABLED)) {
      cdnAvailable = false;
      return false;
    }

    const isAvailable = await checkCdnAvailability();
    cdnAvailable = isAvailable;

    if (cdnAvailable) {
      console.log(`BTTV: CDN is available: ${CDN_DOMAIN}`);
    } else {
      console.warn('BTTV: CDN is unavailable');
    }

    return cdnAvailable;
  })();

  return cdnCheckPromise;
}

export function getCdnUrl() {
  if (!settings.get(SettingIds.PROXY_ENABLED)) {
    return '';
  }

  if (!cdnAvailable) {
    return '';
  }

  return `${CDN_DOMAIN}/`;
}

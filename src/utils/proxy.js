import settings from '../settings.js';
import {SettingIds} from '../constants.js';
import {initializeStaregeDomain, getStaregeDomain} from './starege-domain.js';

let proxyCheckPromise = null;
let proxyAvailable = false;

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

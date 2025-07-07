import settings from '../settings.js';
import {SettingIds} from '../constants.js';

export function getProxyUrl() {
  if (!settings.get(SettingIds.PROXY_ENABLED)) {
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
}

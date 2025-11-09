import {EXT_VER, CDN_ENDPOINT} from '../constants.js';
import {getCdnUrl} from './proxy.js';

export default {
  url(path, breakCache = false) {
    const cdnUrl = getCdnUrl();
    const fullUrl = `${cdnUrl}${CDN_ENDPOINT}${path}${breakCache ? `?v=${EXT_VER}` : ''}`;

    return fullUrl;
  },

  emoteUrl(emoteId, version = '3x', static_ = false) {
    return this.url(`emote/${emoteId}${static_ ? '/static' : ''}/${version}.webp`);
  },
};

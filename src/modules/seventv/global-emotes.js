import {EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {getProxyUrl} from '../../utils/proxy.js';
import watcher from '../../watcher.js';
import AbstractEmotes from '../emotes/abstract-emotes.js';
import {createEmote, isOverlay, isZeroWidth} from './utils.js';

const category = {
  id: EmoteCategories.SEVENTV_GLOBAL,
  provider: EmoteProviders.SEVENTV,
  displayName: formatMessage({defaultMessage: '7TV Global Emotes'}),
};

class SevenTVGlobalEmotes extends AbstractEmotes {
  constructor() {
    super();

    settings.on(`changed.${SettingIds.EMOTES}`, () => this.updateGlobalEmotes());

    this.updateGlobalEmotes();
  }

  get category() {
    return category;
  }

  updateGlobalEmotes() {
    this.emotes.clear();

    if (!hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_EMOTES)) return;

    const proxyUrl = getProxyUrl();
    const apiUrl = proxyUrl
      ? `${proxyUrl}https://7tv.io/v3/emote-sets/global`
      : 'https://7tv.io/v3/emote-sets/global';

    fetch(apiUrl)
      .then((response) => response.json())
      .then(({emotes: globalEmotes}) => {
        if (globalEmotes == null) {
          return;
        }

        for (const {
          id,
          name: code,
          data: {
            listed,
            animated,
            owner,
            flags,
            host: {url},
          },
        } of globalEmotes) {
          if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
            continue;
          }

          const zeroWidth = isZeroWidth(flags);
          const zeroWidthEnabled = hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_ZERO_WIDTH_EMOTES);

          // If zero-width emotes are disabled, treat them as regular emotes
          const shouldBeZeroWidth = zeroWidth && zeroWidthEnabled;
          const shouldBeOverlay = isOverlay(flags) && zeroWidthEnabled;

          this.emotes.set(
            code,
            createEmote(id, code, animated, owner, category, shouldBeOverlay, url, shouldBeZeroWidth)
          );
        }
      })
      .then(() => watcher.emit('emotes.updated'));
  }
}

export default new SevenTVGlobalEmotes();

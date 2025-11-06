import {EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {getProxyUrl} from '../../utils/proxy.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import AbstractEmotes from '../emotes/abstract-emotes.js';
import {createEmote, isOverlay} from './utils.js';

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
    const apiUrl = proxyUrl ? `${proxyUrl}https://7tv.io/v3/emote-sets/global` : 'https://7tv.io/v3/emote-sets/global';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            console.log('BTTV: 7TV global emotes not found');
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data === null) {
          return;
        }
        const {emotes: globalEmotes} = data;
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

          this.emotes.set(code, createEmote(id, code, animated, owner, category, isOverlay(flags), url));
        }
      })
      .then(() => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: '7TV global emotes have been updated'}), true);
        watcher.emit('emotes.updated');
      })
      .catch((error) => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: 'Error loading 7TV global emotes'}), true);
        console.error('BTTV: Error loading 7TV global emotes:', error);
      });
  }
}

export default new SevenTVGlobalEmotes();

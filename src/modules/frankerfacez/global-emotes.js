import {EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import api from '../../utils/api.js';
import {hasFlag} from '../../utils/flags.js';
import {getCdnUrl} from '../../utils/proxy.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';

import AbstractEmotes from '../emotes/abstract-emotes.js';
import Emote from '../emotes/emote.js';

const category = {
  id: EmoteCategories.FRANKERFACEZ_GLOBAL,
  provider: EmoteProviders.FRANKERFACEZ,
  displayName: formatMessage({defaultMessage: 'FrankerFaceZ Global Emotes'}),
};

function proxyImages(images) {
  if (!images) return images;

  const cdnUrl = getCdnUrl();
  const proxiedImages = {};

  Object.keys(images).forEach((key) => {
    const imageUrl = images[key];
    if (imageUrl && typeof imageUrl === 'string') {
      proxiedImages[key] = `${cdnUrl}${imageUrl}`;
    } else {
      proxiedImages[key] = imageUrl;
    }
  });

  return proxiedImages;
}

class GlobalEmotes extends AbstractEmotes {
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

    if (!hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.FFZ_EMOTES)) return;

    api
      .get('cached/frankerfacez/emotes/global')
      .then((emotes) =>
        emotes.forEach(({id, user, code, images, animated, modifier}) => {
          this.emotes.set(
            code,
            new Emote({
              id,
              category: this.category,
              channel: user,
              code,
              images: proxyImages(images),
              animated,
              modifier,
            })
          );
        })
      )
      .then(() => {
        twitch.sendChatAdminMessage(
          formatMessage({defaultMessage: 'FrankerFaceZ global emotes have been updated'}),
          true
        );
        watcher.emit('emotes.updated');
      })
      .catch((error) => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: 'Error loading FrankerFaceZ global emotes'}), true);
        console.error('BTTV: Error loading FrankerFaceZ global emotes:', error);
      });
  }
}

export default new GlobalEmotes();

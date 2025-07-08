import {EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import api from '../../utils/api.js';
import {getCurrentChannel} from '../../utils/channel.js';
import {hasFlag} from '../../utils/flags.js';
import {getProxyUrl} from '../../utils/proxy.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import AbstractEmotes from '../emotes/abstract-emotes.js';
import Emote from '../emotes/emote.js';

const category = {
  id: EmoteCategories.FRANKERFACEZ_CHANNEL,
  provider: EmoteProviders.FRANKERFACEZ,
  displayName: formatMessage({defaultMessage: 'FrankerFaceZ Channel Emotes'}),
};

function proxyImages(images) {
  if (!images) return images;

  const proxyUrl = getProxyUrl();
  const proxiedImages = {};

  Object.keys(images).forEach((key) => {
    const imageUrl = images[key];
    if (imageUrl && typeof imageUrl === 'string') {
      proxiedImages[key] = `${proxyUrl}${imageUrl}`;
    } else {
      proxiedImages[key] = imageUrl;
    }
  });

  return proxiedImages;
}

class FrankerFaceZChannelEmotes extends AbstractEmotes {
  constructor() {
    super();

    watcher.on('channel.updated', () => this.updateChannelEmotes());
    settings.on(`changed.${SettingIds.EMOTES}`, () => this.updateChannelEmotes());
  }

  get category() {
    return category;
  }

  updateChannelEmotes() {
    this.emotes.clear();

    if (!hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.FFZ_EMOTES)) return;

    const currentChannel = getCurrentChannel();
    if (!currentChannel) return;

    api
      .get(`cached/frankerfacez/users/${currentChannel.provider}/${currentChannel.id}`)
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
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: 'FrankerFaceZ emotes have been updated'}), true);
        watcher.emit('emotes.updated');
      })
      .catch((error) => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: 'Error loading FrankerFaceZ channel emotes'}), true);
        console.error('Error loading FrankerFaceZ channel emotes:', error);
      });
  }
}

export default new FrankerFaceZChannelEmotes();

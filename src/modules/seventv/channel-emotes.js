import ReconnectingEventSource from 'reconnecting-eventsource';
import {EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {getProxyUrl} from '../../utils/proxy.js';
import {getCurrentChannel} from '../../utils/channel.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import AbstractEmotes from '../emotes/abstract-emotes.js';
import {createEmote, isOverlay} from './utils.js';

const category = {
  id: EmoteCategories.SEVENTV_CHANNEL,
  provider: EmoteProviders.SEVENTV,
  displayName: formatMessage({defaultMessage: '7TV Channel Emotes'}),
};

let eventSource;

class SevenTVChannelEmotes extends AbstractEmotes {
  constructor() {
    super();

    watcher.on('channel.updated', () => this.updateChannelEmotes());
    settings.on(`changed.${SettingIds.EMOTES}`, () => this.updateChannelEmotes());
  }

  get category() {
    return category;
  }

  updateChannelEmotes() {
    if (eventSource != null) {
      try {
        eventSource.close();
      } catch (_) {}
    }

    this.emotes.clear();

    if (!hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_EMOTES)) return;

    const currentChannel = getCurrentChannel();
    if (!currentChannel) return;

    const proxyUrl = getProxyUrl();
    const apiUrl = proxyUrl
      ? `${proxyUrl}https://7tv.io/v3/users/${encodeURIComponent(currentChannel.provider)}/${encodeURIComponent(currentChannel.id)}`
      : `https://7tv.io/v3/users/${encodeURIComponent(currentChannel.provider)}/${encodeURIComponent(currentChannel.id)}`;

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(({emote_set: emoteSet}) => {
        const {emotes} = emoteSet ?? {};
        if (emotes == null) {
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
        } of emotes) {
          if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
            continue;
          }

          this.emotes.set(code, createEmote(id, code, animated, owner, category, isOverlay(flags), url));
        }

        eventSource = new ReconnectingEventSource(
          `${proxyUrl ? proxyUrl : ''}https://events.7tv.io/v3@emote_set.update<object_id=${encodeURIComponent(emoteSet.id)}>`
        );

        // Handle emote_set.update events with pulled/pushed arrays
        eventSource.addEventListener('dispatch', (event) => {
          const data = JSON.parse(event.data);
          if (data.type !== 'emote_set.update') {
            return;
          }

          const {body} = data;
          if (!body) {
            return;
          }

          const username = body.actor?.username || 'Unknown';

          // Handle removed emotes (pulled array)
          if (body.pulled && Array.isArray(body.pulled)) {
            body.pulled.forEach((item) => {
              if (item.key === 'emotes' && item.old_value) {
                const emoteCode = item.old_value.name;
                this.emotes.delete(emoteCode);

                // Send system message for emote removal
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {emoteCode} has been removed from chat by {username}'},
                    {emoteCode: `\u200B${emoteCode}\u200B`, username}
                  ),
                  true
                );
              }
            });
          }

          // Handle added emotes (pushed array)
          if (body.pushed && Array.isArray(body.pushed)) {
            body.pushed.forEach((item) => {
              if (item.key === 'emotes' && item.value) {
                const emote = item.value;
                const {
                  id,
                  name: code,
                  data: {
                    listed,
                    animated,
                    owner,
                    flags,
                    host: {url},
                  },
                } = emote;

                if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
                  return;
                }

                this.emotes.set(code, createEmote(id, code, animated, owner, category, isOverlay(flags), url));

                // Send system message for emote addition
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {emoteCode} has been added to chat by {username}'},
                    {emoteCode: `${code} \u200B \u200B${code}\u200B`, username}
                  ),
                  true
                );
              }
            });
          }

          // Handle updated emotes (renamed emotes)
          if (body.updated && Array.isArray(body.updated)) {
            body.updated.forEach((item) => {
              if (item.key === 'emotes' && item.old_value && item.value) {
                const oldEmoteCode = item.old_value.name;
                const newEmote = item.value;
                const {
                  id,
                  name: newCode,
                  data: {
                    listed,
                    animated,
                    owner,
                    flags,
                    host: {url},
                  },
                } = newEmote;

                if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
                  return;
                }

                // Remove old emote code
                this.emotes.delete(oldEmoteCode);

                // Add new emote code
                this.emotes.set(newCode, createEmote(id, newCode, animated, owner, category, isOverlay(flags), url));

                // Send system message for emote rename
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {oldCode} has been renamed to {newCode} by {username}'},
                    {
                      oldCode: `\u200B${oldEmoteCode}\u200B`,
                      newCode: `${newCode} \u200B \u200B${newCode}\u200B`,
                      username,
                    }
                  ),
                  true
                );
              }
            });
          }

          watcher.emit('emotes.updated');
        });
      })
      .then(() => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: '7TV channel emotes have been updated'}), true);
        watcher.emit('emotes.updated');
      })
      .catch((error) => {
        twitch.sendChatAdminMessage(formatMessage({defaultMessage: 'Error loading 7TV channel emotes'}), true);
        console.error('Error loading 7TV channel emotes:', error);
      });
  }
}

export default new SevenTVChannelEmotes();

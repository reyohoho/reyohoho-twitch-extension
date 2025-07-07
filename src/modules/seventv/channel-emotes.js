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
import {createEmote, isOverlay, isZeroWidth} from './utils.js';

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
      .then((response) => response.json())
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

          // Handle removed emotes (pulled array)
          if (body.pulled && Array.isArray(body.pulled)) {
            body.pulled.forEach((item) => {
              if (item.key === 'emotes' && item.old_value) {
                const emoteCode = item.old_value.name;
                this.emotes.delete(emoteCode);

                // Send system message for emote removal
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {emoteCode} has been removed from chat'},
                    {emoteCode: `\u200B${emoteCode}\u200B`}
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

                const zeroWidth = isZeroWidth(flags);
                const zeroWidthEnabled = hasFlag(
                  settings.get(SettingIds.EMOTES),
                  EmoteTypeFlags.SEVENTV_ZERO_WIDTH_EMOTES
                );

                const shouldBeZeroWidth = zeroWidth && zeroWidthEnabled;
                const shouldBeOverlay = isOverlay(flags) && zeroWidthEnabled;

                this.emotes.set(
                  code,
                  createEmote(id, code, animated, owner, category, shouldBeOverlay, url, shouldBeZeroWidth)
                );

                // Send system message for emote addition
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {emoteCode} has been added to chat'},
                    {emoteCode: `${code} \u200B \u200B${code}\u200B`}
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

                const zeroWidth = isZeroWidth(flags);
                const zeroWidthEnabled = hasFlag(
                  settings.get(SettingIds.EMOTES),
                  EmoteTypeFlags.SEVENTV_ZERO_WIDTH_EMOTES
                );

                const shouldBeZeroWidth = zeroWidth && zeroWidthEnabled;
                const shouldBeOverlay = isOverlay(flags) && zeroWidthEnabled;

                // Add new emote code
                this.emotes.set(
                  newCode,
                  createEmote(id, newCode, animated, owner, category, shouldBeOverlay, url, shouldBeZeroWidth)
                );

                // Send system message for emote rename
                twitch.sendChatAdminMessage(
                  formatMessage(
                    {defaultMessage: '7TV Emotes: {oldCode} has been renamed to {newCode}'},
                    {oldCode: `\u200B${oldEmoteCode}\u200B`, newCode: `${newCode} \u200B \u200B${newCode}\u200B`}
                  ),
                  true
                );
              }
            });
          }

          watcher.emit('emotes.updated');
        });
      })
      .then(() => watcher.emit('emotes.updated'));
  }
}

export default new SevenTVChannelEmotes();

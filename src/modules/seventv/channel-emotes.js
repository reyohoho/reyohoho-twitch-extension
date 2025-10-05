import { EmoteCategories, EmoteProviders, EmoteTypeFlags, SettingIds } from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import { hasFlag } from '../../utils/flags.js';
import { getProxyUrl } from '../../utils/proxy.js';
import { getCurrentChannel } from '../../utils/channel.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import AbstractEmotes from '../emotes/abstract-emotes.js';
import { createEmote, isOverlay } from './utils.js';

const category = {
  id: EmoteCategories.SEVENTV_CHANNEL,
  provider: EmoteProviders.SEVENTV,
  displayName: formatMessage({ defaultMessage: '7TV Channel Emotes' }),
};

let websocket;
let reconnectTimeout;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 60000; // 60 seconds max delay
const INITIAL_RECONNECT_DELAY = 5000; // 5 seconds initial delay

class SevenTVChannelEmotes extends AbstractEmotes {
  constructor() {
    super();

    watcher.on('channel.updated', () => this.updateChannelEmotes());
    settings.on(`changed.${SettingIds.EMOTES}`, () => this.updateChannelEmotes());
  }

  get category() {
    return category;
  }

  createWebSocket(emoteSetId) {
    if (websocket) {
      websocket.close();
    }

    const proxyUrl = getProxyUrl();
    let wsUrl;

    if (proxyUrl && settings.get(SettingIds.PROXY_ENABLED)) {
      wsUrl = 'wss://starege.rhhhhhhh.live/7tv-proxy';
    } else {
      wsUrl = 'wss://events.7tv.io/v3';
    }

    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      isReconnecting = false;
      reconnectAttempts = 0;
      console.log('BTTV: 7TV WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message, emoteSetId);
      } catch (error) {
        console.error('BTTV: Error parsing 7TV WebSocket message:', error);
      }
    };

    websocket.onclose = (event) => {
      console.log('BTTV: 7TV WebSocket closed', event.code, event.reason);
      // Reconnect on abnormal closures (not 1000 = normal close, not 1005 = no status received)
      if (event.code !== 1000 && event.code !== 1005) {
        this.scheduleReconnect(emoteSetId);
      }
    };

    websocket.onerror = (error) => {
      console.error('BTTV: 7TV WebSocket error:', error);
    };
  }

  scheduleReconnect(emoteSetId) {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 60s (max)
    const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;

    isReconnecting = true;
    console.log(`BTTV: Reconnecting to 7TV WebSocket in ${delay / 1000}s (attempt ${reconnectAttempts})...`);

    reconnectTimeout = setTimeout(() => {
      console.log('BTTV: Attempting to reconnect to 7TV WebSocket...');
      this.createWebSocket(emoteSetId);
    }, delay);
  }

  handleWebSocketMessage(message, emoteSetId) {
    const { op, d } = message;

    if (op === 1) {
      this.subscribeToEmoteSet(emoteSetId);
    } else if (op === 0) {
      this.handleDispatchMessage(d);
    } else if (op === 5) {
      console.log('BTTV: 7TV WebSocket ACK:', d);
    } else if (op === 6) {
      console.error('BTTV: 7TV WebSocket error:', d);
    }
  }

  subscribeToEmoteSet(emoteSetId) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        op: 35,
        d: {
          type: 'emote_set.update',
          condition: {
            object_id: emoteSetId,
          },
        },
      };
      websocket.send(JSON.stringify(subscribeMessage));
      console.log('BTTV: Subscribed to 7TV emote set:', emoteSetId);
    }
  }

  handleDispatchMessage(data) {
    if (data.type !== 'emote_set.update') {
      return;
    }

    const { body } = data;
    if (!body) {
      return;
    }

    const username = body.actor?.display_name || 'Unknown';

    if (body.pulled && Array.isArray(body.pulled)) {
      body.pulled.forEach((item) => {
        if (item.key === 'emotes' && item.old_value) {
          const emoteCode = item.old_value.name;
          this.emotes.delete(emoteCode);

          twitch.sendChatAdminMessage(
            formatMessage(
              { defaultMessage: '7TV Emotes: {emoteCode} has been removed from chat by {username}' },
              { emoteCode: `\u200B${emoteCode}\u200B`, username }
            ),
            true
          );
        }
      });
    }

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
              host: { url },
            },
          } = emote;

          if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
            return;
          }

          this.emotes.set(code, createEmote(id, code, animated, owner, category, isOverlay(flags), url));

          twitch.sendChatAdminMessage(
            formatMessage(
              { defaultMessage: '7TV Emotes: {emoteCode} has been added to chat by {username}' },
              { emoteCode: `${code} \u200B \u200B${code}\u200B`, username }
            ),
            true
          );
        }
      });
    }

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
              host: { url },
            },
          } = newEmote;

          if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
            return;
          }

          this.emotes.delete(oldEmoteCode);
          this.emotes.set(newCode, createEmote(id, newCode, animated, owner, category, isOverlay(flags), url));

          twitch.sendChatAdminMessage(
            formatMessage(
              { defaultMessage: '7TV Emotes: {oldCode} has been renamed to {newCode} by {username}' },
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
  }

  updateChannelEmotes() {
    if (websocket) {
      websocket.close();
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    isReconnecting = false;
    reconnectAttempts = 0;
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
          if (response.status === 404) {
            console.log(`BTTV: 7TV channel emotes not found for channel: ${currentChannel.id}`);
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
        const { emote_set: emoteSet } = data;
        const { emotes } = emoteSet ?? {};
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
            host: { url },
          },
        } of emotes) {
          if (!listed && !hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_UNLISTED_EMOTES)) {
            continue;
          }

          this.emotes.set(code, createEmote(id, code, animated, owner, category, isOverlay(flags), url));
        }

        this.createWebSocket(emoteSet.id);
      })
      .then(() => {
        twitch.sendChatAdminMessage(formatMessage({ defaultMessage: '7TV channel emotes have been updated' }), true);
        watcher.emit('emotes.updated');
      })
      .catch((error) => {
        twitch.sendChatAdminMessage(formatMessage({ defaultMessage: 'Error loading 7TV channel emotes' }), true);
        console.error('BTTV: Error loading 7TV channel emotes:', error);
      });
  }
}

export default new SevenTVChannelEmotes();

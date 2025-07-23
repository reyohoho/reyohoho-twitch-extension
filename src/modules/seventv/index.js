import domObserver from '../../observers/dom.js';
import watcher from '../../watcher.js';
import {getCurrentUser} from '../../utils/user.js';
import {getCurrentChannel} from '../../utils/channel.js';
import {getProxyUrl} from '../../utils/proxy.js';

const BTTV_GLOBAL_MIXIN = '__BTTV_GLOBAL_MIXIN__';
const SEVEN_TV_ROOT_ID = 'seventv-root';


function generateSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now();
}

const sessionId = generateSessionId();
let lastPresenceAt = 0;
let presenceInterval = null;
let seventvUserId = null;
let seventvUserIdPromise = null;

async function getSevenTVUserId() {
  if (seventvUserId) return seventvUserId;
  if (seventvUserIdPromise) return seventvUserIdPromise;

  const user = getCurrentUser();
  if (!user?.id) return null;

  const proxyUrl = getProxyUrl();
  const url = `${proxyUrl}https://7tv.io/v3/users/twitch/${user.id}`;
  seventvUserIdPromise = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      seventvUserId = data?.user?.id || null;
      return seventvUserId;
    })
    .catch(() => null);

  return seventvUserIdPromise;
}

async function sendPresence({self = false} = {}) {
  const channel = getCurrentChannel();
  if (!channel?.id) return;

  const userId = await getSevenTVUserId();
  if (!userId) return;

  const now = Date.now();
  if (!self && lastPresenceAt && now - lastPresenceAt < 10000) return;
  lastPresenceAt = now;

  const body = {
    kind: 1,
    passive: self,
    session_id: self ? sessionId : undefined,
    data: {
      platform: 'TWITCH',
      id: channel.id,
    },
  };

  const proxyUrl = getProxyUrl();
  const url = `${proxyUrl}https://7tv.io/v3/users/${userId}/presences`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
  } catch (e) {}
}

function startPresenceLoop() {
  if (presenceInterval) clearInterval(presenceInterval);
  sendPresence({self: true});
  presenceInterval = setInterval(() => sendPresence({self: false}), 10000);
}

function stopPresenceLoop() {
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = null;
}

class SevenTV {
  constructor() {
    domObserver.on(`#${SEVEN_TV_ROOT_ID}`, (_, isConnected) => {
      if (!isConnected) {
        stopPresenceLoop();
        return;
      }
      this.applyGlobalMixin();
    });
    watcher.on('channel.updated', () => {
      stopPresenceLoop();
      const user = getCurrentUser();
      const channel = getCurrentChannel();
      if (user?.id && channel?.id) {
        startPresenceLoop();
      }
    });
  }

  getSeventvVueApp() {
    const root = document.getElementById(SEVEN_TV_ROOT_ID);
    if (root == null) {
      return null;
    }
    return root.__vue_app__;
  }

  applyGlobalMixin() {
    const vueApp = this.getSeventvVueApp();
    if (vueApp == null) {
      return;
    }
    const mixins = vueApp?._context?.mixins;
    if (mixins == null || !Array.isArray(mixins)) {
      return;
    }
    const globalMixin = mixins.find((mixin) => mixin?.__name === BTTV_GLOBAL_MIXIN);
    if (globalMixin != null) {
      return;
    }
    vueApp.mixin({
      __name: BTTV_GLOBAL_MIXIN,
      mounted() {
        this.$el.__bttv_seventv_instance = this;
      },
      beforeUnmount() {
        if (this.$el.__bttv_seventv_instance !== this) {
          return;
        }
        delete this.$el.__bttv_seventv_instance;
      },
    });
  }

  getElementInstance(element) {
    const instance = element?.__bttv_seventv_instance?.$;
    if (instance == null) {
      return null;
    }
    return instance;
  }
}

export default new SevenTV();

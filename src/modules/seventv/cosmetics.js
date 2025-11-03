import {hasFlag} from '../../utils/flags.js';
import settings from '../../settings.js';
import {SettingIds, EmoteTypeFlags} from '../../constants.js';
import {getProxyUrl} from '../../utils/proxy.js';
import debug from '../../utils/debug.js';
import {getUserPaint} from '../../utils/subscription-api.js';

const SEVENTV_GQL_ENDPOINT = 'https://7tv.io/v3/gql';

class SevenTVCosmetics {
  constructor() {
    this.paintCache = new Map();
    this.userPaintCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 min
    this.stylesInjected = false;
    this.pendingRequests = new Set();

    settings.on(`changed.${SettingIds.EMOTES}`, () => {
      if (!this.isEnabled()) {
        this.removePaintStyles();
      }
    });

    this.injectBaseStyles();
  }

  isEnabled() {
    return hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_COSMETICS);
  }

  injectBaseStyles() {
    if (this.stylesInjected) return;

    const css = `
      /* 7TV Cosmetics Styles */
      .seventv-paint {
        position: relative;
        display: inline-block;
        font-weight: bold;
        font-size: inherit;
        line-height: inherit;
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: none;
        background-color: currentColor;
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
      }

      .seventv-paint[class*="seventv-paint-"] {
        animation: none;
        transition: none;
      }

      .seventv-paint:empty {
        display: none;
      }

      .seventv-paint::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .chat-line__username .seventv-paint {
        display: inline;
        font-size: inherit;
        line-height: inherit;
      }

      .chat-author__display-name .seventv-paint,
      .chat-author__intl-login .seventv-paint {
        display: inline;
        font-size: inherit;
        line-height: inherit;
      }

      .seventv-chat-user-username .seventv-paint {
        display: inline;
        font-size: inherit;
        line-height: inherit;
      }

      @supports not (background-clip: text) {
        .seventv-paint {
          -webkit-background-clip: inherit;
          -webkit-text-fill-color: inherit;
          background-clip: inherit;
          color: inherit;
        }
      }

      @supports not (-webkit-background-clip: text) {
        .seventv-paint {
          -webkit-background-clip: inherit;
          -webkit-text-fill-color: inherit;
          background-clip: inherit;
          color: inherit;
        }
      }
    `;

    const style = document.createElement('style');
    style.setAttribute('id', 'seventv-cosmetics-base-styles');
    style.textContent = css;
    document.head.appendChild(style);

    this.stylesInjected = true;
  }

  async fetchPaintData(paintIds) {
    if (!this.isEnabled()) return {};

    const query = `
      query GetPaints($list: [ObjectID!]) {
        cosmetics(list: $list) {
          paints {
            id
            name
            color
            function
            angle
            shape
            image_url
            repeat
            stops {
              at
              color
            }
            shadows {
              x_offset
              y_offset
              radius
              color
            }
          }
        }
      }
    `;

    try {
      const proxyUrl = getProxyUrl();
      const response = await fetch(`${proxyUrl}${SEVENTV_GQL_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: 'GetPaints',
          variables: {list: paintIds},
          query,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data.cosmetics.paints || [];
    } catch (error) {
      debug.error('Failed to fetch 7TV paint data:', error);
      return [];
    }
  }

  async fetchAllPaints() {
    try {
      const response = await fetch('https://starege.rhhhhhhh.live/api/paints');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      debug.log(`Loaded ${data.count} paints from backend cache`);
      return data.paints || [];
    } catch (error) {
      debug.error('Failed to fetch paints from backend:', error);
      return [];
    }
  }

  async fetchUserPaint(userId) {
    if (!this.isEnabled()) return null;

    const cacheKey = `${userId}:TWITCH`;
    const cached = this.userPaintCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const localPaint = await getUserPaint(userId);
      
      if (localPaint.has_paint && localPaint.paint_id) {
        debug.log(`Using local paint ID for user ${userId}: ${localPaint.paint_id}`);
        
        const paints = await this.fetchPaintData([localPaint.paint_id]);
        const paint = paints.length > 0 ? paints[0] : null;
        
        if (paint) {
          const paintWithMeta = {
            paint,
            source: 'local',
          };
          
          this.userPaintCache.set(cacheKey, {
            data: paintWithMeta,
            timestamp: Date.now(),
          });
          return paintWithMeta;
        }
      }

      debug.log(`Fetching paint from 7TV API for user ${userId}`);
      
      const query = `
        query GetUserPaint($id: String!) {
          userByConnection(id: $id, platform: TWITCH) {
            style {
              paint {
                id
                name
                color
                function
                angle
                shape
                image_url
                repeat
                stops {
                  at
                  color
                }
                shadows {
                  x_offset
                  y_offset
                  radius
                  color
                }
              }
            }
          }
        }
      `;

      const proxyUrl = getProxyUrl();
      const response = await fetch(`${proxyUrl}${SEVENTV_GQL_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: 'GetUserPaint',
          variables: {id: userId},
          query,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const paint = data.data.userByConnection?.style?.paint || null;

      const paintWithMeta = paint
        ? {
            paint,
            source: '7tv',
          }
        : null;

      this.userPaintCache.set(cacheKey, {
        data: paintWithMeta,
        timestamp: Date.now(),
      });

      return paintWithMeta;
    } catch (error) {
      debug.error('Failed to fetch user paint:', error);
      return null;
    }
  }

  decimalToRGBAString(num) {
    const r = (num >>> 24) & 0xff;
    const g = (num >>> 16) & 0xff;
    const b = (num >>> 8) & 0xff;
    const a = num & 0xff;

    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  }

  generateBackgroundImage(paint) {
    let result = 'url()';

    switch (paint.function) {
      case 'LINEAR_GRADIENT': {
        result = paint.repeat ? 'repeating-' : '';
        result += `linear-gradient(${this.generateLinearGradientContent(paint)})`;
        break;
      }
      case 'RADIAL_GRADIENT': {
        result = paint.repeat ? 'repeating-' : '';
        result += `radial-gradient(${this.generateRadialGradientContent(paint)})`;
        break;
      }
      case 'URL': {
        const imageUrl = paint.image_url ? `${getProxyUrl()}${paint.image_url}` : '';
        result = `url(${imageUrl})`;
        break;
      }
      default: {
        result = 'none';
      }
    }

    return result;
  }

  generateLinearGradientContent(paint) {
    const args = [];
    args.push(`${paint.angle}deg`);

    if (paint.stops && paint.stops.length > 0) {
      for (const stop of paint.stops) {
        args.push(`${this.decimalToRGBAString(stop.color)} ${stop.at * 100}%`);
      }
    }

    return args.join(', ');
  }

  generateRadialGradientContent(paint) {
    const args = [];
    args.push(paint.shape || 'circle');

    if (paint.stops && paint.stops.length > 0) {
      for (const stop of paint.stops) {
        args.push(`${this.decimalToRGBAString(stop.color)} ${stop.at * 100}%`);
      }
    }

    return args.join(', ');
  }

  generateDropShadows(paint) {
    if (!paint.shadows || paint.shadows.length === 0) {
      return 'none';
    }

    const args = [];
    for (const shadow of paint.shadows) {
      args.push(
        `drop-shadow(${shadow.x_offset}px ${shadow.y_offset}px ${shadow.radius}px ${this.decimalToRGBAString(shadow.color)})`
      );
    }

    return args.join(' ');
  }

  generatePaintCSS(paint, className = 'seventv-paint') {
    if (!paint) return '';

    const css = `
      .${className} {
        color: ${paint.color ? this.decimalToRGBAString(paint.color) : 'inherit'};
        background-image: ${this.generateBackgroundImage(paint)};
        background-size: 100% 100%;
        background-clip: text;
        filter: ${this.generateDropShadows(paint)};
        background-color: currentColor;
        -webkit-text-fill-color: transparent;
        -webkit-background-clip: text;
        text-shadow: none;
      }
    `;

    return css;
  }

  applyPaintToElement(element, paint, className = 'seventv-paint', paintMeta = null) {
    if (!element || !paint) return;

    const uniqueClassName = `${className}-${paint.id}`;
    if (element.classList.contains(uniqueClassName)) {
      return;
    }

    element.classList.add(className);
    element.classList.add(uniqueClassName);

    if (paintMeta) {
      const sourceName = paintMeta.source === 'local' ? 'RTE Custom Paint' : '7TV Paint';
      const tooltip = `${sourceName}: ${paint.name}`;
      element.setAttribute('title', tooltip);
      element.setAttribute('data-paint-source', paintMeta.source);
      element.setAttribute('data-paint-name', paint.name);
    }

    if (!this.paintCache.has(paint.id)) {
      const style = document.createElement('style');
      style.setAttribute('data-paint-id', paint.id);
      style.textContent = this.generatePaintCSS(paint, uniqueClassName);
      document.head.appendChild(style);
      this.paintCache.set(paint.id, true);
    }
  }

  async applyUserPaint(element, userId) {
    if (!this.isEnabled() || !element || !userId) return;

    element.setAttribute('data-paint-user-id', userId);

    const cacheKey = `${userId}:TWITCH`;
    const cached = this.userPaintCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      if (cached.data) {
        this.applyPaintToElement(element, cached.data.paint, 'seventv-paint', cached.data);
      }
      return;
    }

    if (this.pendingRequests.has(userId)) {
      setTimeout(() => this.applyUserPaint(element, userId), 50);
      return;
    }

    this.pendingRequests.add(userId);

    try {
      const paintData = await this.fetchUserPaint(userId);
      if (paintData) {
        this.applyPaintToElement(element, paintData.paint, 'seventv-paint', paintData);
      }
    } catch (error) {
      debug.error('Failed to apply user paint:', error);
    } finally {
      this.pendingRequests.delete(userId);
    }
  }

  async refreshAllUserPaints() {
    if (!this.isEnabled()) return;

    debug.log('Refreshing all user paints on the page...');

    this.userPaintCache.clear();

    const paintedElements = document.querySelectorAll('[data-paint-user-id]');

    debug.log(`Found ${paintedElements.length} painted elements to refresh`);

    for (const element of paintedElements) {
      const userId = element.getAttribute('data-paint-user-id');

      if (userId) {
        const classes = Array.from(element.classList);
        classes.forEach((cls) => {
          if (cls.startsWith('seventv-paint')) {
            element.classList.remove(cls);
          }
        });

        element.removeAttribute('title');
        element.removeAttribute('data-paint-source');
        element.removeAttribute('data-paint-name');

        await this.applyUserPaint(element, userId);
      }
    }

    debug.log('Finished refreshing user paints');
  }

  clearCache() {
    this.paintCache.clear();
    this.userPaintCache.clear();
    this.pendingRequests.clear();
  }

  removePaintStyles() {
    const paintStyles = document.querySelectorAll('style[data-paint-id]');
    paintStyles.forEach((style) => style.remove());

    const baseStyles = document.querySelector('#seventv-cosmetics-base-styles');
    if (baseStyles) {
      baseStyles.remove();
      this.stylesInjected = false;
    }

    const paintElements = document.querySelectorAll('[class*="seventv-paint"]');
    paintElements.forEach((element) => {
      element.className = element.className.replace(/seventv-paint[^\s]*/g, '').trim();
    });
  }
}

export default new SevenTVCosmetics();

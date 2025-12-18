import {PlatformTypes} from '../../constants.js';
import extension from '../../utils/extension.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';

class GlobalCSSModule {
  constructor() {
    loadModuleForPlatforms(
      [PlatformTypes.TWITCH, () => import('./twitch.js')]
    );
  }

  loadGlobalCSS() {
    const extensionCSSUrl = extension.url('betterttv.css', true);
    if (!extensionCSSUrl) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.setAttribute('href', extensionCSSUrl);
      css.setAttribute('type', 'text/css');
      css.setAttribute('rel', 'stylesheet');
      css.addEventListener('load', () => resolve());
      css.addEventListener('error', (err) => reject(err));
      document.body.appendChild(css);
    });
  }
}

export default new GlobalCSSModule();
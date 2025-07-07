import {PlatformTypes} from '../../constants.js';
import extension from '../../utils/extension.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import {getPlatform} from '../../utils/window.js';

class GlobalCSSModule {
  constructor() {
    loadModuleForPlatforms([PlatformTypes.TWITCH, () => import('./twitch.js')]);
  }
}
export default new GlobalCSSModule();

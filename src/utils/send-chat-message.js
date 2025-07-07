import {PlatformTypes} from '../constants.js';
import {loadModuleForPlatforms} from './modules.js';

export default loadModuleForPlatforms(
  [
    PlatformTypes.TWITCH,
    () => {
      let twitch;
      return async (message) => {
        if (twitch == null) {
          const module = await import('./twitch.js');
          twitch = module.default;
        }
        twitch.sendChatAdminMessage(message, true);
      };
    },
  ]
);

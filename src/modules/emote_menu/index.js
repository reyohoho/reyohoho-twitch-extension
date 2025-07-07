import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import TwitchEmoteMenu from './twitch/EmoteMenu.jsx';

export default loadModuleForPlatforms(
  [PlatformTypes.TWITCH, async () => new TwitchEmoteMenu()]
);

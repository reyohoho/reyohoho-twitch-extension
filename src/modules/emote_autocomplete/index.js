import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import TwitchEmoteAutocomplete from './twitch/EmoteAutocomplete.jsx';

export default loadModuleForPlatforms(
  [PlatformTypes.TWITCH, () => new TwitchEmoteAutocomplete()]
);

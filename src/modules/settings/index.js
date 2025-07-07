import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import TwitchSettingsModule from './twitch/Settings.jsx';

const settings = {
  openSettings: () => {},
};

loadModuleForPlatforms(
  [PlatformTypes.TWITCH, async () => new TwitchSettingsModule()]
).then((resolvedSettings) => {
  settings.openSettings = resolvedSettings.openSettings;
});

export default settings;

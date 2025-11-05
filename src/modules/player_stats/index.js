import {PlatformTypes, SettingIds} from '../../constants.js';
import settings from '../../settings.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import watcher from '../../watcher.js';
import metadataManager from './metadata-manager.js';
import {getPlayerStatsDefinition} from './definitions.js';
import './style.css';

class PlayerStatsModule {
  constructor() {
    metadataManager.initialize();

    watcher.on('load.player', () => {
      this.loadStats();
    });

    settings.on(`changed.${SettingIds.PLAYER_STATS}`, () => {
      this.loadStats();
    });

    this.loadStats();
  }

  loadStats() {
    metadataManager.define('player-stats', getPlayerStatsDefinition());
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new PlayerStatsModule()]);


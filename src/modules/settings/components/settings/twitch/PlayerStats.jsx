import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Player Statistics'});

function PlayerStats() {
  const [value, setValue] = useStorageState(SettingIds.PLAYER_STATS);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({
            defaultMessage: 'Show stream latency and playback statistics under the player',
          })}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(PlayerStats, {
  settingId: SettingIds.PLAYER_STATS,
  name: SETTING_NAME,
  category: CategoryTypes.CHANNEL,
  keywords: ['player', 'stats', 'statistics', 'latency', 'lag', 'delay', 'fps', 'bitrate'],
});


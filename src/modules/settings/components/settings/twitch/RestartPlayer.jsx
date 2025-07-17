import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Restart Player'});

function RestartPlayer() {
  const [value, setValue] = useStorageState(SettingIds.RESTART_PLAYER);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Add a Restart Player button to the video player controls'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(RestartPlayer, {
  settingId: SettingIds.RESTART_PLAYER,
  name: SETTING_NAME,
  category: CategoryTypes.CHANNEL,
  keywords: ['restart', 'player', 'video', 'reset'],
});

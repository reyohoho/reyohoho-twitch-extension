import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Giant Emotes'});

function GiantEmotes() {
  const [value, setValue] = useStorageState(SettingIds.GIANT_EMOTES);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Allow channel points to make emotes giant in chat'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(GiantEmotes, {
  settingId: SettingIds.GIANT_EMOTES,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['giant', 'emotes', 'channel', 'points'],
});

export default GiantEmotes; 
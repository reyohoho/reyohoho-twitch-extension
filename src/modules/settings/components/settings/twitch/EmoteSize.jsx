import React from 'react';
import InputNumber from 'rsuite/InputNumber';
import Panel from 'rsuite/Panel';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Emote Size'});

function EmoteSize() {
  const [value, setValue] = useStorageState(SettingIds.EMOTE_SIZE);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Size of emotes displayed in chat (in pixels)'})}
        </p>
        <InputNumber
          value={value}
          onChange={setValue}
          min={16}
          max={128}
          step={16}
          style={{width: '100px'}}
        />
      </div>
    </Panel>
  );
}

registerComponent(EmoteSize, {
  settingId: SettingIds.EMOTE_SIZE,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['emote', 'size', 'pixels', 'reyohoho'],
});

export default EmoteSize; 
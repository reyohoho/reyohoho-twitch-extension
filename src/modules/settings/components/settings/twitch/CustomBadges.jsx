import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Custom Badges'});

function CustomBadges() {
  const [value, setValue] = useStorageState(SettingIds.CUSTOM_BADGES);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Show custom badges added by the extension'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(CustomBadges, {
  settingId: SettingIds.CUSTOM_BADGES,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['badges', 'custom', 'reyohoho'],
});

export default CustomBadges;


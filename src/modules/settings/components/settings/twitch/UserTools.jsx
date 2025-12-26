import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import { CategoryTypes, SettingIds } from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import { registerComponent } from '../../Store.jsx';

const SETTING_NAME = formatMessage({ defaultMessage: 'User Tools' });

function UserTools() {
  const [userTools, setUserTools] = useStorageState(SettingIds.USER_TOOLS);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({
            defaultMessage:
              'Show Follows and Logs buttons when hovering over chat messages',
          })}
        </p>
        <Toggle checked={userTools} onChange={(state) => setUserTools(state)} />
      </div>
    </Panel>
  );
}

registerComponent(UserTools, {
  settingId: SettingIds.USER_TOOLS,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['user', 'tools', 'follows', 'logs', 'hover', 'message', 'buttons'],
});

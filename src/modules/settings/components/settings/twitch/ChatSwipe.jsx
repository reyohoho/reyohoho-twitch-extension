import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Chat Swipe'});

function ChatSwipe() {
  const [value, setValue] = useStorageState(SettingIds.CHAT_SWIPE);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Enable swipe gestures on chat messages for moderation actions (ban, timeout, delete, unban)'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(ChatSwipe, {
  settingId: SettingIds.CHAT_SWIPE,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['chat', 'swipe', 'moderation', 'ban', 'timeout', 'delete', 'unban'],
}); 
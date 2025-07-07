import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Video Mirror'});

function VideoMirror() {
  const [value, setValue] = useStorageState(SettingIds.VIDEO_MIRROR);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Add a button to horizontally flip the video player'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(VideoMirror, {
  settingId: SettingIds.VIDEO_MIRROR,
  name: SETTING_NAME,
  category: CategoryTypes.CHANNEL,
  keywords: ['video', 'mirror', 'flip', 'horizontal', 'reyohoho'],
});

export default VideoMirror; 
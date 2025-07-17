import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Picture in Picture'});

function PictureInPicture() {
  const [value, setValue] = useStorageState(SettingIds.PICTURE_IN_PICTURE);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Add a Picture in Picture button to the video player controls'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(PictureInPicture, {
  settingId: SettingIds.PICTURE_IN_PICTURE,
  name: SETTING_NAME,
  category: CategoryTypes.CHANNEL,
  keywords: ['picture', 'pip', 'player', 'video'],
});

import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Audio Compressor'});

function AudioCompressor() {
  const [value, setValue] = useStorageState(SettingIds.AUDIO_COMPRESSOR);

  const handleChange = (newValue) => {
    console.log('BTTV: Audio compressor setting changed in UI:', newValue);
    setValue(newValue);
  };

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Show audio compressor button in the video player. The button state is remembered separately. Press Alt+C to toggle.'})}
        </p>
        <Toggle checked={value} onChange={handleChange} />
      </div>
    </Panel>
  );
}

registerComponent(AudioCompressor, {
  settingId: SettingIds.AUDIO_COMPRESSOR,
  name: SETTING_NAME,
  category: CategoryTypes.CHANNEL,
  keywords: ['audio', 'compressor', 'sound', 'quality', 'reyohoho'],
});

export default AudioCompressor; 
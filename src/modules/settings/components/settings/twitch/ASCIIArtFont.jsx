import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'ASCII Art Font'});

function ASCIIArtFont() {
  const [value, setValue] = useStorageState(SettingIds.ASCII_ART_FONT);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Automatically use default Twitch font for ASCII art messages'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(ASCIIArtFont, {
  settingId: SettingIds.ASCII_ART_FONT,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['ascii', 'art', 'font', 'chat', 'messages'],
});

export default ASCIIArtFont; 
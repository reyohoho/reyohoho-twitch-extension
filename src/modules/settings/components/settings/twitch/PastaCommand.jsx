import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Pasta Command'});

function PastaCommand() {
  const [value, setValue] = useStorageState(SettingIds.PASTA_COMMAND);

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Enable /pasta command for searching copypastas (dump from copypastas.ru)'})}
        </p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

registerComponent(PastaCommand, {
  settingId: SettingIds.PASTA_COMMAND,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['pasta', 'command', 'copypasta', 'search'],
}); 
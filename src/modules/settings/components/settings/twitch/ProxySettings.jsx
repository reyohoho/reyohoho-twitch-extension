import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import {initializeProxyCheck} from '../../../../../utils/proxy.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Proxy Settings'});

function ProxySettings() {
  const [enabled, setEnabled] = useStorageState(SettingIds.PROXY_ENABLED);

  const handleToggleChange = async (state) => {
    setEnabled(state);
    if (state) {
      await initializeProxyCheck(true);
    }
  };

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Enable proxy for emote providers to bypass regional restrictions. The best available server will be selected automatically.'})}
        </p>
        <Toggle checked={enabled} onChange={handleToggleChange} />
      </div>
    </Panel>
  );
}

registerComponent(ProxySettings, {
  settingId: SettingIds.PROXY_ENABLED,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['proxy', 'emotes', 'bypass', 'regional', 'reyohoho'],
});

export default ProxySettings;


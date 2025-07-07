import React from 'react';
import Button from 'rsuite/Button';
import Input from 'rsuite/Input';
import InputGroup from 'rsuite/InputGroup';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import {getDefaultProxyUrl, resetProxyUrl} from '../../../../../utils/proxy.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Proxy Settings'});

function ProxySettings() {
  const [enabled, setEnabled] = useStorageState(SettingIds.PROXY_ENABLED);
  const [url, setUrl] = useStorageState(SettingIds.PROXY_URL);

  const handleReset = () => {
    resetProxyUrl();
  };

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Enable proxy for emote providers to bypass regional restrictions'})}
        </p>
        <Toggle checked={enabled} onChange={(state) => setEnabled(state)} />
      </div>
      {enabled && (
        <div className={styles.settingRow}>
          <p className={styles.settingDescription}>
            {formatMessage({defaultMessage: 'Proxy URL for emote providers'})}
          </p>
          <InputGroup>
            <Input
              value={url || ''}
              onChange={(value) => setUrl(value)}
              placeholder={getDefaultProxyUrl()}
            />
            <InputGroup.Button>
              <Button onClick={handleReset}>
                {formatMessage({defaultMessage: 'Reset'})}
              </Button>
            </InputGroup.Button>
          </InputGroup>
        </div>
      )}
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
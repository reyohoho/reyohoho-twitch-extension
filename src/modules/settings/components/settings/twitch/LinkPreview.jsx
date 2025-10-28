import React from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Link Preview'});

function LinkPreview() {
  const [value, setValue] = useStorageState(SettingIds.LINK_PREVIEW);
  const [hideLink, setHideLink] = useStorageState(SettingIds.LINK_PREVIEW_HIDE_LINK);

  const handleChange = (newValue) => {
    console.log('BTTV: Link preview setting changed in UI:', newValue);
    setValue(newValue);
  };

  const handleHideLinkChange = (newValue) => {
    console.log('BTTV: Link preview hide link setting changed in UI:', newValue);
    setHideLink(newValue);
  };

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Display image and video links in chat as embedded content'})}
        </p>
        <Toggle checked={value} onChange={handleChange} />
      </div>
      {value && (
        <div className={styles.settingRow}>
          <p className={styles.settingDescription}>
            {formatMessage({defaultMessage: 'Hide the original link and show only the preview'})}
          </p>
          <Toggle checked={hideLink} onChange={handleHideLinkChange} />
        </div>
      )}
    </Panel>
  );
}

registerComponent(LinkPreview, {
  settingId: SettingIds.LINK_PREVIEW,
  name: SETTING_NAME,
  category: CategoryTypes.CHAT,
  keywords: ['link', 'preview', 'image', 'video', 'embed'],
});

export default LinkPreview;

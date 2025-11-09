import React from 'react';
import InputNumber from 'rsuite/InputNumber';
import Panel from 'rsuite/Panel';
import SelectPicker from 'rsuite/SelectPicker';
import useStorageState from '../../../../../common/hooks/StorageState.jsx';
import {CategoryTypes, SettingIds} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const SETTING_NAME = formatMessage({defaultMessage: 'Link Preview'});

const LINK_MODES = {
  DEFAULT: 'default',
  HIDE_ALL: 'hide_all',
  PREVIEW_ONLY: 'preview_only',
  BOTH: 'both',
};

const modeOptions = [
  {
    label: formatMessage({defaultMessage: 'Show links without preview (default)'}),
    value: LINK_MODES.DEFAULT,
  },
  {
    label: formatMessage({defaultMessage: 'Hide all media links completely'}),
    value: LINK_MODES.HIDE_ALL,
  },
  {
    label: formatMessage({defaultMessage: 'Show preview only (hide link text)'}),
    value: LINK_MODES.PREVIEW_ONLY,
  },
  {
    label: formatMessage({defaultMessage: 'Show both preview and link text'}),
    value: LINK_MODES.BOTH,
  },
];

function LinkPreview() {
  const [linkPreview, setLinkPreview] = useStorageState(SettingIds.LINK_PREVIEW);
  const [hideLink, setHideLink] = useStorageState(SettingIds.LINK_PREVIEW_HIDE_LINK);
  const [hideAll, setHideAll] = useStorageState(SettingIds.LINK_PREVIEW_HIDE_ALL);
  const [maxHeight, setMaxHeight] = useStorageState(SettingIds.LINK_PREVIEW_MAX_HEIGHT);
  const [maxWidth, setMaxWidth] = useStorageState(SettingIds.LINK_PREVIEW_MAX_WIDTH);


  const getCurrentMode = () => {
    if (hideAll) return LINK_MODES.HIDE_ALL;
    if (!linkPreview) return LINK_MODES.DEFAULT;
    if (linkPreview && hideLink) return LINK_MODES.PREVIEW_ONLY;
    return LINK_MODES.BOTH;
  };

  const currentMode = getCurrentMode();

  const handleModeChange = (newMode) => {
    console.log('BTTV: Link preview mode changed to:', newMode);

    switch (newMode) {
      case LINK_MODES.DEFAULT:
        setLinkPreview(false);
        setHideLink(false);
        setHideAll(false);
        break;
      case LINK_MODES.HIDE_ALL:
        setLinkPreview(false);
        setHideLink(false);
        setHideAll(true);
        break;
      case LINK_MODES.PREVIEW_ONLY:
        setLinkPreview(true);
        setHideLink(true);
        setHideAll(false);
        break;
      case LINK_MODES.BOTH:
        setLinkPreview(true);
        setHideLink(false);
        setHideAll(false);
        break;
    }
  };

  const showPreviewSettings = currentMode === LINK_MODES.PREVIEW_ONLY || currentMode === LINK_MODES.BOTH;

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Link preview mode'})}
        </p>
        <SelectPicker
          data={modeOptions}
          value={currentMode}
          onChange={handleModeChange}
          cleanable={false}
          searchable={false}
          style={{width: '100%', maxWidth: '400px'}}
        />
      </div>
      {showPreviewSettings && (
        <>
          <div className={styles.settingRow}>
            <p className={styles.settingDescription}>
              {formatMessage({defaultMessage: 'Maximum image height (px)'})}
            </p>
            <InputNumber
              value={maxHeight}
              onChange={setMaxHeight}
              min={50}
              max={1000}
              step={10}
              style={{width: '100px'}}
            />
          </div>
          <div className={styles.settingRow}>
            <p className={styles.settingDescription}>
              {formatMessage({defaultMessage: 'Maximum image width (px)'})}
            </p>
            <InputNumber
              value={maxWidth}
              onChange={setMaxWidth}
              min={50}
              max={1000}
              step={10}
              style={{width: '100px'}}
            />
          </div>
        </>
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

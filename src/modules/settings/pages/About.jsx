import * as faDownload from '@fortawesome/free-solid-svg-icons/faDownload';
import * as faRedo from '@fortawesome/free-solid-svg-icons/faRedo';
import * as faUpload from '@fortawesome/free-solid-svg-icons/faUpload';
import { Icon } from '@rsuite/icons';
import classNames from 'classnames';
import { saveAs } from 'file-saver';
import React, { useRef, useState } from 'react';
import IconButton from 'rsuite/IconButton';
import Panel from 'rsuite/Panel';
import PanelGroup from 'rsuite/PanelGroup';
import FontAwesomeSvgIcon from '../../../common/components/FontAwesomeSvgIcon.jsx';
import { EXT_VER, REYOHOHO_VER } from '../../../constants.js';
import formatMessage from '../../../i18n/index.js';
import { SETTINGS_STORAGE_KEY } from '../../../settings.js';
import storage from '../../../storage.js';
import { loadLegacySettings } from '../../../utils/legacy-settings.js';
import CloseButton from '../components/CloseButton.jsx';
import styles from '../styles/about.module.css';
import header from '../styles/header.module.css';

function loadJSON(string) {
  let json = null;
  try {
    json = JSON.parse(string);
  } catch (e) {
    json = null;
  }
  return json;
}

function getDataURLFromUpload(input) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = ({ target }) => resolve(target.result);
    const file = input.files[0];
    if (!file) {
      resolve(null);
      return;
    }
    reader.readAsText(file);
  });
}

function backupFile() {
  const rv = storage.getStorage();
  saveAs(new Blob([JSON.stringify(rv)], { type: 'application/json;charset=utf-8' }), 'bttv_settings.backup');
}

function About({ onClose }) {
  const fileImportRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function importFile(target) {
    setImporting(true);

    const data = loadJSON(await getDataURLFromUpload(target));
    if (data == null) {
      return;
    }

    let importLegacy = true;
    const sanitizedData = {};
    for (const key of Object.keys(data)) {
      const nonPrefixedKey = key.split('bttv_')[1];
      storage.set(nonPrefixedKey, data[key]);
      sanitizedData[nonPrefixedKey] = data[key];
      if (nonPrefixedKey === SETTINGS_STORAGE_KEY) {
        importLegacy = false;
      }
    }
    if (importLegacy) {
      storage.set(SETTINGS_STORAGE_KEY, loadLegacySettings(sanitizedData));
    }
    setTimeout(() => window.location.reload(), 1000);
  }

  function resetDefault() {
    setResetting(true);
    storage.set(SETTINGS_STORAGE_KEY, null);
    setTimeout(() => window.location.reload(), 1000);
  }

  return (
    <>
      <div className={header.content}>
        <PanelGroup>
          <Panel header={formatMessage({ defaultMessage: 'ReYohoho' })}>
            <div className={styles.socials}>
              <ul>
                <li>
                  <p className={classNames(header.heading, header.upper)}>
                    {formatMessage({ defaultMessage: 'Version' })}
                  </p>
                </li>
                <li>
                  <p className={header.description}>
                    BetterTTV Version {EXT_VER}
                  </p>
                </li>
                <li>
                  <p className={header.description}>
                    ReYohoho Version {REYOHOHO_VER}
                  </p>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://t.me/reyohoho_twitch_ext">
                    Updates(Следите за обновлениями в TG!)
                  </a>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://github.com/reyohoho/reyohoho-betterttv">
                    GitHub Repository
                  </a>
                </li>
              </ul>
              <ul>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://boosty.to/sentryward/donate">
                    Boosty
                  </a>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://t.me/send?start=IV7outCFI5B0">
                    Crypto
                  </a>
                </li>
                <li>
                  <p className={header.description}>
                    USDT TRON – TRC20: TYH7kvPryhSCFWjdRVw68VZ1advYaZw3yJ
                  </p>
                </li>
              </ul>
              <ul>
                <li>
                  <p className={header.description}>
                    This is a fork of BetterTTV
                  </p>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://betterttv.com/">
                    Support Original Authors
                  </a>
                </li>
                <li>
                  <a target="_blank" rel="noreferrer" href="https://github.com/night/betterttv">
                    Original Repository
                  </a>
                </li>
              </ul>
            </div>
          </Panel>
          <Panel header={formatMessage({ defaultMessage: 'Settings' })}>
            <div className={styles.buttons}>
              <IconButton
                className={styles.button}
                appearance="primary"
                onClick={backupFile}
                disabled={resetting}
                icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faDownload} />}>
                {formatMessage({ defaultMessage: 'Backup Settings' })}
              </IconButton>
              <input type="file" hidden ref={fileImportRef} onChange={({ target }) => importFile(target)} />
              <IconButton
                className={styles.button}
                appearance="primary"
                onClick={() => {
                  const currentFileImportRef = fileImportRef.current;
                  if (currentFileImportRef == null) {
                    return;
                  }
                  currentFileImportRef.click();
                }}
                disabled={resetting}
                loading={importing}
                icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faUpload} />}>
                {formatMessage({ defaultMessage: 'Import Settings' })}
              </IconButton>
              <IconButton
                icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faRedo} />}
                className={styles.button}
                loading={resetting}
                disabled={importing}
                color="red"
                onClick={() => resetDefault()}>
                {formatMessage({ defaultMessage: 'Reset to Default' })}
              </IconButton>
            </div>
          </Panel>
          <Panel>
            <p className={header.description}>
              {formatMessage({ defaultMessage: 'Version {version}' }, { version: EXT_VER })}
            </p>
          </Panel>
        </PanelGroup>
      </div>
      <div className={header.header}>
        <CloseButton onClose={onClose} className={header.closeButton} />
      </div>
    </>
  );
}

export default About;

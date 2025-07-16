import * as faGear from '@fortawesome/free-solid-svg-icons/faGear';
import * as faSearch from '@fortawesome/free-solid-svg-icons/faSearch';
import * as faTimes from '@fortawesome/free-solid-svg-icons/faTimes';
import * as faSync from '@fortawesome/free-solid-svg-icons/faSync';
import {Icon} from '@rsuite/icons';
import React, {useEffect, useRef, useState} from 'react';
import IconButton from 'rsuite/IconButton';
import Input from 'rsuite/Input';
import InputGroup from 'rsuite/InputGroup';
import FontAwesomeSvgIcon from '../../../common/components/FontAwesomeSvgIcon.jsx';
import formatMessage from '../../../i18n/index.js';
import globalEmotes from '../../emotes/global-emotes.js';
import watcher from '../../../watcher.js';
import {initializeProxyCheck} from '../../../utils/proxy.js';
import styles from './Header.module.css';

function Header({value, onChange, toggleWhisper, selected, ...props}) {
  const searchInputRef = useRef(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const currentSearchInputRef = searchInputRef.current;
    if (currentSearchInputRef == null) {
      return;
    }
    document.activeElement.blur();
    setTimeout(() => currentSearchInputRef.focus(), 1);
  }, []);

  const handleSettingsClick = async () => {
    const {default: settings} = await import('../../settings/index.js');
    settings.openSettings();
  };

  const handleReloadEmotes = async () => {
    if (isReloading) {
      return;
    }

    setIsReloading(true);

    try {
      await initializeProxyCheck(true);
      await Promise.all([globalEmotes.updateGlobalEmotes(), new Promise((resolve) => {
        watcher.emit('channel.updated');
        setTimeout(resolve, 100);
      })]);
    } catch (error) {
      console.error('[BTTV] Error reloading emotes:', error);
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div {...props}>
      <InputGroup>
        <InputGroup.Addon className={styles.searchPrefix}>
          <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faSearch} />
        </InputGroup.Addon>
        <Input
          placeholder={selected == null ? formatMessage({defaultMessage: 'Search for Emotes'}) : selected.code}
          value={value}
          onChange={onChange}
          inputRef={searchInputRef}
        />
      </InputGroup>
      <IconButton
        icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faSync} />}
        appearance="subtle"
        onClick={handleReloadEmotes}
        disabled={isReloading}
        title={formatMessage({defaultMessage: 'Reload Emotes'})}
        className={isReloading ? styles.reloading : ''}
      />
      <IconButton
        icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faGear} />}
        appearance="subtle"
        onClick={handleSettingsClick}
      />
      <IconButton
        icon={<Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faTimes} />}
        appearance="subtle"
        onClick={toggleWhisper}
      />
    </div>
  );
}

export default React.memo(
  Header,
  (oldProps, newProps) =>
    oldProps.selected === newProps.selected &&
    newProps.value === oldProps.value &&
    newProps.toggleWhisper === oldProps.toggleWhisper
);

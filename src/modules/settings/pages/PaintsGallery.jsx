import {Icon} from '@rsuite/icons';
import * as faExternalLinkAlt from '@fortawesome/free-solid-svg-icons/faExternalLinkAlt';
import React from 'react';
import Button from 'rsuite/Button';
import Panel from 'rsuite/Panel';
import PanelGroup from 'rsuite/PanelGroup';
import FontAwesomeSvgIcon from '../../../common/components/FontAwesomeSvgIcon.jsx';
import formatMessage from '../../../i18n/index.js';
import CloseButton from '../components/CloseButton.jsx';
import header from '../styles/header.module.css';
import styles from '../styles/paints-gallery.module.css';

function PaintsGallery({onClose}) {
  const handleOpenWebsite = () => {
    window.open('https://ext.rhhhhhhh.live/paints', '_blank');
  };

  return (
    <>
      <div className={header.content}>
        <PanelGroup>
          <Panel header={formatMessage({defaultMessage: 'Paints Gallery'})}>
            <div className={styles.redirectContainer}>
              <div className={styles.redirectIcon}>🎨</div>
              <h2 className={styles.redirectTitle}>
                {formatMessage({defaultMessage: 'Установка расцветки ника и кастомного бейджика перенесена на сайт'})}
              </h2>
              <Button
                appearance="primary"
                size="lg"
                className={styles.redirectButton}
                onClick={handleOpenWebsite}>
                <Icon as={FontAwesomeSvgIcon} fontAwesomeIcon={faExternalLinkAlt} />{' '}
                {formatMessage({defaultMessage: 'Перейти на сайт'})}
              </Button>
            </div>
          </Panel>
        </PanelGroup>
      </div>
      <div className={header.header}>
        <CloseButton onClose={onClose} className={header.closeButton} />
      </div>
    </>
  );
}

export default PaintsGallery;


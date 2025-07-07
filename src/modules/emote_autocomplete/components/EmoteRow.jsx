import classNames from 'classnames';
import React from 'react';
import {Button} from 'rsuite';
import Emote from '../../../common/components/Emote.jsx';
import {getEmotePageUrl} from '../../../utils/emote.js';
import styles from './EmoteRow.module.css';

export default function EmoteRow({key, index, emote, active, setSelected, handleAutocomplete}) {
  function handleMouseDown(e) {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      const pageUrl = getEmotePageUrl(emote);
      if (pageUrl) {
        const originalOpacity = e.target.style.opacity;
        e.target.style.opacity = '0.5';

        setTimeout(() => {
          e.target.style.opacity = originalOpacity;
        }, 200);

        window.open(pageUrl, '_blank');
      }
    }
  }

  return (
    <Button
      key={key}
      onMouseOver={() => setSelected(index)}
      onClick={() => handleAutocomplete(emote)}
      onMouseDown={handleMouseDown}
      appearance="subtle"
      className={classNames(styles.emoteRow, {[styles.active]: active})}>
      <div className={styles.emoteInfoContainer}>
        <Emote className={styles.emote} emote={emote} />
        <div>{emote.code}</div>
      </div>
      <div className={styles.categoryName}>{emote.category.displayName}</div>
    </Button>
  );
}

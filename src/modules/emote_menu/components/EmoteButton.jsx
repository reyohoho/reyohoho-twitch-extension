import classNames from 'classnames';
import React from 'react';
import Emote from '../../../common/components/Emote.jsx';
import {getEmotePageUrl} from '../../../utils/emote.js';
import styles from './EmoteButton.module.css';

export default function EmoteButton({emote, onClick, onMouseOver, active}) {
  const locked = emote.metadata?.isLocked?.() ?? false;

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
    <button
      onClick={() => onClick(emote)}
      onMouseOver={() => onMouseOver(emote)}
      onFocus={() => onMouseOver(emote)}
      onMouseDown={handleMouseDown}
      type="button"
      className={classNames(styles.emote, active ? styles.active : null)}>
      <Emote emote={emote} locked={locked} />
    </button>
  );
}

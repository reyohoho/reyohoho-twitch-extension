import React, {useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import formatMessage from '../../i18n/index.js';
import {getEmotePageUrl} from '../../utils/emote.js';
import {createSrc, DEFAULT_SIZES} from '../../utils/image.js';
import styles from './EmoteInfoModal.module.css';

function EmoteInfoModal({emote, onClose}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!emote) {
    return null;
  }

  const channelName = emote.channel && (emote.channel.displayName || emote.channel.name);
  const pageUrl = getEmotePageUrl(emote);
  const emoteImageSrc = createSrc(emote.images, false, DEFAULT_SIZES[0]);

  const handleOpenPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pageUrl) {
      window.open(pageUrl, '_blank');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <h2>{emote.code}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.emoteImageContainer}>
            <img 
              src={emoteImageSrc} 
              alt={emote.code} 
              className={styles.emoteImage}
            />
          </div>
          
          <div className={styles.info}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{formatMessage({defaultMessage: 'Name'})}:</span>
              <span className={styles.infoValue}>{emote.code}</span>
            </div>
            
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{formatMessage({defaultMessage: 'Provider'})}:</span>
              <span className={styles.infoValue}>{emote.category.displayName}</span>
            </div>
            
            {channelName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{formatMessage({defaultMessage: 'Channel'})}:</span>
                <span className={styles.infoValue}>{channelName}</span>
              </div>
            )}
            
            {emote.animated && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{formatMessage({defaultMessage: 'Animated'})}:</span>
                <span className={styles.infoValue}>{formatMessage({defaultMessage: 'Yes'})}</span>
              </div>
            )}
          </div>
          
          {pageUrl && (
            <div className={styles.actions}>
              <button className={styles.pageButton} onClick={handleOpenPage}>
                {formatMessage({defaultMessage: 'Open Emote Page'})}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default class EmoteInfoWindow {
  constructor() {
    this.container = null;
    this.root = null;
    this.isOpenFlag = false;
    this.currentEmote = null;
  }

  open(emote) {
    if (this.isOpenFlag) {
      this.close();
    }

    if (!emote) {
      return;
    }

    this.currentEmote = emote;
    this.container = document.createElement('div');
    this.container.id = 'bttv-emote-info-container';
    document.body.appendChild(this.container);

    this.root = createRoot(this.container);
    this.root.render(<EmoteInfoModal emote={emote} onClose={() => this.close()} />);
    
    this.isOpenFlag = true;
  }

  close() {
    if (!this.isOpenFlag) return;

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }

    this.currentEmote = null;
    this.isOpenFlag = false;
  }

  isOpen() {
    return this.isOpenFlag;
  }
}


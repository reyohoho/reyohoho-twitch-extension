/* eslint-disable jsx-a11y/control-has-associated-label */
import classNames from 'classnames';
import React, {useState, useEffect, useRef, useCallback} from 'react';
import Whisper from 'rsuite/Whisper';
import LogoIcon from '../../../common/components/LogoIcon.jsx';
import emoteMenuViewStore from '../../../common/stores/emote-menu-view-store.js';
import {EmoteMenuTips} from '../../../constants.js';
import keyCodes from '../../../utils/keycodes.js';
import {isMac} from '../../../utils/window.js';
import styles from './Button.module.css';
import EmoteMenuPopover from './EmoteMenuPopover.jsx';
import {markTipAsSeen} from './Tip.jsx';

export default function Button({
  isLegacy = false,
  appendToChat,
  className,
  boundingQuerySelector,
  containerQuerySelector,
}) {
  const [loaded, setLoaded] = useState(false);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const whisperRef = useRef(null);

  const toggleWhisper = useCallback(whisperOpen ? () => whisperRef.current.close() : () => whisperRef.current.open(), [
    whisperOpen,
    whisperRef,
  ]);

  useEffect(() => {
    function callback() {
      setLoaded(true);
    }

    if (loaded || emoteMenuViewStore.isLoaded()) {
      callback();
      return;
    }

    const removeListener = emoteMenuViewStore.once('updated', callback);
    // eslint-disable-next-line consistent-return
    return () => {
      removeListener();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const isPressed =
        (event.altKey && event.key === keyCodes.E) || (isMac() && event.ctrlKey && event.key === keyCodes.E);
      if (!isPressed) {
        return;
      }

      event.preventDefault();

      markTipAsSeen(EmoteMenuTips.EMOTE_MENU_HOTKEY);

      toggleWhisper();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleWhisper]);

  return (
    <Whisper
      ref={whisperRef}
      onOpen={() => setWhisperOpen(true)}
      onClose={() => setWhisperOpen(false)}
      container={
        containerQuerySelector != null ? () => document.querySelector(containerQuerySelector) ?? undefined : undefined
      }
      trigger="click"
      placement={null} // this throws a warning but is necessary to stop rsuite from auto-respositioning
      speaker={
        <EmoteMenuPopover
          toggleWhisper={toggleWhisper}
          appendToChat={appendToChat}
          boundingQuerySelector={boundingQuerySelector}
        />
      }>
      {isLegacy ? (
        <button type="button" className={classNames(styles.legacyButton, className)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 47.5 47.5" style={{enableBackground: 'new 0 0 47.5 47.5'}} xmlSpace="preserve">
            <g transform="matrix(1.25,0,0,-1.25,0,47.5)">
              <g>
                <g clipPath="url(#clipPath16)">
                  <g transform="translate(36,19)">
                    <path style={{fill: '#ffcc4d', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none'}} d="m 0,0 c 0,-9.389 -7.611,-17 -17,-17 -9.389,0 -17,7.611 -17,17 0,9.389 7.611,17 17,17 C -7.611,17 0,9.389 0,0"/>
                  </g>
                  <g transform="translate(19,16)">
                    <path style={{fill: '#664500', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none'}} d="m 0,0 c -3.623,0 -6.027,0.422 -9,1 -0.679,0.131 -2,0 -2,-2 0,-4 4.595,-9 11,-9 6.404,0 11,5 11,9 C 11,1 9.679,1.132 9,1 6.027,0.422 3.623,0 0,0"/>
                  </g>
                  <g transform="translate(11,24)">
                    <path style={{fill: '#664500', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none'}} d="M 0,0 C 0,0 0,2 2,2 4,2 4,0 4,0 l 0,-2 c 0,0 0,-2 -2,-2 -2,0 -2,2 -2,2 l 0,2 z"/>
                  </g>
                  <g transform="translate(23,24)">
                    <path style={{fill: '#664500', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none'}} d="M 0,0 C 0,0 0,2 2,2 4,2 4,0 4,0 l 0,-2 c 0,0 0,-2 -2,-2 -2,0 -2,2 -2,2 l 0,2 z"/>
                  </g>
                  <g transform="translate(10,15)">
                    <path style={{fill: '#ffffff', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none'}} d="m 0,0 c 0,0 3,-1 9,-1 6,0 9,1 9,1 0,0 -2,-4 -9,-4 -7,0 -9,4 -9,4"/>
                  </g>
                </g>
              </g>
            </g>
            <defs>
              <clipPath id="clipPath16" clipPathUnits="userSpaceOnUse">
                <path d="M 0,38 38,38 38,0 0,0 0,38 Z"/>
              </clipPath>
            </defs>
          </svg>
        </button>
      ) : (
        <button type="button" className={classNames(styles.button, className)}>
          <LogoIcon />
        </button>
      )}
    </Whisper>
  );
}

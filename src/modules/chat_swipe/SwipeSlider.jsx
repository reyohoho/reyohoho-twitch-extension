import React, {useState, useRef} from 'react';
import {SwipeSliderData, maxVal} from './SwipeSliderBackend.js';
import twitch from '../../utils/twitch.js';

export default function SwipeSlider({children, message, user, canModerate}) {
  const [data] = useState(() => new SwipeSliderData(user?.isActor || false));
  const [transition, setTransition] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [pos, setPos] = useState(0);
  const initialRef = useRef(0);

  if (!canModerate) {
    return children;
  }

  const executeCommand = () => {
    if (!data.command || !user?.name) {
      console.warn('BTTV ChatSwipe: No command or user name available');
      return;
    }

    try {
      switch (data.command) {
        case 'ban':
          if (data.banDuration) {
            const timeoutCommand = `/timeout ${user.name} ${data.banDuration}`;
            console.log('BTTV ChatSwipe: Executing timeout:', timeoutCommand);
            twitch.sendChatMessage(timeoutCommand);
          } else {
            const banCommand = `/ban ${user.name}`;
            console.log('BTTV ChatSwipe: Executing ban:', banCommand);
            twitch.sendChatMessage(banCommand);
          }
          break;
        case 'unban':
          const unbanCommand = `/unban ${user.name}`;
          console.log('BTTV ChatSwipe: Executing unban:', unbanCommand);
          twitch.sendChatMessage(unbanCommand);
          break;
        case 'delete':
          if (message?.id) {
            const deleteCommand = `/delete ${message.id}`;
            console.log('BTTV ChatSwipe: Executing delete:', deleteCommand);
            twitch.sendChatMessage(deleteCommand);
          } else {
            const purgeCommand = `/timeout ${user.name} 1`;
            console.log('BTTV ChatSwipe: Executing purge:', purgeCommand);
            twitch.sendChatMessage(purgeCommand);
          }
          break;
        default:
          console.warn('BTTV ChatSwipe: Unknown command:', data.command);
      }
    } catch (error) {
      console.error('BTTV ChatSwipe: Error executing command:', error);
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    initialRef.current = e.pageX;
    setTracking(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e) => {
    setTracking(false);
    
    if (data.command) {
      executeCommand();
    }

    setTransition(true);
    setTimeout(() => setTransition(false), 300);
    
    data.calculate(0);
    setPos(0);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!tracking) return;
    e.preventDefault();

    const calcPos = Math.max(Math.min(e.pageX - initialRef.current, maxVal), -60);
    data.calculate(calcPos);
    setPos(calcPos);
  };

  const highlight = message?.highlight?.color || 'none';

  return (
    <div
      className="bttv-swipe-slider"
      style={{
        transform: `translateX(${pos}px)`,
        transition: transition ? 'transform 0.3s ease' : 'none',
        boxShadow: tracking ? 'black 0px 0.1rem 0.2rem' : 'none',
        position: 'relative'
      }}
    >
      <div 
        className="bttv-ban-background" 
        style={{ 
          backgroundColor: data.color, 
          width: `${Math.max(0, pos)}px`,
          opacity: data.banVis
        }}
      >
        <span className="bttv-background-text">
          {data.text}
        </span>
      </div>
      
      <div className="bttv-grabbable-wrapper">
        <div 
          className="bttv-grabbable-outer" 
          onPointerDown={handlePointerDown} 
          onPointerUp={handlePointerUp} 
          onPointerMove={handlePointerMove}
        >
          <div
            className="bttv-grabbable-inner"
            style={{
              backgroundColor: highlight,
            }}
          >
            <div className="bttv-dots" />
          </div>
        </div>
      </div>
      
      <div className="bttv-wrapped">
        {children}
      </div>
      
      <div 
        className="bttv-unban-background" 
        style={{ 
          width: `${Math.max(0, -pos)}px`,
          opacity: data.unbanVis
        }}
      >
        <span className="bttv-background-text">
          Unban
        </span>
      </div>
    </div>
  );
} 
import React, {useState, useEffect} from 'react';
import {getStaregeApiUrl, initializeStaregeDomain} from '../../utils/starege-domain.js';

export default function LogoIcon(props) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const initLogo = async () => {
      await initializeStaregeDomain();
      const url = getStaregeApiUrl('/badge.webp');
      if (url) {
        setLogoUrl(url);
      }
    };
    
    initLogo();
  }, []);

  if (!logoUrl) return null;

  return (
    <img 
      src={logoUrl} 
      alt="ReYohoho Twitch Extension" 
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      {...props}
    />
  );
}

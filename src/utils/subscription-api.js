import {getStaregeApiUrl} from './starege-domain.js';

export async function checkSubscription(twitchId) {
  try {
    const apiUrl = getStaregeApiUrl(`/api/subscription/check/${twitchId}`);
    if (!apiUrl) {
      console.warn('BTTV: No working Starege domain available');
      return { has_subscription: false, error: true };
    }

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('Failed to check subscription:', response.statusText);
      return { has_subscription: false, error: true };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { has_subscription: false, error: true };
  }
}

export function openSubscriptionPage() {
  window.open('https://ext.rhhhhhhh.live', '_blank');
}

export async function getUserPaint(twitchId, noCache = false) {
  try {
    const path = noCache 
      ? `/api/paint/${twitchId}?timestamp=${Date.now()}`
      : `/api/paint/${twitchId}`;
    const apiUrl = getStaregeApiUrl(path);
    if (!apiUrl) {
      console.warn('BTTV: No working Starege domain available');
      return { has_paint: false, error: true };
    }

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('Failed to get user paint:', response.statusText);
      return { has_paint: false, error: true };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user paint:', error);
    return { has_paint: false, error: true };
  }
}



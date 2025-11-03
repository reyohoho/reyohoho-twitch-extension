const API_BASE_URL = 'https://starege.rhhhhhhh.live/api';

export async function checkSubscription(twitchId) {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/check/${twitchId}`);
    
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
    const url = noCache 
      ? `${API_BASE_URL}/paint/${twitchId}?timestamp=${Date.now()}`
      : `${API_BASE_URL}/paint/${twitchId}`;
    const response = await fetch(url);
    
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

export async function setUserPaint(twitchId, paintId) {
  try {
    const response = await fetch(`${API_BASE_URL}/paint/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitch_id: twitchId,
        paint_id: paintId,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to set user paint:', response.statusText);
      return { success: false, error: true };
    }
    
    const result = await response.json();
    return { success: true, ...result };
  } catch (error) {
    console.error('Error setting user paint:', error);
    return { success: false, error: true };
  }
}

export async function deleteUserPaint(twitchId) {
  try {
    const response = await fetch(`${API_BASE_URL}/paint/${twitchId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      console.error('Failed to delete user paint:', response.statusText);
      return { success: false, error: true };
    }
    
    const result = await response.json();
    return { success: true, ...result };
  } catch (error) {
    console.error('Error deleting user paint:', error);
    return { success: false, error: true };
  }
}



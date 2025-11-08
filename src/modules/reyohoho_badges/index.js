import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import {getCurrentUser} from '../../utils/user.js';
import {getStaregeApiUrl, initializeStaregeDomain} from '../../utils/starege-domain.js';
import watcher from '../../watcher.js';
import './style.css';

const badgeUsers = new Map();
const badgeRequestCache = new Map();
const pendingRequests = new Set();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ReyohohoBadgesModule {
  constructor() {
    console.log('BTTV: Reyohoho badges module initialized (on-demand loading)');
    this.currentUserId = null;

    this.initializeDomain();
  }

  async initializeDomain() {
    await initializeStaregeDomain();
    
    this.initializeCurrentUser();

    setTimeout(() => {
      this.registerCurrentUser();
    }, 2000);
  }

  async initializeCurrentUser() {
    try {
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id) {
        this.currentUserId = currentUser.id;
        await this.fetchUserBadge(currentUser.id);
      }
    } catch (error) {
      console.error('BTTV: Failed to initialize current user badge:', error);
    }
  }

  getBadge(userId) {
    const cached = badgeUsers.get(userId);
    if (cached) {
      return cached;
    }

    const cacheEntry = badgeRequestCache.get(userId);
    if (cacheEntry) {
      const now = Date.now();
      if (now - cacheEntry.timestamp < CACHE_DURATION) {
        return cacheEntry.badge || null;
      }
    }

    if (pendingRequests.has(userId)) {
      return null;
    }

    this.fetchUserBadge(userId);
    return null;
  }

  async fetchUserBadge(userId) {
    if (pendingRequests.has(userId)) {
      return null;
    }

    pendingRequests.add(userId);

    try {
      const apiUrl = getStaregeApiUrl(`/api/badge-users/${userId}`);
      if (!apiUrl) {
        console.warn('BTTV: No working Starege domain available');
        return null;
      }

      const response = await fetch(apiUrl);
      
      if (response.ok) {
        if (response.status === 204) {
          badgeRequestCache.set(userId, {
            badge: null,
            timestamp: Date.now(),
          });
          return null;
        }
        const {userId: id, badgeUrl} = await response.json();
        const badge = {
          url: badgeUrl,
          description: 'ReYohoho Badge',
        };
        
        badgeUsers.set(id, badge);
        badgeRequestCache.set(userId, {
          badge,
          timestamp: Date.now(),
        });
        
        watcher.emit('reyohoho_badge.updated', userId);
        
        return badge;
      }
    } catch (error) {
      console.error(`BTTV: Failed to fetch badge for user ${userId}:`, error);
    } finally {
      pendingRequests.delete(userId);
    }
    
    return null;
  }

  async registerUser(userId) {
    try {
      const apiUrl = getStaregeApiUrl('/api/badge-users');
      if (!apiUrl) {
        console.warn('BTTV: No working Starege domain available');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId}),
      });
    } catch (error) {
      console.error(`BTTV: Failed to register user ${userId}:`, error);
    }
  }

  async registerCurrentUser() {
    try {
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id) {
        await this.registerUser(currentUser.id);
      }
    } catch (error) {
      console.error('BTTV: Failed to register current user:', error);
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new ReyohohoBadgesModule()]);

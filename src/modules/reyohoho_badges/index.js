import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import {getCurrentUser} from '../../utils/user.js';
import './style.css';

const badgeUsers = new Map();

class ReyohohoBadgesModule {
  constructor() {
    console.log('BTTV: Reyohoho badges module initialized');
    this.loadBadges();

    setTimeout(() => {
      this.registerCurrentUser();
    }, 2000);
  }

  async loadBadges() {
    try {
      const response = await fetch('https://starege.rhhhhhhh.live/api/badge-users');
      const badges = await response.json();

      if (badges && Array.isArray(badges)) {
        badges.forEach(({userId, badgeUrl}) => {
          badgeUsers.set(userId, {
            url: badgeUrl,
            description: 'ReYohoho Badge',
          });
        });
      }
    } catch (error) {
      console.error('BTTV: Failed to load Reyohoho badges:', error);
    }
  }

  getBadge(userId) {
    return badgeUsers.get(userId);
  }

  async registerUser(userId) {
    try {
      const response = await fetch('https://starege.rhhhhhhh.live/api/badge-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId}),
      });
      await this.loadBadges();
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

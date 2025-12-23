import { SettingIds, UsernameFlags, EmoteTypeFlags } from '../../constants.js';
import settings from '../../settings.js';
import { hasFlag } from '../../utils/flags.js';
import colors from '../../utils/colors.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import seventvCosmetics from '../seventv/cosmetics.js';
import './style.css';

const userCache = new Map();
const USER_CACHE_TIMEOUT = 30 * 60 * 1000;

class ColoredMentionsModule {
  constructor() {
    watcher.on('chat.message', (element, messageObj) => this.onMessage(element, messageObj));
    watcher.on('chat.seventv_message', (element, messageObj) => this.onMessage(element, messageObj));
    
    watcher.on('chat.message', (element, messageObj) => this.collectUserData(messageObj));
    watcher.on('chat.seventv_message', (element, messageObj) => this.collectUserData(messageObj));
  }

  isEnabled() {
    return hasFlag(settings.get(SettingIds.USERNAMES), UsernameFlags.COLORED_MENTIONS);
  }

  collectUserData(messageObj) {
    if (!messageObj?.user) return;

    const { userID, userLogin, userDisplayName, color } = messageObj.user;
    if (!userID || !userLogin) return;

    const username = userLogin.toLowerCase();
    const existing = userCache.get(username);

    if (!existing || Date.now() - existing.timestamp > USER_CACHE_TIMEOUT / 2) {
      const userData = {
        userId: userID,
        userLogin,
        displayName: userDisplayName,
        color: color || '#9147ff',
        timestamp: Date.now(),
      };
      userCache.set(username, userData);
      
      if (userDisplayName && userDisplayName.toLowerCase() !== username) {
        userCache.set(userDisplayName.toLowerCase(), userData);
      }
    }
  }

  getUserData(username) {
    const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
    if (!normalizedUsername) return null;
    
    const cached = userCache.get(normalizedUsername);
    
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TIMEOUT) {
      return cached;
    }

    const messages = twitch.getChatMessages();
    for (const { message } of messages) {
      if (!message?.user) continue;
      
      const { userID, userLogin, userDisplayName, color } = message.user;
      
      if (
        userLogin?.toLowerCase() === normalizedUsername ||
        userDisplayName?.toLowerCase() === normalizedUsername
      ) {
        const userData = {
          userId: userID,
          userLogin,
          displayName: userDisplayName,
          color: color || '#9147ff',
          timestamp: Date.now(),
        };
        userCache.set(normalizedUsername, userData);
        return userData;
      }
    }

    return cached || null;
  }

  calculateColor(color) {
    if (!hasFlag(settings.get(SettingIds.USERNAMES), UsernameFlags.READABLE)) {
      return color;
    }
    return colors.calculateColor(color, settings.get(SettingIds.DARKENED_MODE));
  }

  onMessage(element, messageObj) {
    if (!this.isEnabled()) return;

    setTimeout(() => {
      this.processMentions(element);
    }, 0);
  }

  processMentions(element) {
    if (!this.isEnabled()) return;

    const mentionSelectors = [
      'span[data-a-target="chat-message-mention"]',
      '.mention-fragment',
      '.mention-fragment--recipient',
    ];

    const mentionElements = element.querySelectorAll(mentionSelectors.join(','));
    
    for (const mentionEl of mentionElements) {
      if (mentionEl.hasAttribute('data-bttv-colored-mention')) continue;
      
      this.colorMention(mentionEl);
    }
  }

  async colorMention(mentionEl) {
    const mentionText = mentionEl.textContent || mentionEl.innerText;
    const username = mentionText.replace(/^@/, '').toLowerCase();
    
    if (!username) return;

    const userData = this.getUserData(username);
    if (!userData) return;

    mentionEl.setAttribute('data-bttv-colored-mention', 'true');
    mentionEl.setAttribute('data-bttv-mention-login', userData.userLogin);

    const color = this.calculateColor(userData.color);
    mentionEl.style.color = color;
    mentionEl.classList.add('bttv-colored-mention');

    mentionEl.addEventListener('click', (e) => this.handleMentionClick(e, userData.userLogin));

    const paintEnabled = hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.SEVENTV_COSMETICS);
    if (paintEnabled && seventvCosmetics.isEnabled() && userData.userId) {
      const text = mentionEl.textContent;
      
      if (!mentionEl.querySelector('.seventv-paint') && !mentionEl.classList.contains('seventv-paint')) {
        const paintSpan = document.createElement('span');
        paintSpan.textContent = text;
        paintSpan.style.color = color;
        
        mentionEl.textContent = '';
        mentionEl.appendChild(paintSpan);
        
        await seventvCosmetics.applyUserPaint(paintSpan, userData.userId);
      }
    }
  }

  handleMentionClick(e, userLogin) {
    e.preventDefault();
    e.stopPropagation();
    
    // Close any existing viewer card
    document.querySelector('button[data-test-selector="close-viewer-card"]')?.click();
    
    // Find a message from this user and click on their username to open viewer card
    const messages = twitch.getChatMessages();
    for (const { element, message } of messages) {
      if (message?.user?.userLogin?.toLowerCase() === userLogin.toLowerCase()) {
        const usernameEl = element.querySelector('.chat-author__display-name, .chat-author__intl-login');
        if (usernameEl) {
          usernameEl.click();
          return;
        }
      }
    }
    
    // Fallback: if user hasn't sent a message, open profile in new tab
    window.open(`https://www.twitch.tv/${userLogin}`, '_blank');
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of userCache.entries()) {
      if (now - value.timestamp > USER_CACHE_TIMEOUT) {
        userCache.delete(key);
      }
    }
  }
}

const coloredMentionsModule = new ColoredMentionsModule();

setInterval(() => {
  coloredMentionsModule.cleanupCache();
}, 10 * 60 * 1000);

export default coloredMentionsModule;


import {PlatformTypes, SettingIds} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import settings from '../../settings.js';
import {formatChatUser} from '../chat/index.js';
import {getCurrentUser} from '../../utils/user.js';
import './style.css';

class ChatSwipeModule {
  constructor() {
    console.log('BetterTTV ChatSwipe: Module initializing...');

    this.processedElements = new WeakSet();

    watcher.on('chat.message', (element, messageObj) => this.onChatMessage(element, messageObj));

    settings.on(`changed.${SettingIds.CHAT_SWIPE}`, () => {
      console.log('BetterTTV ChatSwipe: Setting changed, clearing processed elements');
      this.processedElements = new WeakSet();
    });

    console.log('BetterTTV ChatSwipe: Module initialized successfully');
  }

  canModerate(messageObj) {
    const isModerator = twitch.getCurrentUserIsModerator();
    const isOwner = twitch.getCurrentUserIsOwner();

    if (!isModerator && !isOwner) {
      console.debug('BetterTTV ChatSwipe: User is not moderator or owner');
      return false;
    }

    const user = formatChatUser(messageObj);
    if (!user) {
      console.debug('BetterTTV ChatSwipe: Could not format chat user');
      return false;
    }

    const currentUser = getCurrentUser();
    if (currentUser && user.id === currentUser.id) {
      return false;
    }

    if (user.mod || messageObj.badges?.broadcaster || messageObj.badges?.moderator) {
      console.debug('BetterTTV ChatSwipe: Target user is mod/broadcaster, cannot moderate');
      return false;
    }

    console.debug('BetterTTV ChatSwipe: Can moderate user:', user.name);
    return true;
  }

  addSwipeHandlers(element, messageObj) {
    if (this.processedElements.has(element)) {
      return;
    }

    const user = formatChatUser(messageObj);
    const canModerate = this.canModerate(messageObj);

    if (!canModerate) {
      return;
    }

    console.log('BetterTTV ChatSwipe: Adding swipe handlers for user:', user.name);

    this.processedElements.add(element);

    const swipeContainer = this.createSwipeContainer(element);

    this.setupSwipeHandlers(swipeContainer, user, messageObj);
  }

  createSwipeContainer(originalElement) {
    const container = document.createElement('div');
    container.className = 'bttv-swipe-slider';

    const banBackground = document.createElement('div');
    banBackground.className = 'bttv-ban-background';
    banBackground.innerHTML = '<span class="bttv-background-text"></span>';
    banBackground.style.display = 'none';
    banBackground.style.backgroundColor = '#ffaa00';

    const unbanBackground = document.createElement('div');
    unbanBackground.className = 'bttv-unban-background';
    unbanBackground.innerHTML = '<span class="bttv-background-text">Unban</span>';
    unbanBackground.style.display = 'none';
    unbanBackground.style.backgroundColor = '#27ae60';

    const grabbableWrapper = document.createElement('div');
    grabbableWrapper.className = 'bttv-grabbable-wrapper';
    grabbableWrapper.title = 'Drag to moderate';

    const grabbableOuter = document.createElement('div');
    grabbableOuter.className = 'bttv-grabbable-outer';

    const grabbableInner = document.createElement('div');
    grabbableInner.className = 'bttv-grabbable-inner';

    const dots = document.createElement('div');
    dots.className = 'bttv-dots';

    const wrapped = document.createElement('div');
    wrapped.className = 'bttv-wrapped';

    grabbableInner.appendChild(dots);
    grabbableOuter.appendChild(grabbableInner);
    grabbableWrapper.appendChild(grabbableOuter);

    const parent = originalElement.parentNode;
    const nextSibling = originalElement.nextSibling;

    parent.removeChild(originalElement);

    originalElement.style.display = '';

    wrapped.appendChild(originalElement);

    container.appendChild(banBackground);
    container.appendChild(grabbableWrapper);
    container.appendChild(wrapped);
    container.appendChild(unbanBackground);

    if (nextSibling) {
      parent.insertBefore(container, nextSibling);
    } else {
      parent.appendChild(container);
    }

    return {
      container,
      banBackground,
      unbanBackground,
      grabbableWrapper,
      grabbableOuter,
      wrapped,
      originalElement,
    };
  }

  setupSwipeHandlers(swipeContainer, user, messageObj) {
    const {container, banBackground, unbanBackground, grabbableOuter} = swipeContainer;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let initialPos = 0;

    const updateVisuals = (deltaX) => {
      const pos = Math.max(Math.min(deltaX, 300), -60);

      container.style.transform = `translateX(${pos}px)`;

      banBackground.style.display = 'none';
      unbanBackground.style.display = 'none';

      if (pos > 0) {
        banBackground.style.display = 'flex';
        banBackground.style.width = `${pos}px`;

        const banText = banBackground.querySelector('.bttv-background-text');
        if (pos > 40 && pos < 80) {
          banText.textContent = 'Delete';
          banBackground.style.backgroundColor = '#e67e22';
          banText.style.opacity = '1';
        } else if (pos >= 80 && pos < 300) {
          const timeoutDuration = this.calculateTimeoutDuration(pos);
          banText.textContent = `Timeout ${timeoutDuration}`;
          banBackground.style.backgroundColor = '#d35400';
          banText.style.opacity = '1';
        } else if (pos >= 300) {
          banText.textContent = 'Ban';
          banBackground.style.backgroundColor = '#c0392b';
          banText.style.opacity = '1';
        } else {
          banText.textContent = '';
          banBackground.style.backgroundColor = 'transparent';
          banText.style.opacity = '0';
        }
      } else if (pos < 0) {
        unbanBackground.style.display = 'flex';
        unbanBackground.style.width = `${Math.abs(pos)}px`;

        const unbanText = unbanBackground.querySelector('.bttv-background-text');
        unbanText.style.opacity = Math.abs(pos) > 40 ? '1' : '0';
      }
    };

    const handleStart = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;

      e.stopPropagation();
      startX = e.pageX || e.touches?.[0]?.pageX || 0;
      currentX = startX;
      isDragging = true;

      grabbableOuter.style.cursor = 'grabbing';
      grabbableOuter.setPointerCapture?.(e.pointerId);

      console.log('BetterTTV ChatSwipe: Started dragging');
    };

    const handleMove = (e) => {
      if (!isDragging) return;

      e.preventDefault();
      currentX = e.pageX || e.touches?.[0]?.pageX || 0;
      const deltaX = currentX - startX;

      updateVisuals(deltaX);
    };

    const handleEnd = (e) => {
      if (!isDragging) return;

      isDragging = false;
      grabbableOuter.style.cursor = 'grab';
      grabbableOuter.releasePointerCapture?.(e.pointerId);

      const deltaX = currentX - startX;
      console.log('BetterTTV ChatSwipe: Ended dragging, deltaX:', deltaX);

      if (Math.abs(deltaX) > 40) {
        this.executeSwipeCommand(deltaX, user, messageObj);
      }

      container.style.transition = 'transform 0.3s ease';
      container.style.transform = 'translateX(0px)';
      banBackground.style.width = '0px';
      unbanBackground.style.width = '0px';
      banBackground.style.display = 'none';
      unbanBackground.style.display = 'none';

      setTimeout(() => {
        container.style.transition = 'none';
      }, 300);

      startX = 0;
      currentX = 0;
    };

    grabbableOuter.addEventListener('pointerdown', handleStart);
    grabbableOuter.addEventListener('pointermove', handleMove);
    grabbableOuter.addEventListener('pointerup', handleEnd);
    grabbableOuter.addEventListener('pointerleave', handleEnd);
  }

  calculateTimeoutDuration(position) {
    const maxDistance = 300;
    const maxSeconds = 1209600; // 14 days
    const normalizedDistance = Math.min((position - 80) / (maxDistance - 80), 1);
    const timeoutSeconds = Math.floor(Math.pow(normalizedDistance, 10) * maxSeconds) || 600; // Default 10 minutes

    if (timeoutSeconds < 60) {
      return `${timeoutSeconds}s`;
    } else if (timeoutSeconds < 3600) {
      return `${Math.round(timeoutSeconds / 60)}m`;
    } else if (timeoutSeconds < 86400) {
      return `${Math.round(timeoutSeconds / 3600)}h`;
    } else {
      return `${Math.round(timeoutSeconds / 86400)}d`;
    }
  }

  executeSwipeCommand(deltaX, user, messageObj) {
    try {
      if (deltaX < -40) {
        // Unban
        const unbanCommand = `/unban ${user.name}`;
        console.log('BetterTTV ChatSwipe: Executing unban:', unbanCommand);
        twitch.sendChatMessage(unbanCommand);
      } else if (deltaX > 40 && deltaX < 80) {
        // Delete
        if (messageObj.id) {
          const deleteCommand = `/delete ${messageObj.id}`;
          console.log('BetterTTV ChatSwipe: Executing delete:', deleteCommand);
          twitch.sendChatMessage(deleteCommand);
        } else {
          const purgeCommand = `/timeout ${user.name} 1`;
          console.log('BetterTTV ChatSwipe: Executing purge:', purgeCommand);
          twitch.sendChatMessage(purgeCommand);
        }
      } else if (deltaX >= 80) {
        // Timeout or Ban
        if (deltaX >= 300) {
          const banCommand = `/ban ${user.name}`;
          console.log('BetterTTV ChatSwipe: Executing ban:', banCommand);
          twitch.sendChatMessage(banCommand);
        } else {
          const timeoutSeconds = this.calculateTimeoutSeconds(deltaX);
          const timeoutCommand = `/timeout ${user.name} ${timeoutSeconds}`;
          console.log('BetterTTV ChatSwipe: Executing timeout:', timeoutCommand);
          twitch.sendChatMessage(timeoutCommand);
        }
      }
    } catch (error) {
      console.error('BetterTTV ChatSwipe: Error executing command:', error);
    }
  }

  calculateTimeoutSeconds(position) {
    const maxDistance = 300;
    const maxSeconds = 1209600;
    const normalizedDistance = Math.min((position - 80) / (maxDistance - 80), 1);
    return Math.floor(Math.pow(normalizedDistance, 10) * maxSeconds) || 600;
  }

  onChatMessage(element, messageObj) {
    if (!element || !messageObj) {
      console.debug('BetterTTV ChatSwipe: Missing element or messageObj');
      return;
    }

    const swipeEnabled = settings.get(SettingIds.CHAT_SWIPE, true);

    if (!swipeEnabled) {
      console.debug('BetterTTV ChatSwipe: Swipe disabled in settings');
      return;
    }

    console.debug('BetterTTV ChatSwipe: Processing message from', messageObj.user?.userLogin);

    setTimeout(() => {
      try {
        this.addSwipeHandlers(element, messageObj);
      } catch (error) {
        console.error('BetterTTV ChatSwipe: Error adding swipe handlers:', error);
      }
    }, 100);
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new ChatSwipeModule()]);

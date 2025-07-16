import {ChatFlags, DeletedMessageTypes, PlatformTypes, SettingIds} from '../../constants.js';
import settings from '../../settings.js';
import {hasFlag} from '../../utils/flags.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import twitch from '../../utils/twitch.js';
import watcher from '../../watcher.js';
import formatMessage from '../../i18n/index.js';

class HideChatEventsModule {
  constructor() {
    watcher.on('chat.message.handler', (message) => {
      this.handleMessage(message);
    });
  }

  addAdminMessageToDeletedMessage(userLogin, adminMessage, moderationType, duration) {
    const deletedMessages = settings.get(SettingIds.DELETED_MESSAGES);
    if (deletedMessages !== DeletedMessageTypes.HIGHLIGHT) {
      return;
    }

    let displayText;
    if (moderationType === 1) {
      if (duration) {
        displayText = `Timed Out (${duration}s)`;
      } else {
        displayText = 'Permanently Banned';
      }
    } else if (moderationType === 0) {
      displayText = 'Permanently Banned';
    } else {
      displayText = adminMessage;
    }

    const messages = Array.from(document.querySelectorAll('.chat-line__message')).filter((node) => {
      const message = twitch.getChatMessageObject(node);
      if (!message) {
        return false;
      }
      return message.user?.userLogin === userLogin;
    });
    messages.forEach((messageNode) => {
      const messageTextElement = messageNode.querySelector('.text-fragment');
      if (messageTextElement && !messageTextElement.querySelector('.bttv-admin-message')) {
        const adminMessageSpan = document.createElement('span');
        adminMessageSpan.className = 'bttv-admin-message';
        adminMessageSpan.style.color = '#999999';
        adminMessageSpan.style.fontStyle = 'italic';
        adminMessageSpan.textContent = ` ${displayText}`;
        messageTextElement.appendChild(adminMessageSpan);

        const originalText = messageTextElement.innerHTML;
        messageNode.addEventListener('mouseenter', () => {
          adminMessageSpan.style.display = 'none';
        });
        messageNode.addEventListener('mouseleave', () => {
          adminMessageSpan.style.display = 'inline';
        });
      }
    });
  }

  handleMessage({message, preventDefault}) {
    switch (message.type) {
      case twitch.getTMIActionTypes()?.FIRST_MESSAGE_HIGHLIGHT:
        if (!hasFlag(settings.get(SettingIds.CHAT), ChatFlags.VIEWER_GREETING)) {
          preventDefault();
        }
        break;
      case twitch.getTMIActionTypes()?.SUBSCRIPTION:
      case twitch.getTMIActionTypes()?.RESUBSCRIPTION:
      case twitch.getTMIActionTypes()?.SUBGIFT:
        if (!hasFlag(settings.get(SettingIds.CHAT), ChatFlags.SUB_NOTICE)) {
          preventDefault();
        }
        break;
      case 2:
        this.handleModerationMessage(message);
        break;
      default:
        break;
    }
  }

  handleModerationMessage(message) {
    if (message.moderationType === undefined) return;

    const currentUserIsModerator = twitch.getCurrentUserIsModerator();
    const currentUserIsOwner = twitch.getCurrentUserIsOwner();

    if (currentUserIsModerator || currentUserIsOwner) return;

    const userLogin = message.userLogin;
    const duration = message.duration;
    const reason = message.reason;

    let adminMessage;
    if (message.moderationType === 1) {
      if (duration) {
        adminMessage = formatMessage(
          {
            defaultMessage: '{userLogin} was timed out for {duration} seconds {reason}',
            id: 'modTimeout',
          },
          {
            userLogin,
            duration,
            reason: reason ? ` (${reason})` : '',
          }
        );
      } else {
        adminMessage = formatMessage(
          {
            defaultMessage: '{userLogin} was permanently banned {reason}',
            id: 'modBan',
          },
          {
            userLogin,
            reason: reason ? ` (${reason})` : '',
          }
        );
      }
    } else if (message.moderationType === 0) {
      adminMessage = formatMessage(
        {
          defaultMessage: '{userLogin} was permanently banned {reason}',
          id: 'modBan',
        },
        {
          userLogin,
          reason: reason ? ` (${reason})` : '',
        }
      );
    }

    if (adminMessage) {
      twitch.sendChatAdminMessage(adminMessage);
      setTimeout(() => {
        this.addAdminMessageToDeletedMessage(userLogin, adminMessage, message.moderationType, duration);
      }, 100);
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new HideChatEventsModule()]);

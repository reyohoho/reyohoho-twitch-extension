import {ChatFlags, PlatformTypes, SettingIds} from '../../constants.js';
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
            defaultMessage: '{userLogin} was banned {reason}',
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
          defaultMessage: '{userLogin} was banned {reason}',
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
    }
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new HideChatEventsModule()]);

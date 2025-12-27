import formatMessage from '../../../i18n/index.js';
import {getCurrentUser} from '../../../utils/user.js';
import twitch from '../../../utils/twitch.js';
import watcher from '../../../watcher.js';
import commandStore, {PermissionLevels} from '../store.js';

console.log('[mentions] Module loaded');

const mentions = new Map();
const MENTION_TIMEOUT = 5 * 60 * 1000; // 5 min

function messageTextFromAST(ast) {
  if (!ast || !Array.isArray(ast)) {
    return '';
  }
  return ast
    .map((node) => {
      switch (node.type) {
        case 0: // Text
          return node.content?.trim() || '';
        case 3: // CurrentUserHighlight
          return `@${node.content || ''}`;
        case 4: // Mention
          return `@${node.content?.recipient || ''}`;
        case 5: // Link
          return node.content?.url || '';
        case 6: // Emote
          return node.content?.alt || '';
        default:
          return '';
      }
    })
    .join(' ');
}

function isUserMentioned(messageElement, messageObj, currentUser) {
  if (!currentUser) {
    return false;
  }

  const isMentionedByDOM =
    messageElement.querySelector('.reply-line--mentioned') != null ||
    messageElement.querySelector('.mention-fragment--recipient') != null;

  if (isMentionedByDOM) {
    return true;
  }

  const {messageParts, reply} = messageObj;
  if (messageParts) {
    const messageText = messageTextFromAST(messageParts).toLowerCase();
    const userLogin = currentUser.name?.toLowerCase();
    const userDisplayName = currentUser.displayName?.toLowerCase();

    if (
      (userLogin && messageText.includes(`@${userLogin}`)) ||
      (userDisplayName && messageText.includes(`@${userDisplayName}`))
    ) {
      return true;
    }
  }

  if (reply?.parentUserLogin) {
    const replyUserLogin = reply.parentUserLogin.toLowerCase();
    const userLogin = currentUser.name?.toLowerCase();
    if (replyUserLogin === userLogin) {
      return true;
    }
  }

  return false;
}

function cleanOldMentions() {
  const now = Date.now();
  for (const [username, timestamp] of mentions.entries()) {
    if (now - timestamp > MENTION_TIMEOUT) {
      mentions.delete(username);
    }
  }
}

function onChatMessage(messageElement, messageObj) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }

  const {user, login, timestamp, messageParts} = messageObj;
  if (user == null && login == null) {
    return;
  }

  const from = login ?? user.userLogin;
  if (!from) {
    return;
  }

  const fromLower = from.toLowerCase();
  const currentUserLogin = currentUser.name?.toLowerCase();
  
  if (fromLower === currentUserLogin) {
    const messageText = messageTextFromAST(messageParts || []).toLowerCase();
    
    const mentionedUsers = [];
    for (const [username] of mentions.entries()) {
      if (isUserMentionedInText(messageText, username)) {
        mentionedUsers.push(username);
      }
    }
    
    if (mentionedUsers.length > 0) {
      for (const username of mentionedUsers) {
        mentions.delete(username);
      }
    }
    return;
  }

  if (isUserMentioned(messageElement, messageObj, currentUser)) {
    mentions.set(fromLower, timestamp || Date.now());
  }
}

function getRecentMentions() {
  cleanOldMentions();
  return Array.from(mentions.keys());
}

function isUserMentionedInText(text, username) {
  if (!text || !username) {
    return false;
  }
  const normalizedText = text.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`@${escapedUsername}(?=\\s|,|$)`, 'i');
  return regex.test(normalizedText);
}

function handleMentionsCommand() {
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }

  const currentMessage = twitch.getChatInputValue();
  
  const recentMentions = getRecentMentions();
  
  if (recentMentions.length === 0) {
    twitch.sendChatAdminMessage(
      formatMessage({defaultMessage: 'No mentions in the last 5 minutes.'})
    );
    return;
  }

  const notMentioned = recentMentions.filter(
    (username) => !isUserMentionedInText(currentMessage || '', username)
  );

  if (notMentioned.length === 0) {
    twitch.sendChatAdminMessage(
      formatMessage({defaultMessage: 'All recent mentions are already in your message.'})
    );
    return;
  }

  const mentionsText = notMentioned.map((username) => `@${username}`).join(' ');
  
  let prefixText = currentMessage || '';
  prefixText = prefixText.replace(/^\/mentions\s*/i, '').trim();
  
  if (prefixText.length > 0 && !prefixText.endsWith(' ')) {
    prefixText += ' ';
  }
  
  const finalText = prefixText + mentionsText + ' ';
  setTimeout(() => {
    twitch.setChatInputValue(finalText, true);
    
    setTimeout(() => {
      const afterValue = twitch.getChatInputValue();
      if (afterValue !== finalText) {
        twitch.setChatInputValue(finalText, true);
      }
    }, 50);
  }, 50);
}

try {
  commandStore.registerCommand({
    name: 'mentions',
    commandArgs: [],
    description: formatMessage({
      defaultMessage: 'Usage: "/mentions" - Mentions all users who mentioned you in the last 5 minutes',
    }),
    handler: (...args) => {
      try {
        handleMentionsCommand(...args);
      } catch (error) {
        console.error('[mentions] Error in handler:', error);
      }
    },
    permissionLevel: PermissionLevels.VIEWER,
  });
} catch (error) {
  console.error('[mentions] Error registering command:', error);
}

watcher.on('chat.message', onChatMessage);


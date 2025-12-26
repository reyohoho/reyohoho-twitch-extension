import { PlatformTypes, SettingIds } from '../../constants.js';
import { loadModuleForPlatforms } from '../../utils/modules.js';
import { getCurrentChannel } from '../../utils/channel.js';
import twitch from '../../utils/twitch.js';
import settings from '../../settings.js';
import watcher from '../../watcher.js';
import './style.css';

const FOLLOWS_URL = 'https://tools.2807.eu/follows?user=';
const LOGS_URL_BASE = 'https://tv.supa.sh/logs?c=';

function getUsernameFromElement(element) {
  const messageObj = twitch.getChatMessageObject(element);
  if (messageObj?.user?.userLogin) {
    return messageObj.user.userLogin.toLowerCase();
  }
  return null;
}

function openFollows(username) {
  window.open(FOLLOWS_URL + encodeURIComponent(username), '_blank');
}

function openLogs(username) {
  const currentChannel = getCurrentChannel();
  if (currentChannel?.name) {
    window.open(LOGS_URL_BASE + currentChannel.name + '&u=' + encodeURIComponent(username), '_blank');
  }
}

function createButton(title, className, svgPath, onClick) {
  const wrapper = document.createElement('div');
  wrapper.className = `bttv-user-tool-icon-wrapper ${className}`;

  const btn = document.createElement('button');
  btn.className = 'bttv-user-tool-button';
  btn.setAttribute('aria-label', title);
  btn.title = title;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="presentation">${svgPath}</svg>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  wrapper.appendChild(btn);
  return wrapper;
}

function addUserToolButtons(element) {
  if (!settings.get(SettingIds.USER_TOOLS)) return;

  const iconsContainer = element.querySelector('.chat-line__icons');
  if (!iconsContainer) return;

  const username = getUsernameFromElement(element);
  if (!username) return;

  if (element.querySelector('.bttv-user-tool-follows')) return;

  const followsBtn = createButton(
    `Follows: ${username}`,
    'bttv-user-tool-follows',
    '<path fill-rule="evenodd" d="M5 7a5 5 0 116.192 4.857A2 2 0 0113 13h1a3 3 0 013 3v2h-2v-2a1 1 0 00-1-1h-1a3.99 3.99 0 01-3-1.354A3.99 3.99 0 017 15H6a1 1 0 00-1 1v2H3v-2a3 3 0 013-3h1a2 2 0 001.808-1.143A5.002 5.002 0 015 7zm5 3a3 3 0 110-6 3 3 0 010 6z" clip-rule="evenodd"></path>',
    () => openFollows(username)
  );

  const logsBtn = createButton(
    `Logs: ${username}`,
    'bttv-user-tool-logs',
    '<path d="M4 3h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h12V5H4zm2 2h8v2H6V7zm0 4h6v2H6v-2z"></path>',
    () => openLogs(username)
  );

  iconsContainer.appendChild(followsBtn);
  iconsContainer.appendChild(logsBtn);
}

class UserToolsModule {
  constructor() {
    watcher.on('chat.message', (element) => this.onMessage(element));
    settings.on(`changed.${SettingIds.USER_TOOLS}`, () => this.onSettingChanged());
  }

  onMessage(element) {
    setTimeout(() => addUserToolButtons(element), 0);
  }

  onSettingChanged() {
    document.querySelectorAll('.bttv-user-tool-icon-wrapper').forEach((el) => el.remove());
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new UserToolsModule()]);

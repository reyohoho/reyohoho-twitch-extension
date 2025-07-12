import {EmoteTypeFlags, SettingIds, UsernameFlags, PlatformTypes, BadgeTypes, ChatFlags} from '../../constants.js';
import formatMessage from '../../i18n/index.js';
import settings from '../../settings.js';
import api from '../../utils/api.js';
import cdn from '../../utils/cdn.js';
import {getCurrentChannel} from '../../utils/channel.js';
import colors from '../../utils/colors.js';
import {hasFlag} from '../../utils/flags.js';
import {getProxyUrl} from '../../utils/proxy.js';
import twitch from '../../utils/twitch.js';
import {getPlatform} from '../../utils/window.js';
import watcher from '../../watcher.js';
import domObserver from '../../observers/dom.js';
import nicknames from '../chat_nicknames/index.js';
import emotes from '../emotes/index.js';
import splitChat from '../split_chat/index.js';
import subscribers from '../subscribers/index.js';
import reyohohoBadges from '../reyohoho_badges/index.js';
import {shouldMakeGiantEmote, extractRewardTitle} from '../../utils/giant-emotes.js';

const STEAM_LOBBY_JOIN_REGEX = /^steam:\/\/joinlobby\/\d+\/\d+\/\d+$/;
const EMOTES_TO_CAP = ['567b5b520e984428652809b6'];
const MAX_EMOTES_WHEN_CAPPED = 10;
const EMOTE_SELECTOR =
  '.bttv-animated-static-emote, .chat-line__message, .vod-message, .pinned-chat__message, .thread-message__message';
const EMOTE_HOVER_SELECTOR =
  '.bttv-animated-static-emote:hover, .chat-line__message:hover, .vod-message:hover, .pinned-chat__message:hover, .thread-message__message:hover';

const EMOTE_MODIFIERS = {
  'w!': 'bttv-emote-modifier-wide',
  'h!': 'bttv-emote-modifier-flip-horizontal',
  'v!': 'bttv-emote-modifier-flip-vertical',
  'z!': 'bttv-emote-modifier-zero-space',
  'c!': 'bttv-emote-modifier-cursed',
  'l!': 'bttv-emote-modifier-rotate-left',
  'r!': 'bttv-emote-modifier-rotate-right',
  'p!': 'bttv-emote-modifier-party',
  's!': 'bttv-emote-modifier-shake',
  ffzW: 'bttv-emote-modifier-wide',
  ffzX: 'bttv-emote-modifier-flip-horizontal',
  ffzY: 'bttv-emote-modifier-flip-vertical',
  ffzCursed: 'bttv-emote-modifier-cursed',
};
const PREFIX_EMOTE_MODIFIERS_LIST = Object.keys(EMOTE_MODIFIERS).filter((key) => key.endsWith('!'));
const SUFFIX_EMOTE_MODIFIERS_LIST = Object.keys(EMOTE_MODIFIERS).filter((key) => !key.endsWith('!'));

const badgeTemplate = (url, description) => {
  const badgeContainer = document.createElement('div');
  badgeContainer.classList.add('bttv-tooltip-wrapper', 'bttv-chat-badge-container');

  const image = new Image();
  image.src = url;
  image.alt = description;
  image.classList.add('chat-badge', 'bttv-chat-badge');
  image.setAttribute('data-a-target', 'chat-badge');
  badgeContainer.appendChild(image);

  const tooltip = document.createElement('div');
  tooltip.classList.add('bttv-tooltip', 'bttv-tooltip--up');
  tooltip.style.marginBottom = '0.9rem';
  tooltip.innerText = description;
  badgeContainer.appendChild(tooltip);

  return badgeContainer;
};
const steamLobbyJoinTemplate = (joinLink) => {
  const anchor = document.createElement('a');
  anchor.href = joinLink;
  anchor.innerText = joinLink;
  return anchor;
};

export function formatChatUser(message) {
  if (message == null) {
    return null;
  }

  const {user} = message;
  if (user == null) {
    return null;
  }

  let {badges} = message;
  if (badges == null) {
    badges = {};
  }

  return {
    id: user.userID,
    name: user.userLogin,
    displayName: user.userDisplayName,
    color: user.color,
    mod: Object.prototype.hasOwnProperty.call(badges, 'moderator'),
    subscriber:
      Object.prototype.hasOwnProperty.call(badges, 'subscriber') ||
      Object.prototype.hasOwnProperty.call(badges, 'founder'),
    badges,
  };
}

const badgeUsers = new Map();
const badgeDescriptions = {
  [BadgeTypes.DEVELOPER]: formatMessage({defaultMessage: 'NightDev Developer'}),
  [BadgeTypes.SUPPORT_VOLUNTEER]: formatMessage({defaultMessage: 'NightDev Support Volunteer'}),
  [BadgeTypes.EMOTE_APPROVER]: formatMessage({defaultMessage: 'BetterTTV Emote Approver'}),
  [BadgeTypes.TRANSLATOR]: formatMessage({defaultMessage: 'BetterTTV Translator'}),
};
const globalBots = ['nightbot', 'moobot'];
let channelBots = [];
let asciiOnly = false;
let subsOnly = false;
let modsOnly = false;
let currentMoveTarget = null;

function hasNonASCII(message) {
  for (let i = 0; i < message.length; i++) {
    if (message.charCodeAt(i) > 128) return true;
  }
  return false;
}

export function getMessagePartsFromMessageElement(message) {
  return message.querySelectorAll('span[data-a-target="chat-message-text"]');
}

function proxyBadgeUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return url;

  return `${proxyUrl}${url}`;
}

class ChatModule {
  constructor() {
    watcher.on('load', () => this.loadEmoteMouseHandler());
    settings.on(`changed.${SettingIds.EMOTES}`, () => this.loadEmoteMouseHandler());
    watcher.on('chat.message', (element, message) => this.messageParser(element, message));
    watcher.on('chat.seventv_message', (element, userId) => this.seventvMessageParser(element, userId));
    watcher.on('chat.notice_message', (element) => this.noticeMessageParser(element));
    watcher.on('chat.pinned_message', (element) => this.pinnedMessageParser(element));
    watcher.on('chat.status', (element, message) => {
      if (message?.renderBetterTTVEmotes !== true) {
        return;
      }
      this.messageReplacer(element, null);
    });
    watcher.on('channel.updated', ({bots}) => {
      channelBots = bots;
    });
    watcher.on('emotes.updated', (name) => {
      const messages = twitch.getChatMessages(name);

      for (const {message, element} of messages) {
        const user = formatChatUser(message);
        if (!user) {
          continue;
        }

        this.messageReplacer(getMessagePartsFromMessageElement(element), user);
      }
    });

    domObserver.on('div[data-test-selector="user-notice-line"]', (element) => {
      this.handleChannelPointsMessage(element);
    });

    domObserver.on('.chat-line__message-body--highlighted', (element) => {
      this.handleHighlightedMessage(element);
    });

    api.get(`cached/badges/${getPlatform() === 'twitch'}`).then((badges) => {
      badges.forEach(({providerId, badge}) => badgeUsers.set(providerId, badge));
    });
  }

  loadEmoteMouseHandler() {
    const emotesSettingValue = settings.get(SettingIds.EMOTES);
    const handleAnimatedEmotes =
      !hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_PERSONAL_EMOTES) ||
      !hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_EMOTES);

    if (handleAnimatedEmotes) {
      document.addEventListener('mousemove', this.handleEmoteMouseEvent);
    } else {
      document.removeEventListener('mousemove', this.handleEmoteMouseEvent);
    }
  }

  handleEmoteMouseEvent({target}) {
    const currentTargets = [];
    if (currentMoveTarget !== target) {
      const closestTarget = target?.closest(EMOTE_SELECTOR);
      if (closestTarget != null) {
        currentTargets.push(closestTarget);
      }
      const closestCurrentMoveTarget = currentMoveTarget?.closest(EMOTE_SELECTOR);
      if (closestCurrentMoveTarget != null) {
        currentTargets.push(closestCurrentMoveTarget);
      }
    }
    currentMoveTarget = target;

    if (currentTargets.length === 0) {
      return;
    }

    for (const currentTarget of currentTargets) {
      const isHovering = currentTarget.matches(EMOTE_HOVER_SELECTOR);
      const messageEmotes = currentTarget.querySelectorAll('.bttv-animated-static-emote img');
      for (const emote of messageEmotes) {
        const staticSrc = emote.__bttvStaticSrc ?? emote.src;
        const staticSrcSet = emote.__bttvStaticSrcSet ?? emote.srcset;
        const animatedSrc = emote.__bttvAnimatedSrc;
        const animatedSrcSet = emote.__bttvAnimatedSrcSet;
        if (!animatedSrc || !animatedSrcSet) {
          return;
        }

        if (!isHovering) {
          emote.src = staticSrc;
          emote.srcset = staticSrcSet;
        } else {
          emote.src = animatedSrc;
          emote.srcset = animatedSrcSet;
        }
      }
    }
  }

  calculateColor(color) {
    if (!hasFlag(settings.get(SettingIds.USERNAMES), UsernameFlags.READABLE)) {
      return color;
    }

    return colors.calculateColor(color, settings.get(SettingIds.DARKENED_MODE));
  }

  customBadges(user) {
    const badges = [];

    const badge = badgeUsers.get(user.id);
    if (badge) {
      badges.push(badgeTemplate(proxyBadgeUrl(badge.svg), badgeDescriptions[badge.type] ?? badge.description));
    }

    const currentChannel = getCurrentChannel();
    if (currentChannel && currentChannel.name === 'night' && subscribers.hasLegacySubscription(user.id)) {
      badges.push(badgeTemplate(proxyBadgeUrl(cdn.url('tags/subscriber.png')), 'Subscriber'));
    }

    const subscriberBadge = subscribers.getSubscriptionBadge(user.id);
    if (subscriberBadge?.url != null) {
      badges.push(
        badgeTemplate(
          proxyBadgeUrl(subscriberBadge.url),
          subscriberBadge.startedAt
            ? formatMessage(
                {defaultMessage: 'BetterTTV Pro since {date, date, medium}'},
                {date: new Date(subscriberBadge.startedAt)}
              )
            : formatMessage({defaultMessage: 'BetterTTV Pro Subscriber'})
        )
      );
    }

    const reyohohoBadge = reyohohoBadges.getBadge(user.id);
    if (reyohohoBadge && reyohohoBadge.url) {
      badges.push(badgeTemplate(reyohohoBadge.url, reyohohoBadge.description));
    }

    return badges;
  }

  asciiOnly(enabled) {
    asciiOnly = enabled;
  }

  subsOnly(enabled) {
    subsOnly = enabled;
  }

  modsOnly(enabled) {
    modsOnly = enabled;
  }

  messageReplacer(nodes, user) {
    let tokens = [];
    if (
      NodeList.prototype.isPrototypeOf.call(NodeList.prototype, nodes) ||
      HTMLCollection.prototype.isPrototypeOf.call(HTMLCollection.prototype, nodes)
    ) {
      for (const node of nodes) {
        tokens.push(...node.childNodes);
      }
    } else {
      const node = nodes[0] ?? nodes;
      tokens = node.childNodes ?? [];
    }

    const emoteModifiersEnabled = hasFlag(settings.get(SettingIds.EMOTES), EmoteTypeFlags.EMOTE_MODIFIERS);

    let cappedEmoteCount = 0;
    let lastEmoteContainer = null; // Track the last emote container for zero-width emotes

    for (let i = 0; i < tokens.length; i++) {
      const node = tokens[i];

      let data;
      if (node.nodeType === window.Node.ELEMENT_NODE && node.nodeName === 'SPAN') {
        data = node.innerText;
      } else if (node.nodeType === window.Node.TEXT_NODE) {
        data = node.data;
      } else {
        continue;
      }

      const parts = data.split(' ');
      const partMetadata = [];
      let hasModifiers = false;
      let modified = false;
      let zeroWidthEmotes = []; // Collect zero-width emotes to attach later

      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (part == null || typeof part !== 'string') {
          continue;
        }

        const steamJoinLink = part.match(STEAM_LOBBY_JOIN_REGEX);
        if (steamJoinLink) {
          parts[j] = steamLobbyJoinTemplate(steamJoinLink[0]);
          modified = true;
          continue;
        }

        if (emoteModifiersEnabled && PREFIX_EMOTE_MODIFIERS_LIST.includes(part)) {
          partMetadata[j] = {modifier: part, type: 'prefix'};
          hasModifiers = true;
        }

        let emoteIndex = j;
        let isEmoteOrSuffixModifier = false;
        let emote = emotes.getEligibleEmote(part, user);
        if (emote != null && !emote.modifier) {
          partMetadata[j] = {emote};
          isEmoteOrSuffixModifier = true;
        }

        if (emoteModifiersEnabled && SUFFIX_EMOTE_MODIFIERS_LIST.includes(part)) {
          partMetadata[j] = {modifier: part, type: 'suffix'};
          isEmoteOrSuffixModifier = true;
          hasModifiers = true;
        }

        let modifiers = [];
        if (hasModifiers && isEmoteOrSuffixModifier) {
          let detectedEmote = false;
          // we search backwards to find the emote and any modifiers
          for (let k = j; k >= 0; k--) {
            const partMetadataItem = partMetadata[k];
            // if we discover an emote, use that emote as the base for the modifiers
            if (!detectedEmote && partMetadataItem?.emote != null) {
              emote = partMetadataItem.emote;
              emoteIndex = k;
              detectedEmote = true;
              continue;
            }
            // if we've reached a non-modifier or an invalid modifier, stop
            if (
              partMetadataItem?.modifier == null ||
              (!detectedEmote && partMetadataItem.type === 'prefix') ||
              (detectedEmote && partMetadataItem.type === 'suffix')
            ) {
              break;
            }
            modifiers.push(partMetadataItem);
            parts[k] = null;
          }
          // if the emote is only a suffix modifier, render it without its effect
          if (modifiers.length === 1 && modifiers[0].type === 'suffix' && emoteIndex === j) {
            modifiers = [];
          }
        }

        if (emote != null) {
          const emoteHasModifiers = modifiers.length > 0;

          // Check if this is a zero-width emote
          if (emote.metadata?.isZeroWidth === true) {
            // Store zero-width emote to attach to the next regular emote
            zeroWidthEmotes.push({
              emote,
              modifiers: emoteHasModifiers ? modifiers.map(({modifier}) => modifier) : null,
              classNames: emoteHasModifiers ? modifiers.map(({modifier}) => EMOTE_MODIFIERS[modifier]) : null,
            });
            parts[emoteIndex] = null; // Don't render zero-width emotes as separate elements
            continue;
          }

          const renderedEmote =
            EMOTES_TO_CAP.includes(emote.id) && ++cappedEmoteCount > MAX_EMOTES_WHEN_CAPPED
              ? null
              : emote.render(
                  emoteHasModifiers
                    ? modifiers.filter(({type}) => type === 'prefix').map(({modifier}) => modifier)
                    : null,
                  emoteHasModifiers
                    ? modifiers.filter(({type}) => type === 'suffix').map(({modifier}) => modifier)
                    : null,
                  emoteHasModifiers ? modifiers.map(({modifier}) => EMOTE_MODIFIERS[modifier]) : null
                );

          // Attach any pending zero-width emotes to this emote
          if (renderedEmote && zeroWidthEmotes.length > 0) {
            const emoteContainer = renderedEmote.querySelector('.bttv-emote') || renderedEmote;
            if (emoteContainer) {
              // Create a wrapper if the emote doesn't have one
              let wrapper = emoteContainer.parentElement;
              if (!wrapper || !wrapper.classList.contains('bttv-emote-container')) {
                wrapper = document.createElement('span');
                wrapper.classList.add('bttv-emote-container');
                emoteContainer.parentNode.insertBefore(wrapper, emoteContainer);
                wrapper.appendChild(emoteContainer);
              }

              // Add zero-width emotes to the wrapper
              zeroWidthEmotes.forEach(({emote: zeroWidthEmote, modifiers, classNames}) => {
                const zeroWidthElement = zeroWidthEmote.render(
                  modifiers ? modifiers.filter((m) => PREFIX_EMOTE_MODIFIERS_LIST.includes(m)) : null,
                  modifiers ? modifiers.filter((m) => !PREFIX_EMOTE_MODIFIERS_LIST.includes(m)) : null,
                  classNames
                );
                wrapper.appendChild(zeroWidthElement);
              });
            }
            zeroWidthEmotes = []; // Clear the queue
          }

          parts[emoteIndex] = renderedEmote;
          lastEmoteContainer = renderedEmote;
          modified = true;
        }
      }

      // If we have zero-width emotes but no regular emotes to attach them to,
      // render them as standalone emotes
      if (zeroWidthEmotes.length > 0 && lastEmoteContainer) {
        const emoteContainer = lastEmoteContainer.querySelector('.bttv-emote') || lastEmoteContainer;
        if (emoteContainer) {
          let wrapper = emoteContainer.parentElement;
          if (!wrapper || !wrapper.classList.contains('bttv-emote-container')) {
            wrapper = document.createElement('span');
            wrapper.classList.add('bttv-emote-container');
            emoteContainer.parentNode.insertBefore(wrapper, emoteContainer);
            wrapper.appendChild(emoteContainer);
          }

          zeroWidthEmotes.forEach(({emote: zeroWidthEmote, modifiers, classNames}) => {
            const zeroWidthElement = zeroWidthEmote.render(
              modifiers ? modifiers.filter((m) => PREFIX_EMOTE_MODIFIERS_LIST.includes(m)) : null,
              modifiers ? modifiers.filter((m) => !PREFIX_EMOTE_MODIFIERS_LIST.includes(m)) : null,
              classNames
            );
            wrapper.appendChild(zeroWidthElement);
          });
        }
      }

      if (modified) {
        const fragment = document.createDocumentFragment();
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          let part = parts[partIndex];
          if (part == null) {
            continue;
          }
          if (part.nodeType == null) {
            part = document.createTextNode(part);
          }
          fragment.appendChild(part);
          if (partIndex < parts.length - 1) {
            fragment.appendChild(document.createTextNode(' '));
          }
        }
        node.parentNode.replaceChild(fragment, node);
      }
    }
  }

  messageParser(element, messageObj) {
    const fromNode = element.querySelector('.chat-author__display-name,.chat-author__intl-login');
    const messageParts = getMessagePartsFromMessageElement(element);

    let badgesContainer = element.querySelector('.chat-badge')?.closest('span');
    if (badgesContainer == null) {
      badgesContainer = element.querySelector('span.chat-line__username')?.previousSibling;
      if (badgesContainer?.nodeName !== 'SPAN') {
        badgesContainer = null;
      }
    }

    this._messageParser(element, messageObj, fromNode, badgesContainer, messageParts);
  }

  seventvMessageParser(element, messageObj) {
    const fromNode = element.querySelector('.seventv-chat-user-username');
    const badgesContainer = element.querySelector('.seventv-chat-user-badge-list');
    const messageParts = element.querySelectorAll('.seventv-chat-message-body > span');
    this._messageParser(element, messageObj, fromNode, badgesContainer, messageParts);
  }

  _messageParser(element, messageObj, fromNode, badgesContainer, messageParts = []) {
    if (element.__bttvParsed) return;

    splitChat.render(element, messageObj);

    const user = formatChatUser(messageObj);
    if (!user) return;

    if (messageObj.isFirstMsg === true && hasFlag(settings.get(SettingIds.CHAT), ChatFlags.VIEWER_GREETING)) {
      element.classList.add('bttv-first-message');
    }

    let color;
    if (hasFlag(settings.get(SettingIds.USERNAMES), UsernameFlags.READABLE)) {
      color = this.calculateColor(user.color);

      fromNode.style.color = color;
      if (element.style.color) {
        element.style.color = color;
      }
    } else {
      color = fromNode.style.color;
    }

    if (fromNode) {
      fromNode.style.position = 'relative';
      fromNode.style.zIndex = '1';
    }

    if (subscribers.hasGlow(user.id) && settings.get(SettingIds.DARKENED_MODE) === true) {
      const rgbColor = colors.getRgb(color);
      fromNode.style.textShadow = `0 0 20px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.8)`;
    }

    if ((globalBots.includes(user.name) || channelBots.includes(user.name)) && user.mod) {
      element
        .querySelector('img.chat-badge[alt="Moderator"]')
        ?.replaceWith(badgeTemplate(proxyBadgeUrl(cdn.url('tags/bot.png')), formatMessage({defaultMessage: 'Bot'})));
    }

    const customBadges = this.customBadges(user);
    if (badgesContainer != null && customBadges.length > 0) {
      for (const badge of customBadges) {
        badgesContainer.appendChild(badge);
      }
    }

    const nickname = nicknames.get(user.name);
    if (nickname) {
      fromNode.innerText = nickname;
    }

    if (
      (modsOnly === true && !user.mod) ||
      (subsOnly === true && !user.subscriber) ||
      (asciiOnly === true &&
        (hasNonASCII(messageObj.messageBody) || messageObj.messageParts?.some((part) => part.type === 6)))
    ) {
      element.style.display = 'none';
    }

    if (messageObj && messageObj.messageBody) {
      element.setAttribute('data-original-text', messageObj.messageBody);
    }

    if (!element.querySelector('.bttv-copy-message-button')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'bttv-copy-message-button';
      copyBtn.title = 'Скопировать сообщение';
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5h12v13H9zM3 13V2h12v2H5v11H3z"/></svg>`;
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = element.getAttribute('data-original-text') || (messageObj && messageObj.messageBody) || '';
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
          fallbackCopy(text);
        }
      });
      element.appendChild(copyBtn);
    }

    this.messageReplacer(messageParts, user);

    setTimeout(() => {
      if (!element.isConnected) {
        return;
      }
      const allEmotes = Array.from(element.querySelectorAll('.bttv-emote, div[data-test-selector="emote-button"]'));

      const emoteGroups = [];
      let currentGroup = null;

      for (const emote of allEmotes) {
        if (emote.classList.contains('bttv-emote-overlay')) {
          if (currentGroup) {
            currentGroup.overlays.push(emote);
          } else {
            emote.classList.remove('bttv-emote-overlay');
            currentGroup = {base: emote, overlays: []};
            emoteGroups.push(currentGroup);
          }
        } else {
          currentGroup = {base: emote, overlays: []};
          emoteGroups.push(currentGroup);
        }
      }

      for (const group of emoteGroups) {
        if (group.overlays.length > 0) {
          const container = document.createElement('span');
          container.classList.add('bttv-emote-container', 'bttv-tooltip-wrapper');

          group.base.replaceWith(container);
          container.appendChild(group.base);

          const newTooltip = document.createElement('div');
          newTooltip.classList.add('bttv-tooltip', 'bttv-tooltip--up', 'bttv-tooltip--align-center');
          newTooltip.style.width = 'max-content';

          for (const emote of [group.base, ...group.overlays]) {
            const originalTooltip = emote.querySelector('.bttv-tooltip');
            if (originalTooltip) {
              const image = originalTooltip.querySelector('.bttv-tooltip-emote-image');
              if (image) {
                newTooltip.appendChild(image.cloneNode(true));
              }

              const textDiv = originalTooltip.querySelector('div:not([class])');
              if (textDiv) {
                const newTextDiv = textDiv.cloneNode(true);
                newTextDiv.style.whiteSpace = 'pre-wrap';
                newTooltip.appendChild(newTextDiv);
              }
            }
          }
          container.appendChild(newTooltip);

          group.base.querySelector('.bttv-tooltip')?.remove();

          for (const overlay of group.overlays) {
            overlay.querySelector('.bttv-tooltip')?.remove();
            container.appendChild(overlay);
            const overlayParent = overlay.closest('span.text-fragment');
            if (overlayParent && overlayParent.textContent.trim() === '') {
              overlayParent.remove();
            }
          }
        }
      }

      if (settings.get(SettingIds.GIANT_EMOTES)) {
        const hasChannelPointsReward = messageObj?.ffz_reward || element.ffz_reward;

        const isHighlightedByChannelPoints = element.querySelector('.chat-line__message-body--highlighted');

        if (hasChannelPointsReward || isHighlightedByChannelPoints) {
          let reward = messageObj?.ffz_reward || element.ffz_reward;

          if (!reward && isHighlightedByChannelPoints) {
            const channelPointsElement =
              element.closest('[data-test-selector="user-notice-line"]') ||
              element.previousElementSibling?.closest('[data-test-selector="user-notice-line"]');

            if (channelPointsElement) {
              const rewardText = channelPointsElement.textContent || '';
              const title = extractRewardTitle(rewardText);

              if (title) {
                reward = {title};
              }
            }
          }

          if (reward) {
            this.handleGiantEmotes(element, {ffz_reward: reward});
          }
        }
      }
    }, 0);

    element.__bttvParsed = true;
  }

  noticeMessageParser(element) {
    const chatterNames = [...element.querySelectorAll('.chatter-name span span, .chatter-name span')];
    for (const chatterName of chatterNames) {
      // skip non-text elements
      if (chatterName.childElementCount > 0) {
        continue;
      }
      // TODO: this doesn't handle apac names or display names with spaces. prob ok for now.
      const nickname = nicknames.get(chatterName.innerText.toLowerCase());
      if (nickname) {
        chatterName.innerText = nickname;
      }
    }
  }

  pinnedMessageParser(element) {
    this.messageReplacer(getMessagePartsFromMessageElement(element), null);
  }

  handleChannelPointsMessage(element) {
    const rewardIcon = element.querySelector('.channel-points-reward-line__icon');
    if (!rewardIcon) {
      return;
    }

    const rewardText = element.textContent || '';
    const title = extractRewardTitle(rewardText);

    if (!title) {
      return;
    }

    const reward = {title};

    if (!shouldMakeGiantEmote(reward)) {
      return;
    }

    const messageElement = element.querySelector('.chat-line__message, .chat-line--inline');
    if (messageElement) {
      messageElement.ffz_reward = reward;
    } else {
      let nextMessage = element.nextElementSibling;
      while (nextMessage && !nextMessage.classList.contains('chat-line__message')) {
        nextMessage = nextMessage.nextElementSibling;
      }

      if (nextMessage) {
        nextMessage.ffz_reward = reward;
      }
    }
  }

  handleHighlightedMessage(element) {
    const messageElement = element.closest('.chat-line__message');
    if (!messageElement) {
      return;
    }

    const channelPointsElement =
      messageElement.closest('[data-test-selector="user-notice-line"]') ||
      messageElement.previousElementSibling?.closest('[data-test-selector="user-notice-line"]');

    if (channelPointsElement) {
      const rewardText = channelPointsElement.textContent || '';
      const title = extractRewardTitle(rewardText);

      if (title) {
        const reward = {title};

        if (shouldMakeGiantEmote(reward)) {
          messageElement.ffz_reward = reward;
        }
      }
    }
  }

  handleGiantEmotes(element, messageObj) {
    if (!shouldMakeGiantEmote(messageObj.ffz_reward)) {
      return;
    }

    const emotes = element.querySelectorAll('.bttv-emote img, div[data-test-selector="emote-button"] img');
    if (emotes.length === 0) {
      return;
    }

    const lastEmote = emotes[emotes.length - 1];
    const emoteContainer = lastEmote.closest('.bttv-emote, div[data-test-selector="emote-button"]');

    if (!emoteContainer) {
      return;
    }

    const giantContainer = document.createElement('div');
    giantContainer.classList.add('chat-line__message--ffz-giant-emote');

    const giantEmote = lastEmote.cloneNode(true);

    const provider =
      giantEmote.getAttribute('data-provider') ||
      (giantEmote.src.includes('cdn.frankerfacez.com')
        ? 'ffz'
        : giantEmote.src.includes('cdn.7tv.app')
          ? '7tv'
          : 'twitch');

    let height = 112;

    if (provider === 'ffz' || provider === '7tv') {
      const originalHeight = giantEmote.height || 28;
      const scale = 4;
      height = originalHeight * scale;

      if (height > 128) height = 128;
      if (height < 64) height = 64;
    }

    giantEmote.style.height = `${height}px`;
    giantEmote.style.maxHeight = `${height}px`;
    giantEmote.style.maxWidth = `${height * 2}px`;

    emoteContainer.remove();

    giantContainer.appendChild(giantEmote);

    element.appendChild(giantContainer);
  }
}

export default new ChatModule();

// Fallback для копирования (textarea)
function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
  } catch (err) {}
  document.body.removeChild(textArea);
}

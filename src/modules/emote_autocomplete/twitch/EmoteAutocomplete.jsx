import {EmoteCategories, EmoteTypeFlags, SettingIds} from '../../../constants.js';
import dom from '../../../observers/dom.js';
import settings from '../../../settings.js';
import {hasFlag} from '../../../utils/flags.js';
import {getEmotePageUrl} from '../../../utils/emote.js';
import {createSrcSet, createSrc} from '../../../utils/image.js';
import twitch from '../../../utils/twitch.js';
import {getCurrentUser} from '../../../utils/user.js';
import watcher from '../../../watcher.js';
import chat, {getMessagePartsFromMessageElement, formatChatUser} from '../../chat/index.js';
import emotes from '../../emotes/index.js';
import './EmoteAutocomplete.module.css';

const EMOTE_ID_BETTERTTV_PREFIX = '__BTTV__';
const CUSTOM_SET_ID = 'BETTERTTV_EMOTES';
const AUTOCOMPLETE_MATCH_IMAGE_QUERY = '.emote-autocomplete-provider__image, .chat-line__message--emote';

const PATCHED_SENTINEL = Symbol('patched symbol');

function serializeEmoteId(emote) {
  const data = `${emote.category.provider}-${emote.id}-${emote.code}`;
  return `${EMOTE_ID_BETTERTTV_PREFIX}${btoa(encodeURIComponent(data))}`;
}

function deserializeEmoteFromURL(url) {
  const emoteData = url.split(EMOTE_ID_BETTERTTV_PREFIX)[1]?.split('/')[0];
  if (emoteData == null) {
    return null;
  }
  try {
    const [emoteProvider, emoteId, emoteCode] = decodeURIComponent(atob(emoteData)).split('-');
    return {
      provider: emoteProvider,
      id: emoteId,
      code: emoteCode,
    };
  } catch (_) {
    return null;
  }
}

function getAutocompleteEmoteProvider() {
  const autocompleteNode = twitch.getAutocompleteStateNode();
  if (autocompleteNode == null) {
    return null;
  }

  const autocompleteProviders = autocompleteNode.stateNode.providers;
  return autocompleteProviders.find(({autocompleteType}) => autocompleteType === 'emote');
}

function createTwitchEmoteSet(allEmotes) {
  return {
    emotes: allEmotes.map((emote) => {
      const emotesSettingValue = settings.get(SettingIds.EMOTES);
      const showAnimatedEmotes =
        emote.category.id === EmoteCategories.BETTERTTV_PERSONAL
          ? hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_PERSONAL_EMOTES)
          : hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_EMOTES);
      const shouldRenderStatic = emote.animated && !showAnimatedEmotes;

      return {
        id: serializeEmoteId(emote),
        modifiers: null,
        setID: CUSTOM_SET_ID,
        token: emote.code,
        srcSet: createSrcSet(emote.images, shouldRenderStatic),
        src: createSrc(emote.images, shouldRenderStatic),
      };
    }),
    id: CUSTOM_SET_ID,
  };
}

function injectEmoteSets() {
  const autocompleteEmoteProvider = getAutocompleteEmoteProvider();
  if (autocompleteEmoteProvider == null) {
    return;
  }

  const autocompleteEmotes = autocompleteEmoteProvider.props.emotes;

  const allEmotes = emotes.getEmotesByCategories([
    EmoteCategories.BETTERTTV_CHANNEL,
    EmoteCategories.BETTERTTV_GLOBAL,
    EmoteCategories.BETTERTTV_PERSONAL,
    EmoteCategories.FRANKERFACEZ_CHANNEL,
    EmoteCategories.FRANKERFACEZ_GLOBAL,
    EmoteCategories.SEVENTV_CHANNEL,
    EmoteCategories.SEVENTV_GLOBAL,
    EmoteCategories.BETTERTTV_EMOJI,
  ]);

  const emoteSet = createTwitchEmoteSet(allEmotes);
  const index = autocompleteEmotes.findIndex(({id}) => id === CUSTOM_SET_ID);

  if (index === -1) {
    autocompleteEmotes.push(emoteSet);
  } else {
    autocompleteEmotes[index] = emoteSet;
  }
}

function patchEmoteImage(image, isConnected) {
  if (!isConnected) {
    return;
  }

  const url = String(image.srcset || image.src);
  const deseralizedEmote = deserializeEmoteFromURL(url);

  if (deseralizedEmote == null) {
    return;
  }

  const imageButton = image.closest('div[data-test-selector="emote-button"]');
  const imageButtonMessage = imageButton?.closest('.chat-line__message');
  const imageButtonMessageObject = imageButtonMessage != null ? twitch.getChatMessageObject(imageButtonMessage) : null;
  if (imageButtonMessage != null && imageButtonMessageObject?.user != null) {
    let span;
    const {previousSibling} = imageButton;
    if (previousSibling != null && previousSibling.matches('span[data-a-target="chat-message-text"]')) {
      span = previousSibling;
      imageButton.remove();
    } else {
      span = document.createElement('span');
      span.setAttribute('data-a-target', 'chat-message-text');
      imageButton.replaceWith(span);
    }

    const {lastChild} = span;
    if (lastChild != null && lastChild.nodeType === 3) {
      lastChild.textContent += deseralizedEmote.code;
    } else {
      span.appendChild(document.createTextNode(deseralizedEmote.code));
    }

    // some emotes do not get handled by Twitch's native parsing, so we need to undo our parsing and re-parse
    imageButtonMessage.querySelectorAll('.bttv-emote').forEach((emote) => {
      emote.replaceWith(document.createTextNode(emote.querySelector('img').alt));
    });

    span.normalize();

    chat.messageReplacer(
      getMessagePartsFromMessageElement(imageButtonMessage),
      formatChatUser(imageButtonMessageObject)
    );
    return;
  }

  const emote = emotes.getEligibleEmote(deseralizedEmote.code, getCurrentUser());
  if (emote == null) {
    return;
  }

  const emotesSettingValue = settings.get(SettingIds.EMOTES);
  const showAnimatedEmotes =
    emote.category.id === EmoteCategories.BETTERTTV_PERSONAL
      ? hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_PERSONAL_EMOTES)
      : hasFlag(emotesSettingValue, EmoteTypeFlags.ANIMATED_EMOTES);
  const shouldRenderStatic = emote.animated && !showAnimatedEmotes;

  if (image.srcset) {
    image.srcset = createSrcSet(emote.images, shouldRenderStatic);
  }
  if (image.src) {
    image.src = createSrc(emote.images, shouldRenderStatic);
  }

  const handleMiddleClick = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      const pageUrl = getEmotePageUrl(emote);
      if (pageUrl) {
        const originalOpacity = image.style.opacity;
        image.style.opacity = '0.5';

        setTimeout(() => {
          image.style.opacity = originalOpacity;
        }, 200);

        window.open(pageUrl, '_blank');
      }
    }
  };

  image.addEventListener('mousedown', handleMiddleClick);

  if (shouldRenderStatic) {
    image.addEventListener('mouseenter', () => {
      if (image.srcset) {
        image.srcset = createSrcSet(emote.images, false);
      }
      if (image.src) {
        image.src = createSrc(emote.images, false);
      }
    });
    image.addEventListener('mouseleave', () => {
      if (image.srcset) {
        image.srcset = createSrcSet(emote.images, true);
      }
      if (image.src) {
        image.src = createSrc(emote.images, true);
      }
    });
  }
}

let twitchComponentDidUpdate = null;
export default class EmoteAutocomplete {
  constructor() {
    this.load();
    watcher.on('channel.updated', () => this.load());
    watcher.on('load.chat', () => this.load());
    watcher.on('emotes.updated', () => injectEmoteSets());
    dom.on(AUTOCOMPLETE_MATCH_IMAGE_QUERY, patchEmoteImage, {
      attributes: true,
      attributeFilter: ['src', 'srcset'],
    });
  }

  load() {
    const emoteAutocompleteProvider = getAutocompleteEmoteProvider();
    if (emoteAutocompleteProvider == null) {
      return;
    }

    if (emoteAutocompleteProvider.__bttvAutocompletePatched !== PATCHED_SENTINEL) {
      emoteAutocompleteProvider.__bttvAutocompletePatched = PATCHED_SENTINEL;
      twitchComponentDidUpdate = emoteAutocompleteProvider.componentDidUpdate;

      // eslint-disable-next-line no-inner-declarations
      function bttvComponentDidUpdate(prevProps) {
        if (prevProps.emotes !== this.props.emotes) {
          injectEmoteSets();
        }

        if (twitchComponentDidUpdate != null) {
          twitchComponentDidUpdate.call(this, ...prevProps);
        }
      }

      emoteAutocompleteProvider.componentDidUpdate = bttvComponentDidUpdate;
      emoteAutocompleteProvider.forceUpdate();
    }

    injectEmoteSets();
  }
}

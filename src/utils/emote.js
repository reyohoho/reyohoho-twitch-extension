export function getCanonicalEmoteId(emoteId, emoteProvider) {
  return `${emoteProvider}-${emoteId}`;
}

export function getEmotePageUrl(emote) {
  if (!emote || !emote.id || !emote.category?.provider) {
    console.log('BTTV: getEmotePageUrl: Invalid emote object:', emote);
    return null;
  }

  const {id} = emote;
  const {provider} = emote.category;

  console.log('BTTV: getEmotePageUrl: Processing emote:', {
    id,
    provider,
    code: emote.code,
  });

  switch (provider) {
    case 'bttv':
      return `https://betterttv.com/emotes/${id}`;
    case 'ffz':
      return `https://www.frankerfacez.com/emoticon/${id}-${emote.code}`;
    case 'seventv':
      return `https://7tv.app/emotes/${id}`;
    default:
      console.log('BTTV: Unknown provider for emote page URL:', provider);
      return null;
  }
}

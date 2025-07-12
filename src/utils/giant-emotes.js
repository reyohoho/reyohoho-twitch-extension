export function isMessageEffect(reward) {
  return reward?.type === 'SEND_ANIMATED_MESSAGE';
}

export function shouldMakeGiantEmote(reward) {
  if (!reward) return false;

  const title = reward.title || '';
  const prompt = reward.prompt || '';

  if (title.includes('FFZ:GE') || prompt.includes('FFZ:GE')) {
    return true;
  }

  if (title.toLowerCase().includes('гигант') || prompt.toLowerCase().includes('гигант')) {
    return true;
  }

  if (title.toLowerCase().includes('гига') || prompt.toLowerCase().includes('гига')) {
    return true;
  }

  if (title.toLowerCase().includes('giant') || prompt.toLowerCase().includes('giant')) {
    return true;
  }

  return false;
}

export function extractRewardTitle(text) {
  if (!text) return '';

  const match = text.match(/(?:Получено|Redeemed|Активировано):\s*([^0-9]+)/);
  if (match) {
    return match[1].trim();
  }

  const words = text.split(/\s+/);
  for (const word of words) {
    if (
      word.includes('FFZ:GE') ||
      word.toLowerCase().includes('гигант') ||
      word.toLowerCase().includes('гига') ||
      word.toLowerCase().includes('giant')
    ) {
      return word;
    }
  }

  return '';
}

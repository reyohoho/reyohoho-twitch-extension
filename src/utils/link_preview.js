import { SettingIds } from '../constants.js';
import settings from '../settings.js';
import { getProxyUrl } from './proxy.js';

const IMG_REGEX = /https?:\/\/[a-zA-Z0-9\.\/\-\_\%\@\?\&\=\:\+\~]+(?:\.jpg|\.jpeg|\.png|\.gif|\.bmp|\.tif|\.tiff|\.webp|\.jfif)/i;
const VID_REGEX = /https?:\/\/[a-zA-Z0-9\.\/\-\_\%\@\?\&\=\:\+\~]+(?:\.mp4|\.mov)/i;
const SEVENTV_EMOTE_REGEX = /https?:\/\/7tv\.app\/emotes\/([a-zA-Z0-9]+)/i;
const IMGUR_REGEX = /https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)/i;
const KAPPALOL_REGEX = /https?:\/\/(?:www\.)?kappa\.lol\/([a-zA-Z0-9]+)/i;
const DISCORD_CDN_REGEX = /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//i;

export class LinkPreviewProcessor {
  constructor() {
    this.maxHeight = 200;
    this.maxWidth = 200;
  }

  updateSettings() {
    this.maxHeight = settings.get(SettingIds.LINK_PREVIEW_MAX_HEIGHT) || 200;
    this.maxWidth = settings.get(SettingIds.LINK_PREVIEW_MAX_WIDTH) || 200;
  }

  processElement(element) {
    const text = element.textContent.trim();

    const hideAll = settings.get(SettingIds.LINK_PREVIEW_HIDE_ALL);
    const showPreview = settings.get(SettingIds.LINK_PREVIEW);
    
    const seventvMatch = text.match(SEVENTV_EMOTE_REGEX);
    const imgurMatch = text.match(IMGUR_REGEX);
    const kappaLolMatch = text.match(KAPPALOL_REGEX);

    if (hideAll) {
      if (seventvMatch || imgurMatch || kappaLolMatch || IMG_REGEX.test(text) || VID_REGEX.test(text)) {
        this.hideElement(element);
        return true;
      }
      return false;
    }

    if (!showPreview) {
      return false;
    }

    if (seventvMatch) {
      this.replace7TVEmote(element, seventvMatch[1]);
      return true;
    } else if (imgurMatch) {
      this.replaceImgurImage(element, imgurMatch[1]);
      return true;
    } else if (kappaLolMatch) {
      this.replaceKappaLolImage(element, kappaLolMatch[1]);
      return true;
    } else if (IMG_REGEX.test(text)) {
      this.replaceImage(element);
      return true;
    } else if (VID_REGEX.test(text)) {
      this.replaceVideo(element);
      return true;
    }

    return false;
  }

  hideElement(element) {
    element.dataset.linkPreviewProcessed = 'true';
    element.style.display = 'none';
  }

  replaceImage(element) {
    const url = element.textContent.trim();
    
    element.dataset.linkPreviewProcessed = 'true';
    
    const proxyUrl = getProxyUrl();
    let imageUrl = url;
    if (proxyUrl && DISCORD_CDN_REGEX.test(url)) {
      imageUrl = `${proxyUrl}${url}`;
    }
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Link Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        element.innerHTML = '';
        element.appendChild(previewContainer);
      } else {
        element.appendChild(document.createElement('br'));
        element.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replaceVideo(element) {
    const videoUrl = element.textContent.trim();
    
    element.dataset.linkPreviewProcessed = 'true';
    
    const previewContainer = document.createElement('span');
    previewContainer.className = 'bttv-link-preview-container';
    
    const video = document.createElement('video');
    video.src = videoUrl;
    video.className = 'bttv-link-preview-video';
    video.controls = true;
    video.preload = 'metadata';
    video.style.maxHeight = `${this.maxHeight}px`;
    video.style.maxWidth = `${this.maxWidth}px`;
    
    previewContainer.appendChild(video);
    
    const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
    
    if (hideLink) {
      element.innerHTML = '';
      element.appendChild(previewContainer);
    } else {
      element.appendChild(document.createElement('br'));
      element.appendChild(previewContainer);
    }
  }

  replaceImgurImage(element, imgurId) {
    const originalUrl = element.textContent.trim();
    const imageUrl = `https://i.imgur.com/${imgurId}.jpg`;
    
    element.dataset.linkPreviewProcessed = 'true';
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = originalUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Imgur Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        element.innerHTML = '';
        element.appendChild(previewContainer);
      } else {
        element.appendChild(document.createElement('br'));
        element.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replaceKappaLolImage(element, kappaLolId) {
    const originalUrl = element.textContent.trim();
    
    element.dataset.linkPreviewProcessed = 'true';
    
    const proxyUrl = getProxyUrl();
    const imageUrl = proxyUrl ? `${proxyUrl}${originalUrl}` : originalUrl;
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = originalUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = imageUrl;
      imgElement.className = 'bttv-link-preview-image';
      imgElement.alt = 'Kappa.lol Preview';
      imgElement.style.maxHeight = `${this.maxHeight}px`;
      imgElement.style.maxWidth = `${this.maxWidth}px`;
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        element.innerHTML = '';
        element.appendChild(previewContainer);
      } else {
        element.appendChild(document.createElement('br'));
        element.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = imageUrl;
  }

  replace7TVEmote(element, emoteId) {
    const proxyUrl = getProxyUrl();
    
    let emoteImageUrl = `https://cdn.7tv.app/emote/${emoteId}/2x.webp`;
    
    if (proxyUrl) {
      emoteImageUrl = `${proxyUrl}${emoteImageUrl}`;
    }
    
    element.dataset.linkPreviewProcessed = 'true';
    
    const img = new Image();
    
    img.onload = () => {
      const previewContainer = document.createElement('span');
      previewContainer.className = 'bttv-link-preview-container';
      
      const anchor = document.createElement('a');
      anchor.href = element.textContent.trim();
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'bttv-link-preview-anchor';
      
      const imgElement = document.createElement('img');
      imgElement.src = emoteImageUrl;
      imgElement.className = 'bttv-link-preview-emote';
      imgElement.alt = '7TV Emote';
      
      anchor.appendChild(imgElement);
      previewContainer.appendChild(anchor);
      
      const hideLink = settings.get(SettingIds.LINK_PREVIEW_HIDE_LINK);
      
      if (hideLink) {
        element.innerHTML = '';
        element.appendChild(previewContainer);
      } else {
        element.appendChild(document.createElement('br'));
        element.appendChild(previewContainer);
      }
    };
    
    img.onerror = () => {
    };
    
    img.src = emoteImageUrl;
  }
}

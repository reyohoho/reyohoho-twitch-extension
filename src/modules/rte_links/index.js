import {PlatformTypes} from '../../constants.js';
import {loadModuleForPlatforms} from '../../utils/modules.js';
import {getCurrentChannel} from '../../utils/channel.js';
import domObserver from '../../observers/dom.js';
import './style.css';

const RTE_LINKS_SELECTOR = '.rte_links';
const CHANNEL_INFO_SELECTOR = '#live-channel-stream-information';
const CHANNEL_TITLE_SELECTOR = 'h1[class*="ScTitleText"]';

function handleLinkClick(e, href) {
  e.preventDefault();
  e.stopPropagation();

  const existingLink = document.querySelector(`a[href="${href}"]`);
  if (existingLink && existingLink !== e.target) {
    existingLink.click();
    return;
  }

  window.history.pushState(null, '', href);
  
  const popStateEvent = new PopStateEvent('popstate', {
    state: null,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(popStateEvent);
}

function createRteLinks() {
  const channel = getCurrentChannel();
  if (!channel?.name) return null;

  const linksContainer = document.createElement('div');
  linksContainer.className = 'rte_links tw-mg-l-1';

  const links = [
    {href: `/${channel.name}/schedule`, text: 'Расписание'},
    {href: `/${channel.name}/videos`, text: 'Видео'},
    {href: `/${channel.name}/videos?filter=clips&range=7d`, text: 'Клипы'},
  ];

  links.forEach((link) => {
    const linkElement = document.createElement('a');
    linkElement.href = link.href;
    linkElement.className = 'tw-c-text-alt-2 tw-interactive tw-pd-x-1';
    linkElement.textContent = link.text;
    linkElement.addEventListener('click', (e) => handleLinkClick(e, link.href));
    linksContainer.appendChild(linkElement);
  });

  return linksContainer;
}

function addRteLinks() {
  const channelInfo = document.querySelector(CHANNEL_INFO_SELECTOR);
  if (!channelInfo) return;

  if (channelInfo.querySelector(RTE_LINKS_SELECTOR)) return;

  const channelTitle = channelInfo.querySelector(CHANNEL_TITLE_SELECTOR);
  if (!channelTitle) return;

  let targetContainer = channelTitle.closest('.Layout-sc-1xcs6mc-0.dMBVIY');
  
  if (!targetContainer) {
    const metadataSupport = channelInfo.querySelector('.metadata-layout__support');
    if (metadataSupport) {
      targetContainer = metadataSupport.querySelector('.Layout-sc-1xcs6mc-0.dMBVIY');
    }
  }

  if (!targetContainer) {
    const titleLink = channelTitle.closest('a');
    if (titleLink) {
      targetContainer = titleLink.parentElement;
    }
  }

  if (!targetContainer) return;

  const rteLinks = createRteLinks();
  if (!rteLinks) return;

  const ijyopaContainer = targetContainer.querySelector('.Layout-sc-1xcs6mc-0.ijyopa');
  if (ijyopaContainer) {
    const nextSibling = ijyopaContainer.nextSibling;
    if (nextSibling) {
      targetContainer.insertBefore(rteLinks, nextSibling);
    } else {
      targetContainer.appendChild(rteLinks);
    }
  } else {
    const titleLink = channelTitle.closest('a');
    if (titleLink && titleLink.parentElement === targetContainer) {
      const nextSibling = titleLink.nextSibling;
      if (nextSibling) {
        targetContainer.insertBefore(rteLinks, nextSibling);
      } else {
        targetContainer.appendChild(rteLinks);
      }
    } else {
      targetContainer.appendChild(rteLinks);
    }
  }
}

class RteLinksModule {
  constructor() {
    domObserver.on(CHANNEL_INFO_SELECTOR, (node, isConnected) => {
      if (isConnected) {
        setTimeout(() => addRteLinks(), 100);
      }
    });

    const checkAndAdd = () => {
      const channelInfo = document.querySelector(CHANNEL_INFO_SELECTOR);
      if (channelInfo && !channelInfo.querySelector(RTE_LINKS_SELECTOR)) {
        addRteLinks();
      }
    };

    setTimeout(checkAndAdd, 500);

    setInterval(checkAndAdd, 2000);
  }
}

export default loadModuleForPlatforms([PlatformTypes.TWITCH, () => new RteLinksModule()]);


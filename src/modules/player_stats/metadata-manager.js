import domObserver from '../../observers/dom.js';
import watcher from '../../watcher.js';

class MetadataManager {
  constructor() {
    this.definitions = new Map();
    this.containers = new WeakMap();
    this.timers = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    const triggerUpdate = (delay = 100) => {
      this.cleanupOldContainers();
      setTimeout(() => this.updateAllMetadata(), delay);
    };

    watcher.on('load.player', () => triggerUpdate(100));
    watcher.on('load.channel', () => triggerUpdate(300));
    watcher.on('load.chat', () => triggerUpdate(200));
    watcher.on('load.vod', () => triggerUpdate(100));

    domObserver.on('#live-channel-stream-information', (node, isConnected) => {
      if (isConnected) {
        triggerUpdate(150);
      }
    });

    domObserver.on('[data-a-target="animated-channel-viewers-count"]', (node, isConnected) => {
      if (isConnected) {
        triggerUpdate(100);
      }
    });

    domObserver.on('.stream-info', (node, isConnected) => {
      if (isConnected) {
        triggerUpdate(100);
      }
    });

    const checkInterval = setInterval(() => {
      if (this.definitions.size > 0) {
        const infoBar = document.querySelector('#live-channel-stream-information');
        if (infoBar) {
          const container = infoBar.querySelector('.bttv-player-stats-container');
          if (!container || !container.querySelector('[data-stat-key]')) {
            triggerUpdate(0);
          }
        }
        this.cleanupOrphanedElements();
      }
    }, 3000);

    this.checkInterval = checkInterval;
    this.initialized = true;
  }

  cleanupOrphanedElements() {
    const containers = document.querySelectorAll('.bttv-player-stats-container');
    const infoBar = document.querySelector('#live-channel-stream-information');
    
    containers.forEach((container) => {
      if (!infoBar || !infoBar.contains(container)) {
        container.remove();
      } else {
        const elements = container.querySelectorAll('[data-stat-key]');
        elements.forEach((el) => {
          if (!el.querySelector('.bttv-stat-tooltip')) {
            const key = el.getAttribute('data-stat-key');
            const def = this.definitions.get(key);
            if (def?.tooltip) {
              const tooltipEl = document.createElement('div');
              tooltipEl.className = 'bttv-stat-tooltip';
              el.appendChild(tooltipEl);
            }
          }
        });
      }
    });
  }

  define(key, definition) {
    this.definitions.set(key, definition);
    this.updateMetadata(key);
  }

  undefine(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.definitions.delete(key);
    this.removeMetadataElement(key);
  }

  getDefinition(key) {
    return this.definitions.get(key);
  }

  async updateMetadata(key) {
    const definition = this.definitions.get(key);
    if (!definition) return;

    const container = this.findOrCreateContainer();
    if (!container) return;

    try {
      await this.renderMetadata(key, definition, container);
    } catch (error) {
      console.error(`Error rendering metadata for ${key}:`, error);
    }
  }

  async updateAllMetadata() {
    this.cleanupOldContainers();
    for (const key of this.definitions.keys()) {
      await this.updateMetadata(key);
    }
  }

  cleanupOldContainers() {
    const allContainers = document.querySelectorAll('.bttv-player-stats-container');
    const infoBar = document.querySelector('#live-channel-stream-information');
    
    allContainers.forEach((container) => {
      if (!infoBar || !infoBar.contains(container)) {
        container.remove();
      }
    });
  }

  findOrCreateContainer() {
    const infoBar = document.querySelector('#live-channel-stream-information');
    if (!infoBar) return null;

    let existingContainer = infoBar.querySelector('.bttv-player-stats-container');
    if (existingContainer && document.contains(existingContainer)) {
      const parent = existingContainer.parentElement;
      if (parent && infoBar.contains(parent)) {
        return existingContainer;
      } else {
        existingContainer.remove();
        existingContainer = null;
      }
    }

    const viewerCount = infoBar.querySelector('strong[data-a-target="animated-channel-viewers-count"]');
    let parentContainer = null;

    if (viewerCount) {
      let el = viewerCount;
      let depth = 0;
      while (el && depth < 10) {
        if (el.querySelector('svg')) {
          parentContainer = el.parentElement;
          break;
        }
        el = el.parentElement;
        depth++;
      }
    }

    if (!parentContainer) {
      const report =
        infoBar.querySelector('.report-button') ||
        infoBar.querySelector('button[data-test-selector="video-options-button"]') ||
        infoBar.querySelector('button[data-test-selector="clip-options-button"]') ||
        infoBar.querySelector('button[data-a-target="report-button-more-button"]');

      if (report) {
        parentContainer =
          report.closest('.tw-flex-wrap.tw-justify-content-end') ||
          report.closest('.tw-justify-content-end');

        if (!parentContainer) {
          parentContainer = report.parentElement?.parentElement;
          if (
            parentContainer &&
            parentContainer.parentElement?.childElementCount === 2 &&
            report.dataset.aTarget !== 'report-button-more-button'
          ) {
            parentContainer = parentContainer.parentElement.firstElementChild;
          }
        }
      }
    }

    if (!parentContainer || !infoBar.contains(parentContainer)) {
      return null;
    }

    parentContainer.classList.add('bttv-meta-tray');

    const container = document.createElement('div');
    container.className = 'bttv-player-stats-container';
    
    const firstButton = parentContainer.querySelector('button');
    if (firstButton) {
      parentContainer.insertBefore(container, firstButton);
    } else {
      parentContainer.appendChild(container);
    }

    return container;
  }

  async renderMetadata(key, definition, container) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    let element = container.querySelector(`[data-stat-key="${key}"]`);

    const refresh = definition.refresh?.call?.(definition);
    if (!refresh && definition.refresh !== undefined) {
      if (element) {
        element.remove();
      }
      return;
    }

    let data = {};
    if (definition.setup) {
      data = await definition.setup.call(definition);
      if (!data) {
        if (element) {
          element.remove();
        }
        return;
      }
    }

    const label = definition.label?.call?.(definition, data);
    if (!label) {
      if (element) {
        element.remove();
      }
      return;
    }

    if (!element) {
      element = this.createMetadataElement(key, definition, data);
      if (!element) return;

      const order = definition.order?.call?.(definition, data) ?? 999;
      element.style.order = order;
      container.appendChild(element);
    }

    this.updateMetadataElement(element, key, definition, data, label);

    if (typeof refresh === 'number' || refresh === true) {
      const timeout = typeof refresh === 'number' ? refresh : 1000;
      this.timers.set(
        key,
        setTimeout(() => this.updateMetadata(key), timeout)
      );
    }
  }

  createMetadataElement(key, definition, data) {
    const isButton = definition.button !== false && (definition.click || definition.popup);

    const element = document.createElement(isButton ? 'button' : 'div');
    element.className = isButton
      ? 'bttv-stat bttv-stat-button'
      : 'bttv-stat';
    
    element.setAttribute('data-stat-key', key);

    const inner = document.createElement('div');
    inner.className = 'bttv-stat-inner';

    const iconEl = document.createElement('span');
    iconEl.className = 'bttv-stat-icon';
    inner.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.className = 'bttv-stat-label';
    inner.appendChild(labelEl);

    element.appendChild(inner);

    if (definition.click) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        definition.click.call(definition, data, e, () => this.updateMetadata(key));
      });
    }

    if (definition.tooltip) {
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'bttv-stat-tooltip';
      element.appendChild(tooltipEl);
      
      element.addEventListener('mouseenter', () => {
        tooltipEl.classList.add('bttv-stat-tooltip--visible');
      });
      
      element.addEventListener('mouseleave', () => {
        tooltipEl.classList.remove('bttv-stat-tooltip--visible');
      });
    }

    return element;
  }

  updateMetadataElement(element, key, definition, data, label) {
    const iconEl = element.querySelector('.bttv-stat-icon');
    const labelEl = element.querySelector('.bttv-stat-label');
    const tooltipEl = element.querySelector('.bttv-stat-tooltip');

    if (iconEl) {
      const icon = definition.icon?.call?.(definition, data);
      if (icon) {
        const currentIcon = iconEl.querySelector('figure')?.className;
        if (currentIcon !== icon) {
          iconEl.innerHTML = typeof icon === 'string' ? `<figure class="${icon}"></figure>` : icon;
        }
        iconEl.style.display = '';
      } else {
        iconEl.style.display = 'none';
      }
    }

    if (labelEl && labelEl.textContent !== label) {
      labelEl.textContent = label;
    }

    const color = definition.color?.call?.(definition, data);
    if (color) {
      if (element.style.color !== color) {
        element.style.color = color;
      }
    } else if (element.style.color) {
      element.style.color = '';
    }

    if (tooltipEl && definition.tooltip) {
      const tooltipContent = definition.tooltip?.call?.(definition, data);
      if (tooltipContent) {
        const newTooltip = this.extractTooltipText(tooltipContent);
        if (tooltipEl.textContent !== newTooltip) {
          tooltipEl.textContent = newTooltip;
        }
      }
    }

    element._bttvData = data;
  }

  extractTooltipText(content) {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content.map((c) => this.extractTooltipText(c)).filter(Boolean).join('\n');
    }
    if (content?.textContent) {
      return content.textContent;
    }
    return '';
  }

  removeMetadataElement(key) {
    const containers = document.querySelectorAll('.bttv-player-stats-container');
    containers.forEach((container) => {
      const element = container.querySelector(`[data-stat-key="${key}"]`);
      if (element) {
        element.remove();
      }
    });
  }
}

export default new MetadataManager();


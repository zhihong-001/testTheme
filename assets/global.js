if (typeof window.Shopline === 'undefined') {
  window.Shopline = {};
}

// pubsub event


const PUB_SUB_EVENTS = {
  quantityUpdate: 'quantity-update',
  variantChange: 'variant-change',
};

const subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
  }
}
;

// Translation util
window.t = function t(path, hash) {
  function parsePathToArray(p) {
    if (typeof p !== 'string') {
      throw new TypeError('path must be string');
    }
    return p.replace(/\]/, '').split(/[.[]/);
  }
  const keys = parsePathToArray(path);
  const value = keys.reduce((prev, current) => {
    if (!prev) return undefined;
    return prev[current];
    
  }, window.__I18N__);

  const regExp = /\{\{([^{}]+)\}\}/g;
  if (!value) return path;

  // No hash, no substitution
  if (!hash) return value;

  return value.replace(regExp, (...args) => {
    if (args[1] !== null && args[1] !== undefined) {
      return hash[args[1]];
    }
    if (args[0] !== null && args[0] !== undefined) {
      return hash[args[0]];
    }
  });
};
;

// Common util


/**
 * @global
 */
function throttle(fn, wait) {
  let timer = null;
  return (...args) => {
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, wait);
  };
}

/**
 * @global
 */
function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * @global
 */
function jsonParse(val, normalValue) {
  try {
    const res = JSON.parse(val);
    return res;
  } catch {
    return normalValue;
  }
}

/**
 * @global
 */
function changeURLArg(urlStr, args) {
  const url = new URL(urlStr);

  Object.keys(args).forEach((arg) => {
    const val = args[arg];
    if (val) {
      url.searchParams.set(arg, val);
    } else {
      url.searchParams.delete(arg);
    }
  });
  return url;
}

/**
 * @global
 */
function observeElementVisible(elm, fn, options) {
  const visibleObserver = new IntersectionObserver(
    (entrys) => {
      const isVisibled = entrys[0].isIntersecting;

      fn(isVisibled, visibleObserver);
    },
    {
      rootMargin: '0px',
      ...options,
    },
  );

  visibleObserver.observe(elm);

  return () => {
    visibleObserver.disconnect();
  };
}

function triggerResizeByOverflow() {
  const obse = new MutationObserver((mutationsList) => {
    const classMutation = mutationsList.find(
      (mutation) => mutation.type === 'attributes' && mutation.attributeName === 'class',
    );
    const oldClass = classMutation.oldValue || '';
    const newClass = classMutation.target.classList;
    const isAddClass = !oldClass.includes('overflow-hidden') && newClass.contains('overflow-hidden');
    const isRemoveClass = oldClass.includes('overflow-hidden') && !newClass.contains('overflow-hidden');
    if (isAddClass || isRemoveClass) {
      window.dispatchEvent(new Event('resize'));
    }
  });
  obse.observe(document.body, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['class'],
  });
}

triggerResizeByOverflow();

window.Shopline.bind = function (fn, scope) {
  return function (...arg) {
    return fn.apply(scope, arg);
  };
};

window.Shopline.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent(`on${eventName}`, callback);
};
;

// Global util


/**
 * @global
 * @param {String} name
 * @param {() => CustomElementConstructor} constructorCreator element constructor creator
 */
const defineCustomElement = (name, constructorCreator) => {
  if (!customElements.get(name)) {
    const constructor = constructorCreator();
    customElements.define(name, constructor);
    window[constructor.name] = constructor;
  }
};
;


/**
 * @global
 */
class BaseElement extends HTMLElement {
  constructor() {
    super();

    this.createVisibleObserver();
  }

  createVisibleObserver() {
    this.isVisibled = false;
    this.visibleObserver = new IntersectionObserver(
      (entrys) => {
        this.isVisibled = entrys[0].isIntertrue;
        this.dispatchEvent(
          new CustomEvent('visible', {
            detail: true,
          }),
        );
        this.visibleObserver.disconnect();
      },
      {
        rootMargin: '100px',
      },
    );
    this.visibleObserver.observe(this);
  }
}

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.close.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.close();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('click', (event) => {
        if (!event.target.closest('deferred-media, product-model')) {
          this.close();
        }
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.close();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  open(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    window.pauseAllMedia();
  }

  close() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);
;
function isMobileScreen() {
  return window.matchMedia('(max-width: 959px)').matches;
}

/**
 * Detect screen size
 * @param {({ isMobileScreen: boolean, event: Event | null, first: boolean }) => Function | void} onResize Called when the screen size changes, when there is a return function, the last time will be cleaned up when changing
 * @param {boolean} immediate Whether to call onResize for the first time
 * @returns {{isMobileScreen: boolean,destroy: Function}} Return detection results, cleaning function
 */

function detectingScreen(onResize, immediate) {
  // last screen
  let isMb = isMobileScreen();
  let cleanUp;

  function handleResize(event, first) {
    if (typeof onResize === 'function') {
      const _ = isMobileScreen();
      if (isMb !== _ || first) {
        // When the screen changes and `onResize` returns a cleanup function, the last cleanup function is called
        if (typeof cleanUp === 'function') {
          try {
            cleanUp({ isMobileScreen: isMb, event });
          } catch (err) {
            
            console.log('cleanUp call error', err);
          }
        }
        isMb = _;
        cleanUp = onResize({ isMobileScreen: _, event, first: !!first });
      }
    }
  }

  if (typeof onResize === 'function') {
    window.addEventListener('resize', handleResize);
  }

  if (immediate) {
    handleResize(null, true);
  }

  return {
    isMobileScreen: isMb,
    destroy() {
      if (typeof onResize === 'function') {
        window.removeEventListener('resize', handleResize);
      }
    },
  };
}
;


function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`,
    },
  };
}
;

// Global component
/**
 * @global
 */
class DetailsModal extends BaseElement {
  constructor() {
    super();

    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');
    this.contentElement = this.detailsContainer.querySelector('.modal__content');

    this.detailsContainer.addEventListener('keyup', (event) => event.code.toUpperCase() === 'ESCAPE' && this.close());
    const closeBtns = this.querySelectorAll('button[name="close"]');
    if (this.summaryToggle) {
      this.summaryToggle.addEventListener('click', this.onSummaryClick.bind(this));
      this.summaryToggle.setAttribute('role', 'button');
    }
    if (closeBtns.length) {
      closeBtns.forEach((btn) =>
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          this.close();
        }),
      );
    }
  }

  get isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  get disabledBodyClickClose() {
    return this.detailsContainer.hasAttribute('disabled-body-click-close');
  }

  onSummaryClick(event) {
    event.preventDefault();
    this.isOpen ? this.close() : this.open(event);
  }

  onBodyClick(event) {
    if (event.target.classList.contains('modal__overlay')) {
      this.close(event);
    }
  }

  doAnimate(isClose = false) {
    let timer;

    return new Promise((resolve) => {
      const onAnimationend = (event) => {
        if (event && event.target !== this.contentElement) return;
        this.contentElement.removeAttribute('style');
        this.contentElement.removeEventListener('animationend', onAnimationend);
        resolve(this);
        clearTimeout(timer);
      };

      requestAnimationFrame(() => {
        if (isClose) {
          this.contentElement.style.animationDirection = 'reverse';
        }

        this.contentElement.style.animationName = 'var(--modal-animation-name, fadeIn)';
        this.contentElement.addEventListener('animationend', onAnimationend);
        timer = setTimeout(onAnimationend, 300);
      });
    });
  }

  open() {
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    this.detailsContainer.setAttribute('open', true);
    if (!this.disabledBodyClickClose) {
      this.detailsContainer.addEventListener('click', this.onBodyClickEvent);
    }
    document.body.classList.add('overflow-hidden');

    const focusTarget = this.detailsContainer.querySelector('input[autofocus]:not([type="hidden"])');
    if (focusTarget) focusTarget.focus();

    return this.doAnimate();
  }

  close() {
    if (!this.isOpen) return Promise.resolve();

    return this.doAnimate(true).then((res) => {
      this.detailsContainer.removeAttribute('open');
      if (!this.disabledBodyClickClose) {
        this.detailsContainer.removeEventListener('click', this.onBodyClickEvent);
      }
      document.body.classList.remove('overflow-hidden');
      (this.focusToggle || false) && this.summaryToggle.focus();
      return res;
    });
  }
}

defineCustomElement('details-modal', () => DetailsModal);
;
/**
 * @global
 */
class AccordionComponent extends HTMLElement {
  constructor() {
    super();

    this.summaryToggles = this.querySelectorAll('summary');
    this.summaryToggles.forEach((summary) => {
      summary.addEventListener('click', this.onSummaryClick.bind(this));
    });
  }

  onSummaryClick(event) {
    event.preventDefault();
    const summary = event.currentTarget;
    const detailsContainer = summary.closest('details');
    detailsContainer.hasAttribute('open') ? this.close(detailsContainer) : this.open(detailsContainer);
  }

  doAnimate(contentElement, isClose = false) {
    const animation = [
      { height: 0, opacity: 0 },
      {
        height: `${contentElement.getBoundingClientRect().height}px`,
        opacity: 1,
      },
    ];

    isClose && animation.reverse();

    return contentElement.animate(animation, {
      iterations: 1,
      duration: 200,
      easing: 'ease',
    });
  }

  open(detailsContainer) {
    if (detailsContainer.parentNode.tagName === 'LI') {
      const detailList = detailsContainer.parentNode.parentNode.querySelectorAll('li');
      detailList.forEach((node) => {
        node.querySelector('details')?.removeAttribute('open');
      });
    }
    const template = detailsContainer.querySelector('template');
    if (template) {
      detailsContainer.appendChild(template.content);
      detailsContainer.removeChild(template);
    }
    detailsContainer.setAttribute('open', true);
    this.doAnimate(detailsContainer.querySelector('summary').nextElementSibling);
  }

  close(detailsContainer) {
    this.doAnimate(detailsContainer.querySelector('summary').nextElementSibling, true).addEventListener(
      'finish',
      () => {
        detailsContainer.removeAttribute('open');
      },
    );
  }
}

customElements.define('accordion-component', AccordionComponent);
;
// deferred load media (eg: video)
defineCustomElement(
  'deferred-media',
  () =>
    class DeferredMedia extends HTMLElement {
      constructor() {
        super();
        const poster = this.querySelector('[id^="Deferred-Poster-"]');
        if (!poster) return;
        poster.addEventListener('click', this.loadContent.bind(this));
      }

      loadContent(focus = true) {
        window.pauseAllMedia();
        if (!this.getAttribute('loaded')) {
          const content = document.createElement('div');
          content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

          this.setAttribute('loaded', true);
          const deferredElement = this.appendChild(content.querySelector('video, iframe'));
          if (focus) deferredElement.focus();
        }
      }
    },
);
;
defineCustomElement('modal-opener', () => {
  return class ModalOpener extends HTMLElement {
    constructor() {
      super();

      const button = this.querySelector('button');

      if (!button) return;
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modalId = this.getAttribute('data-modal').slice(1);
        const modals = document.querySelectorAll(`[id="${modalId}"]`);
        const targetModal = modals[modals.length - 1];
        if (targetModal) targetModal.open(button);
      });
    }
  };
});
;
class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this.getVariantStrings();
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '');
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.renderProductInfo();
    }

    this.updateURL();
    this.updateVariantInput();
    this.updateShareUrl();
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true),
    );

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (this.dataset.updateUrl === 'false') return;
    window.history.replaceState(
      {},
      document.title,
      changeURLArg(window.location.href, {
        sku: this.currentVariant?.id,
      }),
    );
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;

    const url = changeURLArg(`${window.shopUrl}${this.dataset.url}`, {
      sku: this.currentVariant?.id,
    });

    shareButton.updateUrl(url);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant?.id || '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const sku = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
    const { sectionTemplate } = this.dataset;
    fetch(
      `${this.dataset.url}?sku=${sku}&section_id=${sectionId}${
        sectionTemplate && `&section_template=${sectionTemplate}`
      }`,
    )
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(`price-${sectionId}`);
        if (source && destination) destination.innerHTML = source.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        this.updateProductInfo(
          document.getElementById(`inventory-${this.dataset.section}`),
          html.getElementById(`inventory-${sectionId}`),
        );

        // moq
        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        const volumePricingSource = html.getElementById(`Volume-${sectionId}`);
        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(`Price-Per-Item-${sectionId}`);
        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
        }

        this.toggleAddButton(!this.currentVariant.available, this.variantStrings.soldOut);

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  updateProductInfo(destination, source) {
    if (destination && source) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.toggle('visibility-hidden', source.innerText === '');
  }

  toggleAddButton(disable, text) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = this.variantStrings.addToCart;
    }
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = this.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    const jsonStr = this.querySelector('.variant-data[type="application/json"]')?.textContent.trim() || '[]';
    this.variantData = this.variantData || JSON.parse(jsonStr);
    return this.variantData;
  }

  getVariantStrings() {
    this.variantStrings =
      this.variantStrings || JSON.parse(this.querySelector('.variant-strings[type="application/json"]').textContent);
  }
}

class VariantRadios extends VariantSelects {
  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

defineCustomElement('variant-selects', () => VariantSelects);

defineCustomElement('variant-radios', () => VariantRadios);
;

// Global function

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
}
;

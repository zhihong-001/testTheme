defineCustomElement('slider-component', () => {
  const ACTIVE_CLASS = 'is-active';

  class SliderPlugin {
    /**
     * @param {SliderComponent} core
     */
    constructor(core) {
      this.core = core;
      this.core.addEventListener('visible', this.init.bind(this));
    }
  }

  class SliderAutoPlayPlugin extends SliderPlugin {
    constructor(core) {
      super(core);
      core.addEventListener('slideChanged', this.play.bind(this));
    }

    init() {
      const { core } = this;

      this.autoPlay = core.getAttribute('autoplay') === 'true';
      if (!this.autoPlay) return;
      this.autoPlaySpeed = (core.getAttribute('speed') || 8) * 1000;
      this.play();
    }

    play() {
      const { core } = this;

      clearTimeout(this._autoPlayTimer);
      if (!this.autoPlaySpeed || this.isLast) return;
      this._autoPlayTimer = setTimeout(
        () => this.core.slideTo((core.currentPage + 1) % core.totalPage || core.totalPage),
        this.autoPlaySpeed,
      );
    }

    pause() {
      clearTimeout(this._autoPlayTimer);
    }
  }

  class SliderArrowsPlugin extends SliderPlugin {
    constructor(core) {
      super(core);
      core.addEventListener('slideChanged', this.updateView.bind(this));
    }

    init() {
      const { core } = this;
      this.currentPageElement = core.querySelector('.slider-counter--current');
      this.pageTotalElement = core.querySelector('.slider-counter--total');
      this.prevButton = core.getAttribute('controller-previous')
        ? document.querySelector(core.getAttribute('controller-previous'))
        : core.querySelector('button[name="previous"]');
      this.nextButton = core.getAttribute('controller-next')
        ? document.querySelector(core.getAttribute('controller-next'))
        : core.querySelector('button[name="next"]');

      this.prevButton && this.prevButton.addEventListener('click', this._onButtonClick.bind(this, false));
      this.nextButton && this.nextButton.addEventListener('click', this._onButtonClick.bind(this, true));
    }

    _onButtonClick(dir, event) {
      event.preventDefault();
      const { core } = this;
      const step = Number(event.currentTarget.dataset.step || 1);

      if (!core.enableSliderLooping) {
        core.slideTo(dir ? Math.min(core.currentPage + step, core.totalPage) : Math.max(core.currentPage - step, 1));
      } else {
        core.slideTo(
          (dir
            ? (core.currentPage + step) % core.totalPage
            : (core.currentPage + core.totalPage - step) % core.totalPage) || core.totalPage,
        );
      }
    }

    updateView() {
      const { core } = this;
      if (this.currentPageElement && this.pageTotalElement) {
        this.currentPageElement.textContent = core.currentPage;
        this.pageTotalElement.textContent = core.totalPage;
      }

      if (!core.enableSliderLooping) {
        if (this.prevButton) {
          if (core.currentPage === 1) {
            this.prevButton.setAttribute('disabled', 'disabled');
          } else {
            this.prevButton.removeAttribute('disabled');
          }
        }

        if (this.nextButton) {
          if (core.currentPage === core.totalPage && this.nextButton) {
            this.nextButton.setAttribute('disabled', 'disabled');
          } else {
            this.nextButton.removeAttribute('disabled');
          }
        }
      }
    }
  }

  class SliderPagersPlugin extends SliderPlugin {
    constructor(core) {
      super(core);
      core.addEventListener('slideChanged', this.updateView.bind(this));
    }

    init() {
      const { core } = this;

      this.pagers = core.querySelectorAll('button[name="pager"]');
      this.pagers.forEach((pager) => {
        pager.addEventListener('click', (event) => {
          const index = Number(pager.dataset.index);
          if (!Number.isNaN(index)) {
            event.preventDefault();
            this.core.slideTo(index + 1);
          }
        });
      });
    }

    updateView() {
      if (this.pagers) {
        this.pagers.forEach((pager) =>
          pager.classList[String(this.core.currentPage - 1) === pager.dataset.index ? 'add' : 'remove'](ACTIVE_CLASS),
        );
      }
    }
  }

  return class SliderComponent extends BaseElement {
    constructor() {
      super();

      this.slider = this.querySelector('[id^="Slider-"]');

      if (!this.slider) return;

      this.mql = window.matchMedia('(min-width: 750px)');
      this.slideItems = Array.from(this.querySelectorAll('[id^="Slide-"]'));
      this.currentPage = 1;
      this.totalPage = this.slideItems.length;
      this.enableSliderLooping = this.hasAttribute('loop');

      this.plugins = {
        autoplay: new SliderAutoPlayPlugin(this),
        arrows: new SliderArrowsPlugin(this),
        pagers: new SliderPagersPlugin(this),
      };

      this.slider.addEventListener('scroll', window.throttle(this._slideUpdate.bind(this), 100));
      this.addEventListener('visible', this.initSlides.bind(this));
      const resizeObserver = new ResizeObserver(window.throttle(this.initSlides.bind(this), 100));
      resizeObserver.observe(this.slider);
    }

    initSlides() {
      this.slideItems = Array.from(this.querySelectorAll('[id^="Slide-"]'));
      this.currentPage = this._getInitPage();
      this.totalPage = this._getTotalPage();
      this.updateView();
    }

    get direction() {
      if (this.hasAttribute('pc-direction') && this.mql.matches) {
        return this.getAttribute('pc-direction') === 'vertical' ? 'vertical' : 'horizontal';
      }
      if (this.hasAttribute('tablet-direction')) {
        return this.getAttribute('tablet-direction') === 'vertical' ? 'vertical' : 'horizontal';
      }
      return this.getAttribute('direction') === 'vertical' ? 'vertical' : 'horizontal';
    }

    get isLast() {
      return this.enableSliderLooping ? this.currentPage === this.totalPage : false;
    }

    resetSlides() {
      this.initSlides();
      this._slideUpdate();
    }

    _slideUpdate() {
      const idx = this.slideItems.findIndex((slide) => this.isSlideVisible(slide));

      if (idx < 0 || idx >= this.totalPage) return;

      const targetSlide = this.slideItems[idx];
      const previousPage = this.currentPage;
      this.currentPage = idx + 1;

      if (previousPage !== this.currentPage) {
        this.dispatchEvent(
          new CustomEvent('slideChanged', {
            detail: {
              currentPage: this.currentPage,
              currentElement: targetSlide,
            },
          }),
        );

        this._updateView();
      }
    }

    _getTotalPage() {
      if (this.slideItems.length === 1) return 1;

      const sliderClientSize = this.direction === 'horizontal' ? this.slider.clientWidth : this.slider.clientHeight;
      const sliderFullSize = this.direction === 'horizontal' ? this.slider.scrollWidth : this.slider.scrollHeight;

      let slideWithInScreenNum = 1;

      for (let i = this.slideItems.length - 2; i >= 0; i--) {
        const slide = this.slideItems[i];
        const slideOffsetSize = this.direction === 'horizontal' ? slide.offsetLeft : slide.offsetTop;

        if (sliderFullSize - slideOffsetSize < sliderClientSize + 1) {
          slideWithInScreenNum++;
        } else {
          break;
        }
      }

      return this.slideItems.length - slideWithInScreenNum + 1;
    }

    _getInitPage() {
      const idx = this.slideItems.findIndex((slide) => slide.classList.contains(ACTIVE_CLASS));
      return idx < 0 ? 1 : idx + 1;
    }

    _updateView() {
      this.slideItems.forEach((slide, idx) => {
        slide.classList[idx === this.currentPage - 1 ? 'add' : 'remove'](ACTIVE_CLASS);
      });
    }

    updateView() {
      this._updateView();
      Object.values(this.plugins).forEach((plugin) => plugin.updateView && plugin.updateView());
      this.slideTo(this.currentPage, true);
    }

    isSlideVisible(element) {
      if (this.direction === 'vertical') {
        return (
          element.clientHeight > 0 &&
          element.offsetTop - this.slider.scrollTop >= -1 &&
          this.slider.clientHeight + this.slider.scrollTop - (element.offsetTop + element.clientHeight) >= -1
        );
      }
      return (
        element.clientWidth > 0 &&
        element.offsetLeft - this.slider.scrollLeft >= -1 &&
        this.slider.clientWidth + this.slider.scrollLeft - (element.offsetLeft + element.clientWidth) >= -1
      );
    }

    /**
     * Switch to the target frame
     */
    slideTo(idx, force) {
      if (idx === this.currentPage && !force) return;

      const targetSlide = this.slideItems[idx - 1];
      targetSlide &&
        this.slider.scrollTo(
          this.direction === 'vertical' ? { top: targetSlide.offsetTop } : { left: targetSlide.offsetLeft },
        );
    }
  };
});

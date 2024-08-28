defineCustomElement(
  'announcement-bar-section',
  () =>
    class AnnouncementBarSection extends SliderComponent {
      constructor() {
        super();
        this.enableSliderLooping = true;
        this.addEventListener('visible', this.init.bind(this));
        this.bindManualArrow();
      }

      init() {
        this.initSliderHeight();
        this.bindResize();
      }

      initSliderHeight() {
        if (this.direction !== 'vertical') {
          return;
        }

        this.resetSliderHeight();

        let max = 0;
        this.slideItems.forEach((item) => {
          const height = item.clientHeight;
          max = max > height ? max : height;
        });
        if (max === 0) {
          return;
        }

        this.setSliderHeight(max);
      }

      resetSliderHeight() {
        this.slider.style.height = 'auto';
        this.slideItems.forEach((item) => {
          item.style.height = 'auto';
        });
      }

      setSliderHeight(h) {
        this.slider.style.height = `${h}px`;
        this.slideItems.forEach((item) => {
          item.style.height = '100%';
        });
      }

      bindResize() {
        if (this.direction !== 'vertical') {
          return;
        }

        const debounceSetHeight = debounce(() => this.initSliderHeight(), 500);
        window.addEventListener('resize', debounceSetHeight);
      }

      splideTo(index) {
        if (this.getAttribute('autoplay') === 'true') {
          super.plugins.autoplay.pause();
        }
        super.slideTo(index + 1);
      }

      play() {
        if (this.getAttribute('autoplay') === 'true') {
          super.plugins.autoplay.play();
        }
      }

      bindManualArrow() {
        const that = this;
        if (this.dataset.displayMode === 'manual') {
          const arrows = this.querySelectorAll('.announcement-bar-item__arrow-prev');
          if (arrows.length > 0) {
            this.querySelectorAll('.announcement-bar-item__arrow-prev').forEach(function (ele) {
              ele.addEventListener('click', function () {
                if (that.plugins.arrows.prevButton) that.plugins.arrows.prevButton.click();
              });
            });
            this.querySelectorAll('.announcement-bar-item__arrow-next').forEach(function (ele) {
              ele.addEventListener('click', function () {
                if (that.plugins.arrows.nextButton) that.plugins.arrows.nextButton.click();
              });
            });
          }
        }
      }
    },
);

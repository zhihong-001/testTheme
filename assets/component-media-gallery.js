defineCustomElement('media-gallery', () => {
  return class MediaGallery extends HTMLElement {
    constructor() {
      super();

      this.elements = {
        liveRegion: this.querySelector('[id^="GalleryStatus"]'),
        viewer: this.querySelector('[id^="GalleryViewer"]'),
        thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
      };
      this.mql = window.matchMedia('(min-width: 750px)');
      if (!this.elements.thumbnails) return;

      this.elements.viewer.addEventListener('slideChanged', window.debounce(this.onSlideChanged.bind(this), 500));
      this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
        mediaToSwitch
          .querySelector('button')
          .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
      });
    }

    onSlideChanged(event) {
      const thumbnail = this.elements.thumbnails.querySelector(
        `[data-target="${event.detail.currentElement.dataset.mediaId}"]`,
      );
      this.setActiveThumbnail(thumbnail);
    }

    setActiveMedia(mediaId, prepend) {
      const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
      const activeMediaIndex = Array.from(activeMedia.parentElement.children).indexOf(activeMedia);
      const isMobile = window.isMobileScreen();

      const pcStyle = this.getAttribute('data-desktop-layout');
      const pcIsSlider = pcStyle === 'thumbnail_flatten' || pcStyle === 'carousel';
      if (pcIsSlider && activeMediaIndex > -1) {
        if (!isMobile) {
          this.elements.viewer.currentPage = activeMediaIndex + 1;
          this.elements.viewer.updateView();
        }
      }
      // this.elements.viewer.slideTo(2);
      // this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
      //   element.classList.remove('is-active');
      // });
      // activeMedia.classList.add('is-active');

      if (prepend && !isMobile && !pcIsSlider) {
        activeMedia.parentElement.prepend(activeMedia);
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
          activeThumbnail.parentElement.prepend(activeThumbnail);
          this.elements.thumbnails.resetSlides();
        }
        if (this.elements.viewer.slider) {
          this.elements.viewer.resetSlides();
          this.elements.viewer.slideTo(1);
        }
      }

      this.preventStickyHeader();
      window.setTimeout(() => {
        activeMedia.parentElement.scrollTo({
          left: activeMedia.offsetLeft,
        });

        if (!isMobile && (!this.elements.thumbnails || this.dataset.desktopLayout === 'flatten')) {
          activeMedia.scrollIntoView({ behavior: 'smooth' });
        }
      });
      this.playActiveMedia(activeMedia);

      if (!this.elements.thumbnails) return;
      const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
      this.setActiveThumbnail(activeThumbnail);
      this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
    }

    setActiveThumbnail(thumbnail) {
      if (!this.elements.thumbnails || !thumbnail) return;

      this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('data-current'));
      thumbnail.querySelector('button').setAttribute('data-current', true);

      if (this.elements.thumbnails.isSlideVisible(thumbnail)) return;

      this.elements.thumbnails.slider.scrollTo({
        left: thumbnail.offsetLeft,
      });
    }

    announceLiveRegion(activeItem) {
      const image = activeItem.querySelector('.product__modal-opener--image img');
      if (!image) return;
      image.onload = () => {
        this.elements.liveRegion.setAttribute('data-hidden', false);
        // this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
        setTimeout(() => {
          this.elements.liveRegion.setAttribute('data-hidden', true);
        }, 2000);
      };
      // image.src = image.src;
    }

    playActiveMedia(activeItem) {
      window.pauseAllMedia();
      const deferredMedia = activeItem.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }

    preventStickyHeader() {
      this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
      if (!this.stickyHeader) return;
      this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    }
  };
});

defineCustomElement('share-button', () => {
  return class ShareButton extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        details: this.querySelector('details'),
        shareButton: this.querySelector('button'),
        shareSummary: this.querySelector('summary'),
        copyButton: this.querySelector('.share-button__copy'),
        copySuccessButton: this.querySelector('.share-button__copy-succuess'),
        closeButton: this.querySelector('.share-button__close'),
        successMessage: this.querySelector('[id^="ShareMessage"]'),
        link: this.querySelector('.share-button__link'),
        fallback: this.querySelector('.share-button__fallback'),
      };
      this.urlToShare = this.elements.urlInput ? this.elements.urlInput.value : document.location.href;

      this.elements.fallback
        .querySelector('.share-button__copy')
        .addEventListener('click', this.copyToClipboard.bind(this));
      this.elements.closeButton.addEventListener('click', this.close.bind(this));
      this.elements.copySuccessButton.addEventListener('click', this.close.bind(this));
      this.elements.shareSummary.addEventListener('click', this.initOutSideClick.bind(this));
    }

    // Register click outside the dom event
    initOutSideClick() {
      const handlerClick = (event) => {
        const isSelf = this.elements.details.contains(event.target);
        if (!isSelf) {
          this.close();
          document.removeEventListener('click', handlerClick);
        }
      };
      document.addEventListener('click', handlerClick);
    }

    close() {
      // Reset
      this.elements.details.removeAttribute('open');
      this.elements.copyButton.classList.remove('display-none');
      this.elements.copySuccessButton.classList.add('display-none');
      this.elements.link.innerHTML = this.elements.link.getAttribute('data-copy_text');
    }

    toggleDetails() {
      if (this.elements.details.open) {
        this.elements.fallback.focus();
      }
    }

    copyToClipboard() {
      navigator.clipboard.writeText(this.elements.link.innerText).then(() => {
        this.elements.copyButton.classList.add('display-none');
        this.elements.copySuccessButton.classList.remove('display-none');
        this.elements.link.innerHTML = this.elements.link.getAttribute('data-succuess_text');
      });
    }

    updateUrl(url) {
      this.elements.link.innerHTML = url;
    }
  };
});

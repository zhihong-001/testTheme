defineCustomElement('product-form', () => {
  return class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      if (!this.form) {
        return;
      }

      this.form.querySelector('[name=id]').disabled = false;
      this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer-entry');
      this.submitButton = this.querySelector('[type="submit"]');
      this.submitButton.addEventListener('click', this.submitButtonClickHandler.bind(this));
    }

    // Because the editor hijack the a tag click event, the click event needs to be bound to prevent bubbling
    submitButtonClickHandler(e) {
      e.preventDefault();
      e.stopPropagation();
      this.onSubmitHandler();
    }

    onSubmitHandler() {
      if (this.submitButton.classList.contains('disabled') || this.submitButton.classList.contains('loading')) return;

      this.handleErrorMessage();

      this.submitButton.classList.add('loading');
      this.querySelector('.loading-overlay__spinner').classList.add('display-flex');

      const config = window.fetchConfig();
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];
      const formData = new FormData(this.form);
      this.ensureQuantity(formData);
      formData.delete('returnTo');

      const isCartPage = document.body.getAttribute('data-template') === 'cart';
      if (this.cart && !isCartPage) {
        formData.append(
          'sections',
          this.cart.getSectionsToRender().map((section) => section.id),
        );
        formData.append('sections_url', window.location.pathname);
      }
      config.body = formData;
      fetch(`${window.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.message) {
            this.handleErrorMessage(response.message);
            const isQuickAdd = this.submitButton.classList.contains('quick-add__submit');
            if (!isQuickAdd) return;
            this.submitButton.classList.add('disabled');
            this.submitButton.querySelector('span').classList.add('hidden');
            this.error = true;
            return;
          }
          if (!this.cart || isCartPage) {
            window.location = window.routes.cart_url;
            return;
          }

          this.error = false;
          const quickAddModal = this.closest('quick-add-modal');
          const SLQuickAddModal = (window.Shopline.utils || {}).quickAddModal;
          if (quickAddModal) {
            document.body.addEventListener(
              'modalClosed',
              () => {
                setTimeout(() => {
                  this.cart.renderContents(response);
                });
              },
              { once: true },
            );
            quickAddModal.close(true);
          } else if (SLQuickAddModal) {
            SLQuickAddModal.close().then(() => this.cart.renderContents(response));
          } else {
            this.cart.renderContents(response);
          }
        })
        .catch(() => {
          this.handleErrorMessage(this.getAttribute('data-default-error-message'));
        })
        .finally(() => {
          this.submitButton.classList.remove('loading');
          this.querySelector('.loading-overlay__spinner').classList.remove('display-flex');
        });
    }

    ensureQuantity(formData) {
      if (!formData.has('quantity')) {
        formData.set('quantity', '1');
      }
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  };
});

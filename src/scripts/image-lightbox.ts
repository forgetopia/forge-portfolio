/** Native modal dialogs provide background inertness without a UI framework. */
export function initImageLightboxes() {
  document.querySelectorAll<HTMLElement>('[data-still-gallery]').forEach((gallery) => {
    if (gallery.dataset.lightboxInitialized === 'true') return;

    const triggers = [...gallery.querySelectorAll<HTMLAnchorElement>('[data-lightbox-trigger]')];
    const dialog = gallery.querySelector<HTMLDialogElement>('[data-image-lightbox]');
    const close = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-close]');
    const previous = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
    const next = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-next]');
    const imageArea = dialog?.querySelector<HTMLElement>('[data-lightbox-image-area]');
    const caption = dialog?.querySelector<HTMLElement>('[data-lightbox-caption]');
    const count = dialog?.querySelector<HTMLElement>('[data-lightbox-count]');
    const status = dialog?.querySelector<HTMLElement>('[data-lightbox-status]');
    const placeholder = dialog?.querySelector<HTMLElement>('[data-lightbox-placeholder]');
    let image = dialog?.querySelector<HTMLImageElement>('[data-lightbox-image]');

    // Unsupported browsers retain ordinary links to the full-size images.
    if (!dialog || typeof dialog.showModal !== 'function' || !close || !previous || !next
      || !imageArea || !caption || !count || !status || !placeholder || !image || !triggers.length) return;

    let currentIndex = 0;
    let requestVersion = 0;
    let opener: HTMLAnchorElement | null = null;
    let restoreScroll: (() => void) | null = null;

    const lockScroll = () => {
      const root = document.documentElement;
      const body = document.body;
      const rootOverflow = root.style.overflow;
      const bodyOverflow = body.style.overflow;
      const bodyPadding = body.style.paddingRight;
      const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;

      return () => {
        root.style.overflow = rootOverflow;
        body.style.overflow = bodyOverflow;
        body.style.paddingRight = bodyPadding;
      };
    };

    const showImage = (index: number) => {
      currentIndex = (index + triggers.length) % triggers.length;
      const trigger = triggers[currentIndex];
      if (!trigger) return;

      const version = ++requestVersion;
      const candidate = new Image();
      candidate.className = 'lightbox-image';
      candidate.dataset.lightboxImage = '';
      candidate.alt = trigger.dataset.imageAlt ?? '';
      candidate.width = Number(trigger.dataset.imageWidth) || 1;
      candidate.height = Number(trigger.dataset.imageHeight) || 1;
      candidate.decoding = 'async';
      candidate.hidden = true;

      caption.textContent = trigger.dataset.imageCaption ?? candidate.alt;
      count.textContent = `Image ${currentIndex + 1} of ${triggers.length}`;
      placeholder.hidden = trigger.dataset.imagePlaceholder !== 'true';
      status.textContent = 'Loading image…';
      imageArea.setAttribute('aria-busy', 'true');

      // A new image instance and request token isolate fast navigation from stale events.
      candidate.onload = () => {
        if (version !== requestVersion || !dialog.open) return;
        candidate.hidden = false;
        status.textContent = '';
        imageArea.setAttribute('aria-busy', 'false');
      };
      candidate.onerror = () => {
        if (version !== requestVersion || !dialog.open) return;
        candidate.hidden = true;
        status.textContent = 'Image could not be loaded. Try another still frame or close the viewer.';
        imageArea.setAttribute('aria-busy', 'false');
      };

      if (image) {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute('src');
        image.replaceWith(candidate);
      }
      image = candidate;
      candidate.src = trigger.getAttribute('href') ?? trigger.href;
    };

    previous.disabled = next.disabled = triggers.length < 2;
    previous.addEventListener('click', () => showImage(currentIndex - 1));
    next.addEventListener('click', () => showImage(currentIndex + 1));
    close.addEventListener('click', () => dialog.close());

    triggers.forEach((trigger, index) => {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        if (dialog.open) {
          event.preventDefault();
          opener = trigger;
          showImage(index);
          close.focus({ preventScroll: true });
          return;
        }

        try {
          dialog.showModal();
        } catch {
          // Preserve the original link if the dialog cannot be opened.
          return;
        }
        event.preventDefault();
        document.dispatchEvent(new Event('forge:lightbox-open'));
        opener = trigger;
        restoreScroll = lockScroll();
        showImage(index);
        close.focus({ preventScroll: true });
      });
    });

    dialog.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showImage(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
        return;
      }
      if (event.key !== 'Tab') return;

      const controls = [close, previous, next].filter((button) => !button.disabled);
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !controls.includes(active as HTMLButtonElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !controls.includes(active as HTMLButtonElement))) {
        event.preventDefault();
        first?.focus();
      }
      // Escape retains the dialog's native cancel/close behavior.
    });

    dialog.addEventListener('close', () => {
      requestVersion += 1;
      if (image) {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute('src');
        image.hidden = true;
      }
      status.textContent = '';
      imageArea.setAttribute('aria-busy', 'false');
      restoreScroll?.();
      restoreScroll = null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });

    gallery.dataset.lightboxInitialized = 'true';
  });
}

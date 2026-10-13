/** Enhance the static collection only after its controls are ready to use. */
export function initPortfolioGalleries() {
  document.querySelectorAll<HTMLElement>('[data-portfolio-gallery]').forEach((gallery) => {
    if (gallery.dataset.initialized === 'true') return;

    const controls = gallery.querySelector<HTMLElement>('[data-gallery-controls]');
    const buttons = [...gallery.querySelectorAll<HTMLButtonElement>('[data-category-filter]')];
    const cards = [...gallery.querySelectorAll<HTMLElement>('[data-project-card]')];
    const count = gallery.querySelector<HTMLElement>('[data-gallery-count]');
    const empty = gallery.querySelector<HTMLElement>('[data-gallery-empty]');
    const reset = gallery.querySelector<HTMLButtonElement>('[data-gallery-reset]');
    const allButton = buttons.find((button) => button.dataset.categoryFilter === 'all');

    if (!controls || !count || !empty || !reset || !allButton) return;

    const selectCategory = (selectedButton: HTMLButtonElement) => {
      const category = selectedButton.dataset.categoryFilter;
      const focusedElement = document.activeElement;
      let focusBecomesHidden = false;
      let visible = 0;

      cards.forEach((card) => {
        const matches = category === 'all' || (card.dataset.categories ?? '').split(' ').includes(category ?? '');
        if (!matches && focusedElement && card.contains(focusedElement)) focusBecomesHidden = true;
        card.hidden = !matches;
        if (matches) visible += 1;
      });

      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === selectedButton)));
      const categoryDescription = category === 'all' ? '' : ` in ${selectedButton.textContent?.trim() ?? ''}`;
      count.textContent = `Showing ${visible} ${visible === 1 ? 'work' : 'works'}${categoryDescription}`;
      if (visible !== 0 && focusedElement && empty.contains(focusedElement)) focusBecomesHidden = true;
      empty.hidden = visible !== 0;
      // Pointer activation does not move focus to buttons in every browser.
      // Keep a focused card or empty-state action from disappearing beneath the visitor.
      if (focusBecomesHidden) selectedButton.focus({ preventScroll: true });
    };

    buttons.forEach((button) => button.addEventListener('click', () => selectCategory(button)));
    reset.addEventListener('click', () => {
      selectCategory(allButton);
      allButton.focus();
    });

    gallery.dataset.initialized = 'true';
    controls.hidden = false;
  });
}

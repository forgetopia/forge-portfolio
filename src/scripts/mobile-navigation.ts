/** Keep the native disclosure usable without turning navigation into a modal. */
export function initMobileNavigation() {
  document.querySelectorAll<HTMLDetailsElement>('[data-mobile-menu]').forEach((menu) => {
    if (menu.dataset.navigationInitialized === 'true') return;

    const summary = menu.querySelector<HTMLElement>('summary');
    const header = menu.closest<HTMLElement>('.site-header');
    if (!summary || !header) return;

    // Match the stylesheet's mobile breakpoint; native summary exposes expanded state.
    const desktop = window.matchMedia('(min-width: 641px)');
    let lastMenuFocus: HTMLElement | null = null;
    const close = (restoreFocus = false) => {
      lastMenuFocus = null;
      if (!menu.open) return;
      menu.open = false;
      if (restoreFocus && !desktop.matches) {
        summary.focus({ preventScroll: true });
        lastMenuFocus = summary;
      }
    };

    document.addEventListener('keydown', (event) => {
      if (!menu.open || event.defaultPrevented || event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    });

    document.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Node) || menu.contains(event.target)) return;

      // Restore hidden menu focus first; a clicked control can then receive its usual focus.
      close(menu.contains(document.activeElement));
    });

    document.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement && menu.contains(event.target)) {
        lastMenuFocus = event.target;
      } else {
        close();
      }
    });

    menu.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target.closest('nav a[href]')) close(true);
    });

    const updateViewport = () => {
      if (!desktop.matches) return;
      const active = document.activeElement;
      // CSS can hide the disclosure and blur its child before this callback fires.
      // Only body focus can use that remembered child; another focused control wins.
      const menuFocus = active instanceof HTMLElement && menu.contains(active)
        ? active
        : active === document.body ? lastMenuFocus : null;
      close();
      if (!menuFocus) return;

      // A desktop resize must not leave keyboard focus on the now-hidden disclosure.
      const equivalent = menuFocus instanceof HTMLAnchorElement
        ? [...header.querySelectorAll<HTMLAnchorElement>('.desktop-navigation a')]
          .find((link) => link.href === menuFocus.href)
        : undefined;
      (equivalent ?? header.querySelector<HTMLAnchorElement>('.wordmark'))?.focus({ preventScroll: true });
    };

    desktop.addEventListener('change', updateViewport);
    window.addEventListener('pagehide', () => close());
    updateViewport();
    menu.dataset.navigationInitialized = 'true';
  });
}

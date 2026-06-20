let indicatorUpdate = null;

export function initPillNav() {
  const wrapper = document.querySelector('.pill-nav-wrapper');
  const indicator = document.querySelector('.pill-nav-indicator');
  const items = document.querySelectorAll('.pill-nav .nav-menu li');
  if (!wrapper || !indicator || !items.length) return () => {};

  const moveTo = (el, hover = false) => {
    if (!el) return;
    indicator.style.width = `${el.offsetWidth}px`;
    indicator.style.transform = `translateX(${el.offsetLeft}px)`;
    indicator.classList.toggle('is-hover', hover && !el.classList.contains('active'));
  };

  const activeItem = () => wrapper.querySelector('.nav-menu li.active');

  const update = () => moveTo(activeItem());

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => moveTo(item, true));
    item.addEventListener('mouseleave', () => moveTo(activeItem()));
  });

  window.addEventListener('resize', update);
  requestAnimationFrame(() => requestAnimationFrame(update));

  indicatorUpdate = update;
  return update;
}

export function refreshPillNavIndicator() {
  indicatorUpdate?.();
}

export type TopDockOptions = {
  proximity: number;
  spring: number;
  damping: number;
  widthGrowth: number;
  heightGrowth: number;
  drop: number;
};

/** Fixed track with stable rest positions and spring-driven horizontal cells. */
export function createTopDockController(
  root: HTMLElement,
  getOptions: () => TopDockOptions,
) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-dock-item]')];
  const state = items.map(() => ({ value: 0, velocity: 0, target: 0 }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'),
    coarse = matchMedia('(pointer: coarse)');
  let frame = 0,
    focused = -1,
    pointer: number | null = null,
    previousTime = 0;
  const paint = () => {
    const options = getOptions();
    items.forEach((item, i) => {
      item.style.setProperty('--dock-grow', state[i].value.toFixed(4));
      item.style.setProperty('--dock-width-growth', `${options.widthGrowth}px`);
      item.style.setProperty(
        '--dock-height-growth',
        `${options.heightGrowth}px`,
      );
      item.style.setProperty('--dock-drop', `${options.drop}px`);
    });
    const max = Math.max(0, ...state.map((s) => s.value));
    root.dataset.dockMax = max.toFixed(2);
    root.dataset.dockState = max > 0.02 ? 'active' : 'idle';
  };
  const tick = (now: number) => {
    frame = 0;
    const options = getOptions();
    const steps = Math.min(
      2,
      Math.max(0.5, (now - (previousTime || now - 16.67)) / 16.67),
    );
    previousTime = now;
    let moving = false;
    state.forEach((s) => {
      s.velocity =
        (s.velocity + (s.target - s.value) * options.spring * steps) *
        Math.pow(options.damping, steps);
      s.value = Math.max(0, Math.min(1.12, s.value + s.velocity * steps));
      if (Math.abs(s.target - s.value) + Math.abs(s.velocity) < 0.002) {
        s.value = s.target;
        s.velocity = 0;
      } else moving = true;
    });
    paint();
    if (moving && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const update = () => {
    const disabled = reduced.matches || coarse.matches || innerWidth <= 840;
    const bounds = root.getBoundingClientRect();
    const base =
      Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--dock-base-width'),
      ) || 86;
    const gap = Number.parseFloat(getComputedStyle(root).gap) || 4;
    const left =
      bounds.left +
      (bounds.width - (base * items.length + gap * (items.length - 1))) / 2;
    state.forEach((s, i) => {
      const center = left + base / 2 + i * (base + gap);
      s.target = disabled
        ? 0
        : focused === i
          ? 1
          : pointer === null
            ? 0
            : Math.max(
                0,
                1 - Math.abs(pointer - center) / getOptions().proximity,
              );
      if (disabled) {
        s.value = 0;
        s.velocity = 0;
      }
    });
    if (disabled) {
      cancelAnimationFrame(frame);
      frame = 0;
      paint();
    } else if (!frame && !document.hidden) {
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const move = (e: PointerEvent) => {
    pointer = e.clientX;
    update();
  };
  const leave = () => {
    pointer = null;
    update();
  };
  const focus = (e: FocusEvent) => {
    focused = items.findIndex((item) => item.contains(e.target as Node));
    update();
  };
  const blur = () => {
    focused = -1;
    update();
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else update();
  };
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', leave);
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', blur);
  window.addEventListener('resize', update);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', update);
  coarse.addEventListener('change', update);
  paint();
  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('focusin', focus);
    root.removeEventListener('focusout', blur);
    window.removeEventListener('resize', update);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', update);
    coarse.removeEventListener('change', update);
  };
}

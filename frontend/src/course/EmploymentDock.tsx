import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BriefcaseBusiness, FileText, PanelLeft, X } from 'lucide-react';
import type { Menu } from './api';
import './employmentDock.css';

const compactQuery = '(max-width: 900px)';

/** Fixed glass rail, rendered outside the page's transformed/blurred containers. */
export default function EmploymentDock({ menus, teacher }: { menus: Menu[]; teacher: boolean }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [compact, setCompact] = useState(() => matchMedia(compactQuery).matches);
  const [open, setOpen] = useState(true);
  const panel = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const visible = !compact || open;

  useEffect(() => {
    const query = matchMedia(compactQuery);
    const change = () => setCompact(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.compact-header');
    if (!header) return;
    const measure = () => host.current?.style.setProperty('--employment-dock-top', `${Math.ceil(header.getBoundingClientRect().bottom + 18)}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);

  useEffect(() => {
    const root = nav.current;
    if (!root || reduced || compact) return;
    const items = [...root.querySelectorAll<HTMLElement>('[data-rail-item]')];
    const states = items.map(() => ({ value: 0, velocity: 0, target: 0 }));
    let frame = 0, pointer: number | null = null, focused = -1, previous = 0;
    const tick = (now: number) => {
      frame = 0;
      const step = Math.min(2, Math.max(.5, (now - (previous || now - 16.67)) / 16.67));
      previous = now;
      let moving = false;
      states.forEach((state, index) => {
        state.velocity = (state.velocity + (state.target - state.value) * .19 * step) * Math.pow(.7, step);
        state.value = Math.max(0, Math.min(1.08, state.value + state.velocity * step));
        if (Math.abs(state.target - state.value) + Math.abs(state.velocity) < .002) {
          state.value = state.target; state.velocity = 0;
        } else moving = true;
        items[index].style.setProperty('--rail-grow', state.value.toFixed(4));
      });
      if (moving && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const update = () => {
      const top = root.getBoundingClientRect().top;
      states.forEach((state, index) => {
        const center = top + items[index].offsetTop - root.scrollTop + items[index].offsetHeight / 2;
        state.target = focused === index ? 1 : pointer === null ? 0 : Math.max(0, 1 - Math.abs(pointer - center) / 122);
      });
      if (!frame && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); }
    };
    const move = (event: PointerEvent) => { if (event.pointerType !== 'touch') { pointer = event.clientY; update(); } };
    const leave = () => { pointer = null; update(); };
    const focus = (event: FocusEvent) => { focused = items.findIndex(item => item.contains(event.target as Node)); update(); };
    const blur = () => { focused = -1; update(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else update(); };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('focusin', focus);
    root.addEventListener('focusout', blur);
    root.addEventListener('scroll', update, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      items.forEach(item => item.style.removeProperty('--rail-grow'));
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('focusin', focus);
      root.removeEventListener('focusout', blur);
      root.removeEventListener('scroll', update);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [menus, compact, reduced, visible]);

  const close = () => { setOpen(false); toggle.current?.focus(); };
  useEffect(() => {
    if (!compact || !open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLButtonElement>('[data-dock-close]')?.focus({ preventScroll: true });
    return () => {
      if (panel.current?.contains(document.activeElement) && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [compact, open]);

  return createPortal(<div ref={host} className="employment-dock-host">
    {compact && open && <button className="employment-dock-backdrop" aria-label="收起就业导航" onClick={close} tabIndex={-1} />}
    {visible && <motion.aside
      ref={panel}
      id="employment-floating-navigation"
      className="employment-sidebar employment-floating-dock"
      aria-label={teacher ? '教师端就业导航' : '学生端就业导航'}
      initial={reduced ? false : { opacity: 0, x: -22, scale: .97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      onKeyDown={event => { if (compact && event.key === 'Escape') { event.preventDefault(); close(); } }}
    >
      <div className="employment-dock-glow" aria-hidden="true" />
      <div className="employment-sidebar-brand">
        <span className="employment-dock-mark"><BriefcaseBusiness size={23} strokeWidth={1.7} /></span>
        <div><strong>{teacher ? '教师端 · 就业管理' : '学生端 · 求职中心'}</strong><small>{teacher ? 'TEACHER WORKSPACE' : 'STUDENT CAREER SPACE'}</small></div>
        {compact && <button data-dock-close type="button" className="employment-dock-close" aria-label="收起就业导航" onClick={close}><X size={19} /></button>}
      </div>
      <nav ref={nav} className="employment-dock-nav" aria-label="就业模块导航">
        {menus.map(menu => <Link
          key={menu.id}
          to={menu.path}
          data-rail-item
          className={`employment-dock-link ${location.pathname === menu.path ? 'selected' : ''}`}
          aria-current={location.pathname === menu.path ? 'page' : undefined}
          onClick={() => { if (compact) close(); }}
        ><span>{menu.label}</span><ArrowUpRight size={17} strokeWidth={1.6} /></Link>)}
        {!menus.length && <p className="employment-dock-pending">正在连接就业导航…</p>}
      </nav>
      <div className="employment-dock-footer">
        <Link className="employment-template-link" to="/resume-templates"><FileText size={18} strokeWidth={1.7} />浏览简历市场<ArrowUpRight size={15} /></Link>
        <p className="employment-sidebar-note">{teacher ? '关注每份投递，连接每个机会。' : '跟进自己的求职，走好每一步。'}</p>
      </div>
    </motion.aside>}
    {compact && <button
      ref={toggle}
      className="employment-dock-toggle"
      aria-label={open ? '收起就业导航' : '展开就业导航'}
      aria-expanded={open}
      aria-controls="employment-floating-navigation"
      onClick={() => setOpen(value => !value)}
    ><PanelLeft size={19} /><span>就业导航</span><span className="employment-dock-toggle-dot" aria-hidden="true" /></button>}
  </div>, document.body);
}

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Database,
  FileStack,
  FileText,
  LayoutTemplate,
  LogOut,
  MessageSquare,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronDown,
  ArrowLeftRight,
  UserRound,
  BriefcaseBusiness,
} from 'lucide-react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { clearAuthSession } from '../../api/auth';
import { useProfile } from '../../hooks/useProfile';
import StudioAtmosphere from '../StudioAtmosphere';
import { createTopDockController } from './topDockController';

const navItems = [
  { path: '/community', label: '社区频道', icon: Users },
  { path: '/history', label: '简历库', icon: FileStack },
  { path: '/resume-builder', label: '简历生成', icon: FileText },
  { path: '/resume-templates', label: '简历市场', icon: LayoutTemplate },
  { path: '/employment', label: '就业管理', icon: BriefcaseBusiness },
  { path: '/interviews', label: '面试记录', icon: Users },
  { path: '/knowledgebase', label: '知识库', icon: Database },
  { path: '/knowledgebase/chat', label: '问答助手', icon: MessageSquare },
];
function active(current: string, path: string) {
  if (path === '/knowledgebase')
    return current === path || current === '/knowledgebase/upload';
  return current.startsWith(path);
}
const dockOptions = {
  proximity: 122,
  spring: 0.19,
  damping: 0.7,
  widthGrowth: 17,
  heightGrowth: 16,
  drop: 3.5,
};

export default function Layout() {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const dockRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const employmentMode = location.pathname === '/employment' || location.pathname.startsWith('/employment/');
  const fullBleed =
    employmentMode ||
    location.pathname === '/upload' ||
    location.pathname.startsWith('/resume-builder');
  const interviewMode = /\/interview\/\d+/.test(location.pathname);
  useEffect(() => {
    const root = dockRef.current;
    if (root) return createTopDockController(root, () => dockOptions);
  }, [interviewMode]);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  const switchAccount = (mode: string) => {
    clearAuthSession();
    navigate(`/login?mode=${mode}`, { replace: true });
  };
  if (interviewMode) return <Outlet />;
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-sky-bg studio-layout relative min-h-screen text-app-text">
        <StudioAtmosphere />
        <header className={`compact-header ${scrolled ? 'is-scrolled' : ''}`}>
          <motion.div
            className="atd-modern__bar"
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              to="/upload"
              className="atd-modern__brand"
              aria-label="返回首页"
            >
              <span className="atd-modern__mark">
                <Sparkles size={20} strokeWidth={1.6} />
              </span>
              <span>AI Interview</span>
            </Link>
            <nav
              ref={dockRef}
              className="atd-modern__dock"
              style={{ '--dock-count': navItems.length } as CSSProperties}
              aria-label="主导航"
              data-dock-state="idle"
              data-dock-max="0.00"
            >
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-dock-item
                  aria-current={
                    active(location.pathname, item.path) ? 'page' : undefined
                  }
                  className={`atd-modern__item ${active(location.pathname, item.path) ? 'is-active' : ''}`}
                >
                  <item.icon
                    className="atd-modern__icon"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="account-control" ref={accountRef}>
              <button
                ref={accountButtonRef}
                type="button"
                className="account-trigger"
                aria-label={`账户菜单：${profile?.username || '当前用户'}`}
                aria-expanded={menu}
                aria-controls="account-panel"
                onClick={() => setMenu(!menu)}
              >
                <img src="/avatar-default.svg" alt="当前用户默认头像" />
                {profile?.role === 'ADMIN' && (
                  <span className="account-admin-dot" title="管理员" />
                )}
                <ChevronDown size={14} className={menu ? 'is-open' : ''} />
              </button>
              {menu && (
                <div
                  className="account-panel"
                  id="account-panel"
                  aria-label="账户操作"
                >
                  <div className="account-profile">
                    <img src="/avatar-default.svg" alt="" />
                    <div>
                      <strong>{profile?.username || '当前用户'}</strong>
                      <span>
                        {profile?.role === 'ADMIN' ? '管理员' : '社区成员'}
                      </span>
                    </div>
                  </div>
                  {profile?.role === 'ADMIN' && (
                    <>
                      <Link to="/admin/users">
                        <Users size={17} />
                        查看用户
                      </Link>
                      <Link to="/community/admin">
                        <ShieldCheck size={17} />
                        社区管理
                      </Link>
                      <Link to="/community">
                        <UserRound size={17} />
                        用户视图
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      switchAccount(
                        profile?.role === 'ADMIN' ? 'user' : 'admin',
                      )
                    }
                  >
                    <ArrowLeftRight size={17} />
                    {profile?.role === 'ADMIN'
                      ? '切换用户账号'
                      : '切换管理员账号'}
                  </button>
                  <button
                    type="button"
                    className="account-signout"
                    onClick={() => switchAccount('user')}
                  >
                    <LogOut size={17} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </header>
        <main className={`studio-main${employmentMode ? ' studio-main--employment' : ''}`}>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {fullBleed ? (
              <Outlet />
            ) : (
              <div className="studio-page-panel">
                <Outlet />
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}

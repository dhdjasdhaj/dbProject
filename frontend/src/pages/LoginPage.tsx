import { useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Sparkles, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, saveAuthSession } from '../api/auth';
import { getErrorMessage } from '../api/request';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const adminMode = params.get('mode') === 'admin';
  const from = (location.state as { from?: string })?.from || '/upload';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const switchMode = (mode: string) => {
    setParams({ mode }, { replace: true });
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await (adminMode
        ? authApi.adminLogin(username.trim(), password)
        : authApi.login(username.trim(), password));
      saveAuthSession(res);
      toast.success('登录成功');
      navigate(adminMode ? '/admin/users' : from, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-sky-bg app-clouds flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ds-fg text-ds-bg dark:bg-neutral-100 dark:text-neutral-950">
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[1.125rem] font-bold text-ds-fg dark:text-neutral-50">
            AI Interview
          </p>
          <p className="text-[0.8125rem] text-ds-fg-muted dark:text-neutral-500">
            登录后使用简历与知识库功能
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] rounded-card border border-white/30 bg-white/[0.2] p-8 shadow-[0_20px_60px_rgba(30,64,175,0.2)] backdrop-blur-[14px]"
      >
        <div className="login-mode-switch" role="group" aria-label="登录身份">
          <button
            type="button"
            aria-pressed={!adminMode}
            disabled={loading}
            onClick={() => switchMode('user')}
          >
            <UserRound size={17} />
            用户登录
          </button>
          <button
            type="button"
            aria-pressed={adminMode}
            disabled={loading}
            onClick={() => switchMode('admin')}
          >
            <ShieldCheck size={17} />
            管理员登录
          </button>
        </div>
        <h1 className="text-[1.25rem] font-bold text-ds-fg dark:text-neutral-50">
          {adminMode ? '管理员登录' : '登录'}
        </h1>
        <p className="mt-1 text-[0.875rem] text-ds-fg-muted dark:text-neutral-400">
          {adminMode
            ? '管理社区内容，查看已注册的用户'
            : '使用已注册的用户名与密码'}
        </p>

        <label
          htmlFor="login-username"
          className="mt-6 block text-[0.8125rem] font-semibold text-ds-fg dark:text-neutral-200"
        >
          用户名
        </label>
        <input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mt-1.5 w-full rounded-pill border border-ds-border bg-ds-bg px-4 py-2.5 text-[0.9375rem] text-ds-fg outline-none focus:border-ds-fg dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200"
          placeholder="用户名"
          required
          minLength={3}
        />

        <label
          htmlFor="login-password"
          className="mt-4 block text-[0.8125rem] font-semibold text-ds-fg dark:text-neutral-200"
        >
          密码
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-pill border border-ds-border bg-ds-bg px-4 py-2.5 text-[0.9375rem] text-ds-fg outline-none focus:border-ds-fg dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200"
          placeholder="密码"
          required
          minLength={8}
        />

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-pill bg-ds-fg py-3 text-[0.9375rem] font-semibold text-ds-bg transition enabled:hover:opacity-90 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
        >
          {loading ? '登录中…' : adminMode ? '进入管理后台' : '登录'}
        </button>

        {adminMode ? (
          <p className="login-admin-note">
            请使用管理员账号登录。用户账号可切回“用户登录”。
          </p>
        ) : (
          <p className="mt-6 text-center text-[0.875rem] text-ds-fg-muted dark:text-neutral-400">
            没有账号？{' '}
            <Link
              to="/register"
              className="font-semibold text-sky-950 hover:underline"
            >
              注册
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}

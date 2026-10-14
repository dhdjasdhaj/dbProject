import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, saveAuthSession } from '../api/auth';
import { getErrorMessage } from '../api/request';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(username.trim(), password);
      saveAuthSession(res);
      toast.success('注册成功');
      navigate('/upload', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
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
          <p className="text-[1.125rem] font-bold text-ds-fg dark:text-neutral-50">创建账号</p>
          <p className="text-[0.8125rem] text-ds-fg-muted dark:text-neutral-500">数据将仅对您可见</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] rounded-card border border-white/30 bg-white/[0.2] p-8 shadow-[0_20px_60px_rgba(30,64,175,0.2)] backdrop-blur-[14px]"
      >
        <h1 className="text-[1.25rem] font-bold text-ds-fg dark:text-neutral-50">注册</h1>
        <p className="mt-1 text-[0.875rem] text-ds-fg-muted dark:text-neutral-400">用户名 3～64 字符，密码至少 8 位</p>

        <label className="mt-6 block text-[0.8125rem] font-semibold text-ds-fg dark:text-neutral-200">用户名</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          className="mt-1.5 w-full rounded-pill border border-ds-border bg-ds-bg px-4 py-2.5 text-[0.9375rem] text-ds-fg outline-none focus:border-ds-fg dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200"
          placeholder="用户名"
          required
          minLength={3}
          maxLength={64}
        />

        <label className="mt-4 block text-[0.8125rem] font-semibold text-ds-fg dark:text-neutral-200">密码</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-pill border border-ds-border bg-ds-bg px-4 py-2.5 text-[0.9375rem] text-ds-fg outline-none focus:border-ds-fg dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-200"
          placeholder="至少 8 位"
          required
          minLength={8}
          maxLength={128}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-pill bg-ds-fg py-3 text-[0.9375rem] font-semibold text-ds-bg transition enabled:hover:opacity-90 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
        >
          {loading ? '提交中…' : '注册并登录'}
        </button>

        <p className="mt-6 text-center text-[0.875rem] text-ds-fg-muted dark:text-neutral-400">
          已有账号？{' '}
          <Link to="/login" className="font-semibold text-sky-950 hover:underline">
            登录
          </Link>
        </p>
      </form>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserRound,
} from 'lucide-react';
import { adminUsersApi, AdminUserPage } from '../api/adminUsers';
import { useProfile } from '../hooks/useProfile';

export default function AdminUsersPage() {
  const { profile, error: profileError } = useProfile();
  const [data, setData] = useState<AdminUserPage | null>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (profile?.role !== 'ADMIN') return;
    let alive = true;
    setLoading(true);
    setError('');
    adminUsersApi
      .list(query, role, page)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [profile, query, role, page, refresh]);
  if (profileError)
    return (
      <div className="community-state" role="alert">
        {profileError}
      </div>
    );
  if (!profile)
    return (
      <div className="community-state" role="status">
        正在确认登录身份…
      </div>
    );
  if (profile.role !== 'ADMIN')
    return (
      <div className="community-state">
        <ShieldCheck size={32} />
        <h1>仅管理员可查看用户</h1>
        <Link to="/login?mode=admin">前往管理员登录</Link>
      </div>
    );
  const search = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setQuery(input.trim());
  };
  return (
    <section className="admin-users-page">
      <div className="admin-users-heading">
        <div>
          <span className="admin-users-eyebrow">
            <ShieldCheck size={17} />
            ADMINISTRATION
          </span>
          <h1>用户管理</h1>
          <p>查看网站已注册的用户和账号身份。</p>
        </div>
        <Link to="/community/admin">
          <ArrowLeft size={17} />
          社区管理
        </Link>
      </div>
      <div className="admin-users-stats">
        {[
          { label: '注册用户', value: data?.stats.total, icon: Users },
          { label: '普通用户', value: data?.stats.users, icon: UserRound },
          {
            label: '管理员',
            value: data?.stats.administrators,
            icon: ShieldCheck,
          },
        ].map((stat) => (
          <div key={stat.label}>
            <stat.icon size={22} />
            <span>{stat.label}</span>
            <strong>{stat.value ?? '—'}</strong>
          </div>
        ))}
      </div>
      <div className="admin-users-directory">
        <div className="admin-users-toolbar">
          <form onSubmit={search}>
            <Search size={19} />
            <input
              aria-label="搜索用户名"
              placeholder="搜索用户名…"
              value={input}
              maxLength={64}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              搜索
            </button>
          </form>
          <select
            aria-label="用户身份筛选"
            value={role}
            onChange={(e) => {
              setPage(0);
              setRole(e.target.value);
            }}
          >
            <option value="">全部身份</option>
            <option value="USER">普通用户</option>
            <option value="ADMIN">管理员</option>
          </select>
          <button
            type="button"
            className="admin-users-refresh"
            disabled={loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            <RefreshCw size={17} />
            刷新
          </button>
        </div>
        <div className="admin-users-list-heading" aria-hidden="true">
          <span>用户</span>
          <span>身份</span>
          <span>注册时间</span>
        </div>
        {loading ? (
          <div className="community-state" role="status">
            正在加载用户…
          </div>
        ) : error ? (
          <div className="community-state" role="alert">
            {error}
            <button onClick={() => setRefresh((v) => v + 1)}>重新加载</button>
          </div>
        ) : !data?.items.length ? (
          <div className="community-state">没有符合条件的用户</div>
        ) : (
          <ul className="admin-users-list" aria-label="已注册用户">
            {data.items.map((user) => (
              <li key={user.id}>
                <div className="admin-users-identity">
                  <img src="/avatar-default.svg" alt="默认头像" />
                  <div>
                    <strong>{user.username}</strong>
                    <small>
                      用户 ID · {user.id}
                      {user.id === profile.userId ? ' · 当前账号' : ''}
                    </small>
                  </div>
                </div>
                <span
                  className={`admin-user-role ${user.role === 'ADMIN' ? 'is-admin' : ''}`}
                >
                  {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                </span>
                <time dateTime={user.createdAt}>
                  {new Date(user.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
        <div className="admin-users-footer">
          <span>共 {data?.total ?? 0} 位用户</span>
          {data && data.total > data.pageSize && (
            <div className="admin-users-pagination">
              <button
                disabled={loading || page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </button>
              <span>
                {page + 1} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                disabled={loading || (page + 1) * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

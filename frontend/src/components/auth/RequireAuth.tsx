import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredToken } from '../../authStorage';

/**
 * 未登录时跳转登录页；已登录则渲染子路由（Outlet）
 */
export default function RequireAuth() {
  const location = useLocation();
  if (!getStoredToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

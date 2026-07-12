import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'#6b7280' }}>
      <div style={{ width:32, height:32, border:'3px solid #e5e7eb', borderTopColor:'#009B00', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <div style={{ fontSize:13 }}>Loading…</div>
    </div>
  );

  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  // Allow all staff roles into the admin portal
  if (!['SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE'].includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== 'CUSTOMER') return <Navigate to="/admin" replace />;
  return children;
}

import { useAuth } from '../../services/AuthContext';
import { Lock, ShieldOff } from 'lucide-react';

/**
 * Wraps any admin page — shows "Access Denied" if user lacks permission.
 *
 * Usage:
 *   <PermissionGate perm="EDIT_LEADS">  → blocks if no EDIT_LEADS
 *   <PermissionGate view="LEADS">       → blocks if no VIEW_LEADS or EDIT_LEADS
 *   <PermissionGate superAdminOnly>     → only SUPER_ADMIN
 */
export default function PermissionGate({ children, perm, view, superAdminOnly }) {
  const { user, hasPermission, canView, isSuperAdmin } = useAuth();

  if (!user) return null;

  let allowed = true;

  if (superAdminOnly && !isSuperAdmin) allowed = false;
  else if (perm && !hasPermission(perm)) allowed = false;
  else if (view && !canView(view)) allowed = false;

  if (!allowed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 360, gap: 16, padding: 40
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldOff size={32} color="#dc2626" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Access Denied</div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 360, lineHeight: 1.6 }}>
            You don't have permission to access this section.<br />
            Contact your administrator to request access.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9ca3af', background: '#f9fafb', padding: '8px 16px', borderRadius: 20, border: '1px solid #e5e7eb' }}>
          <Lock size={12} />
          Required: <code style={{ fontSize: 11, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
            {perm || (view ? `VIEW_${view}` : 'SUPER_ADMIN')}
          </code>
          · Your role: <strong>{user?.role?.replace('_', ' ')}</strong>
        </div>
      </div>
    );
  }

  return children;
}

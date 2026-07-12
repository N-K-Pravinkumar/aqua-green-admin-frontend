import { useState, useEffect } from 'react';
import { CheckCircle, Edit, Eye, EyeOff, Info, Key, Lock, Plus, RefreshCw, Shield, UserCheck, UserX, Users, XCircle } from 'lucide-react';
import { useToast, ConfirmModal, formatDate } from '../../components/admin/AdminHelpers';
import PermissionGate from '../../components/admin/PermissionGate';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

const userAPI = {
  getAll: ()            => api.get('/admin/users'),
  create: data          => api.post('/admin/users', data),
  update: (id, data)    => api.put(`/admin/users/${id}`, data),
  toggleActive: id      => api.patch(`/admin/users/${id}/toggle-active`),
  resetPassword:(id,pw) => api.patch(`/admin/users/${id}/reset-password`, { password: pw }),
  getPermissions: ()    => api.get('/admin/users/permissions'),
  getRolePerms: role    => api.get(`/admin/users/permissions/${role}`),
};

const ROLES = [
  { key:'ADMIN',    label:'Admin',    color:'#7c3aed', bg:'#ede9fe', desc:'Full access — can manage all modules' },
  { key:'MANAGER',  label:'Manager',  color:'#2563eb', bg:'#dbeafe', desc:'Manage operations, reports, customers' },
  { key:'EMPLOYEE', label:'Employee', color:'#009B00', bg:'#d1fae5', desc:'View and update service requests only' },
];

const EMPTY = { fullName:'', email:'', username:'', password:'', mobile:'', role:'EMPLOYEE', department:'', permissions:[] };

// ── Permission Checklist component ─────────────────────────────
function PermissionChecklist({ perms, onChange, allPerms }) {
  const toggle = (p) => onChange(perms.includes(p) ? perms.filter(x=>x!==p) : [...perms, p]);
  const selectAll = () => onChange(Object.values(allPerms).flat());
  const clearAll  = () => onChange([]);

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <button type="button" onClick={selectAll} className="btn btn-xs btn-ghost" style={{ fontSize:11 }}>Select All</button>
        <button type="button" onClick={clearAll}  className="btn btn-xs btn-ghost" style={{ fontSize:11, color:'#dc2626' }}>Clear All</button>
        <span style={{ fontSize:11, color:'#6b7280', marginLeft:'auto' }}>{perms.length} selected</span>
      </div>
      <div style={{ maxHeight:380, overflowY:'auto', border:'1.5px solid #e5e7eb', borderRadius:10, padding:10 }}>
        {Object.entries(allPerms).map(([group, groupPerms]) => (
          <div key={group} style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.7px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ flex:1, height:1, background:'#e5e7eb' }}/>
              {group}
              <span style={{ flex:1, height:1, background:'#e5e7eb' }}/>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {groupPerms.map(p => {
                const on = perms.includes(p);
                const isView = p.startsWith('VIEW_');
                const isEdit = p.startsWith('EDIT_');
                const isDel  = p.startsWith('DELETE_');
                const color  = isDel ? '#dc2626' : isEdit ? '#2563eb' : '#009B00';
                const bg     = isDel ? '#fee2e2' : isEdit ? '#dbeafe' : '#d1fae5';
                return (
                  <label key={p} title={p} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', padding:'4px 8px', borderRadius:8, border:`1.5px solid ${on ? color : '#e5e7eb'}`, background: on ? bg : '#fafafa', transition:'all .12s', userSelect:'none' }}>
                    <input type="checkbox" checked={on} onChange={()=>toggle(p)} style={{ cursor:'pointer', accentColor: color, width:12, height:12 }} />
                    <span style={{ fontSize:11, fontWeight:on?700:500, color: on ? color : '#6b7280' }}>
                      {p.replace('_',' ').toLowerCase().replace(/^\w/,c=>c.toUpperCase())}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users,     setUsers]     = useState([]);
  const [allPerms,  setAllPerms]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [resetId,   setResetId]   = useState(null);
  const [newPwd,    setNewPwd]    = useState('');
  const [roleFilter,setRoleFilter]= useState('ALL');
  const { show, ToastEl } = useToast();
  const { user: me, isSuperAdmin, canManageUsers } = useAuth();

  useEffect(() => {
    const el = document.getElementById('admin-page-title');
    if (el) el.textContent = 'User Accounts';
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [ur, pr] = await Promise.all([userAPI.getAll(), userAPI.getPermissions()]);
      setUsers(ur.data.data || []);
      setAllPerms(pr.data.data || {});
    } catch { show('Failed to load users', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditUser(null); setShowPass(false); setModal(true); };
  const openEdit = (u) => {
    setForm({
      fullName: u.fullName||'', email: u.email||'', username: u.username||'',
      password: '', mobile: u.mobile||'', role: u.role||'EMPLOYEE',
      department: u.department||'', permissions: u.permissions||[],
    });
    setEditUser(u); setShowPass(false); setModal(true);
  };

  const loadRoleDefaults = async (role) => {
    setForm(f => ({ ...f, role }));
    try {
      const r = await userAPI.getRolePerms(role);
      setForm(f => ({ ...f, role, permissions: r.data.data || [] }));
    } catch { setForm(f => ({ ...f, role })); }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { show('Full name is required', 'error'); return; }
    if (!form.email.trim())    { show('Email is required', 'error'); return; }
    if (!editUser && !form.password) { show('Password required for new accounts', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) await userAPI.update(editUser.id, payload);
      else          await userAPI.create(payload);
      show(editUser ? 'Account updated successfully' : 'Account created successfully');
      setModal(false);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    try {
      await userAPI.toggleActive(u.id);
      show(u.active ? 'Account deactivated' : 'Account activated');
      load();
    } catch { show('Failed', 'error'); }
  };

  const handleResetPwd = async () => {
    if (!newPwd || newPwd.length < 6) { show('Password must be at least 6 characters', 'error'); return; }
    try {
      await userAPI.resetPassword(resetId, newPwd);
      show('Password reset successfully');
      setResetId(null); setNewPwd('');
    } catch { show('Reset failed', 'error'); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const filtered = roleFilter === 'ALL' ? users : users.filter(u => u.role === roleFilter);

  const roleStyle = (role) => ROLES.find(r => r.key === role) || { color:'#6b7280', bg:'#f3f4f6', label: role };

  // ── Permission summary for display ────────────────────────────
  const permSummary = (u) => {
    if (!u.permissions?.length) return { label:'No permissions', color:'#dc2626', bg:'#fee2e2' };
    if (u.permissions.includes('ALL')) return { label:'All permissions', color:'#7c3aed', bg:'#ede9fe' };
    const count = u.permissions.length;
    return { label:`${count} permission${count!==1?'s':''}`, color:'#009B00', bg:'#d1fae5' };
  };

  return (
    <PermissionGate perm="MANAGE_USERS">
      <div>
        {ToastEl}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, display:'flex', alignItems:'center', gap:9 }}>
              <Users size={20} color="#009B00" /> User Accounts
            </div>
            <div style={{ fontSize:13, color:'#6b7280', marginTop:3 }}>
              Manage staff access. Super Admin controls all permissions.
            </div>
          </div>
          {canManageUsers() && (
            <button className="btn btn-primary" onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <Plus size={16} /> Create Account
            </button>
          )}
        </div>

        {/* Role info cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
          {ROLES.map(role => (
            <div key={role.key} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 16px', borderLeft:`4px solid ${role.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <Shield size={15} color={role.color} />
                <span style={{ fontWeight:700, fontSize:13, color:role.color }}>{role.label}</span>
                <span style={{ background:role.bg, color:role.color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10, marginLeft:'auto' }}>
                  {users.filter(u=>u.role===role.key).length}
                </span>
              </div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{role.desc}</div>
            </div>
          ))}
        </div>

        {/* Role filter */}
        <div className="filter-bar">
          {['ALL','SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE'].map(r => (
            <button key={r} className={`filter-btn${roleFilter===r?' active':''}`} onClick={()=>setRoleFilter(r)}>
              {r==='ALL' ? `All (${users.length})` : `${r.replace('_',' ')} (${users.filter(u=>u.role===r).length})`}
            </button>
          ))}
        </div>

        {/* Users table */}
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>Loading accounts…</div>
        ) : (
          <div className="section-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th><th>Role</th><th>Contact</th>
                    <th>Permissions</th><th>Status</th><th>Last Login</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const rs = roleStyle(u.role);
                    const ps = permSummary(u);
                    const isMe = me?.id === u.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:rs.bg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:rs.color, flexShrink:0 }}>
                              {u.fullName?.charAt(0)||'?'}
                            </div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
                                {u.fullName}
                                {isMe && <span style={{ fontSize:9, background:'#fef3c7', color:'#92400e', padding:'1px 5px', borderRadius:6, fontWeight:700 }}>YOU</span>}
                              </div>
                              <div style={{ fontSize:11, color:'#9ca3af' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:rs.bg, color:rs.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:10 }}>
                            {u.role?.replace('_',' ')}
                          </span>
                          {u.department && <div style={{ fontSize:10, color:'#9ca3af', marginTop:3 }}>{u.department}</div>}
                        </td>
                        <td>
                          <div style={{ fontSize:12, color:'#374151' }}>{u.email}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{u.mobile||'—'}</div>
                        </td>
                        <td>
                          <span style={{ fontSize:11, fontWeight:700, background:ps.bg, color:ps.color, padding:'2px 8px', borderRadius:10 }}>
                            {ps.label}
                          </span>
                        </td>
                        <td>
                          {u.active
                            ? <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#008800', fontWeight:700 }}><CheckCircle size={12} /> Active</span>
                            : <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#dc2626', fontWeight:700 }}><XCircle size={12} /> Inactive</span>
                          }
                        </td>
                        <td style={{ fontSize:11, color:'#9ca3af' }}>{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                        <td>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {canManageUsers() && (
                              <>
                                <button className="btn btn-xs btn-ghost" onClick={()=>openEdit(u)} style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <Edit size={11} /> Edit
                                </button>
                                <button className="btn btn-xs btn-ghost" onClick={()=>{setResetId(u.id);setNewPwd('');}} style={{ display:'flex', alignItems:'center', gap:4 }} title="Reset password">
                                  <Key size={11} />
                                </button>
                                {!isMe && (
                                  <button className="btn btn-xs" onClick={()=>handleToggle(u)}
                                    style={{ display:'flex', alignItems:'center', gap:4, background:u.active?'#fee2e2':'#d1fae5', color:u.active?'#dc2626':'#008800', border:'none' }}
                                    title={u.active?'Deactivate':'Activate'}>
                                    {u.active ? <UserX size={11}/> : <UserCheck size={11}/>}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#9ca3af' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit modal */}
        {modal && (
          <div className="modal-overlay" onClick={()=>setModal(false)}>
            <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{ maxWidth:740, padding:0, borderRadius:20 }}>
              {/* Header */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:10 }}>
                <Shield size={18} color="#009B00" />
                <div>
                  <div style={{ fontSize:17, fontWeight:800 }}>{editUser ? `Edit Account — ${editUser.fullName}` : 'Create Staff Account'}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>Set role, contact details and specific permissions</div>
                </div>
                <button className="modal-close" style={{ marginLeft:'auto' }} onClick={()=>setModal(false)}>×</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr', height:'65vh', overflow:'hidden' }}>
                {/* Left: account details */}
                <div style={{ padding:'20px 24px', overflowY:'auto', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column', gap:13 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px' }}>Account Details</div>

                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={form.fullName} onChange={e=>f('fullName',e.target.value)} placeholder="e.g. Murugan K" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-input" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="murugan@aquagreen.com" disabled={!!editUser} />
                    {editUser && <span className="form-hint">Email cannot be changed after creation</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input className="form-input" value={form.mobile} onChange={e=>f('mobile',e.target.value.replace(/\D/,'').slice(0,10))} placeholder="10-digit mobile" inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" value={form.department} onChange={e=>f('department',e.target.value)} placeholder="e.g. Service, Sales, Accounts" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select className="form-select" value={form.role} onChange={e=>loadRoleDefaults(e.target.value)}>
                      {ROLES.map(r => (
                        <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display:'flex', justifyContent:'space-between' }}>
                      {editUser ? 'New Password (leave blank to keep)' : 'Password *'}
                    </label>
                    <div style={{ position:'relative' }}>
                      <input className="form-input" type={showPass?'text':'password'} value={form.password}
                        onChange={e=>f('password',e.target.value)} placeholder="Min 6 characters"
                        style={{ paddingRight:40 }} />
                      <button type="button" onClick={()=>setShowPass(!showPass)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center' }}>
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>

                  {/* Permission summary */}
                  <div style={{ padding:'10px 12px', background:'#f0fff0', borderRadius:8, border:'1px solid #c5e8d8' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#009B00', marginBottom:5 }}>
                      Selected permissions ({form.permissions.length})
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {form.permissions.slice(0,8).map(p => (
                        <span key={p} style={{ fontSize:10, background:'#009B00', color:'#fff', padding:'2px 6px', borderRadius:6 }}>
                          {p.replace('_',' ')}
                        </span>
                      ))}
                      {form.permissions.length > 8 && (
                        <span style={{ fontSize:10, color:'#009B00', fontWeight:700 }}>+{form.permissions.length-8} more</span>
                      )}
                      {form.permissions.length === 0 && (
                        <span style={{ fontSize:11, color:'#dc2626' }}>⚠ No permissions selected — user won't see anything</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: permissions */}
                <div style={{ padding:'20px 24px', overflowY:'auto' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
                    Permissions — what this user can do
                  </div>
                  <PermissionChecklist
                    perms={form.permissions}
                    onChange={newPerms => f('permissions', newPerms)}
                    allPerms={allPerms}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9fafb', borderRadius:'0 0 20px 20px' }}>
                <div style={{ fontSize:12, color:'#6b7280', display:'flex', alignItems:'center', gap:6 }}>
                  <Info size={13} /> Role sets default permissions. Customize above as needed.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7 }}>
                    {saving ? <><span className="spinner"/> Saving…</> : <><Shield size={14}/> {editUser?'Update Account':'Create Account'}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password modal */}
        {resetId && (
          <div className="modal-overlay" onClick={()=>setResetId(null)}>
            <div className="modal" style={{ maxWidth:380 }} onClick={e=>e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Key size={17} color="#009B00" /> Reset Password
                </div>
                <button className="modal-close" onClick={()=>setResetId(null)}>×</button>
              </div>
              <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>
                Set a new password for <strong>{users.find(u=>u.id===resetId)?.fullName}</strong>.
                They will need to use this password at next login.
              </p>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position:'relative' }}>
                  <input className="form-input" type={showPass?'text':'password'} value={newPwd}
                    onChange={e=>setNewPwd(e.target.value)} placeholder="Min 6 characters"
                    autoFocus style={{ paddingRight:40 }} />
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center' }}>
                    {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                  </button>
                </div>
                {newPwd.length > 0 && newPwd.length < 6 && (
                  <span className="form-error">Password must be at least 6 characters</span>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setResetId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleResetPwd} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <RefreshCw size={14}/> Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}

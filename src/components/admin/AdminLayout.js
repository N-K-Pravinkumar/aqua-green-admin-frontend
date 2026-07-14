import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Menu, X, Globe, Bell, Search, Sun, Moon,
  ChevronRight, Home, LogOut
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import './admin.css';

export default function AdminLayout() {
  const [badges,      setBadges]      = useState({});
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [dark,        setDark]        = useState(() => localStorage.getItem('aga_dark') === '1');
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [pageTitle,   setPageTitle]   = useState('Dashboard');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('aga_dark', dark ? '1' : '0');
  }, [dark]);

  // Track page title from DOM id
  useEffect(() => {
    const el = document.getElementById('admin-page-title');
    if (!el) return;
    const obs = new MutationObserver(() => setPageTitle(el.textContent));
    obs.observe(el, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // ESC closes mobile sidebar
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Load badge counts
  useEffect(() => {
    dashboardAPI.getStats()
      .then(r => {
        const d = r.data?.data || {};
        setBadges({
          newLeads:        d.newLeads        || 0,
          pendingServices: d.pendingServices || 0,
          lowStockItems:   d.lowStockItems   || 0,
        });
      }).catch(() => {});
  }, []);

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <div className="admin-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)',
            backdropFilter:'blur(4px)', zIndex:99 }}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        badges={badges}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Topbar */}
      <header className="admin-topbar" style={{
        position: 'fixed', top: 0, right: 0,
        left: mobileOpen ? 0 : (collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'),
        height: 'var(--header-h)',
        background: 'rgba(238,244,255,.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 18px', gap: 12, zIndex: 90,
        transition: 'left .25s cubic-bezier(.4,0,.2,1)',
        boxShadow: '0 1px 0 rgba(15,23,42,.06)',
      }}>

        {/* Hamburger / collapse */}
        <button
          onClick={() => window.innerWidth < 1024 ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
            background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'var(--fg-muted)', flexShrink:0,
            transition:'all .15s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-light)';e.currentTarget.style.color='var(--primary)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='var(--fg-muted)';}}
        >
          <Menu size={16} />
        </button>

        {/* Breadcrumb + page title */}
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--fg-muted)', marginBottom:1 }}>
            <Home size={10} />
            <ChevronRight size={10} />
            <span>Admin</span>
            <ChevronRight size={10} />
            <span style={{ color:'var(--fg)', fontWeight:600 }} id="admin-page-title">Dashboard</span>
          </div>
        </div>

        {/* Global search */}
        <div style={{ flex:1, maxWidth:280, position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--fg-muted)', pointerEvents:'none' }} />
          <input
            placeholder="Quick search…"
            style={{ width:'100%', padding:'6px 12px 6px 30px', borderRadius:9,
              border:'1px solid var(--border)', background:'#fff',
              fontSize:12, outline:'none', color:'var(--fg)',
              fontFamily:'inherit', transition:'border-color .15s, box-shadow .15s' }}
            onFocus={e=>{ e.target.style.borderColor='var(--primary)'; e.target.style.boxShadow='0 0 0 3px rgba(10,124,248,.1)'; }}
            onBlur={e=>{  e.target.style.borderColor='var(--border)';  e.target.style.boxShadow='none'; }}
          />
        </div>

        {/* Right actions */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>

          {/* Website link */}
          <button onClick={() => navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
              borderRadius:8, border:'1px solid var(--border)', background:'#fff',
              fontSize:11, fontWeight:600, color:'var(--fg-muted)', cursor:'pointer',
              transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-light)';e.currentTarget.style.color='var(--primary)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='var(--fg-muted)';}}
          >
            <Globe size={12} /> Website
          </button>

          {/* Dark mode */}
          <button onClick={() => setDark(d => !d)}
            style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
              background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--fg-muted)', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-light)';e.currentTarget.style.color='var(--primary)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='var(--fg-muted)';}}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Notifications */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
                background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', color:'var(--fg-muted)', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-light)';e.currentTarget.style.color='var(--primary)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='var(--fg-muted)';}}
            >
              <Bell size={14} />
              {(badges.pendingServices > 0 || badges.lowStockItems > 0) && (
                <span style={{ position:'absolute', top:5, right:5, width:7, height:7,
                  borderRadius:'50%', background:'var(--red)', border:'1.5px solid var(--bg)' }} />
              )}
            </button>

            {/* Notif dropdown */}
            {notifOpen && (
              <div onClick={e=>e.stopPropagation()} style={{
                position:'absolute', top:'calc(100% + 8px)', right:0,
                width:300, background:'#fff', border:'1px solid var(--border)',
                borderRadius:12, boxShadow:'0 8px 32px rgba(15,23,42,.12)',
                zIndex:200, overflow:'hidden',
              }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>Notifications</span>
                  <button onClick={() => setNotifOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--fg-muted)', fontSize:16 }}>×</button>
                </div>
                {[
                  badges.pendingServices > 0 && { icon:'🔧', title:`${badges.pendingServices} pending service requests`, color:'#FEF3C7', dot:'#F59E0B' },
                  badges.lowStockItems   > 0 && { icon:'📦', title:`${badges.lowStockItems} items low in stock`, color:'#FEE2E2', dot:'#EF4444' },
                  badges.newLeads        > 0 && { icon:'💡', title:`${badges.newLeads} new leads awaiting contact`, color:'#DBEAFE', dot:'#0A7CF8' },
                ].filter(Boolean).map((n,i) => (
                  <div key={i} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start', background:n.color+'55' }}>
                    <span style={{ fontSize:16 }}>{n.icon}</span>
                    <span style={{ fontSize:12, color:'var(--fg)', flex:1 }}>{n.title}</span>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:n.dot, flexShrink:0, marginTop:4 }} />
                  </div>
                ))}
                <div style={{ padding:'10px 16px', fontSize:11, color:'var(--fg-muted)', textAlign:'center' }}>
                  All caught up! 🎉
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          {user && (
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:6,
              borderLeft:'1px solid var(--border)', marginLeft:2 }}>
              <div style={{ width:32, height:32, borderRadius:'50%',
                background:'linear-gradient(135deg,#0A7CF8,#009B00)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ display:'flex', flexDirection:'column' }} className="hide-mobile">
                <span style={{ fontSize:12, fontWeight:700, color:'var(--fg)', whiteSpace:'nowrap', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis' }}>
                  {user.fullName}
                </span>
                <span style={{ fontSize:10, color:'var(--fg-muted)' }}>{user.role?.replace('_',' ')}</span>
              </div>
              <button onClick={logout} title="Logout"
                style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border)',
                  background:'transparent', display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', color:'var(--fg-muted)', transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='var(--red)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--fg-muted)';}}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="admin-main" style={{
        marginLeft: mobileOpen ? 0 : (collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'),
        marginTop: 'var(--header-h)',
        minHeight: 'calc(100vh - var(--header-h))',
        padding: '22px',
        transition: 'margin-left .25s cubic-bezier(.4,0,.2,1)',
        background: 'var(--bg)',
      }}>
        {/* Close notif when clicking outside */}
        {notifOpen && (
          <div onClick={() => setNotifOpen(false)} style={{ position:'fixed', inset:0, zIndex:150 }} />
        )}
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Lightbulb, Mail, Users, FileText,
  ShoppingCart, Wrench, Package, BarChart2, Droplets,
  Image, BookOpen, BadgeCheck, TrendingUp, UserCog,
  LogOut, Lock, Receipt, Upload, Phone, MessageCircle,
  Smartphone, Zap, Tag, Database, Settings2,
  FilePlus, CreditCard, ClipboardList, Bell, Send
} from 'lucide-react';
import { useAuth } from '../../services/AuthContext';
import './admin.css';

const NAV_GROUPS = [
  {
    section: 'Main',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: null }],
  },
  {
    section: 'CRM',
    items: [
      { to: '/admin/leads',     label: 'Leads',     icon: Zap, perm: 'LEADS',     badge: 'newLeads' },
      { to: '/admin/enquiries', label: 'Enquiries', icon: Mail, perm: 'ENQUIRIES' },
      { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'CUSTOMERS' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/admin/billing',           label: 'Billing',           icon: Receipt,      perm: 'SALES' },
      { to: '/admin/comms-hub',         label: 'Comms & Billing Hub', icon: Bell, perm: 'SALES' },
      { to: '/admin/quotations',        label: 'Quotations',        icon: FilePlus, perm: 'QUOTATIONS' },
      { to: '/admin/sales',             label: 'Sales',             icon: CreditCard, perm: 'SALES' },
      { to: '/admin/service-requests', label: 'Service Requests', icon: ClipboardList, perm: 'SERVICE_REQUESTS', badge: 'pendingServices' },
      { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench, perm: 'SERVICE_REQUESTS' },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/admin/products',      label: 'Products',  icon: Tag, perm: 'PRODUCTS' },
      { to: '/admin/service-items', label: 'Services',  icon: Settings2, perm: 'SERVICES' },
      { to: '/admin/stock',         label: 'Spares & Stock', icon: Package, perm: 'STOCK',   badge: 'lowStock' },
    ],
  },
  {
    section: 'Documents',
    items: [
      { to: '/admin/templates',    label: 'Templates',     icon: FileText, perm: 'TEMPLATES' },
      { to: '/admin/communication',label: 'Communication', icon: Send, perm: 'COMMUNICATION' },
      { to: '/admin/sms',          label: 'SMS',           icon: Smartphone, perm: 'COMMUNICATION' },
    ],
  },
  {
    section: 'Website',
    items: [
      { to: '/admin/gallery', label: 'Gallery', icon: Image, perm: 'GALLERY' },
      { to: '/admin/blogs',   label: 'Blogs',   icon: BookOpen, perm: 'BLOGS' },
    ],
  },
  {
    section: 'HR & Reports',
    items: [
      { to: '/admin/employees', label: 'Employees', icon: BadgeCheck, perm: 'EMPLOYEES' },
      { to: '/admin/users',     label: 'User Accounts', icon: UserCog, perm: 'USERS' },
      { to: '/admin/reports',   label: 'Reports', icon: BarChart2, perm: 'REPORTS' },
      { to: '/admin/import',    label: 'Import data', icon: Database, perm: 'REPORTS' },
    ],
  },
];

export default function AdminSidebar({ badges = {}, collapsed = false, mobileOpen = false, onClose }) {
  const { pathname } = useLocation();
  const { user, logout, canView, isSuperAdmin, canManageUsers } = useAuth();
  const navigate = useNavigate();
  const isActive = (to) => to === '/admin' ? pathname === '/admin' : pathname.startsWith(to);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  // Determine if a nav item should be shown
  const canSeeItem = (item) => {
    if (!item.perm) return true; // Dashboard always visible
    if (item.perm === 'USERS') return canManageUsers();
    return canView(item.perm);
  };

  return (
    <aside className={`admin-sidebar${mobileOpen ? ' mobile-open' : ''}`} style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflow: 'hidden',
      transition: 'width .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1)',
      transform: undefined,
      boxShadow: '2px 0 20px rgba(10,124,248,.05)',
    }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10,
        padding: collapsed ? '0 14px' : '0 16px',
        height: 'var(--header-h)',
        borderBottom: '1px solid var(--sidebar-border)',
        flexShrink: 0, justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
          background:'linear-gradient(135deg,#0A7CF8,#009B00)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 12px rgba(10,124,248,.35)',
        }}>
          <Droplets size={17} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--fg)', fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.2 }}>Aqua Green</div>
            <div style={{ fontSize:10, color:'var(--fg-muted)', fontWeight:500, letterSpacing:'.04em' }}>Agencies CRM</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'8px 8px', overflowX:'hidden' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.section}>
            {!collapsed
              ? <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--fg-muted)', padding:'10px 12px 4px', opacity:.7 }}>{group.section}</div>
              : <hr style={{ border:'none', borderTop:'1px solid var(--sidebar-border)', margin:'6px 10px' }} />
            }
            {group.items.map(item => {
              const Icon = item.icon;
              const badge = badges[item.badge] || 0;
              const isActive = location.pathname === item.to;
              return (
                <NavLink key={item.to} to={item.to} onClick={() => onClose && onClose()}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:10,
                    padding: collapsed ? '10px 0' : '9px 12px',
                    borderRadius:9, fontSize:13, fontWeight:500,
                    color: isActive ? '#fff' : 'var(--fg-muted)',
                    textDecoration:'none', cursor:'pointer',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(10,124,248,.28)' : 'none',
                    marginBottom:2, transition:'all .15s',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    whiteSpace:'nowrap', overflow:'hidden',
                  })}
                  onMouseEnter={e => {
                    if (!e.currentTarget.style.background.includes('var(--primary)'))
                      e.currentTarget.style.background = 'var(--primary-light)';
                  }}
                  onMouseLeave={e => {
                    if (!e.currentTarget.style.background.includes('var(--primary)'))
                      e.currentTarget.style.background = 'transparent';
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} style={{ flexShrink:0, color: isActive ? '#fff' : 'var(--fg-muted)' }} />
                      {!collapsed && <span style={{ flex:1 }}>{item.label}</span>}
                      {!collapsed && badge > 0 && (
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:999,
                          background: isActive ? 'rgba(255,255,255,.25)' : 'var(--primary-light)',
                          color: isActive ? '#fff' : 'var(--primary)',
                          minWidth:18, textAlign:'center',
                        }}>{badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px 8px 12px', borderTop:'1px solid var(--sidebar-border)', flexShrink:0 }}>
        <button onClick={handleLogout}
          style={{ display:'flex', alignItems:'center', gap:10,
            padding: collapsed ? '9px 0' : '9px 12px', borderRadius:9,
            fontSize:12, fontWeight:500, color:'var(--fg-muted)',
            background:'transparent', border:'none', cursor:'pointer',
            width:'100%', transition:'all .15s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='var(--red)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--fg-muted)';}}
        >
          <LogOut size={15} style={{ flexShrink:0 }} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}

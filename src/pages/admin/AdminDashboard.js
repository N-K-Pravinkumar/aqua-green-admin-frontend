import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { dashboardAPI, serviceRequestAPI, saleAPI, leadAPI } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../components/admin/AdminHelpers';

const SOURCE_COLORS = ['#378ADD','#25D366','#7F77DD','#EF9F27','#E24B4A','#0d8a00'];
const STATUS_COLORS = ['#0d8a00','#EF9F27','#E24B4A'];

export default function AdminDashboard() {
  const [stats, setStats]               = useState(null);
  const [charts, setCharts]             = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [recentSales, setRecentSales]   = useState([]);
  const [leads, setLeads]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.getElementById('admin-page-title')
      && (document.getElementById('admin-page-title').textContent = 'Dashboard');

    Promise.all([
      dashboardAPI.getStats(),
      dashboardAPI.getCharts(),
      serviceRequestAPI.getAll(null, null, 0, 6),
      saleAPI.getAll(0, 5),
      leadAPI.getAll(null, 0, 5),
    ]).then(([statsR, chartsR, srvR, saleR, leadR]) => {
      setStats(statsR.data.data);
      setCharts(chartsR.data.data);
      // Paginated responses wrap data in .content
      setRecentServices(srvR.data.data?.content || []);
      setRecentSales(saleR.data.data?.content || []);
      setLeads(leadR.data.data?.content || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6' }}>Loading dashboard…</div>;

  const salesData    = charts?.monthlySales  || [];
  const leadSources  = charts?.leadSources   || [];
  const serviceStatus= charts?.serviceStatus || [];

  const QUICK_ACTIONS = [
    { label: 'Add lead',       icon: '💡', path: '/admin/leads',            color: '#E6F1FB' },
    { label: 'New quotation',  icon: '📋', path: '/admin/quotations',       color: '#FAEEDA' },
    { label: 'Book service',   icon: '🔧', path: '/admin/service-requests', color: '#EAF3DE' },
    { label: 'Add sale',       icon: '🛒', path: '/admin/sales',            color: '#EEEDFE' },
    { label: 'Check stock',    icon: '📦', path: '/admin/stock',            color: '#FAECE7' },
    { label: 'View enquiries', icon: '📩', path: '/admin/enquiries',        color: '#F1EFE8' },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total leads',         value: stats?.totalLeads || 0,           sub: `${stats?.newLeads || 0} new`,    color: 'stat-blue',  icon: '💡' },
          { label: 'Active customers',     value: stats?.totalCustomers || 0,       sub: 'All time',                       color: 'stat-green', icon: '👥' },
          { label: 'Revenue this month',   value: formatCurrency(stats?.revenueThisMonth), sub: 'Sales + services',       color: 'stat-green', icon: '💰' },
          { label: 'Total revenue',        value: formatCurrency(stats?.totalRevenue),     sub: 'All time',               color: 'stat-green', icon: '📈' },
          { label: 'Total sales',          value: stats?.totalSales || 0,           sub: 'Orders placed',                  color: 'stat-blue',  icon: '🛒' },
          { label: 'Pending services',     value: stats?.pendingServices || 0,      sub: 'Need attention',                 color: 'stat-amber', icon: '🔧' },
          { label: 'Open quotations',      value: stats?.pendingQuotations || 0,    sub: 'Awaiting response',              color: 'stat-amber', icon: '📋' },
          { label: 'Low stock alerts',     value: stats?.lowStockItems || 0,        sub: 'Items below min',                color: 'stat-red',   icon: '📦' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.icon} {s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row — real data from /api/dashboard/charts */}
      <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">Monthly sales — {new Date().getFullYear()}</div></div>
          <div className="section-card-body">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={salesData} margin={{ top:0, right:0, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}k` : v}`} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']} />
                <Bar dataKey="sales" fill="#009B00" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">Service status</div></div>
          <div className="section-card-body">
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', fontSize:11, color:'#5f6368' }}>
              {serviceStatus.map((s,i) => (
                <span key={s.name} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:8, height:8, background:STATUS_COLORS[i], borderRadius:'50%', display:'inline-block' }}></span>
                  {s.name} {s.value}%
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={serviceStatus} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={3}>
                  {serviceStatus.map((s,i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">Lead sources</div></div>
          <div className="section-card-body">
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', fontSize:11, color:'#5f6368' }}>
              {leadSources.map((s,i) => (
                <span key={s.name} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:8, height:8, background:SOURCE_COLORS[i % SOURCE_COLORS.length], borderRadius:'50%', display:'inline-block' }}></span>
                  {s.name} {s.value}%
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={leadSources} dataKey="value" innerRadius={30} outerRadius={52} paddingAngle={3}>
                  {leadSources.map((s,i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue trend — from monthly sales */}
      <div className="section-card" style={{ marginBottom: 16 }}>
        <div className="section-card-head"><div className="section-card-title">Revenue trend — {new Date().getFullYear()}</div></div>
        <div className="section-card-body">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}k` : v}`} />
              <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
              <Line type="monotone" dataKey="sales" stroke="#009B00" strokeWidth={2} dot={{ fill:'#009B00', r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:16 }}>
        <div className="section-card">
          <div className="section-card-head">
            <div className="section-card-title">Recent service requests</div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/admin/service-requests')}>View all →</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Issue</th><th>Technician</th><th>Status</th></tr></thead>
              <tbody>
                {recentServices.map(s => (
                  <tr key={s.id} style={{ cursor:'pointer' }} onClick={() => navigate('/admin/service-requests')}>
                    <td><div style={{ fontWeight:600 }}>{s.customerName}</div><div style={{ fontSize:10, color:'#9aa0a6' }}>{s.customerMobile}</div></td>
                    <td style={{ fontSize:12 }}>{s.issueDescription?.slice(0,30)}{s.issueDescription?.length>30?'…':''}</td>
                    <td style={{ fontSize:12 }}>{s.assignedTechnician||'Unassigned'}</td>
                    <td><span className={`badge badge-${s.status?.toLowerCase().replace('_','')}`}>{s.status?.replace('_',' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">Quick actions</div></div>
          <div className="section-card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {QUICK_ACTIONS.map(a => (
                <div key={a.label} onClick={() => navigate(a.path)}
                  style={{ background:a.color, borderRadius:8, padding:'12px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                  <span style={{ fontSize:18 }}>{a.icon}</span>{a.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent sales + leads */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="section-card">
          <div className="section-card-head">
            <div className="section-card-title">Recent sales</div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/admin/sales')}>View all →</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentSales.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:600, fontSize:12 }}>{s.customerName}</td>
                    <td style={{ fontSize:11, color:'#5f6368' }}>{s.productName}</td>
                    <td style={{ fontWeight:600, color:'#009B00' }}>{formatCurrency(s.totalAmount)}</td>
                    <td><span className={`badge badge-${s.paymentStatus?.toLowerCase()}`}>{s.paymentStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head">
            <div className="section-card-title">Recent leads</div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/admin/leads')}>View all →</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Requirement</th><th>Source</th><th>Status</th></tr></thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id}>
                    <td><div style={{ fontWeight:600, fontSize:12 }}>{l.name}</div><div style={{ fontSize:10, color:'#9aa0a6' }}>{l.mobile}</div></td>
                    <td style={{ fontSize:11, color:'#5f6368' }}>{l.requirement?.slice(0,28)}{l.requirement?.length>28?'…':''}</td>
                    <td style={{ fontSize:11 }}>{l.source?.replace('_',' ')}</td>
                    <td><span className={`badge badge-${l.status?.toLowerCase().replace('_','')}`}>{l.status?.replace('_',' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

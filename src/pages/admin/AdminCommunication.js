import API_ROOT from '../../config/apiRoot';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { communicationAPI, customerAPI, templateAPI } from '../../services/api';
import { formatDateTime, useToast, ConfirmModal } from '../../components/admin/AdminHelpers';

const CHANNELS = [
  { key: 'SMS', icon: '💬', color: '#1d4ed8', label: 'SMS' },
  { key: 'WHATSAPP', icon: '💚', color: '#009900', label: 'WhatsApp' },
  { key: 'EMAIL', icon: '📧', color: '#7c3aed', label: 'Email' },
];

const TRIGGER_TYPES = [
  { key: 'SERVICE_DUE', label: 'Service Due', icon: '🔧' },
  { key: 'Annual Service_EXPIRING', label: 'Annual Service Expiring', icon: '📅' },
  { key: 'FILTER_DUE', label: 'Filter Due', icon: '💧' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending', icon: '💳' },
  { key: 'INSTALLATION_COMPLETE', label: 'Installation Done', icon: '✅' },
  { key: 'SERVICE_COMPLETE', label: 'Service Done', icon: '🎯' },
  { key: 'WARRANTY_EXPIRY', label: 'Warranty Expiry', icon: '🏅' },
];

const STATUS_STYLE = {
  QUEUED: '#fef3c7:#92400e',
  PROCESSING: '#dbeafe:#1e40af',
  SENT: '#d1fae5:#065f46',
  DELIVERED: '#d1fae5:#065f46',
  READ: '#ede9fe:#5b21b6',
  FAILED: '#fee2e2:#7f1d1d',
  SCHEDULED: '#f0fdf4:#15803d',
};

function StatusTag({ status }) {
  const [bg, color] = (STATUS_STYLE[status] || '#f3f4f6:#374151').split(':');
  return <span style={{ fontSize: 10, fontWeight: 700, background: bg, color, padding: '2px 8px', borderRadius: 10 }}>{status}</span>;
}

export default function AdminCommunication() {
  const [tab, setTab] = useState('center'); // center | logs | automation | presets
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [presets, setPresets] = useState([]);
  const [automation, setAutomation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bulkChannel, setBulkChannel] = useState('WHATSAPP');
  const [bulkContent, setBulkContent] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [customerFilter, setCustomerFilter] = useState({ customerType: '', city: '', search: '' });
  const [newPreset, setNewPreset] = useState({ name: '', description: '', filterConfig: '{}', icon: '🔧', color: '#009B00' });
  const [newRule, setNewRule] = useState({ name: '', triggerType: 'SERVICE_DUE', dayOffset: -3, scheduleType: 'DAILY', scheduleTime: '09:00', actionChannel: 'WHATSAPP', active: true });
  const [deleteId, setDeleteId] = useState(null);
  const [logFilter, setLogFilter] = useState('ALL');
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { show, ToastEl } = useToast();

  useEffect(() => {
    document.getElementById('admin-page-title') &&
      (document.getElementById('admin-page-title').textContent = 'Communication Center');
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [logsR, statsR, custR, templR, presR, autoR] = await Promise.all([
        communicationAPI.getAll(),
        communicationAPI.getStats(),
        customerAPI.getAll(),
        templateAPI.getAll(),
        communicationAPI.getFilterPresets(),
        communicationAPI.getAutomation(),
      ]);
      setLogs(logsR.data.data || []);
      setStats(statsR.data.data || {});
      setCustomers(custR.data.data?.content || custR.data.data || []);
      setTemplates(templR.data.data || []);
      setPresets(presR.data.data || []);
      setAutomation(autoR.data.data || []);
    } catch { show('Load failed', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Filter customers for bulk
  const applyFilter = async () => {
    try {
      const r = await communicationAPI.filterCustomers(customerFilter);
      setCustomers(r.data.data?.content || r.data.data || []);
      show(`${(r.data.data?.content || r.data.data || []).length} customers matched`);
    } catch { show('Filter failed', 'error'); }
  };

  const toggleCustomer = (id) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedCustomers(customers.map(c => c.id));
  const clearAll = () => setSelectedCustomers([]);

  const handleTemplateSelect = (t) => {
    setSelectedTemplate(t);
    if (t.messageContent) {
      setBulkContent(t.messageContent);
      setPreviewMsg(t.messageContent.replace(/\{\{customerName\}\}/g, 'Rajesh Kumar').replace(/\{\{companyPhone\}\}/g, '09952828740').replace(/\{\{[^}]+\}\}/g, '[variable]'));
    }
    if (t.subject) setBulkSubject(t.subject);
  };

  const handleTestEmail = async () => {
    setTestEmailLoading(true); setEmailError('');
    try {
      const r = await fetch(`${API_ROOT}/api/communications/test-email`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('aga_token')}` },
        body: JSON.stringify({ email: testEmail || 'pravinkathirneels24@gmail.com' }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        show('✅ Test email sent! Check your inbox.', 'success');
      } else {
        setEmailError(data.message || 'Email failed');
        show('❌ Email failed — check SMTP config', 'error');
      }
    } catch (e) {
      setEmailError('Network error — make sure backend is running');
      show('Network error', 'error');
    } finally { setTestEmailLoading(false); }
  };

  const handleBulkSend = async () => {
    if (selectedCustomers.length === 0) { show('Select at least one customer', 'error'); return; }
    if (!bulkContent && !selectedTemplate) { show('Select a template or enter message', 'error'); return; }
    setSending(true);
    try {
      const r = await communicationAPI.bulkSend({
        channel: bulkChannel,
        customerIds: selectedCustomers,
        templateId: selectedTemplate?.id || null,
        content: bulkContent,
        subject: bulkSubject,
        variables: {},
      });
      setSendResult(r.data.data);
      show(`Sent to ${r.data.data.sent} customers!`);
      setSelectedCustomers([]);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Send failed. Check email config.';
      show(msg, 'error');
      setEmailError(msg);
    }
    finally { setSending(false); }
  };

  const handleSavePreset = async () => {
    if (!newPreset.name) { show('Name required', 'error'); return; }
    try {
      await communicationAPI.createFilterPreset(newPreset);
      show('Filter preset saved'); load();
      setNewPreset({ name: '', description: '', filterConfig: '{}', icon: '🔧', color: '#009B00' });
    } catch { show('Failed', 'error'); }
  };

  const handleSaveRule = async () => {
    if (!newRule.name) { show('Name required', 'error'); return; }
    try {
      await communicationAPI.createAutomation(newRule);
      show('Automation rule created'); load();
      setNewRule({ name: '', triggerType: 'SERVICE_DUE', dayOffset: -3, scheduleType: 'DAILY', scheduleTime: '09:00', actionChannel: 'WHATSAPP', active: true });
    } catch { show('Failed', 'error'); }
  };

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter(l => l.channel === logFilter || l.status === logFilter);

  const TABS = [
    { key: 'center', label: 'Communication Center', icon: '📡' },
    { key: 'logs', label: 'History & Logs', icon: '📋' },
    { key: 'automation', label: 'Automation', icon: '⚡' },
    { key: 'presets', label: 'Filter Presets', icon: '🔖' },
  ];

  return (
    <div>
      {ToastEl}

      {/* Stats Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sent', value: stats.total || 0, color: 'stat-blue', icon: '📡' },
          { label: 'SMS Sent', value: stats.sms || 0, color: 'stat-blue', icon: '💬' },
          { label: 'WhatsApp Sent', value: stats.whatsapp || 0, color: 'stat-green', icon: '💚' },
          { label: 'Emails Sent', value: stats.email || 0, color: 'stat-amber', icon: '📧' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.icon} {s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e9ecef', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, color: tab === t.key ? '#009B00' : '#6c757d',
            borderBottom: tab === t.key ? '2px solid #009B00' : '2px solid transparent',
            marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── COMMUNICATION CENTER ── */}
      {tab === 'center' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
          {/* Left: Customer Selection */}
          <div>
            <div className="section-card" style={{ marginBottom: 14 }}>
              <div className="section-card-head">
                <div className="section-card-title">1 — Select Customers</div>
                <div className="flex-gap">
                  <span style={{ fontSize: 12, color: '#6c757d' }}>{selectedCustomers.length}/{customers.length} selected</span>
                  <button className="btn btn-xs btn-ghost" onClick={selectAll}>Select All</button>
                  <button className="btn btn-xs btn-ghost" onClick={clearAll}>Clear</button>
                </div>
              </div>
              <div className="section-card-body">
                {/* Filter row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Search customers…"
                    value={customerFilter.search} onChange={e => setCustomerFilter(f => ({ ...f, search: e.target.value }))} />
                  <select className="form-select" style={{ width: 160 }} value={customerFilter.customerType}
                    onChange={e => setCustomerFilter(f => ({ ...f, customerType: e.target.value }))}>
                    <option value="">All Types</option>
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={applyFilter}>Filter</button>
                </div>

                {/* Preset filters */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {presets.map(p => (
                    <button key={p.id} className="filter-btn"
                      onClick={async () => {
                        const config = JSON.parse(p.filterConfig || '{}');
                        setCustomerFilter({ ...customerFilter, ...config });
                        await applyFilter();
                      }}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>

                {/* Customer list */}
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                  {customers.filter(c => !customerFilter.search || c.name.toLowerCase().includes(customerFilter.search.toLowerCase()) || c.mobile.includes(customerFilter.search)).map(c => (
                    <div key={c.id}
                      onClick={() => toggleCustomer(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                        borderBottom: '1px solid #f1f3f5', cursor: 'pointer',
                        background: selectedCustomers.includes(c.id) ? '#f0fff0' : '#fff',
                        transition: 'background 0.15s'
                      }}>
                      <input type="checkbox" readOnly checked={selectedCustomers.includes(c.id)} style={{ cursor: 'pointer' }} />
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0f9e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#009B00', flexShrink: 0 }}>
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#6c757d' }}>{c.mobile} · {c.city || 'Coimbatore'}</div>
                      </div>
                      <span style={{ fontSize: 10, background: c.customerType === 'COMMERCIAL' ? '#ede9fe' : '#e0f9e0', color: c.customerType === 'COMMERCIAL' ? '#5b21b6' : '#065f46', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                        {c.customerType || 'RES'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message Composer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Channel */}
            <div className="section-card">
              <div className="section-card-head"><div className="section-card-title">2 — Select Channel</div></div>
              <div className="section-card-body">
                <div style={{ display: 'flex', gap: 8 }}>
                  {CHANNELS.map(ch => (
                    <button key={ch.key} onClick={() => setBulkChannel(ch.key)}
                      style={{ flex: 1, padding: '10px 6px', borderRadius: 8, border: `2px solid ${bulkChannel === ch.key ? ch.color : '#e9ecef'}`, background: bulkChannel === ch.key ? ch.color + '15' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: bulkChannel === ch.key ? ch.color : '#6c757d', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{ch.icon}</div>
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Template selection */}
            <div className="section-card">
              <div className="section-card-head"><div className="section-card-title">3 — Select Template</div></div>
              <div className="section-card-body">
                <select className="form-select" value={selectedTemplate?.id || ''} onChange={e => {
                  const t = templates.find(t => t.id === parseInt(e.target.value));
                  if (t) handleTemplateSelect(t);
                }}>
                  <option value="">Choose a template…</option>
                  {templates.filter(t => t.templateType === bulkChannel || t.category === 'COMMUNICATION').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message composer */}
            <div className="section-card">
              <div className="section-card-head"><div className="section-card-title">4 — Compose Message</div></div>
              <div className="section-card-body">
                {bulkChannel === 'EMAIL' && (
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">Subject</label>
                    <input className="form-input" value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} placeholder="Email subject…" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 100 }}
                    value={bulkContent} onChange={e => setBulkContent(e.target.value)}
                    placeholder="Enter message or select template above…" />
                </div>
                {previewMsg && (
                  <div style={{ marginTop: 10, padding: 12, background: '#f0fff0', borderRadius: 8, border: '1px solid #c5e8d8' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#009B00', marginBottom: 6 }}>Preview (sample customer)</div>
                    <div style={{ fontSize: 12, color: '#212529', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{previewMsg}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Send button */}
            <div style={{ padding: '14px 16px', background: '#f0fff0', border: '1px solid #c5e8d8', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Ready to Send</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>{selectedCustomers.length} customers selected via {bulkChannel}</div>
                </div>
                <button className="btn btn-primary" onClick={handleBulkSend} disabled={sending || selectedCustomers.length === 0}
                  style={{ padding: '10px 20px', fontSize: 14 }}>
                  {sending ? <><span className="spinner" /> Sending…</> : `📤 Send to ${selectedCustomers.length}`}
                </button>
              </div>
              {sendResult && (
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                  ✅ Batch {sendResult.batchId}: {sendResult.sent} sent, {sendResult.failed} failed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COMMUNICATION LOGS ── */}
      {tab === 'logs' && (
        <div>
          <div className="filter-bar">
            {['ALL','SMS','WHATSAPP','EMAIL','SENT','FAILED','SCHEDULED'].map(s => (
              <button key={s} className={`filter-btn${logFilter === s ? ' active' : ''}`} onClick={() => setLogFilter(s)}>{s}</button>
            ))}
          </div>
          <div className="section-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Channel</th><th>Customer</th><th>Template</th><th>Message</th><th>Status</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#9aa0a6' }}>No logs found</td></tr>}
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, color: '#9aa0a6' }}>#{log.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{CHANNELS.find(c => c.key === log.channel)?.icon || '📡'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{log.channel}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{log.customerName || '—'}</div>
                        <div style={{ fontSize: 11, color: '#6c757d' }}>{log.customerMobile}</div>
                      </td>
                      <td style={{ fontSize: 12, color: '#6c757d' }}>{log.templateName || '—'}</td>
                      <td style={{ maxWidth: 180, fontSize: 11, color: '#6c757d' }}>
                        {log.messageContent?.slice(0, 60)}{log.messageContent?.length > 60 ? '…' : ''}
                      </td>
                      <td><StatusTag status={log.status} /></td>
                      <td style={{ fontSize: 11, color: '#9aa0a6', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                      <td>
                        <div className="flex-gap" style={{ gap: 4 }}>
                          {log.status === 'FAILED' && (
                            <button className="btn btn-xs btn-ghost" onClick={async () => { await communicationAPI.updateStatus(log.id, 'QUEUED'); load(); show('Queued for retry'); }}>🔄</button>
                          )}
                          <button className="btn btn-xs btn-ghost" style={{ color: '#A32D2D' }} onClick={() => setDeleteId(log.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTOMATION ── */}
      {tab === 'automation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Existing rules */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Active Automation Rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {automation.map(rule => {
                const trigger = TRIGGER_TYPES.find(t => t.key === rule.triggerType);
                return (
                  <div key={rule.id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, padding: 16 }}>
                    <div className="flex-between mb-8">
                      <div className="flex-gap">
                        <span style={{ fontSize: 20 }}>{trigger?.icon || '⚡'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{rule.name}</div>
                          <div style={{ fontSize: 11, color: '#6c757d' }}>{trigger?.label || rule.triggerType}</div>
                        </div>
                      </div>
                      <div className="flex-gap" style={{ gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: rule.active ? '#d1fae5' : '#fee2e2', color: rule.active ? '#065f46' : '#7f1d1d', padding: '2px 8px', borderRadius: 10 }}>
                          {rule.active ? 'Active' : 'Paused'}
                        </span>
                        <button className="btn btn-xs btn-ghost" onClick={async () => { await communicationAPI.deleteAutomation(rule.id); load(); show('Deleted'); }}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6c757d', flexWrap: 'wrap' }}>
                      <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 6 }}>
                        {rule.dayOffset < 0 ? `${Math.abs(rule.dayOffset)} days before` : rule.dayOffset === 0 ? 'On the day' : `${rule.dayOffset} days after`}
                      </span>
                      <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 6 }}>📡 {rule.actionChannel}</span>
                      <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 6 }}>⏰ {rule.scheduleTime || '09:00'}</span>
                      {rule.totalSent > 0 && <span style={{ background: '#e0f9e0', color: '#009B00', padding: '2px 8px', borderRadius: 6 }}>✅ {rule.totalSent} sent</span>}
                    </div>
                    {rule.description && <p style={{ fontSize: 12, color: '#6c757d', marginTop: 8 }}>{rule.description}</p>}
                  </div>
                );
              })}
              {automation.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#9aa0a6' }}>No automation rules yet</div>}
            </div>
          </div>

          {/* Create rule */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Create Automation Rule</div>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group"><label className="form-label">Rule Name *</label><input className="form-input" value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder="e.g. Service Due Reminder" /></div>
                <div className="form-group"><label className="form-label">Trigger Event</label>
                  <select className="form-select" value={newRule.triggerType} onChange={e => setNewRule(r => ({ ...r, triggerType: e.target.value }))}>
                    {TRIGGER_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <div className="form-group"><label className="form-label">Day Offset</label>
                    <input className="form-input" type="number" value={newRule.dayOffset} onChange={e => setNewRule(r => ({ ...r, dayOffset: parseInt(e.target.value) }))} placeholder="-3 = 3 days before" />
                  </div>
                  <div className="form-group"><label className="form-label">Send Time</label>
                    <input className="form-input" type="time" value={newRule.scheduleTime} onChange={e => setNewRule(r => ({ ...r, scheduleTime: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Channel</label>
                  <select className="form-select" value={newRule.actionChannel} onChange={e => setNewRule(r => ({ ...r, actionChannel: e.target.value }))}>
                    {CHANNELS.map(ch => <option key={ch.key} value={ch.key}>{ch.icon} {ch.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={newRule.active} onChange={e => setNewRule(r => ({ ...r, active: e.target.checked }))} id="ruleActive" />
                  <label htmlFor="ruleActive" style={{ fontSize: 13, cursor: 'pointer' }}>Start active immediately</label>
                </div>
                <button className="btn btn-primary" onClick={handleSaveRule} style={{ width: '100%', justifyContent: 'center' }}>⚡ Create Rule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER PRESETS ── */}
      {tab === 'presets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Saved Filter Presets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {presets.map(p => (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: p.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6c757d' }}>{p.description}</div>
                  </div>
                  <button className="btn btn-xs btn-ghost" style={{ color: '#A32D2D' }} onClick={async () => { await communicationAPI.deleteFilterPreset(p.id); load(); show('Deleted'); }}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                </div>
              ))}
              {presets.length === 0 && <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: '#9aa0a6' }}>No presets saved yet</div>}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Save New Preset</div>
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group"><label className="form-label">Preset Name *</label><input className="form-input" value={newPreset.name} onChange={e => setNewPreset(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Annual Service Due This Month" /></div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={newPreset.description} onChange={e => setNewPreset(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid-2" style={{ gap: 10 }}>
                <div className="form-group"><label className="form-label">Icon</label><input className="form-input" value={newPreset.icon} onChange={e => setNewPreset(p => ({ ...p, icon: e.target.value }))} placeholder="🔧" /></div>
                <div className="form-group"><label className="form-label">Color</label><input className="form-input" type="color" value={newPreset.color} onChange={e => setNewPreset(p => ({ ...p, color: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Filter Config (JSON)</label>
                <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: 12 }} value={newPreset.filterConfig} onChange={e => setNewPreset(p => ({ ...p, filterConfig: e.target.value }))} placeholder='{"customerType":"COMMERCIAL","city":"Coimbatore"}' />
              </div>
              <button className="btn btn-primary" onClick={handleSavePreset} style={{ width: '100%', justifyContent: 'center' }}>🔖 Save Preset</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="Delete Log" message="Remove this communication log?" danger
        onConfirm={async () => { await communicationAPI.delete(deleteId); setDeleteId(null); load(); show('Deleted'); }}
        onCancel={() => setDeleteId(null)} />
    </div>
  );
}

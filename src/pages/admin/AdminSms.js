import { useState, useEffect } from 'react';
import { templateAPI, smsAPI } from '../../services/api';

const SMS_EVENTS = [
  { key: 'ENQUIRY_RECEIVED',  label: 'Enquiry received',   vars: ['name','product'],              desc: 'Fires when a customer submits a website enquiry' },
  { key: 'SERVICE_BOOKED',    label: 'Service booked',     vars: ['name','ticket','technician'],   desc: 'Fires when a service ticket is created or assigned' },
  { key: 'SERVICE_COMPLETED', label: 'Service completed',  vars: ['name','ticket','amount'],       desc: 'Fires when service request is marked COMPLETED' },
  { key: 'QUOTATION_SENT',    label: 'Quotation sent',     vars: ['name','quot','amount'],         desc: 'Fires when quotation status is set to SENT' },
  { key: 'LEAD_FOLLOWUP',     label: 'Lead follow-up',     vars: ['name','requirement'],           desc: 'Manual trigger from Leads page or SMS test panel' },
  { key: 'PAYMENT_RECEIVED',  label: 'Payment received',   vars: ['name','invoice','amount'],      desc: 'Fires when a payment is recorded' },
];

const EMPTY_FORM = {
  name: '', templateType: 'SMS', category: 'COMMUNICATION',
  messageContent: '', description: '', msg91TemplateId: '',
  smsEvent: 'ENQUIRY_RECEIVED', isDefault: true, active: true,
};

function Pill({ color, children }) {
  return (
    <span style={{ background: color + '18', color, borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg = type === 'error' ? '#E24B4A' : '#0d8a00';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, background:bg, color:'#fff', borderRadius:10, padding:'12px 20px', fontSize:13, fontWeight:500, zIndex:9999, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
      {msg}
    </div>
  );
}

export default function AdminSms() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [activeTab, setActiveTab] = useState('templates'); // templates | test | howto
  // test panel state
  const [testTplId, setTestTplId]   = useState('');
  const [testMobile, setTestMobile] = useState('');
  const [testVars, setTestVars]     = useState({});
  const [preview, setPreview]       = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testSent, setTestSent]       = useState(false);
  // follow-up
  const [followupId, setFollowupId]     = useState('');
  const [followupDone, setFollowupDone] = useState(false);

  const notify = (msg, type = 'ok') => setToast({ msg, type });

  const load = () => {
    setLoading(true);
    smsAPI.listTemplates().then(r => setTemplates(r.data.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => {
    document.getElementById('admin-page-title')
      && (document.getElementById('admin-page-title').textContent = 'SMS Templates');
    load();
  }, []);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true); };
  const openEdit   = item => {
    setForm({
      name: item.name, templateType: 'SMS', category: 'COMMUNICATION',
      messageContent: item.messageContent || '',
      description: item.description || '',
      msg91TemplateId: item.msg91TemplateId || '',
      smsEvent: item.smsEvent || 'ENQUIRY_RECEIVED',
      isDefault: !!item.isDefault,
      active: item.active !== false,
    });
    setEditItem(item); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { notify('Template name is required', 'error'); return; }
    if (!form.messageContent.trim()) { notify('Message content is required', 'error'); return; }
    setSaving(true);
    try {
      if (editItem) await templateAPI.update(editItem.id, form);
      else await templateAPI.create(form);
      notify(editItem ? 'Template updated' : 'Template created');
      setModalOpen(false); load();
    } catch { notify('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await templateAPI.delete(id); notify('Deleted'); load(); }
    catch { notify('Delete failed', 'error'); }
  };

  const handleSetDefault = async (id) => {
    try { await templateAPI.setDefault(id); notify('Set as default'); load(); }
    catch { notify('Failed', 'error'); }
  };

  // Preview resolved message
  const handlePreview = async () => {
    if (!testTplId) { notify('Select a template first', 'error'); return; }
    try {
      const r = await smsAPI.preview(Number(testTplId), testVars);
      setPreview(r.data.data);
    } catch { notify('Preview failed', 'error'); }
  };

  // Send real SMS
  const handleTest = async () => {
    if (!testTplId || !testMobile) { notify('Select template and enter mobile', 'error'); return; }
    setTestLoading(true); setTestSent(false);
    try {
      await smsAPI.test(testMobile, Number(testTplId), testVars);
      setTestSent(true);
      notify('SMS sent! Check your phone.');
    } catch (e) {
      notify(e.response?.data?.message || 'Send failed', 'error');
    } finally { setTestLoading(false); }
  };

  const handleFollowup = async () => {
    if (!followupId) return;
    try {
      await smsAPI.leadFollowup(followupId);
      setFollowupDone(true);
      notify('Follow-up SMS sent');
    } catch { notify('Failed', 'error'); }
  };

  // When a template is selected in test panel, prefill var inputs
  const selectedTpl = templates.find(t => String(t.id) === String(testTplId));
  const selectedEvent = SMS_EVENTS.find(e => e.key === selectedTpl?.smsEvent);

  const charCount = form.messageContent.length;
  const smsParts  = Math.ceil(charCount / 160) || 1;

  return (
    <div style={{ maxWidth: 900 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid #e9ecef', marginBottom:24 }}>
        {[['templates','📋 Templates'],['test','🔬 Test & Send'],['howto','📖 Setup guide']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding:'10px 20px', border:'none', background:'transparent', cursor:'pointer',
            fontSize:13, fontWeight:600,
            color: activeTab===k ? '#009B00' : '#6c757d',
            borderBottom: activeTab===k ? '2.5px solid #009B00' : '2.5px solid transparent',
          }}>{l}</button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ─────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:600, margin:0 }}>SMS templates</h2>
              <p style={{ fontSize:12, color:'#6c757d', margin:'4px 0 0' }}>
                Create one template per event. Mark one as <strong>default</strong> — that is what fires automatically.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ New SMS template</button>
          </div>

          {/* Event reference */}
          <div className="section-card" style={{ marginBottom:20 }}>
            <div className="section-card-head"><div className="section-card-title">Available events &amp; variables</div></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Event</th><th>Variables you can use</th><th>When it fires</th></tr></thead>
                <tbody>
                  {SMS_EVENTS.map(ev => (
                    <tr key={ev.key}>
                      <td><code style={{ fontSize:11, background:'#e6f1fb', padding:'2px 6px', borderRadius:4, color:'#185FA5' }}>{ev.key}</code></td>
                      <td>
                        {ev.vars.map(v => (
                          <code key={v} style={{ fontSize:11, background:'#e0f9e0', padding:'2px 5px', borderRadius:3, color:'#009B00', marginRight:4 }}>
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </td>
                      <td style={{ fontSize:12, color:'#5f6368' }}>{ev.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Template list */}
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'#9aa0a6' }}>Loading…</div>
          ) : templates.length === 0 ? (
            <div className="section-card" style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>💬</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No SMS templates yet</div>
              <div style={{ fontSize:13, color:'#6c757d', marginBottom:20 }}>
                Create one for each event. The "default" template fires automatically.
              </div>
              <button className="btn btn-primary" onClick={openCreate}>Create first template</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {SMS_EVENTS.map(ev => {
                const evTpls = templates.filter(t => t.smsEvent === ev.key);
                if (!evTpls.length) return null;
                return (
                  <div key={ev.key}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#6c757d', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
                      {ev.label}
                    </div>
                    {evTpls.map(tpl => (
                      <div key={tpl.id} className="section-card" style={{ marginBottom:8, borderLeft: tpl.isDefault ? '3px solid #009B00' : '3px solid transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'14px 16px' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ fontWeight:600, fontSize:14 }}>{tpl.name}</span>
                              {tpl.isDefault && <Pill color="#009B00">Default</Pill>}
                              {!tpl.active && <Pill color="#E24B4A">Inactive</Pill>}
                              {tpl.msg91TemplateId
                                ? <Pill color="#185FA5">MSG91 ID set</Pill>
                                : <Pill color="#EF9F27">No MSG91 ID</Pill>}
                            </div>
                            <div style={{ fontSize:12, color:'#5f6368', background:'#f8f9fa', borderRadius:6, padding:'8px 10px', fontFamily:'monospace', lineHeight:1.6, maxWidth:560, wordBreak:'break-word' }}>
                              {tpl.messageContent || <em>No content</em>}
                            </div>
                            {tpl.msg91TemplateId && (
                              <div style={{ fontSize:11, color:'#185FA5', marginTop:6 }}>
                                MSG91 ID: <code>{tpl.msg91TemplateId}</code>
                              </div>
                            )}
                          </div>
                          <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:16 }}>
                            {!tpl.isDefault && (
                              <button className="btn btn-ghost btn-xs" onClick={() => handleSetDefault(tpl.id)}>Set default</button>
                            )}
                            <button className="btn btn-ghost btn-xs" onClick={() => openEdit(tpl)}>Edit</button>
                            <button className="btn btn-ghost btn-xs" style={{ color:'#E24B4A' }} onClick={() => handleDelete(tpl.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {/* Templates without a known event */}
              {templates.filter(t => !SMS_EVENTS.find(e => e.key === t.smsEvent)).map(tpl => (
                <div key={tpl.id} className="section-card" style={{ marginBottom:8 }}>
                  <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <span style={{ fontWeight:600 }}>{tpl.name}</span>
                      <span style={{ marginLeft:8, fontSize:11, color:'#6c757d' }}>no event assigned</span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => openEdit(tpl)}>Edit</button>
                      <button className="btn btn-ghost btn-xs" style={{ color:'#E24B4A' }} onClick={() => handleDelete(tpl.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TEST & SEND TAB ────────────────────────────────────── */}
      {activeTab === 'test' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Test panel */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">Send test SMS to your number</div></div>
            <div className="section-card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Select template</label>
                <select className="form-select" value={testTplId} onChange={e => { setTestTplId(e.target.value); setPreview(null); setTestVars({}); }}>
                  <option value="">— choose —</option>
                  {SMS_EVENTS.map(ev => {
                    const evTpls = templates.filter(t => t.smsEvent === ev.key);
                    if (!evTpls.length) return null;
                    return (
                      <optgroup key={ev.key} label={ev.label}>
                        {evTpls.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' ★' : ''}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {selectedTpl && (
                <>
                  <div style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 12px', fontSize:12, fontFamily:'monospace', color:'#2c2c2a', lineHeight:1.7 }}>
                    {selectedTpl.messageContent}
                  </div>

                  {/* Variable inputs */}
                  {selectedEvent && selectedEvent.vars.length > 0 && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:'#495057' }}>Fill in variables for preview</div>
                      {selectedEvent.vars.map(v => (
                        <div key={v} className="form-group" style={{ marginBottom:8 }}>
                          <label className="form-label" style={{ textTransform:'none' }}>{`{{${v}}}`}</label>
                          <input
                            className="form-input"
                            placeholder={`Value for ${v}`}
                            value={testVars[v] || ''}
                            onChange={e => setTestVars(p => ({ ...p, [v]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="btn btn-ghost" onClick={handlePreview}>Preview resolved message</button>

                  {preview && (
                    <div style={{ background:'#e0f9e0', borderRadius:8, padding:'12px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#009B00', marginBottom:6 }}>PREVIEW</div>
                      <div style={{ fontSize:13, lineHeight:1.7, color:'#2c2c2a' }}>{preview.resolved}</div>
                      <div style={{ fontSize:11, color:'#5f6368', marginTop:6 }}>
                        {preview.charCount} chars · {preview.smsParts} SMS part{preview.smsParts !== '1' ? 's' : ''}
                        {!preview.msg91Id && <span style={{ color:'#E24B4A', marginLeft:8 }}>⚠ No MSG91 ID — SMS will not actually send</span>}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label className="form-label">Your mobile number (10 digits, no country code)</label>
                <input className="form-input" placeholder="9876543210" value={testMobile} onChange={e => setTestMobile(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleTest} disabled={testLoading || !testTplId || !testMobile}>
                {testLoading ? 'Sending…' : 'Send SMS to my number'}
              </button>
              {testSent && <div style={{ color:'#0d8a00', fontSize:13, fontWeight:500 }}>✓ SMS sent! Check your phone.</div>}
              <p style={{ fontSize:11, color:'#9aa0a6', margin:0 }}>
                Make sure <code>MSG91_ENABLED=true</code> and <code>MSG91_AUTH_KEY</code> are set in your .env.
              </p>
            </div>
          </div>

          {/* Manual lead follow-up */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">Manual lead follow-up</div></div>
            <div className="section-card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ fontSize:12, color:'#5f6368', margin:0 }}>
                Sends the <strong>LEAD_FOLLOWUP</strong> default template to the lead's registered mobile number.
              </p>
              <div className="form-group">
                <label className="form-label">Lead ID</label>
                <input className="form-input" type="number" placeholder="e.g. 42" value={followupId} onChange={e => setFollowupId(e.target.value)} />
                <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>Find the ID in the Leads table (URL or row ID column)</div>
              </div>
              <button className="btn btn-primary" onClick={handleFollowup} disabled={!followupId}>
                Send follow-up SMS
              </button>
              {followupDone && <div style={{ color:'#0d8a00', fontSize:13, fontWeight:500 }}>✓ Follow-up SMS queued.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── SETUP GUIDE TAB ───────────────────────────────────── */}
      {activeTab === 'howto' && (
        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">How to set up MSG91 SMS</div></div>
          <div className="section-card-body">
            {[
              { n:'1', t:'DLT registration (India mandatory)',
                b:'Register your business on any DLT portal (Jio, Airtel, Vodafone). You need your GST number, PAN, and company name. You get a Principal Entity (PE) ID. This is free but takes 3–7 working days.' },
              { n:'2', t:'Create MSG91 account',
                b:'Sign up at msg91.com. Go to API → Authkey → copy your key. Set it in .env as MSG91_AUTH_KEY=...' },
              { n:'3', t:'Register Sender ID',
                b:'MSG91 panel → SMS → Sender ID → Add. Use 6 alphabetic chars e.g. AGAPUR. Register the same sender on the DLT portal under your PE ID.' },
              { n:'4', t:'Create DLT templates',
                b:'On the DLT portal, submit your message content using {{1}} {{2}} placeholders. After approval (2–5 days) you get a DLT Template ID — a 15–19 digit number.' },
              { n:'5', t:'Create MSG91 templates',
                b:'MSG91 panel → SMS → Templates → Add. Enter the DLT Template ID, your sender, and the exact approved message using ##var## syntax. Copy the MSG91 Template ID shown.' },
              { n:'6', t:'Create templates here (this page)',
                b:'Use the Templates tab above. Write your message with {{name}} {{ticket}} etc. placeholders. Paste the MSG91 Template ID. Mark the right event and set it as default.' },
              { n:'7', t:'Enable in .env',
                b:'Set MSG91_ENABLED=true in your .env file. Restart the backend. Then use the Test & Send tab to verify your own number receives an SMS.' },
            ].map(({ n, t, b }) => (
              <div key={n} style={{ display:'flex', gap:14, marginBottom:18 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#009B00', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{n}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{t}</div>
                  <div style={{ fontSize:12, color:'#5f6368', lineHeight:1.7 }}>{b}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop:20, background:'#faeeda', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Sample DLT template text to submit</div>
              {[
                ['ENQUIRY_RECEIVED', 'Dear {{1}}, thank you for enquiring about {{2}}. Our team will contact you within 45 minutes. - Aqua Green Agencies, Coimbatore.'],
                ['SERVICE_BOOKED',   'Dear {{1}}, your service request {{2}} has been assigned to {{3}}. We will reach you shortly. - Aqua Green Agencies.'],
                ['SERVICE_COMPLETED','Dear {{1}}, your service request {{2}} is completed. Bill amount: Rs.{{3}}. Thank you! - Aqua Green Agencies.'],
                ['QUOTATION_SENT',   'Dear {{1}}, your quotation {{2}} for Rs.{{3}} has been sent. Valid 30 days. Call 09952828740 for queries. - Aqua Green Agencies.'],
                ['LEAD_FOLLOWUP',    'Dear {{1}}, following up on your enquiry for {{2}}. Call us at 09952828740. - Aqua Green Agencies, Coimbatore.'],
                ['PAYMENT_RECEIVED', 'Dear {{1}}, payment received for invoice {{2}} of Rs.{{3}}. Thank you! - Aqua Green Agencies, Coimbatore.'],
              ].map(([ev, txt]) => (
                <div key={ev} style={{ marginBottom:10 }}>
                  <code style={{ fontSize:10, background:'#854F0B22', color:'#854F0B', padding:'1px 5px', borderRadius:3 }}>{ev}</code>
                  <div style={{ fontSize:12, fontFamily:'monospace', marginTop:4, color:'#2c2c2a', lineHeight:1.7 }}>{txt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ────────────────────────────────── */}
      {modalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, width:640, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.18)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid #e9ecef' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:600 }}>{editItem ? 'Edit SMS template' : 'New SMS template'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6c757d' }}>×</button>
            </div>

            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Template name *</label>
                <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Service booking confirmation" />
              </div>

              {/* Event */}
              <div className="form-group">
                <label className="form-label">Business event *</label>
                <select className="form-select" value={form.smsEvent} onChange={e => f('smsEvent', e.target.value)}>
                  {SMS_EVENTS.map(e => <option key={e.key} value={e.key}>{e.label} — {e.desc}</option>)}
                </select>
                <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>
                  Available variables for this event:{' '}
                  {SMS_EVENTS.find(e => e.key === form.smsEvent)?.vars.map(v => (
                    <code key={v} style={{ background:'#e0f9e0', color:'#009B00', padding:'1px 5px', borderRadius:3, marginRight:4, fontSize:11 }}>{`{{${v}}}`}</code>
                  ))}
                </div>
              </div>

              {/* Message content */}
              <div className="form-group">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <label className="form-label">Message content *</label>
                  <span style={{ fontSize:11, color: charCount > 160 ? '#E24B4A' : '#9aa0a6' }}>
                    {charCount} chars · {smsParts} part{smsParts > 1 ? 's' : ''}
                    {charCount > 160 && ' ⚠ multi-part (more credits)'}
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ minHeight:140, fontFamily:'monospace', fontSize:13, lineHeight:1.7 }}
                  value={form.messageContent}
                  onChange={e => f('messageContent', e.target.value)}
                  placeholder={`Dear {{name}}, thank you for enquiring about {{product}}. Our team will contact you within 45 minutes. - Aqua Green Agencies, Coimbatore.`}
                />
                <div style={{ fontSize:11, color:'#6c757d', marginTop:4 }}>
                  Use <code>{'{{variableName}}'}</code> placeholders. Keep under 160 chars for single-part SMS.
                </div>
              </div>

              {/* MSG91 Template ID */}
              <div className="form-group">
                <label className="form-label">MSG91 Template ID</label>
                <input
                  className="form-input"
                  value={form.msg91TemplateId}
                  onChange={e => f('msg91TemplateId', e.target.value)}
                  placeholder="e.g. 1507163147968721856"
                  style={{ fontFamily:'monospace' }}
                />
                <div style={{ fontSize:11, color:'#9aa0a6', marginTop:4 }}>
                  Copy from MSG91 panel → SMS → Templates → copy icon. Without this, SMS will be logged but not sent.
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="form-input" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Brief note about this template" />
              </div>

              {/* Flags */}
              <div style={{ display:'flex', gap:20 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.isDefault} onChange={e => f('isDefault', e.target.checked)} />
                  Set as default for this event
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} />
                  Active
                </label>
              </div>
              <div style={{ fontSize:11, color:'#9aa0a6', marginTop:-8 }}>
                Only the <strong>active default</strong> template fires automatically. You can have multiple templates per event for A/B testing — only the default fires.
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'16px 24px', borderTop:'1px solid #e9ecef' }}>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Update template' : 'Create template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

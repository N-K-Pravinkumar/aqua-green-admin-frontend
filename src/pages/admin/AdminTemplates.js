import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { templateAPI } from '../../services/api';
import { ConfirmModal, formatDateTime, useToast, StatusBadge } from '../../components/admin/AdminHelpers';

const TEMPLATE_TYPES = [
  { key: 'SMS', label: 'SMS', icon: '💬', color: '#1d4ed8', cat: 'COMMUNICATION' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: '💚', color: '#009900', cat: 'COMMUNICATION' },
  { key: 'EMAIL', label: 'Email', icon: '📧', color: '#7c3aed', cat: 'COMMUNICATION' },
  { key: 'QUOTATION', label: 'Quotation', icon: '📋', color: '#d97706', cat: 'DOCUMENT' },
  { key: 'INVOICE', label: 'Invoice', icon: '🧾', color: '#009B00', cat: 'DOCUMENT' },
  { key: 'SERVICE_REPORT', label: 'Service Report', icon: '🔧', color: '#dc2626', cat: 'DOCUMENT' },
  { key: 'WARRANTY_CERT', label: 'Warranty Cert', icon: '🏅', color: '#9333ea', cat: 'DOCUMENT' },
  { key: 'INSTALLATION_REPORT', label: 'Installation Report', icon: '📐', color: '#0891b2', cat: 'DOCUMENT' },
  { key: 'WELCOME_LETTER', label: 'Welcome Letter', icon: '👋', color: '#ea580c', cat: 'DOCUMENT' },
];

const EMPTY_TEMPLATE = {
  name: '', templateType: 'SMS', category: 'COMMUNICATION',
  messageContent: '', htmlContent: '', subject: '', description: '',
  headerConfig: '{}', footerConfig: '{}', watermarkConfig: '{}',
  pageConfig: '{"size":"A4","orientation":"PORTRAIT"}', active: true
};

const ALL_PLACEHOLDERS = [
  { group: 'Customer', items: ['customerName','customerId','mobile','email','address','city'] },
  { group: 'Product', items: ['productName','model','serialNumber','filterType','technician','salesPerson'] },
  { group: 'Dates', items: ['installationDate','nextServiceDate','nextRenewalDate','lastServiceDate'] },
  { group: 'Financial', items: ['quotationNumber','invoiceNumber','subtotal','gst','grandTotal','paymentMode'] },
  { group: 'Company', items: ['companyName','companyPhone','companyEmail','companyWebsite','date'] },
];

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [placeholderPanel, setPlaceholderPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('content'); // content | header | footer | watermark | page
  const { show, ToastEl } = useToast();
  const contentRef = useRef(null);

  useEffect(() => {
    document.getElementById('admin-page-title') &&
      (document.getElementById('admin-page-title').textContent = 'Templates & Documents');
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([templateAPI.getAll(), templateAPI.getCounts()])
      .then(([r, cr]) => { setTemplates(r.data.data || []); setCounts(cr.data.data || {}); })
      .catch(() => show('Load failed', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = typeFilter === 'ALL' ? templates : templates.filter(t => t.templateType === typeFilter);
  const isDoc = t => ['QUOTATION','INVOICE','SERVICE_REPORT','WARRANTY_CERT','INSTALLATION_REPORT','WELCOME_LETTER'].includes(t?.templateType);

  const openCreate = type => {
    const tt = TEMPLATE_TYPES.find(t => t.key === type) || TEMPLATE_TYPES[0];
    setForm({ ...EMPTY_TEMPLATE, templateType: tt.key, category: tt.cat });
    setEditItem(null); setActiveTab('content'); setModalOpen(true);
  };

  const openEdit = item => {
    setForm({
      name: item.name, templateType: item.templateType, category: item.category,
      messageContent: item.messageContent || '', htmlContent: item.htmlContent || '',
      subject: item.subject || '', description: item.description || '',
      headerConfig: item.headerConfig || '{}', footerConfig: item.footerConfig || '{}',
      watermarkConfig: item.watermarkConfig || '{}',
      pageConfig: item.pageConfig || '{"size":"A4","orientation":"PORTRAIT"}',
      active: item.active,
    });
    setEditItem(item); setActiveTab('content'); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { show('Template name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editItem) await templateAPI.update(editItem.id, form);
      else await templateAPI.create(form);
      show(editItem ? 'Template updated' : 'Template created');
      setModalOpen(false); load();
    } catch { show('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handlePreview = async (item) => {
    try {
      const r = await templateAPI.preview(item.id, {});
      setPreviewHtml(r.data.data.rendered);
      setPreviewOpen(item);
    } catch { show('Preview failed', 'error'); }
  };

  const handleGeneratePdf = async (item) => {
    setGenerating(true);
    try {
      const r = await templateAPI.generatePdf(item.id, {});
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = item.name + '.pdf'; a.click();
      show('PDF downloaded');
    } catch { show('PDF generation failed', 'error'); }
    finally { setGenerating(false); }
  };

  const handleGenerateDocx = async (item) => {
    setGenerating(true);
    try {
      const r = await templateAPI.generateDocx(item.id, {});
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = item.name + '.docx'; a.click();
      show('DOCX downloaded');
    } catch { show('DOCX generation failed', 'error'); }
    finally { setGenerating(false); }
  };

  const insertPlaceholder = (ph) => {
    const placeholder = `{{${ph}}}`;
    const field = isDoc(form) ? 'htmlContent' : 'messageContent';
    setForm(f => ({ ...f, [field]: (f[field] || '') + placeholder }));
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const typeInfo = t => TEMPLATE_TYPES.find(x => x.key === t) || { icon: '📄', color: '#6b7280', label: t };

  return (
    <div>
      {ToastEl}

      {/* Header */}
      <div className="flex-between mb-20">
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Templates & Documents</div>
          <div className="text-muted text-sm">{counts.TOTAL || 0} templates across {TEMPLATE_TYPES.length} types</div>
        </div>
        <div className="flex-gap">
          <select className="form-select" style={{ width: 200 }} onChange={e => openCreate(e.target.value)} value="">
            <option value="">+ Create New Template</option>
            {TEMPLATE_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Type cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 24 }}>
        <div
          onClick={() => setTypeFilter('ALL')}
          style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${typeFilter === 'ALL' ? '#009B00' : '#e9ecef'}`, background: typeFilter === 'ALL' ? '#009B00' : '#fff', color: typeFilter === 'ALL' ? '#fff' : '#212529', transition: 'all 0.2s' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>All Types</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{counts.TOTAL || 0}</div>
        </div>
        {TEMPLATE_TYPES.map(t => (
          <div key={t.key}
            onClick={() => setTypeFilter(t.key)}
            style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${typeFilter === t.key ? t.color : '#e9ecef'}`, background: typeFilter === t.key ? t.color : '#fff', color: typeFilter === t.key ? '#fff' : '#212529', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{t.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{counts[t.key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Template list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6' }}>Loading templates…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {filtered.map(t => {
            const ti = typeInfo(t.templateType);
            return (
              <div key={t.id} className="section-card hover-card" style={{ overflow: 'visible' }}>
                <div style={{ padding: '16px 18px' }}>
                  {/* Header */}
                  <div className="flex-between mb-12">
                    <div className="flex-gap">
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: ti.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{ti.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#6c757d' }}>{ti.label}</div>
                      </div>
                    </div>
                    <div className="flex-gap" style={{ gap: 4 }}>
                      {t.isDefault && <span style={{ fontSize: 10, background: '#e0f9e0', color: '#009B00', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>DEFAULT</span>}
                      <span style={{ fontSize: 10, background: t.active ? '#d1fae5' : '#fee2e2', color: t.active ? '#065f46' : '#7f1d1d', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{t.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>

                  {/* Preview snippet */}
                  <div style={{ fontSize: 12, color: '#6c757d', lineHeight: 1.6, minHeight: 48, background: '#f8f9fa', borderRadius: 8, padding: '8px 10px', marginBottom: 12, fontFamily: 'monospace', fontSize: 11 }}>
                    {(t.messageContent || t.htmlContent || '').replace(/<[^>]+>/g, '').slice(0, 120)}{(t.messageContent || t.htmlContent || '').length > 120 ? '…' : ''}
                  </div>

                  {/* Placeholders */}
                  {t.placeholders && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {t.placeholders.split(',').slice(0, 5).map(ph => (
                        <span key={ph} style={{ fontSize: 10, background: '#e0f9e0', color: '#009B00', padding: '2px 6px', borderRadius: 6, fontFamily: 'monospace' }}>{`{{${ph}}}`}</span>
                      ))}
                      {t.placeholders.split(',').length > 5 && (
                        <span style={{ fontSize: 10, color: '#6c757d' }}>+{t.placeholders.split(',').length - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-xs" onClick={() => openEdit(t)}><Pencil size={13} style={{verticalAlign:'middle'}} /> Edit</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => handlePreview(t)}>👁 Preview</button>
                    {isDoc(t) && (
                      <>
                        <button className="btn btn-xs" style={{ background: '#e0f9e0', color: '#009B00' }} onClick={() => handleGeneratePdf(t)} disabled={generating}>
                          {generating ? '…' : '📄 PDF'}
                        </button>
                        <button className="btn btn-xs" style={{ background: '#dbeafe', color: '#1e40af' }} onClick={() => handleGenerateDocx(t)} disabled={generating}>
                          {generating ? '…' : '📝 DOCX'}
                        </button>
                      </>
                    )}
                    {!t.isDefault && (
                      <button className="btn btn-xs btn-ghost" onClick={async () => { await templateAPI.setDefault(t.id); load(); show('Set as default'); }}>
                        ⭐
                      </button>
                    )}
                    <button className="btn btn-xs btn-ghost" style={{ color: '#A32D2D' }} onClick={() => setDeleteId(t.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                  </div>

                  <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 10 }}>
                    v{t.version || 1} · {formatDateTime(t.updatedAt)}
                    {t.createdBy && ` · by ${t.createdBy}`}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', color: '#9aa0a6' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <p>No templates found for {typeFilter === 'ALL' ? 'any type' : typeFilter}</p>
              <button className="btn btn-primary mt-12" onClick={() => openCreate(typeFilter !== 'ALL' ? typeFilter : 'SMS')}>Create First Template</button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '95vw', padding: 0, borderRadius: 20 }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{editItem ? 'Edit Template' : 'Create Template'}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>{typeInfo(form.templateType).icon} {typeInfo(form.templateType).label}</div>
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e9ecef', padding: '0 24px', background: '#f8f9fa' }}>
              {[['content','Content'],['placeholders','Placeholders'],isDoc(form)&&['page','Page Setup'],isDoc(form)&&['watermark','Watermark']].filter(Boolean).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: activeTab === tab ? '#009B00' : '#6c757d',
                  borderBottom: activeTab === tab ? '2px solid #009B00' : '2px solid transparent'
                }}>{label}</button>
              ))}
            </div>

            <div style={{ display: 'flex', height: '60vh', overflow: 'hidden' }}>
              {/* Main Editor */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {activeTab === 'content' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="grid-2" style={{ gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Template Name *</label>
                        <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Service Reminder SMS" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Template Type</label>
                        <select className="form-select" value={form.templateType} onChange={e => f('templateType', e.target.value)}>
                          {TEMPLATE_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {form.templateType === 'EMAIL' && (
                      <div className="form-group">
                        <label className="form-label">Email Subject</label>
                        <input className="form-input" value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="e.g. Your RO Service is Due — Aqua Green Agencies" />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input className="form-input" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Brief description of this template" />
                    </div>

                    {/* Content editor */}
                    {isDoc(form) ? (
                      <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label className="form-label">Document Content (HTML)</label>
                          <span style={{ fontSize: 11, color: '#6c757d' }}>Supports HTML formatting & placeholders</span>
                        </div>
                        {/* Rich formatting toolbar */}
                        <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#f8f9fa', border: '1.5px solid #e9ecef', borderRadius: '10px 10px 0 0', flexWrap: 'wrap' }}>
                          {[['Bold','B','font-weight:bold'],['Italic','I','font-style:italic'],['Underline','U','text-decoration:underline']].map(([label, char, style]) => (
                            <button key={label} type="button" style={{ padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#fff', fontStyle: char === 'I' ? 'italic' : 'normal', fontWeight: char === 'B' ? 'bold' : 'normal', textDecoration: char === 'U' ? 'underline' : 'none' }}
                              onMouseDown={e => { e.preventDefault(); document.execCommand(label.toLowerCase()); }}>
                              {char}
                            </button>
                          ))}
                          <span style={{ width: 1, background: '#dee2e6', margin: '2px 4px' }} />
                          {['Left','Center','Right'].map(align => (
                            <button key={align} type="button" style={{ padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 11, background: '#fff' }}
                              onMouseDown={e => { e.preventDefault(); document.execCommand('justify' + align); }}>
                              {align[0]}
                            </button>
                          ))}
                          <span style={{ width: 1, background: '#dee2e6', margin: '2px 4px' }} />
                          <select style={{ fontSize: 11, border: '1px solid #dee2e6', borderRadius: 4, padding: '2px 4px' }}
                            onChange={e => document.execCommand('fontSize', false, e.target.value)}>
                            <option value="3">Font Size</option>
                            {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Size {s}</option>)}
                          </select>
                          <input type="color" title="Text Color" style={{ width: 28, height: 24, border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', padding: 2 }}
                            onChange={e => document.execCommand('foreColor', false, e.target.value)} />
                        </div>
                        <div
                          ref={contentRef}
                          contentEditable
                          suppressContentEditableWarning
                          style={{ minHeight: 280, padding: 14, border: '1.5px solid #e9ecef', borderTop: 'none', borderRadius: '0 0 10px 10px', fontFamily: 'Calibri, sans-serif', fontSize: 14, lineHeight: 1.6, outline: 'none' }}
                          dangerouslySetInnerHTML={{ __html: form.htmlContent }}
                          onInput={e => f('htmlContent', e.currentTarget.innerHTML)}
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label className="form-label">Message Content</label>
                          <span style={{ fontSize: 11, color: '#6c757d' }}>{form.messageContent?.length || 0} chars</span>
                        </div>
                        <textarea
                          className="form-textarea"
                          style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
                          value={form.messageContent}
                          onChange={e => f('messageContent', e.target.value)}
                          placeholder="Dear {{customerName}}, your RO service is due…"
                        />
                        {form.templateType === 'SMS' && (
                          <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                            SMS parts: {Math.ceil((form.messageContent?.length || 0) / 160)}
                            {form.messageContent?.length > 160 && ' ⚠️ Multi-part SMS'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'placeholders' && (
                  <div>
                    <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 16 }}>
                      Click any placeholder to insert it into the template content:
                    </p>
                    {ALL_PLACEHOLDERS.map(group => (
                      <div key={group.group} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#495057', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group.group}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {group.items.map(ph => (
                            <button key={ph} type="button"
                              onClick={() => insertPlaceholder(ph)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1.5px solid #009B00', background: '#e0f9e0', color: '#009B00', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.target.style.background = '#009B00'; e.target.style.color = '#fff'; }}
                              onMouseLeave={e => { e.target.style.background = '#e0f9e0'; e.target.style.color = '#009B00'; }}>
                              {`{{${ph}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'page' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="grid-2" style={{ gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Paper Size</label>
                        <select className="form-select" value={JSON.parse(form.pageConfig || '{}').size || 'A4'}
                          onChange={e => f('pageConfig', JSON.stringify({ ...JSON.parse(form.pageConfig || '{}'), size: e.target.value }))}>
                          {['A4','A3','LETTER','LEGAL'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Orientation</label>
                        <select className="form-select" value={JSON.parse(form.pageConfig || '{}').orientation || 'PORTRAIT'}
                          onChange={e => f('pageConfig', JSON.stringify({ ...JSON.parse(form.pageConfig || '{}'), orientation: e.target.value }))}>
                          <option value="PORTRAIT">Portrait</option>
                          <option value="LANDSCAPE">Landscape</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Header</label>
                      <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: 12 }}
                        value={form.headerConfig} onChange={e => f('headerConfig', e.target.value)} placeholder='{"showLogo":true,"companyName":true}' />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Footer</label>
                      <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: 12 }}
                        value={form.footerConfig} onChange={e => f('footerConfig', e.target.value)} placeholder='{"left":"GST Number","center":"Terms","right":"Page {{pageNumber}}"}' />
                    </div>
                  </div>
                )}

                {activeTab === 'watermark' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: 14, background: '#f8f9fa', borderRadius: 10, fontSize: 13, color: '#6c757d' }}>
                      Configure watermark settings (JSON format). Common watermarks: DRAFT, CONFIDENTIAL, PAID, QUOTATION.
                    </div>
                    <div className="grid-2" style={{ gap: 12 }}>
                      {[['Text','text','QUOTATION'],['Opacity (0-1)','opacity','0.08'],['Rotation (deg)','rotation','45'],['Color','color','#009B00']].map(([label, key, placeholder]) => (
                        <div key={key} className="form-group">
                          <label className="form-label">Watermark {label}</label>
                          <input className="form-input"
                            value={JSON.parse(form.watermarkConfig || '{}')[key] || ''}
                            placeholder={placeholder}
                            onChange={e => {
                              const wc = { ...JSON.parse(form.watermarkConfig || '{}'), [key]: e.target.value };
                              f('watermarkConfig', JSON.stringify(wc));
                            }} />
                        </div>
                      ))}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Position</label>
                      <select className="form-select"
                        value={JSON.parse(form.watermarkConfig || '{}').position || 'center'}
                        onChange={e => {
                          const wc = { ...JSON.parse(form.watermarkConfig || '{}'), position: e.target.value };
                          f('watermarkConfig', JSON.stringify(wc));
                        }}>
                        {['center','top-left','top-right','bottom-left','bottom-right','diagonal'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quick Presets</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { label: 'DRAFT', config: '{"text":"DRAFT","opacity":0.08,"rotation":45,"color":"#6c757d"}' },
                          { label: 'CONFIDENTIAL', config: '{"text":"CONFIDENTIAL","opacity":0.06,"rotation":45,"color":"#dc2626"}' },
                          { label: 'PAID', config: '{"text":"PAID","opacity":0.07,"rotation":30,"color":"#009900"}' },
                          { label: 'QUOTATION', config: '{"text":"QUOTATION","opacity":0.07,"rotation":45,"color":"#009B00"}' },
                          { label: 'None', config: '{}' },
                        ].map(preset => (
                          <button key={preset.label} type="button" className="btn btn-xs btn-ghost"
                            onClick={() => f('watermarkConfig', preset.config)}>
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: '0 0 20px 20px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : (editItem ? '💾 Update Template' : '✅ Create Template')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Preview — {previewOpen.name}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>Rendered with sample data</div>
              </div>
              <button className="modal-close" onClick={() => setPreviewOpen(null)}>×</button>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 20, border: '1px solid #e9ecef', maxHeight: '60vh', overflowY: 'auto' }}>
              {isDoc(previewOpen) ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ fontFamily: 'Calibri, sans-serif', lineHeight: 1.6 }} />
              ) : (
                <div style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{previewHtml}</div>
              )}
            </div>
            <div className="modal-footer">
              {isDoc(previewOpen) && <>
                <button className="btn btn-xs" style={{ background: '#e0f9e0', color: '#009B00' }} onClick={() => handleGeneratePdf(previewOpen)}>📄 Download PDF</button>
                <button className="btn btn-xs" style={{ background: '#dbeafe', color: '#1e40af' }} onClick={() => handleGenerateDocx(previewOpen)}>📝 Download DOCX</button>
              </>}
              <button className="btn btn-primary" onClick={() => setPreviewOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="Delete Template" message="Delete this template permanently?" danger
        onConfirm={async () => { await templateAPI.delete(deleteId); setDeleteId(null); load(); show('Deleted'); }}
        onCancel={() => setDeleteId(null)} />
    </div>
  );
}

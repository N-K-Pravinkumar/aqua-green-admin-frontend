import { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Wrench, X } from 'lucide-react';
import { maintenanceAPI, templateAPI, customerAPI } from '../../services/api';
import { formatDate } from './AdminHelpers';

const DAY_OPTIONS = [30, 60, 90, 180, 365];

function fillTemplate(text, row, searchedFor) {
  if (!text) return '';
  return text
    .replace(/\{?\{customerName\}?\}/gi, row.customerName || '')
    .replace(/\{?\{name\}?\}/gi, row.customerName || '')
    .replace(/\{?\{mobile\}?\}/gi, row.customerMobile || '')
    .replace(/\{?\{partName\}?\}/gi, searchedFor?.partName || '')
    .replace(/\{?\{productName\}?\}/gi, row.productName || searchedFor?.partName || '')
    .replace(/\{?\{days\}?\}/gi, String(searchedFor?.days ?? ''))
    .replace(/\{?\{lastReplacedDate\}?\}/gi, row.lastReplacedDate ? formatDate(row.lastReplacedDate) : '');
}
const FALLBACK_MESSAGE = (row, searchedFor) =>
  `Dear ${row.customerName || ''}, it's been over ${searchedFor?.days} days since your ${searchedFor?.partName} was last replaced` +
  (row.lastReplacedDate ? ` (on ${formatDate(row.lastReplacedDate)})` : '') +
  `. We recommend scheduling a replacement soon. Call 09952828740 or reply here to book a visit. - Aqua Green Agencies, Coimbatore`;

/**
 * Same "who's overdue for this part?" feature as the old standalone
 * Maintenance page, but embedded directly in Customers — toggled open with
 * a button rather than living in the sidebar.
 */
export default function MaintenancePanel({ onClose }) {
  const [partName, setPartName] = useState('');
  const [days, setDays] = useState(90);
  const [customDays, setCustomDays] = useState('');
  const [knownParts, setKnownParts] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [pickerRow, setPickerRow] = useState(null);

  useEffect(() => {
    maintenanceAPI.getParts().then(r => setKnownParts(r.data.data || [])).catch(() => {});
    templateAPI.getAll().then(r => setTemplates((r.data.data || []).filter(t => t.active !== false))).catch(() => {});
  }, []);

  const daysToUse = customDays ? Number(customDays) || 90 : days;

  const handleSearch = async () => {
    if (!partName.trim()) return;
    setLoading(true);
    try {
      const r = await maintenanceAPI.getOverdue(partName.trim(), daysToUse);
      setResults(r.data.data || []);
      setSearchedFor({ partName: partName.trim(), days: daysToUse });
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const sendWithTemplate = async (row, template) => {
    const digits = (row.customerMobile || '').replace(/\D/g, '');
    const mobile = digits.length === 10 ? `91${digits}` : digits;
    const msg = template ? fillTemplate(template.messageContent, row, searchedFor) : FALLBACK_MESSAGE(row, searchedFor);
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
    setPickerRow(null);
    if (row.customerId) {
      try { await customerAPI.logMessage(row.customerId, 'WHATSAPP', `Maintenance reminder — ${searchedFor?.partName} (${template ? template.name : 'default message'})`); } catch {}
    }
  };
  const openPicker = (row) => templates.length === 0 ? sendWithTemplate(row, null) : setPickerRow(row);

  return (
    <div className="section-card" style={{ padding: 18, marginBottom: 16, border: '1px solid #d1e7dd' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wrench size={16} color="#009B00" /> Maintenance — Who's Overdue?
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6' }}><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Product / Part Name</label>
          <input
            className="form-input"
            list="maint-panel-parts"
            value={partName}
            onChange={e => setPartName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Carbon Filter, Membrane…"
          />
          <datalist id="maint-panel-parts">{knownParts.map(p => <option key={p} value={p} />)}</datalist>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DAY_OPTIONS.map(d => (
            <button key={d} type="button" onClick={() => { setDays(d); setCustomDays(''); }} className={`filter-btn${!customDays && days === d ? ' active' : ''}`} style={{ fontSize: 11 }}>
              {d}d
            </button>
          ))}
          <input className="form-input" type="number" min={1} style={{ width: 80 }} value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="Custom" />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading} style={{ height: 38 }}>
          {loading ? 'Searching…' : <><Search size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Find</>}
        </button>
      </div>

      {results !== null && (
        <div style={{ marginTop: 14 }}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#9aa0a6', fontSize: 13 }}>
              No one's overdue for "{searchedFor?.partName}" past {searchedFor?.days} days.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Mobile</th><th>Product</th><th>Last Replaced</th><th>Days</th><th></th></tr></thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.customerName || '—'}</td>
                      <td><a href={`tel:${row.customerMobile}`} style={{ color: '#009B00', fontWeight: 600 }}>{row.customerMobile}</a></td>
                      <td style={{ fontSize: 12 }}>{row.productName || '—'}</td>
                      <td style={{ fontSize: 12 }}>{formatDate(row.lastReplacedDate)}</td>
                      <td><span className="badge badge-followup" style={{ fontWeight: 700 }}>{row.daysSinceReplaced}d</span></td>
                      <td>
                        <div className="flex-gap" style={{ gap: 4 }}>
                          <a href={`tel:${row.customerMobile}`} className="btn btn-xs btn-ghost"><Phone size={13} /></a>
                          <button className="btn btn-xs btn-ghost" onClick={() => openPicker(row)}><MessageCircle size={13} style={{ color: '#25D366' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pickerRow && (
        <div className="modal-overlay" onClick={() => setPickerRow(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Send reminder to {pickerRow.customerName}</div>
              <button className="modal-close" onClick={() => setPickerRow(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {templates.map(t => (
                <button key={t.id} className="btn btn-ghost" style={{ textAlign: 'left', padding: 10, border: '1px solid #e5e7eb' }} onClick={() => sendWithTemplate(pickerRow, t)}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                </button>
              ))}
              <button className="btn btn-ghost" style={{ textAlign: 'left', padding: 10, border: '1px dashed #e5e7eb' }} onClick={() => sendWithTemplate(pickerRow, null)}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Use default message</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

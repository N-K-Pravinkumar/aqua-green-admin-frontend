import { useState, useEffect } from 'react';
import { Search, Phone, MessageCircle, Wrench, AlertTriangle, X } from 'lucide-react';
import { maintenanceAPI, templateAPI, customerAPI } from '../../services/api';
import { formatDate, useToast } from '../../components/admin/AdminHelpers';

const DAY_OPTIONS = [30, 60, 90, 180, 365];

// Fills {placeholders} in a template's message with this row's actual data.
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
  `. We recommend scheduling a replacement soon to keep your RO purifier performing at its best. Call 09952828740 or reply here to book a visit. - Aqua Green Agencies, Coimbatore`;

export default function AdminMaintenance() {
  const [partName, setPartName] = useState('');
  const [days, setDays] = useState(90);
  const [customDays, setCustomDays] = useState('');
  const [knownParts, setKnownParts] = useState([]);
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState(null); // { partName, days } used for the last search
  const [templates, setTemplates] = useState([]);
  const [pickerRow, setPickerRow] = useState(null); // row currently choosing a template for
  const { show, ToastEl } = useToast();

  useEffect(() => {
    document.getElementById('admin-page-title') && (document.getElementById('admin-page-title').textContent = 'Maintenance Reminders');
  }, []);

  useEffect(() => {
    maintenanceAPI.getParts().then(r => setKnownParts(r.data.data || [])).catch(() => {});
    templateAPI.getAll().then(r => setTemplates((r.data.data || []).filter(t => t.active !== false))).catch(() => {});
  }, []);

  const daysToUse = customDays ? Number(customDays) || 90 : days;

  const handleSearch = async () => {
    if (!partName.trim()) { show('Enter a product/part name to search for', 'error'); return; }
    setLoading(true);
    try {
      const r = await maintenanceAPI.getOverdue(partName.trim(), daysToUse);
      setResults(r.data.data || []);
      setSearchedFor({ partName: partName.trim(), days: daysToUse });
    } catch {
      show('Search failed', 'error');
      setResults([]);
    }
    setLoading(false);
  };

  const pickDays = (d) => { setDays(d); setCustomDays(''); };

  const sendWithTemplate = async (row, template) => {
    const digits = (row.customerMobile || '').replace(/\D/g, '');
    const mobile = digits.length === 10 ? `91${digits}` : digits;
    const msg = template ? fillTemplate(template.messageContent, row, searchedFor) : FALLBACK_MESSAGE(row, searchedFor);
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
    setPickerRow(null);
    show('Opening WhatsApp…');

    // Log to the customer's history timeline (best-effort)
    if (row.customerId) {
      try {
        await customerAPI.logMessage(row.customerId, 'WHATSAPP', `Maintenance reminder — ${searchedFor?.partName} (${template ? template.name : 'default message'})`);
      } catch { /* logging is best-effort */ }
    }
  };

  const openPicker = (row) => {
    if (templates.length === 0) { sendWithTemplate(row, null); return; }
    setPickerRow(row);
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Maintenance Reminders</div>
          <div className="text-muted text-sm">Pick a part (e.g. Carbon Filter, Spun Filter) and how many days back — see who hasn't had it changed since.</div>
        </div>
      </div>

      {/* Filter card */}
      <div className="section-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Product / Part Name</label>
          <input
            className="form-input"
            list="known-parts"
            value={partName}
            onChange={e => setPartName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Carbon Filter, Spun Filter, RO Membrane… (pick from the list or type your own)"
          />
          <datalist id="known-parts">
            {knownParts.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Not changed in the last…</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {DAY_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => pickDays(d)}
                className={`filter-btn${!customDays && days === d ? ' active' : ''}`}
              >
                {d} Days
              </button>
            ))}
            <input
              className="form-input"
              type="number"
              min={1}
              style={{ width: 110 }}
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Custom days"
            />
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 16, padding: '10px 24px' }} onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching…' : <><Search size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Find Overdue Customers</>}
        </button>

        {knownParts.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#9aa0a6' }}>
            Available options ({knownParts.length}): {knownParts.slice(0, 8).join(', ')}{knownParts.length > 8 ? '…' : ''} — or just type any name.
          </div>
        )}
      </div>

      {/* Results */}
      {results === null ? (
        <div className="section-card" style={{ padding: 48, textAlign: 'center', color: '#9aa0a6' }}>
          <Wrench size={32} style={{ opacity: .3, marginBottom: 10 }} />
          <div>Enter a part name, pick a day range, then click Find Overdue Customers.</div>
        </div>
      ) : loading ? (
        <div className="section-card" style={{ padding: 40, textAlign: 'center', color: '#9aa0a6' }}>Searching…</div>
      ) : results.length === 0 ? (
        <div className="section-card" style={{ padding: 48, textAlign: 'center', color: '#9aa0a6' }}>
          No one's overdue — either everyone's within {searchedFor?.days} days, or "{searchedFor?.partName}" hasn't been logged as a replaced part yet.
        </div>
      ) : (
        <div className="section-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8, background: '#fff7ed' }}>
            <AlertTriangle size={16} color="#b45309" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>
              {results.length} customer{results.length !== 1 ? 's' : ''} overdue for "{searchedFor?.partName}" ({searchedFor?.days}+ days since last change)
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Mobile</th><th>Product</th><th>Last Replaced</th><th>Days Since</th><th>Actions</th></tr></thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => openPicker(row)} title="Click to send a WhatsApp reminder">
                    <td style={{ fontWeight: 600 }}>{row.customerName || '—'}</td>
                    <td><a href={`tel:${row.customerMobile}`} onClick={e=>e.stopPropagation()} style={{ color: '#009B00', fontWeight: 600 }}>{row.customerMobile}</a></td>
                    <td style={{ fontSize: 12 }}>{row.productName || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(row.lastReplacedDate)}</td>
                    <td>
                      <span className="badge badge-followup" style={{ fontWeight: 700 }}>
                        {row.daysSinceReplaced} days
                      </span>
                    </td>
                    <td>
                      <div className="flex-gap" style={{ gap: 4 }} onClick={e=>e.stopPropagation()}>
                        <a href={`tel:${row.customerMobile}`} className="btn btn-xs btn-ghost"><Phone size={13} style={{ verticalAlign: 'middle' }} /></a>
                        <button className="btn btn-xs btn-ghost" onClick={() => openPicker(row)} title="Send reminder via WhatsApp">
                          <MessageCircle size={13} style={{ verticalAlign: 'middle', color: '#25D366' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template picker modal */}
      {pickerRow && (
        <div className="modal-overlay" onClick={() => setPickerRow(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Send reminder to {pickerRow.customerName}</div>
              <button className="modal-close" onClick={() => setPickerRow(null)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Choose a WhatsApp template — it'll open pre-filled with this customer's number, ready to send.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  className="btn btn-ghost"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 10, border: '1px solid #e5e7eb' }}
                  onClick={() => sendWithTemplate(pickerRow, t)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2, whiteSpace: 'normal' }}>
                    {(t.messageContent || '').slice(0, 90)}{(t.messageContent || '').length > 90 ? '…' : ''}
                  </div>
                </button>
              ))}
              <button
                className="btn btn-ghost"
                style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 10, border: '1px dashed #e5e7eb' }}
                onClick={() => sendWithTemplate(pickerRow, null)}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>Use default message</div>
                <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2 }}>Standard maintenance reminder, no template</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

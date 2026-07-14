import API_ROOT from '../../config/apiRoot';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerAPI, serviceRequestAPI, saleAPI, quotationAPI, stockAPI, productAPI } from '../../services/api';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const rupee = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const EMPTY_ITEM = { description: '', qty: 1, unitPrice: '', gstPct: 18, total: 0 };

function calcItem(it) {
  const base = (parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 1);
  const gst  = base * (parseFloat(it.gstPct) || 0) / 100;
  return { ...it, total: +(base + gst).toFixed(2) };
}
function calcTotals(items) {
  const sub = items.reduce((s, i) => s + (parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1), 0);
  const gst = items.reduce((s, i) => {
    const b = (parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1);
    return s + b*(parseFloat(i.gstPct)||0)/100;
  }, 0);
  return { subtotal: +sub.toFixed(2), gstAmount: +gst.toFixed(2), totalAmount: +(sub+gst).toFixed(2) };
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#E24B4A' : '#0d8a00',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontSize: 13, fontWeight: 500, maxWidth: 380,
      boxShadow: '0 4px 20px rgba(0,0,0,.18)'
    }}>{msg}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — Mobile-first customer lookup
// ─────────────────────────────────────────────────────────────
function CustomerStep({ onDone }) {
  const [searchParams] = useSearchParams();
  const [mobile, setMobile]       = useState(searchParams.get('mobile') || '');
  const [status, setStatus]       = useState('idle');
  const [customer, setCustomer]   = useState(null);
  const [form, setForm]           = useState({
    name: searchParams.get('name') || '', email:'', address:'', city:''
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // Auto-trigger lookup if mobile came from URL params
  useEffect(() => {
    const m = searchParams.get('mobile');
    if (m && m.length >= 10) lookup(m);
  }, []);

  const lookup = async (overrideMobile) => {
    const m = (overrideMobile || mobile).trim().replace(/\D/g, '');
    if (m.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
    setError(''); setStatus('looking');
    try {
      const r = await customerAPI.lookupByMobile(m);
      if (r.data.data) {
        setCustomer(r.data.data);
        setStatus('found');
      } else {
        setStatus('new');
        setForm(f => ({ ...f, name: f.name || searchParams.get('name') || '' }));
      }
    } catch { setStatus('idle'); setError('Lookup failed. Try again.'); }
  };

  const saveNew = async () => {
    if (!form.name.trim()) { setError('Customer name is required'); return; }
    setSaving(true); setError('');
    try {
      const r = await customerAPI.create({
        name: form.name.trim(), mobile: mobile.trim().replace(/\D/g,''),
        email: form.email, address: form.address, city: form.city, active: true,
      });
      setCustomer(r.data.data);
      setStatus('found');
    } catch { setError('Could not save customer. Try again.'); }
    setSaving(false);
  };

  const reset = () => { setMobile(''); setStatus('idle'); setCustomer(null); setError(''); };

  return (
    <div className="section-card">
      <div className="section-card-head">
        <div className="section-card-title">Step 1 — Customer</div>
        {customer && <button className="btn btn-ghost btn-xs" onClick={reset}>Change</button>}
      </div>
      <div className="section-card-body">

        {/* ── Found customer ── */}
        {status === 'found' && customer && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'#e0f9e0', borderRadius:10, padding:'14px 18px', border:'1.5px solid #009B00' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#009B00', marginBottom:3 }}>
                ✓ {customer.name}
              </div>
              <div style={{ fontSize:12, color:'#5f6368' }}>
                {customer.mobile}
                {customer.address && ` · ${customer.address}`}
                {customer.city && `, ${customer.city}`}
              </div>
              {customer.gstNumber && (
                <div style={{ fontSize:11, color:'#9aa0a6', marginTop:2 }}>GST: {customer.gstNumber}</div>
              )}
            </div>
            <button className="btn btn-primary btn-xs"
              onClick={() => onDone(customer)} style={{ minWidth:120 }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Mobile input ── */}
        {status !== 'found' && (
          <div>
            <label className="form-label">Enter customer mobile number</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" style={{ maxWidth:220, letterSpacing:2, fontSize:15 }}
                type="tel" maxLength={10} placeholder="10-digit mobile"
                value={mobile} onChange={e => { setMobile(e.target.value); setError(''); setStatus('idle'); }}
                onKeyDown={e => e.key==='Enter' && lookup()}
              />
              <button className="btn btn-primary" onClick={() => lookup()}
                disabled={status==='looking' || mobile.length < 10}>
                {status==='looking' ? 'Checking…' : 'Look up'}
              </button>
            </div>
            {error && <div style={{ color:'#E24B4A', fontSize:12, marginTop:6 }}>{error}</div>}

            {/* ── Not found → add new customer inline ── */}
            {status === 'new' && (
              <div style={{ marginTop:16, background:'#fff8e7', border:'1px solid #EF9F27',
                borderRadius:10, padding:16 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'#854F0B', marginBottom:12 }}>
                  ⚠ No customer found for {mobile} — add their details below
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['name','Full name *','text'],
                    ['email','Email','email'],
                    ['address','Address','text'],
                    ['city','City','text'],
                  ].map(([k,l,t]) => (
                    <div key={k} className="form-group">
                      <label className="form-label">{l}</label>
                      <input className="form-input" type={t}
                        value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} />
                    </div>
                  ))}
                </div>
                {error && <div style={{ color:'#E24B4A', fontSize:12, margin:'6px 0' }}>{error}</div>}
                <button className="btn btn-primary" style={{ marginTop:10 }}
                  onClick={saveNew} disabled={saving || !form.name.trim()}>
                  {saving ? 'Saving…' : 'Save new customer & continue'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — Bill type selector
// ─────────────────────────────────────────────────────────────
const BILL_TYPES = [
  { key:'service',   icon:'🔧', label:'Service Bill',    desc:'Charge for technician visit, repairs, filter change etc.' },
  { key:'sales',     icon:'🛒', label:'Sales Invoice',   desc:'Selling a product — RO purifier, spare part, filter etc.' },
  { key:'quotation', icon:'📋', label:'Quotation',       desc:'Price estimate for a customer before the work begins.' },
];

function BillTypeStep({ selected, onSelect }) {
  return (
    <div className="section-card">
      <div className="section-card-head">
        <div className="section-card-title">Step 2 — What are you billing for?</div>
      </div>
      <div className="section-card-body">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {BILL_TYPES.map(t => (
            <div key={t.key} onClick={() => onSelect(t.key)}
              style={{
                border: selected===t.key ? '2.5px solid #009B00' : '1.5px solid #e9ecef',
                borderRadius:12, padding:'16px 14px', cursor:'pointer',
                background: selected===t.key ? '#e0f9e0' : '#fff',
                transition:'all .15s',
              }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{t.icon}</div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{t.label}</div>
              <div style={{ fontSize:12, color:'#5f6368', lineHeight:1.5 }}>{t.desc}</div>
              {selected===t.key && (
                <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#009B00' }}>✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 3 — Line items table
// ─────────────────────────────────────────────────────────────
function ItemsTable({ items, onChange, billType, stockItems, products }) {
  const update = (i, field, val) =>
    onChange(items.map((it, idx) => idx===i ? calcItem({...it,[field]:val}) : it));
  const add    = () => onChange([...items, calcItem({...EMPTY_ITEM})]);
  const remove = i => items.length > 1 && onChange(items.filter((_,idx) => idx!==i));
  const totals = calcTotals(items);

  // Prefill from stock/product dropdown
  const fillFromStock = (i, id) => {
    const s = stockItems.find(s => String(s.id)===String(id));
    if (s) update(i, 'description', `${s.name}${s.brand?` (${s.brand})`:''}`);
  };
  const fillFromProduct = (i, id) => {
    const p = products.find(p => String(p.id)===String(id));
    if (p) {
      const updated = calcItem({ ...items[i], description: p.name + (p.model?` — ${p.model}`:''), unitPrice: p.price||'' });
      onChange(items.map((it,idx) => idx===i ? updated : it));
    }
  };

  return (
    <div className="section-card">
      <div className="section-card-head">
        <div className="section-card-title">Step 3 — Add charges / items</div>
        <button className="btn btn-ghost btn-xs" onClick={add}>+ Add row</button>
      </div>
      <div className="section-card-body">

        {/* Quick-add from stock/products */}
        {billType === 'service' && stockItems.length > 0 && (
          <div style={{ marginBottom:12, fontSize:12, color:'#5f6368' }}>
            <strong>Quick-add spare part:</strong>{' '}
            <select style={{ fontSize:12, padding:'3px 8px', borderRadius:6, border:'1px solid #e9ecef' }}
              onChange={e => { if(e.target.value) fillFromStock(items.length-1, e.target.value); e.target.value=''; }}>
              <option value="">— pick from stock —</option>
              {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} (stock: {s.currentStock})</option>)}
            </select>
          </div>
        )}
        {billType === 'sales' && products.length > 0 && (
          <div style={{ marginBottom:12, fontSize:12, color:'#5f6368' }}>
            <strong>Quick-add product:</strong>{' '}
            <select style={{ fontSize:12, padding:'3px 8px', borderRadius:6, border:'1px solid #e9ecef' }}
              onChange={e => { if(e.target.value) fillFromProduct(items.length-1, e.target.value); e.target.value=''; }}>
              <option value="">— pick from catalogue —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.price?` — ₹${p.price}`:''}</option>)}
            </select>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#009B00', color:'#fff' }}>
                {['Description','Qty','Unit Price (₹)','GST %','Amount',''].map(h => (
                  <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12, fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f3f4' }}>
                  <td style={{ padding:'6px 4px' }}>
                    <input className="form-input" style={{ minWidth:200 }} value={it.description}
                      placeholder={billType==='service'?'e.g. Service charge, Filter replacement…':'e.g. Kent Grand Plus…'}
                      onChange={e => update(i,'description',e.target.value)} />
                  </td>
                  <td style={{ padding:'6px 4px' }}>
                    <input className="form-input" style={{ width:60 }} type="number" min={1} value={it.qty}
                      onChange={e => update(i,'qty',e.target.value)} />
                  </td>
                  <td style={{ padding:'6px 4px' }}>
                    <input className="form-input" style={{ width:110 }} type="number" step="0.01"
                      value={it.unitPrice} placeholder="0.00"
                      onChange={e => update(i,'unitPrice',e.target.value)} />
                  </td>
                  <td style={{ padding:'6px 4px' }}>
                    <select className="form-select" style={{ width:72 }} value={it.gstPct}
                      onChange={e => update(i,'gstPct',e.target.value)}>
                      {[0,5,12,18,28].map(r => <option key={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td style={{ padding:'6px 10px', fontWeight:600, color:'#009B00', whiteSpace:'nowrap' }}>
                    {rupee(it.total)}
                  </td>
                  <td style={{ padding:'6px 4px' }}>
                    <button onClick={() => remove(i)} disabled={items.length===1}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#E24B4A', fontSize:18, opacity:items.length===1?.3:1 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals summary */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
          <div style={{ minWidth:260 }}>
            {[['Subtotal (ex-GST)', totals.subtotal], ['GST', totals.gstAmount]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between',
                padding:'5px 0', borderBottom:'1px solid #e9ecef', fontSize:13, color:'#5f6368' }}>
                <span>{l}</span><span>{rupee(v)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px',
              background:'#009B00', color:'#fff', borderRadius:8, marginTop:8,
              fontWeight:700, fontSize:16 }}>
              <span>TOTAL</span><span>{rupee(totals.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 4 — Payment / extra details
// ─────────────────────────────────────────────────────────────
function PaymentStep({ billType, form, onChange }) {
  const f = (k, v) => onChange({ ...form, [k]: v });
  return (
    <div className="section-card">
      <div className="section-card-head">
        <div className="section-card-title">Step 4 — {billType==='quotation' ? 'Quotation details' : 'Payment details'}</div>
      </div>
      <div className="section-card-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {billType !== 'quotation' && (
            <>
              <div className="form-group">
                <label className="form-label">Payment method</label>
                <select className="form-select" value={form.paymentMethod} onChange={e => f('paymentMethod',e.target.value)}>
                  {['CASH','UPI','CARD','BANK_TRANSFER','CHEQUE'].map(m =>
                    <option key={m}>{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment status</label>
                <select className="form-select" value={form.paymentStatus} onChange={e => f('paymentStatus',e.target.value)}>
                  {['PAID','PENDING','PARTIAL'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}
          {billType === 'service' && (
            <div className="form-group">
              <label className="form-label">Technician name</label>
              <input className="form-input" value={form.technician} onChange={e => f('technician',e.target.value)}
                placeholder="Who did the service?" />
            </div>
          )}
          {billType === 'sales' && (
            <div className="form-group">
              <label className="form-label">Sales person</label>
              <input className="form-input" value={form.salesPerson} onChange={e => f('salesPerson',e.target.value)}
                placeholder="Staff name" />
            </div>
          )}
          {billType === 'quotation' && (
            <div className="form-group">
              <label className="form-label">Valid for (days)</label>
              <select className="form-select" value={form.validityDays} onChange={e => f('validityDays',Number(e.target.value))}>
                {[7,15,30,45,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Notes / remarks (optional)</label>
            <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => f('notes',e.target.value)}
              placeholder="Any special notes, warranty terms, next service date…" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP 5 — Review + Save + Download PDF
// ─────────────────────────────────────────────────────────────
function ReviewStep({ customer, billType, items, payForm, onSave, saved, onDownload, onReset, saving, downloading }) {
  const totals = calcTotals(items);
  const typeLabel = { service:'Service Bill', sales:'Sales Invoice', quotation:'Quotation' }[billType];

  return (
    <div className="section-card" style={{ border:'2px solid #009B00' }}>
      <div className="section-card-head" style={{ background:'#009B00', borderRadius:'10px 10px 0 0', margin:'-1px' }}>
        <div className="section-card-title" style={{ color:'#fff' }}>Step 5 — Review & generate PDF</div>
      </div>
      <div className="section-card-body">
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
          <div style={{ background:'#f8f9fa', borderRadius:8, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'#9aa0a6', marginBottom:3 }}>CUSTOMER</div>
            <div style={{ fontWeight:700 }}>{customer?.name}</div>
            <div style={{ fontSize:12, color:'#5f6368' }}>{customer?.mobile}</div>
          </div>
          <div style={{ background:'#f8f9fa', borderRadius:8, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'#9aa0a6', marginBottom:3 }}>DOCUMENT TYPE</div>
            <div style={{ fontWeight:700 }}>{typeLabel}</div>
            <div style={{ fontSize:12, color:'#5f6368' }}>{items.length} item(s)</div>
          </div>
          <div style={{ background:'#009B00', borderRadius:8, padding:'12px 14px', color:'#fff' }}>
            <div style={{ fontSize:11, opacity:.7, marginBottom:3 }}>TOTAL AMOUNT</div>
            <div style={{ fontWeight:700, fontSize:20 }}>{rupee(totals.totalAmount)}</div>
            <div style={{ fontSize:11, opacity:.7 }}>incl. GST {rupee(totals.gstAmount)}</div>
          </div>
        </div>

        {/* Actions */}
        {!saved ? (
          <div>
            <div style={{ fontSize:12, color:'#5f6368', marginBottom:10 }}>
              Clicking Save will store the record in the database and generate a document number.
              The PDF is created only when you click Download.
            </div>
            <button className="btn btn-primary" style={{ width:'100%', fontSize:15, padding:'13px' }}
              onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : `💾 Save ${typeLabel}`}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background:'#e0f9e0', border:'1.5px solid #009B00', borderRadius:10,
              padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24 }}>✅</span>
              <div>
                <div style={{ fontWeight:700, color:'#009B00' }}>Saved as {saved.num}</div>
                <div style={{ fontSize:12, color:'#5f6368', marginTop:2 }}>
                  Record stored in database. Now download the PDF to print or share with the customer.
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-primary" style={{ flex:2, fontSize:14, padding:'12px' }}
                onClick={onDownload} disabled={downloading}>
                {downloading ? 'Generating PDF…' : '📥 Download PDF'}
              </button>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={onReset}>
                New bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AdminBilling() {
  const [searchParams] = useSearchParams();
  const [customer, setCustomer]   = useState(null);
  const [billType, setBillType]   = useState('service');
  const [items, setItems]         = useState([calcItem({ ...EMPTY_ITEM })]);
  const [payForm, setPayForm]     = useState({
    paymentMethod: 'CASH', paymentStatus: 'PAID',
    technician: '', salesPerson: '', validityDays: 30, notes: '',
  });
  const [saving, setSaving]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved]         = useState(null); // { type, id, num }
  const [toast, setToast]         = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [products, setProducts]   = useState([]);

  const notify = (msg, type='ok') => setToast({ msg, type });

  useEffect(() => {
    document.getElementById('admin-page-title')
      && (document.getElementById('admin-page-title').textContent = 'Billing & Invoicing');
    stockAPI.getAll().then(r => setStockItems(r.data.data||[])).catch(()=>{});
    productAPI.getAll().then(r => setProducts(r.data.data||[])).catch(()=>{});

    // Auto-fill from enquiry redirect: /admin/billing?mobile=9876543210&name=Ravi
    const mobile = searchParams.get('mobile');
    if (mobile) {
      customerAPI.lookupByMobile(mobile).then(r => {
        if (r.data.data) {
          setCustomer(r.data.data);
        } else {
          // Pre-fill new customer form via CustomerStep's URL state
          // CustomerStep reads from URL params internally
        }
      }).catch(()=>{});
    }
  }, []);

  const reset = () => {
    setCustomer(null); setBillType('service');
    setItems([calcItem({...EMPTY_ITEM})]); setSaved(null);
    setPayForm({ paymentMethod:'CASH', paymentStatus:'PAID', technician:'', salesPerson:'', validityDays:30, notes:'' });
  };

  const totals = calcTotals(items);

  // ── Save to database ────────────────────────────────────────
  const handleSave = async () => {
    if (!customer) { notify('No customer selected', 'error'); return; }
    if (items.some(i => !i.description.trim() || !i.unitPrice)) {
      notify('All items need a description and price', 'error'); return;
    }
    setSaving(true);
    try {
      const itemsJson = JSON.stringify(items);

      if (billType === 'quotation') {
        const r = await quotationAPI.create({
          customer: { id: customer.id },
          customerName: customer.name,
          customerMobile: customer.mobile,
          customerAddress: customer.address,
          itemsJson,
          subtotal:     totals.subtotal,
          gstAmount:    totals.gstAmount,
          totalAmount:  totals.totalAmount,
          notes:        payForm.notes,
          validityDays: payForm.validityDays,
          status:       'DRAFT',
          quotationNumber: 'QT-' + uid(),
        });
        const q = r.data.data;
        setSaved({ type:'quotation', id:q.id, num:q.quotationNumber });
        notify(`Quotation ${q.quotationNumber} saved!`);

      } else if (billType === 'service') {
        // Create service request and immediately complete billing
        const srPayload = {
          customer: { id: customer.id },
          customerName:    customer.name,
          customerMobile:  customer.mobile,
          customerAddress: customer.address || '',
          issueDescription: items.map(i=>i.description).join(', '),
          assignedTechnician: payForm.technician || '',
          serviceCharge:   totals.subtotal,
          status:          'COMPLETED',
          paymentStatus:   payForm.paymentStatus,
          paymentMethod:   payForm.paymentMethod,
          notes:           payForm.notes,
          sparePartsJson:  itemsJson,
          sparePartsTotal: totals.subtotal,
          totalBillAmount: totals.totalAmount,
          invoiceNumber:   'SVC-' + uid(),
        };
        const r = await serviceRequestAPI.create(srPayload);
        const sr = r.data.data;
        setSaved({ type:'service', id:sr.id, num:sr.invoiceNumber || sr.ticketNumber });
        notify(`Service bill ${sr.invoiceNumber||sr.ticketNumber} saved!`);

      } else {
        // Sales invoice
        const firstItem = items[0];
        const r = await saleAPI.create({
          customer:       { id: customer.id },
          customerName:   customer.name,
          customerMobile: customer.mobile,
          customerAddress:customer.address || '',
          productName:    firstItem.description,
          quantity:       parseInt(firstItem.qty)||1,
          unitPrice:      parseFloat(firstItem.unitPrice)||0,
          discountAmount: 0,
          gstAmount:      totals.gstAmount,
          totalAmount:    totals.totalAmount,
          paymentMethod:  payForm.paymentMethod,
          paymentStatus:  payForm.paymentStatus,
          salesPerson:    payForm.salesPerson,
          notes:          payForm.notes,
          invoiceNumber:  'INV-' + uid(),
          itemsJson,
        });
        const sale = r.data.data;
        setSaved({ type:'sale', id:sale.id, num:sale.invoiceNumber });
        notify(`Invoice ${sale.invoiceNumber} saved!`);
      }
    } catch (e) {
      notify(e.response?.data?.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  // ── Download PDF ────────────────────────────────────────────
  const handleDownload = async () => {
    if (!saved) return;
    setDownloading(true);
    try {
      const urlMap = {
        quotation: `/api/quotations/${saved.id}/pdf`,
        service:   `/api/service-requests/${saved.id}/invoice/pdf`,
        sale:      `/api/sales/${saved.id}/invoice/pdf`,
      };
      const token = localStorage.getItem('aga_token');
      const res = await fetch(`${API_ROOT}${urlMap[saved.type]}`, {
      headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${saved.type==='quotation'?'Quotation':saved.type==='service'?'ServiceBill':'Invoice'}-${saved.num}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify('PDF downloaded!');
    } catch (e) {
      notify(e.message || 'Download failed', 'error');
    }
    setDownloading(false);
  };

  const canProceed = !!customer;

  return (
    <div style={{ maxWidth:920 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 4px' }}>Billing & Invoicing</h2>
        <p style={{ fontSize:13, color:'#5f6368', margin:0 }}>
          Enter mobile → auto-fill existing customer or add new → select bill type → add items → save & download PDF
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ display:'flex', gap:4, marginBottom:24, alignItems:'center' }}>
        {['Customer','Bill type','Items','Payment','PDF'].map((label,i) => {
          const done = (i===0 && customer) || (i===1 && billType) || (i===2 && items.some(x=>x.description)) || (i===3) || (i===4 && saved);
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', fontSize:11, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background: done?'#009B00':'#e9ecef', color: done?'#fff':'#9aa0a6' }}>
                {done ? '✓' : i+1}
              </div>
              <div style={{ fontSize:11, color: done?'#009B00':'#9aa0a6', fontWeight: done?600:400, whiteSpace:'nowrap' }}>{label}</div>
              {i < 4 && <div style={{ flex:1, height:2, background: done?'#009B00':'#e9ecef', borderRadius:2, marginLeft:4 }}/>}
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Step 1 */}
        <CustomerStep onDone={c => { setCustomer(c); setSaved(null); }} />

        {/* Steps 2-5 — only shown after customer selected */}
        {canProceed && (
          <>
            <BillTypeStep selected={billType} onSelect={t => { setBillType(t); setSaved(null); setItems([calcItem({...EMPTY_ITEM})]); }} />
            <ItemsTable items={items} onChange={v => { setItems(v); setSaved(null); }}
              billType={billType} stockItems={stockItems} products={products} />
            <PaymentStep billType={billType} form={payForm} onChange={f => { setPayForm(f); setSaved(null); }} />
            <ReviewStep
              customer={customer} billType={billType} items={items} payForm={payForm}
              onSave={handleSave} saved={saved} onDownload={handleDownload}
              onReset={reset} saving={saving} downloading={downloading}
            />
          </>
        )}
      </div>
    </div>
  );
}

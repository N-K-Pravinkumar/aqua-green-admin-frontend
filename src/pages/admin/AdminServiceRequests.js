import { useState, useEffect, useRef } from 'react';
import Pagination from '../../components/admin/Pagination';
import SearchBox from '../../components/admin/SearchBox';
import { AlertTriangle, CheckCircle, ChevronDown, Clock, CreditCard, Download, Edit, Eye, FileText, Hammer, Package, Plus, Receipt, Search, ShoppingCart, Trash2, Wrench, XCircle } from 'lucide-react';
import { serviceRequestAPI, stockAPI, productAPI, serviceRequestExtAPI } from '../../services/api';
import { useToast, ConfirmModal, formatDate, StatusBadge } from '../../components/admin/AdminHelpers';
import PermissionGate from '../../components/admin/PermissionGate';
import { ServiceDetailModal } from '../../components/admin/DetailModals';

const STATUS_COLORS = {
  PENDING:     { color:'#92400e', bg:'#fef3c7', icon:<Clock size={11}/> },
  ASSIGNED:    { color:'#1e40af', bg:'#dbeafe', icon:<Wrench size={11}/> },
  IN_PROGRESS: { color:'#5b21b6', bg:'#ede9fe', icon:<Hammer size={11}/> },
  COMPLETED:   { color:'#065f46', bg:'#d1fae5', icon:<CheckCircle size={11}/> },
  CANCELLED:   { color:'#7f1d1d', bg:'#fee2e2', icon:<XCircle size={11}/> },
};

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] || { color:'#374151', bg:'#f3f4f6', icon:null };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:s.bg, color:s.color, fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap' }}>
      {s.icon}{status?.replace('_',' ')}
    </span>
  );
}

// ── Billing Modal ─────────────────────────────────────────────────
function BillingModal({ sr, onClose, onSaved, show }) {
  const [tab, setTab]       = useState('service');  // service | spare | sell | billing
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks]   = useState([]);
  const [products, setProducts] = useState([]);
  const [serviceCharge, setServiceCharge] = useState(sr?.serviceCharge || '');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payStatus, setPayStatus] = useState('PAID');
  const [techNotes, setTechNotes] = useState(sr?.technicianNotes || '');
  const { show: showToast, ToastEl } = useToast();

  // Spare parts state
  const [parts, setParts] = useState([{ name:'', qty:1, unitPrice:'', stockItemId:'' }]);

  // Sell product state
  const [sellProd, setSellProd] = useState({ productId:'', productName:'', qty:1, unitPrice:'', paymentStatus:'PAID', paymentMethod:'CASH' });

  useEffect(() => {
    stockAPI.getAll().then(r => setStocks(r.data.data||[])).catch(()=>{});
    productAPI.getAll().then(r => setProducts(r.data.data||[])).catch(()=>{});
  }, []);

  const addPartRow = () => setParts(p => [...p, { name:'', qty:1, unitPrice:'', stockItemId:'' }]);
  const setPartField = (i, k, v) => setParts(p => p.map((x, idx) => idx===i ? {...x,[k]:v} : x));

  const handleAddParts = async () => {
    const validParts = parts.filter(p => p.name && p.unitPrice);
    if (!validParts.length) { showToast('Add at least one spare part with name and price', 'error'); return; }
    setLoading(true);
    try {
      await serviceRequestExtAPI.addSpareParts(sr.id, validParts.map(p => ({
        name: p.name, qty: Number(p.qty), unitPrice: Number(p.unitPrice),
        stockItemId: p.stockItemId ? Number(p.stockItemId) : null,
      })));
      showToast('Spare parts added & stock deducted ✅');
      setParts([{ name:'', qty:1, unitPrice:'', stockItemId:'' }]);
      onSaved();
    } catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
    finally { setLoading(false); }
  };

  const handleSellProduct = async () => {
    if (!sellProd.productName || !sellProd.unitPrice) { showToast('Product name and price required','error'); return; }
    setLoading(true);
    try {
      const r = await serviceRequestExtAPI.sellProduct(sr.id, {
        productId: sellProd.productId ? Number(sellProd.productId) : null,
        productName: sellProd.productName, qty: Number(sellProd.qty),
        unitPrice: Number(sellProd.unitPrice), paymentStatus: sellProd.paymentStatus, paymentMethod: sellProd.paymentMethod,
      });
      showToast(`Product sold! Invoice: ${r.data.data.invoiceNumber} ✅`);
      setSellProd({ productId:'', productName:'', qty:1, unitPrice:'', paymentStatus:'PAID', paymentMethod:'CASH' });
      onSaved();
    } catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
    finally { setLoading(false); }
  };

  const handleCompleteBilling = async () => {
    setLoading(true);
    try {
      await serviceRequestExtAPI.completeBilling(sr.id, {
        serviceCharge: Number(serviceCharge) || 0,
        paymentStatus: payStatus, paymentMethod: payMethod,
      });
      showToast('Billing completed! Invoice generated ✅');
      onSaved(); onClose();
    } catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
    finally { setLoading(false); }
  };

  const handleDownloadInvoice = async () => {
    try {
      const r = await serviceRequestExtAPI.downloadInvoice(sr.id);
      const url = URL.createObjectURL(new Blob([r.data], { type:'application/pdf' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `Service-Invoice-${sr.invoiceNumber||'DRAFT'}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Download failed','error'); }
  };

  const spareTotal = parts.reduce((s,p) => s + (Number(p.qty)||1) * (Number(p.unitPrice)||0), 0);
  const svcCharge  = Number(serviceCharge) || 0;
  const existingSpare = sr?.sparePartsTotal || 0;
  const grandTotal = svcCharge + Number(existingSpare) + spareTotal;

  const TABS = [
    { key:'service', label:'Service Charge', icon:<Wrench size={13}/> },
    { key:'spare',   label:'Spare Parts',    icon:<Package size={13}/> },
    { key:'sell',    label:'Sell Product',   icon:<ShoppingCart size={13}/> },
    { key:'billing', label:'Complete Bill',  icon:<Receipt size={13}/> },
  ];

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {ToastEl}
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{ maxWidth:680, padding:0 }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#009B00,#007A00)', borderRadius:'16px 16px 0 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{sr?.customerName} — {sr?.productName}</div>
              <div style={{ color:'#7fff7f', fontSize:12 }}>Ticket: {sr?.ticketNumber} · {sr?.assignedTechnician}</div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>

          {/* Summary row */}
          <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
            {[
              ['Service', `₹${svcCharge.toLocaleString('en-IN')}`],
              ['Spare Parts', `₹${Number(existingSpare).toLocaleString('en-IN')}`],
              ['Grand Total', `₹${grandTotal.toLocaleString('en-IN')}`],
              ['Status', sr?.paymentStatus||'PENDING'],
            ].map(([l,v])=>(
              <div key={l} style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'6px 12px', fontSize:12 }}>
                <div style={{ color:'rgba(255,255,255,.65)', fontSize:10 }}>{l}</div>
                <div style={{ color:'#fff', fontWeight:700 }}>{v}</div>
              </div>
            ))}
            {sr?.invoiceNumber && (
              <button onClick={handleDownloadInvoice} style={{ background:'#fbbf24', border:'none', color:'#000', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                <Download size={12}/>Download Invoice
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1, padding:'11px 8px', border:'none', background:'transparent', cursor:'pointer', fontWeight:tab===t.key?700:500, fontSize:12, color:tab===t.key?'#009B00':'#6b7280', borderBottom:`2.5px solid ${tab===t.key?'#009B00':'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all .15s' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'18px 20px', minHeight:280, maxHeight:420, overflowY:'auto' }}>

          {/* Tab: Service Charge */}
          {tab==='service' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'#f0fff0', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#009B00' }}>
                Enter the service charge for labour, visit fee, and any diagnostics.
              </div>
              <div className="form-group">
                <label className="form-label">Service Charge (₹)</label>
                <input className="form-input" type="number" value={serviceCharge} onChange={e=>setServiceCharge(e.target.value)} placeholder="e.g. 250" />
              </div>
              <div className="form-group">
                <label className="form-label">Technician Notes</label>
                <textarea className="form-textarea" value={techNotes} onChange={e=>setTechNotes(e.target.value)} placeholder="Work done, diagnosis, recommendations..." />
              </div>
            </div>
          )}

          {/* Tab: Spare Parts */}
          {tab==='spare' && (
            <div>
              <div style={{ background:'#fffbeb', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#92400e', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                <Package size={14}/>Adding spare parts will automatically deduct them from stock inventory.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {parts.map((p,i)=>(
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.2fr 1.5fr auto', gap:8, alignItems:'end' }}>
                    <div className="form-group" style={{ margin:0 }}>
                      {i===0 && <label className="form-label">Part Name</label>}
                      <input className="form-input" value={p.name} onChange={e=>setPartField(i,'name',e.target.value)} placeholder="e.g. Carbon Filter" />
                    </div>
                    <div className="form-group" style={{ margin:0 }}>
                      {i===0 && <label className="form-label">Qty</label>}
                      <input className="form-input" type="number" min={1} value={p.qty} onChange={e=>setPartField(i,'qty',e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin:0 }}>
                      {i===0 && <label className="form-label">Unit Price (₹)</label>}
                      <input className="form-input" type="number" value={p.unitPrice} onChange={e=>setPartField(i,'unitPrice',e.target.value)} placeholder="150" />
                    </div>
                    <div className="form-group" style={{ margin:0 }}>
                      {i===0 && <label className="form-label">Deduct from Stock</label>}
                      <select className="form-select" value={p.stockItemId} onChange={e=>setPartField(i,'stockItemId',e.target.value)}>
                        <option value="">-- Not in stock --</option>
                        {stocks.map(s=><option key={s.id} value={s.id}>{s.name} ({s.currentStock} left)</option>)}
                      </select>
                    </div>
                    <button onClick={()=>setParts(pt=>pt.filter((_,x)=>x!==i))} disabled={parts.length===1} style={{ background:'#fee2e2', border:'none', color:'#dc2626', width:32, height:32, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:i===0?18:0 }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, flexWrap:'wrap', gap:8 }}>
                <button onClick={addPartRow} style={{ fontSize:12, color:'#009B00', background:'#e0f9e0', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                  <Plus size={13}/>Add Another Part
                </button>
                <div style={{ fontSize:14, fontWeight:700, color:'#009B00' }}>Parts Total: ₹{spareTotal.toLocaleString('en-IN')}</div>
              </div>
              <button onClick={handleAddParts} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:14 }}>
                {loading?'Saving…':'Save Parts & Deduct Stock'}
              </button>
            </div>
          )}

          {/* Tab: Sell Product */}
          {tab==='sell' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'#eff6ff', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#1e40af', display:'flex', gap:7 }}>
                <ShoppingCart size={14} style={{flexShrink:0,marginTop:1}}/>
                Record a product sold to customer during this service visit. Stock will be deducted automatically and a Sales Invoice generated.
              </div>
              <div className="form-group">
                <label className="form-label">Select Product</label>
                <select className="form-select" value={sellProd.productId} onChange={e=>{
                  const p = products.find(x=>String(x.id)===e.target.value);
                  setSellProd(s=>({...s, productId:e.target.value, productName:p?.name||'', unitPrice:p?.price||''}));
                }}>
                  <option value="">-- Select Product --</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price||0).toLocaleString('en-IN')} ({p.stock||0} in stock)</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input className="form-input" value={sellProd.productName} onChange={e=>setSellProd(s=>({...s,productName:e.target.value}))} placeholder="Enter product name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Qty</label>
                  <input className="form-input" type="number" min={1} value={sellProd.qty} onChange={e=>setSellProd(s=>({...s,qty:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹)</label>
                  <input className="form-input" type="number" value={sellProd.unitPrice} onChange={e=>setSellProd(s=>({...s,unitPrice:e.target.value}))} placeholder="7499" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={sellProd.paymentMethod} onChange={e=>setSellProd(s=>({...s,paymentMethod:e.target.value}))}>
                    {['CASH','UPI','CARD','BANK_TRANSFER'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {sellProd.unitPrice && (
                <div style={{ background:'#d1fae5', borderRadius:8, padding:'10px 14px', fontSize:14, fontWeight:700, color:'#065f46' }}>
                  Total: ₹{(Number(sellProd.qty||1)*Number(sellProd.unitPrice||0)).toLocaleString('en-IN')}
                </div>
              )}
              <button onClick={handleSellProduct} disabled={loading} className="btn btn-primary" style={{ justifyContent:'center' }}>
                <ShoppingCart size={15}/>{loading?'Processing…':'Record Sale & Deduct Stock'}
              </button>
            </div>
          )}

          {/* Tab: Complete Billing */}
          {tab==='billing' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Bill summary */}
              <div style={{ background:'#f0fff0', borderRadius:12, padding:'16px', border:'1px solid #c5e8d8' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#009B00', marginBottom:12 }}>Bill Summary</div>
                {[
                  ['Service Charge', `₹${Number(serviceCharge||sr?.serviceCharge||0).toLocaleString('en-IN')}`],
                  ['Spare Parts', `₹${Number(sr?.sparePartsTotal||0).toLocaleString('en-IN')}`],
                  ['Products Sold', `₹${Number(sr?.productsSoldTotal||0).toLocaleString('en-IN')}`],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #c5e8d8', fontSize:13 }}>
                    <span style={{ color:'#374151' }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontSize:16, fontWeight:800, color:'#009B00' }}>
                  <span>Grand Total</span>
                  <span>₹{(Number(serviceCharge||sr?.serviceCharge||0)+Number(sr?.sparePartsTotal||0)+Number(sr?.productsSoldTotal||0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-select" value={payStatus} onChange={e=>setPayStatus(e.target.value)}>
                    {['PAID','PENDING','WAIVED'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                    {['CASH','UPI','CARD','BANK_TRANSFER'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCompleteBilling} disabled={loading} className="btn btn-primary btn-lg" style={{ justifyContent:'center' }}>
                <Receipt size={16}/>{loading?'Processing…':'Complete Billing & Generate Invoice'}
              </button>
              {sr?.invoiceNumber && (
                <button onClick={handleDownloadInvoice} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', background:'#fef3c7', border:'1px solid #fbbf24', color:'#92400e', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 }}>
                  <Download size={15}/>Download Invoice PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
const EMPTY = {
  customerName:'', customerMobile:'', customerAddress:'', productName:'', productModel:'',
  issueDescription:'', assignedTechnician:'', serviceCharge:'', status:'PENDING', priority:'MEDIUM', technicianNotes:''
};

export default function AdminServiceRequests() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage]           = useState(0);
  const [pageInfo, setPageInfo]   = useState({ totalPages:1, totalElements:0 });
  const PAGE_SIZE = 20;
  const debounce = useRef(null);
  const [statusFilter, setStatus] = useState('ALL');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [billingModal, setBillingModal] = useState(null);
  const [counts, setCounts] = useState({});
  const [viewService, setViewService] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const { show, ToastEl } = useToast();

  const handleImport = async () => {
    if (!importText.trim()) { show('Paste some rows first', 'error'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const r = await serviceRequestExtAPI.importLegacyBills(importText);
      setImportResult(r.data.data);
      show(r.data.message);
      load();
    } catch {
      show('Import failed', 'error');
    }
    setImporting(false);
  };

  const load = () => {
    setLoading(true);
    const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
    Promise.all([
      serviceRequestAPI.getAll(statusParam, undefined, page, PAGE_SIZE),
      serviceRequestAPI.getCounts(),
    ]).then(([r, cr])=>{
      const d=r.data.data; setItems(d?.content||d||[]);
      setPageInfo({totalPages:d?.totalPages||1,totalElements:d?.totalElements||0});
      setCounts(cr.data.data || {});
    }).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load, [page, statusFilter]);
  const changeStatus = (s) => { setStatus(s); setPage(0); };

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit   = sr  => { setForm({ customerName:sr.customerName||'', customerMobile:sr.customerMobile||'', customerAddress:sr.customerAddress||'', productName:sr.productName||'', productModel:sr.productModel||'', issueDescription:sr.issueDescription||'', assignedTechnician:sr.assignedTechnician||'', serviceCharge:sr.serviceCharge||'', status:sr.status||'PENDING', priority:sr.priority||'MEDIUM', technicianNotes:sr.technicianNotes||'' }); setEditId(sr.id); setModal(true); };

  const handleSave = async () => {
    if (!form.customerName || !form.issueDescription) { show('Customer name and issue required','error'); return; }
    setSaving(true);
    try {
      if (editId) await serviceRequestAPI.update(editId, form);
      else        await serviceRequestAPI.create(form);
      show(editId?'Updated':'Ticket created'); setModal(false); load();
    } catch(e) { show(e.response?.data?.message||'Save failed','error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (sr, newStatus) => {
    try {
      await serviceRequestExtAPI.updateStatus(sr.id, newStatus);
      show(`Status → ${newStatus}`); load();
    } catch { show('Failed','error'); }
  };

  const downloadInvoice = async (sr) => {
    try {
      const r = await serviceRequestExtAPI.downloadInvoice(sr.id);
      const url = URL.createObjectURL(new Blob([r.data],{type:'application/pdf'}));
      const a = document.createElement('a'); a.href=url; a.download=`Invoice-${sr.invoiceNumber||sr.ticketNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { show('Download failed — complete billing first','error'); }
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const filtered = items.filter(sr=>{
    const q = search.toLowerCase();
    return !q || sr.customerName?.toLowerCase().includes(q) || sr.customerMobile?.includes(q) || sr.ticketNumber?.toLowerCase().includes(q) || sr.productName?.toLowerCase().includes(q);
  });

  return (
    <PermissionGate view="SERVICE_REQUESTS">
      <div>
        {ToastEl}
        {/* Header */}
        <div className="flex-between mb-20">
          <div>
            <div style={{ fontSize:20, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}><Wrench size={20} color="#009B00"/>Service Requests</div>
            <div style={{ fontSize:13, color:'#6b7280' }}>{counts.TOTAL||0} total · {counts.PENDING||0} pending · {counts.COMPLETED||0} completed</div>
          </div>
          <div className="flex-gap">
            <button className="btn btn-ghost" onClick={()=>setImportOpen(true)} style={{ display:'flex', alignItems:'center', gap:7 }}><Download size={15}/>Import Legacy Bills</button>
            <button className="btn btn-primary" onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:7 }}><Plus size={15}/>New Ticket</button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="filter-bar">
          {[['ALL','All',counts.TOTAL],['PENDING','Pending',counts.PENDING],['ASSIGNED','Assigned',counts.ASSIGNED],['IN_PROGRESS','In Progress',counts.IN_PROGRESS],['COMPLETED','Completed',counts.COMPLETED],['CANCELLED','Cancelled',counts.CANCELLED]].map(([k,l,c])=>(
            <button key={k} className={`filter-btn${statusFilter===k?' active':''}`} onClick={()=>changeStatus(k)}>{l} ({c||0})</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:16, maxWidth:400 }}>
          <SearchBox value={search} onChange={v=>{
              setSearch(v);
              clearTimeout(debounce.current);
              if(v.length<2){setSuggestions([]);return;}
              debounce.current=setTimeout(async()=>{
                try{
                  const r=await serviceRequestAPI.getAll(undefined,undefined,0,8);
                  const q=v.toLowerCase();
                  const arr=r.data.data?.content||r.data.data||[];
                  setSuggestions(arr.filter(s=>s.customerName?.toLowerCase().includes(q)||s.customerMobile?.includes(v)||s.ticketNumber?.toLowerCase().includes(q)).slice(0,6).map(s=>({label:s.customerName,sub:`${s.ticketNumber} · ${s.status}`,value:s})));
                }catch{}
              },300);
            }} placeholder="Search by customer, ticket…" suggestions={suggestions} onSelect={s=>{setSearch(s.label);setSuggestions([]);}} width="260px" />
        </div>

        {/* Table */}
        <div className="section-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th><th>Customer</th><th>Product / Issue</th>
                  <th>Technician</th><th>Charges</th><th>Status</th>
                  <th>Priority</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && [...Array(5)].map((_,i)=>(
                  <tr key={i}><td colSpan={9}><div className="skeleton" style={{height:24,borderRadius:6}}/></td></tr>
                ))}
                {!loading && filtered.map(sr=>(
                  <tr key={sr.id}>
                    <td>
                      <div style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:'#009B00' }}>{sr.ticketNumber||'—'}</div>
                      {sr.serviceCode && <div style={{ fontSize:10, color:'#9aa0a6' }}>{sr.serviceCode}</div>}
                      {sr.invoiceNumber && <div style={{ fontSize:10, color:'#9ca3af' }}>INV: {sr.invoiceNumber}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{sr.customerName}</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{sr.customerMobile}</div>
                    </td>
                    <td>
                      <div style={{ fontSize:13, fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sr.productName||'—'}</div>
                      <div style={{ fontSize:11, color:'#6b7280', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sr.issueDescription}</div>
                    </td>
                    <td style={{ fontSize:13 }}>{sr.assignedTechnician||'—'}</td>
                    <td>
                      <div style={{ fontSize:13, fontWeight:700, color:'#009B00' }}>₹{Number(sr.serviceCharge||0).toLocaleString('en-IN')}</div>
                      {sr.sparePartsTotal > 0 && <div style={{ fontSize:10, color:'#6b7280' }}>+₹{Number(sr.sparePartsTotal).toLocaleString('en-IN')} parts</div>}
                      {sr.totalBillAmount > 0 && <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed' }}>Total: ₹{Number(sr.totalBillAmount).toLocaleString('en-IN')}</div>}
                    </td>
                    <td><StatusPill status={sr.status}/></td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:sr.priority==='URGENT'?'#fee2e2':sr.priority==='HIGH'?'#fef3c7':'#f3f4f6', color:sr.priority==='URGENT'?'#7f1d1d':sr.priority==='HIGH'?'#92400e':'#374151' }}>
                        {sr.priority}
                      </span>
                    </td>
                    <td style={{ fontSize:11, color:'#9ca3af' }}>{formatDate(sr.createdAt)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {/* Billing button */}
                        <button onClick={()=>setBillingModal(sr)} title="Billing & Spare Parts" style={{ background:'#e0f9e0', border:'none', color:'#009B00', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Receipt size={13}/>
                        </button>
                        {/* Download invoice */}
                        {sr.invoiceNumber && (
                          <button onClick={()=>downloadInvoice(sr)} title="Download Invoice" style={{ background:'#fef3c7', border:'none', color:'#92400e', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Download size={13}/>
                          </button>
                        )}
                        {/* View — itemized breakdown */}
                        <button onClick={()=>setViewService(sr)} title="View details" style={{ background:'#e0f9e0', border:'none', color:'#009B00', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Eye size={13}/>
                        </button>
                        {/* Edit */}
                        <button onClick={()=>openEdit(sr)} title="Edit" style={{ background:'#f3f4f6', border:'none', color:'#374151', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Edit size={12}/>
                        </button>
                        {/* Status quick change */}
                        {sr.status!=='COMPLETED' && (
                          <button onClick={()=>handleStatusChange(sr,'COMPLETED')} title="Mark Completed" style={{ background:'#d1fae5', border:'none', color:'#008800', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <CheckCircle size={13}/>
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={()=>setDeleteId(sr.id)} title="Delete" style={{ background:'#fee2e2', border:'none', color:'#dc2626', width:28, height:28, borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length===0 && (
                  <tr><td colSpan={9} style={{ padding:32, textAlign:'center', color:'#9ca3af' }}>
                    <Wrench size={32} style={{ marginBottom:8, opacity:.3 }}/><br/>No service requests found
                  </td></tr>
                )}
              </tbody>
            </table>
          <Pagination page={page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={PAGE_SIZE} onPageChange={p=>setPage(p)} />
          </div>
        </div>

        {/* Create/Edit Modal */}
        {modal && (
          <div className="modal-overlay" onClick={()=>setModal(false)}>
            <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">{editId?'Edit Service Request':'New Service Request'}</div>
                <button className="modal-close" onClick={()=>setModal(false)}>×</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group"><label className="form-label">Customer Name *</label><input className="form-input" value={form.customerName} onChange={e=>f('customerName',e.target.value)} placeholder="Rajesh Kumar" /></div>
                <div className="form-group"><label className="form-label">Mobile</label><input className="form-input" value={form.customerMobile} onChange={e=>f('customerMobile',e.target.value)} placeholder="9876543210" /></div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Address</label><input className="form-input" value={form.customerAddress} onChange={e=>f('customerAddress',e.target.value)} placeholder="House no, Street, Area" /></div>
                <div className="form-group"><label className="form-label">Product Name</label><input className="form-input" value={form.productName} onChange={e=>f('productName',e.target.value)} placeholder="Kent Ace" /></div>
                <div className="form-group"><label className="form-label">Model / Serial No</label><input className="form-input" value={form.productModel} onChange={e=>f('productModel',e.target.value)} placeholder="ACE-2023-XL" /></div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Issue Description *</label><textarea className="form-textarea" value={form.issueDescription} onChange={e=>f('issueDescription',e.target.value)} placeholder="Describe the problem in detail…" /></div>
                <div className="form-group"><label className="form-label">Assigned Technician</label><input className="form-input" value={form.assignedTechnician} onChange={e=>f('assignedTechnician',e.target.value)} placeholder="Murugan K" /></div>
                <div className="form-group"><label className="form-label">Service Charge (₹)</label><input className="form-input" type="number" value={form.serviceCharge} onChange={e=>f('serviceCharge',e.target.value)} placeholder="250" /></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e=>f('status',e.target.value)}>{['PENDING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={form.priority} onChange={e=>f('priority',e.target.value)}>{['LOW','MEDIUM','HIGH','URGENT'].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Technician Notes</label><textarea className="form-textarea" value={form.technicianNotes} onChange={e=>f('technicianNotes',e.target.value)} placeholder="Work done, parts replaced…" /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  {saving?<><span className="spinner"/>Saving…</>:<><Wrench size={14}/>{editId?'Update':'Create Ticket'}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Modal */}
        {billingModal && (
          <BillingModal
            sr={billingModal} show={!!billingModal}
            onClose={()=>setBillingModal(null)}
            onSaved={()=>{ load(); }}
          />
        )}

        <ConfirmModal isOpen={!!deleteId} title="Delete Ticket" message="This will permanently delete this service request." danger
          onConfirm={async()=>{ await serviceRequestAPI.delete(deleteId); setDeleteId(null); load(); show('Deleted'); }}
          onCancel={()=>setDeleteId(null)} />

        {viewService && (
          <ServiceDetailModal service={viewService} onClose={()=>setViewService(null)} onEdit={openEdit} />
        )}

        {/* Import Legacy Bills Modal */}
        {importOpen && (
          <div className="modal-overlay" onClick={()=>setImportOpen(false)}>
            <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:700}}>
              <div className="modal-header">
                <div className="modal-title">Import Legacy Bills</div>
                <button className="modal-close" onClick={()=>setImportOpen(false)}>×</button>
              </div>
              <div style={{padding:'0 4px'}}>
                <p style={{fontSize:13,color:'#6b7280',marginBottom:12}}>
                  Paste rows straight from your spreadsheet — one bill per line, columns tab-separated:
                  <br /><code style={{fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>
                    Name [tab] Address [tab] Mobile [tab] Date (DD-MM-YY) [tab] ... [tab] Total [tab] Item / Price [tab] Item / Price ...
                  </code>
                </p>
                <textarea
                  className="form-textarea"
                  style={{minHeight:180,fontFamily:'monospace',fontSize:12}}
                  value={importText}
                  onChange={e=>setImportText(e.target.value)}
                  placeholder={"Naresh\tOndipudur,cbe\t9344960687\t12-10-20\t\t3000\tGet Volve / 550\tCarbon Set / 1500\tOut Filter / 200"}
                />
                {importResult && (
                  <div style={{marginTop:12,padding:12,borderRadius:8,background:importResult.skipped>0?'#fff7ed':'#e0f9e0'}}>
                    <div style={{fontWeight:700,fontSize:13}}>
                      ✓ {importResult.created} imported{importResult.duplicates>0?`, ${importResult.duplicates} already existed`:''}{importResult.skipped>0?`, ⚠ ${importResult.skipped} skipped`:''}
                    </div>
                    {importResult.errors?.length>0 && (
                      <div style={{marginTop:8,fontSize:11,color:'#92400e',maxHeight:120,overflowY:'auto'}}>
                        {importResult.errors.map((e,i)=><div key={i}>• {e}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>{setImportOpen(false);setImportText('');setImportResult(null);}}>Close</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                  {importing ? <><span className="spinner"></span> Importing…</> : 'Import Bills'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}

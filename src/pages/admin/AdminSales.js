// AdminSales.js
import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Pagination from '../../components/admin/Pagination';
import SearchBox from '../../components/admin/SearchBox';
import { saleAPI, customerAPI, productAPI } from '../../services/api';
import { ConfirmModal, formatCurrency, formatDate, useToast } from '../../components/admin/AdminHelpers';

const EMPTY_SALE = { customerName:'',productName:'',quantity:1,unitPrice:'',totalAmount:'',salesPerson:'',invoiceNumber:'',paymentStatus:'PAID',paymentMethod:'UPI' };
const STAFF = ['Murugan K','Senthil K','Karthik R','Arun Kumar'];
const PAY_METHODS = ['CASH','UPI','CARD','BANK_TRANSFER'];

export function AdminSales() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages:1, totalElements:0 });
  const PAGE_SIZE = 20;
  const debounce = useRef(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_SALE);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { show, ToastEl } = useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Sales');},[]);

  const load = ()=>{
    setLoading(true);
    Promise.all([saleAPI.getAll(page,PAGE_SIZE),saleAPI.getStats(),productAPI.getAll()]).then(([r,sr,pr])=>{
      const d=r.data.data; setSales(d?.content||d||[]); setStats(sr.data.data||{}); setProducts(pr.data.data||[]);
      setPageInfo({totalPages:d?.totalPages||1,totalElements:d?.totalElements||0});
    }).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load,[page]);

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleProductSelect = (e) => {
    const p = products.find(p=>p.id===parseInt(e.target.value));
    if(p){ f('productName',p.name); f('unitPrice',p.price); f('totalAmount',p.price*form.quantity); }
  };

  const handleSave = async ()=>{
    if(!form.customerName||!form.productName||!form.unitPrice){show('Fill required fields','error');return;}
    setSaving(true);
    try {
      const inv = form.invoiceNumber||`AQG-INV-${Date.now().toString().slice(-5)}`;
      const total = parseFloat(form.unitPrice)*parseInt(form.quantity);
      const data={...form,unitPrice:parseFloat(form.unitPrice),totalAmount:total,quantity:parseInt(form.quantity),invoiceNumber:inv};
      if(editItem) await saleAPI.update(editItem.id,data);
      else await saleAPI.create(data);
      show(editItem?'Updated':'Sale recorded'); setModalOpen(false); load();
    } catch {show('Failed','error');} finally {setSaving(false);}
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div><div style={{fontSize:18,fontWeight:700}}>Sales</div></div>
        <button className="btn btn-primary" onClick={()=>{setForm(EMPTY_SALE);setEditItem(null);setModalOpen(true);}}>+ Add Sale</button>
      </div>
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',marginBottom:16}}>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value stat-green">{formatCurrency(stats.totalRevenue)}</div></div>
        <div className="stat-card"><div className="stat-label">Monthly Revenue</div><div className="stat-value stat-green">{formatCurrency(stats.monthlyRevenue)}</div></div>
        <div className="stat-card"><div className="stat-label">Total Orders</div><div className="stat-value stat-blue">{stats.totalSales||0}</div></div>
      </div>
      <div className="section-card">
        {loading?<div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>:(
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Salesperson</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {sales.map(s=>(
                  <tr key={s.id}>
                    <td style={{fontWeight:700,color:'#009B00',fontSize:12}}>{s.invoiceNumber}</td>
                    <td style={{fontWeight:600}}>{s.customerName}</td>
                    <td style={{fontSize:12,color:'#5f6368'}}>{s.productName}</td>
                    <td style={{textAlign:'center'}}>{s.quantity}</td>
                    <td style={{fontWeight:700,color:'#009B00'}}>{formatCurrency(s.totalAmount)}</td>
                    <td style={{fontSize:12}}>{s.salesPerson}</td>
                    <td><span className={`badge badge-${s.paymentStatus?.toLowerCase()}`}>{s.paymentStatus}</span></td>
                    <td style={{fontSize:11,color:'#9aa0a6'}}>{formatDate(s.createdAt)}</td>
                    <td><div className="flex-gap" style={{gap:4}}>
                      <button className="btn btn-xs btn-ghost" onClick={()=>{setForm({customerName:s.customerName,productName:s.productName,quantity:s.quantity,unitPrice:s.unitPrice,totalAmount:s.totalAmount,salesPerson:s.salesPerson,invoiceNumber:s.invoiceNumber,paymentStatus:s.paymentStatus,paymentMethod:s.paymentMethod||'UPI'});setEditItem(s);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /></button>
                      <button className="btn btn-xs btn-ghost" style={{color:'#A32D2D'}} onClick={()=>setDeleteId(s.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={PAGE_SIZE} onPageChange={p=>setPage(p)} />
      </div>
      {modalOpen&&(
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editItem?'Edit Sale':'Add Sale'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
            <div className="grid-2" style={{gap:12}}>
              <div className="form-group"><label className="form-label">Customer Name *</label><input className="form-input" value={form.customerName} onChange={e=>f('customerName',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Select Product</label>
                <select className="form-select" onChange={handleProductSelect}><option value="">Choose product…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}</select>
              </div>
              <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={form.productName} onChange={e=>f('productName',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" min={1} value={form.quantity} onChange={e=>{f('quantity',e.target.value);f('totalAmount',parseFloat(form.unitPrice||0)*parseInt(e.target.value||1));}} /></div>
              <div className="form-group"><label className="form-label">Unit Price (₹) *</label><input className="form-input" type="number" value={form.unitPrice} onChange={e=>{f('unitPrice',e.target.value);f('totalAmount',parseFloat(e.target.value||0)*parseInt(form.quantity||1));}} /></div>
              <div className="form-group"><label className="form-label">Total Amount</label><input className="form-input" value={formatCurrency(form.totalAmount)} readOnly style={{background:'#f8f9fa',fontWeight:700,color:'#009B00'}} /></div>
              <div className="form-group"><label className="form-label">Salesperson</label><select className="form-select" value={form.salesPerson} onChange={e=>f('salesPerson',e.target.value)}><option value="">Select…</option>{STAFF.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Payment Method</label><select className="form-select" value={form.paymentMethod} onChange={e=>f('paymentMethod',e.target.value)}>{PAY_METHODS.map(m=><option key={m} value={m}>{m.replace('_',' ')}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Payment Status</label><select className="form-select" value={form.paymentStatus} onChange={e=>f('paymentStatus',e.target.value)}>{['PAID','PENDING','OVERDUE'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Invoice Number</label><input className="form-input" value={form.invoiceNumber} onChange={e=>f('invoiceNumber',e.target.value)} placeholder="Auto-generated if empty" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Record Sale')}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={!!deleteId} title="Delete Sale" message="Delete this sale record?" danger onConfirm={async()=>{await saleAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
    </div>
  );
}

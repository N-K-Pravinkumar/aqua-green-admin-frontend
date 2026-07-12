import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { quotationAPI, stockAPI, employeeAPI, blogAPI } from '../../services/api';
import { ConfirmModal, StatusBadge, formatCurrency, formatDate, formatDateTime, useToast } from '../../components/admin/AdminHelpers';
import ImageUploader from '../../components/admin/ImageUploader';

// ==================== QUOTATIONS ====================
const Q_EMPTY = { quotationNumber:'',customerName:'',customerMobile:'',customerAddress:'',itemsJson:'[]',subtotal:'',gstAmount:'',totalAmount:'',notes:'',status:'DRAFT',validityDays:30 };

export function AdminQuotations() {
  const [items,setItems]=useState([]);const [counts,setCounts]=useState({});const [loading,setLoading]=useState(true);
  const [modalOpen,setModalOpen]=useState(false);const [editItem,setEditItem]=useState(null);const [form,setForm]=useState(Q_EMPTY);
  const [saving,setSaving]=useState(false);const [deleteId,setDeleteId]=useState(null);const [filter,setFilter]=useState('ALL');
  const {show,ToastEl}=useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Quotations');},[]);

  const load=()=>{setLoading(true);Promise.all([quotationAPI.getAll(),quotationAPI.getCounts()]).then(([r,cr])=>{setItems(r.data.data?.content || r.data.data || []);setCounts(cr.data.data||{});}).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const filtered=filter==='ALL'?items:items.filter(i=>i.status===filter);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    if(!form.customerName){show('Customer name required','error');return;}
    setSaving(true);
    try{
      const qn=form.quotationNumber||`AQG-QT-${Date.now().toString().slice(-5)}`;
      const sub=parseFloat(form.subtotal||0);const gst=parseFloat(form.gstAmount||0);
      const data={...form,quotationNumber:qn,subtotal:sub,gstAmount:gst,totalAmount:sub+gst};
      if(editItem) await quotationAPI.update(editItem.id,data);
      else await quotationAPI.create(data);
      show(editItem?'Updated':'Quotation created');setModalOpen(false);load();
    }catch{show('Failed','error');}finally{setSaving(false);}
  };

  return(<div>{ToastEl}
    <div className="flex-between mb-16">
      <div><div style={{fontSize:18,fontWeight:700}}>Quotations</div></div>
      <button className="btn btn-primary" onClick={()=>{setForm(Q_EMPTY);setEditItem(null);setModalOpen(true);}}>+ New Quotation</button>
    </div>
    <div className="filter-bar">
      {['ALL','DRAFT','SENT','ACCEPTED','REJECTED'].map(s=><button key={s} className={`filter-btn${filter===s?' active':''}`} onClick={()=>setFilter(s)}>{s==='ALL'?`All (${items.length})`:`${s} (${counts[s]||0})`}</button>)}
    </div>
    <div className="section-card">
      {loading?<div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>:(
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Quote No.</th><th>Customer</th><th>Mobile</th><th>Amount</th><th>Notes</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'#9aa0a6'}}>No quotations</td></tr>}
            {filtered.map(q=>(
              <tr key={q.id}>
                <td style={{fontWeight:700,color:'#009B00',fontSize:12}}>{q.quotationNumber}</td>
                <td><div style={{fontWeight:600}}>{q.customerName}</div><div style={{fontSize:10,color:'#9aa0a6'}}>{q.customerAddress}</div></td>
                <td style={{fontSize:12}}>{q.customerMobile}</td>
                <td><div style={{fontWeight:700,color:'#009B00'}}>{formatCurrency(q.totalAmount)}</div><div style={{fontSize:10,color:'#9aa0a6'}}>GST: {formatCurrency(q.gstAmount)}</div></td>
                <td style={{fontSize:11,color:'#5f6368',maxWidth:120}}>{q.notes?.slice(0,50)||'—'}</td>
                <td>
                  <select value={q.status} onChange={async e=>{await quotationAPI.updateStatus(q.id,e.target.value);load();show('Status updated');}} style={{fontSize:11,padding:'3px 6px',borderRadius:6,border:'1px solid #e8eaed',background:'#fff'}}>
                    {['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{fontSize:11,color:'#9aa0a6'}}>{formatDate(q.createdAt)}</td>
                <td><div className="flex-gap" style={{gap:4}}>
                  <button className="btn btn-xs btn-ghost" onClick={()=>{setForm({quotationNumber:q.quotationNumber,customerName:q.customerName,customerMobile:q.customerMobile||'',customerAddress:q.customerAddress||'',itemsJson:q.itemsJson||'[]',subtotal:q.subtotal||'',gstAmount:q.gstAmount||'',totalAmount:q.totalAmount||'',notes:q.notes||'',status:q.status,validityDays:q.validityDays||30});setEditItem(q);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /></button>
                  <button className="btn btn-xs btn-ghost" style={{color:'#A32D2D'}} onClick={()=>setDeleteId(q.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
    {modalOpen&&(<div className="modal-overlay" onClick={()=>setModalOpen(false)}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{editItem?'Edit Quotation':'New Quotation'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
        <div className="grid-2" style={{gap:12}}>
          <div className="form-group"><label className="form-label">Customer Name *</label><input className="form-input" value={form.customerName} onChange={e=>f('customerName',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Customer Mobile</label><input className="form-input" value={form.customerMobile} onChange={e=>f('customerMobile',e.target.value)} /></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Customer Address</label><input className="form-input" value={form.customerAddress} onChange={e=>f('customerAddress',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Subtotal (₹)</label><input className="form-input" type="number" value={form.subtotal} onChange={e=>{f('subtotal',e.target.value);f('totalAmount',(parseFloat(e.target.value||0)+parseFloat(form.gstAmount||0)).toFixed(2));}} /></div>
          <div className="form-group"><label className="form-label">GST Amount (₹)</label><input className="form-input" type="number" value={form.gstAmount} onChange={e=>{f('gstAmount',e.target.value);f('totalAmount',(parseFloat(form.subtotal||0)+parseFloat(e.target.value||0)).toFixed(2));}} /></div>
          <div className="form-group"><label className="form-label">Total Amount</label><input className="form-input" value={formatCurrency(form.totalAmount)} readOnly style={{background:'#f8f9fa',fontWeight:700,color:'#009B00'}} /></div>
          <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e=>f('status',e.target.value)}>{['DRAFT','SENT','ACCEPTED','REJECTED'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Any additional notes…" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Create')}</button>
        </div>
      </div>
    </div>)}
    <ConfirmModal isOpen={!!deleteId} title="Delete Quotation" message="Delete this quotation?" danger onConfirm={async()=>{await quotationAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
  </div>);
}

// ==================== STOCK ====================
const S_EMPTY = { name:'',category:'SPARE_PART',openingStock:0,currentStock:0,minStock:5,unit:'UNITS' };

export function AdminStock() {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);
  const [modalOpen,setModalOpen]=useState(false);const [editItem,setEditItem]=useState(null);const [form,setForm]=useState(S_EMPTY);
  const [saving,setSaving]=useState(false);const [deleteId,setDeleteId]=useState(null);const [catFilter,setCatFilter]=useState('ALL');
  const [adjModal,setAdjModal]=useState(null);const [adjQty,setAdjQty]=useState(1);const [adjType,setAdjType]=useState('ADD');
  const {show,ToastEl}=useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Stock Management');},[]);

  const load=()=>{setLoading(true);stockAPI.getAll().then(r=>setItems(r.data.data?.content || r.data.data || [])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));};
  useEffect(load,[]);

  const filtered=catFilter==='ALL'?items:items.filter(i=>i.category===catFilter);
  const lowCount=items.filter(i=>i.currentStock<=i.minStock).length;
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    if(!form.name){show('Name required','error');return;}
    setSaving(true);
    try{
      const data={...form,openingStock:parseInt(form.openingStock||0),currentStock:parseInt(form.currentStock||0),minStock:parseInt(form.minStock||5)};
      if(editItem) await stockAPI.update(editItem.id,data);
      else await stockAPI.create(data);
      show(editItem?'Updated':'Stock item created');setModalOpen(false);load();
    }catch{show('Failed','error');}finally{setSaving(false);}
  };

  const handleAdj=async()=>{
    try{await stockAPI.updateStock(adjModal.id,parseInt(adjQty),adjType);show(`Stock ${adjType==='ADD'?'added':'reduced'}`);setAdjModal(null);load();}catch{show('Failed','error');}
  };

  const stockPct=item=>Math.min(100,Math.round((item.currentStock/Math.max(item.openingStock||1,1))*100));
  const stockColor=item=>item.currentStock<=item.minStock?'#E24B4A':item.currentStock<=(item.minStock*2)?'#EF9F27':'#0d8a00';

  return(<div>{ToastEl}
    <div className="flex-between mb-16">
      <div><div style={{fontSize:18,fontWeight:700}}>Stock Management</div>{lowCount>0&&<div style={{color:'#A32D2D',fontSize:12,fontWeight:600}}>⚠️ {lowCount} items below minimum stock</div>}</div>
      <button className="btn btn-primary" onClick={()=>{setForm(S_EMPTY);setEditItem(null);setModalOpen(true);}}>+ Add Stock Item</button>
    </div>
    <div className="filter-bar">
      {['ALL','PRODUCT','SPARE_PART'].map(c=><button key={c} className={`filter-btn${catFilter===c?' active':''}`} onClick={()=>setCatFilter(c)}>{c==='ALL'?`All (${items.length})`:c==='PRODUCT'?`Products (${items.filter(i=>i.category==='PRODUCT').length})`:`Spare Parts (${items.filter(i=>i.category==='SPARE_PART').length})`}</button>)}
    </div>
    <div className="section-card">
      {loading?<div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>:(
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Item Name</th><th>Category</th><th>Opening</th><th>Current</th><th>Min Stock</th><th>Level</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(item=>(
              <tr key={item.id}>
                <td style={{fontWeight:600}}>{item.name}</td>
                <td><span className={`badge ${item.category==='PRODUCT'?'badge-new':'badge-followup'}`}>{item.category==='SPARE_PART'?'Spare Part':'Product'}</span></td>
                <td style={{textAlign:'center'}}>{item.openingStock}</td>
                <td style={{textAlign:'center',fontWeight:700,color:stockColor(item)}}>{item.currentStock}</td>
                <td style={{textAlign:'center'}}>{item.minStock}</td>
                <td style={{minWidth:100}}>
                  <div className="stock-bar"><div className="stock-fill" style={{width:`${stockPct(item)}%`,background:stockColor(item)}}></div></div>
                  <div style={{fontSize:10,color:'#9aa0a6',marginTop:2}}>{stockPct(item)}%</div>
                </td>
                <td><span className={`badge ${item.currentStock<=item.minStock?'badge-low':'badge-ok'}`}>{item.currentStock<=item.minStock?'LOW STOCK':'OK'}</span></td>
                <td><div className="flex-gap" style={{gap:4}}>
                  <button className="btn btn-xs" style={{background:'#e0f9e0',color:'#009B00'}} onClick={()=>{setAdjModal(item);setAdjQty(1);setAdjType('ADD');}}>+/−</button>
                  <button className="btn btn-xs btn-ghost" onClick={()=>{setForm({name:item.name,category:item.category,openingStock:item.openingStock,currentStock:item.currentStock,minStock:item.minStock,unit:item.unit||'UNITS'});setEditItem(item);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /></button>
                  <button className="btn btn-xs btn-ghost" style={{color:'#A32D2D'}} onClick={()=>setDeleteId(item.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
    {/* Adjust Stock Modal */}
    {adjModal&&(<div className="modal-overlay" onClick={()=>setAdjModal(null)}>
      <div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">Adjust Stock — {adjModal.name}</div><button className="modal-close" onClick={()=>setAdjModal(null)}>×</button></div>
        <div style={{textAlign:'center',padding:'8px 0 16px',color:'#5f6368',fontSize:13}}>Current stock: <strong style={{color:'#009B00',fontSize:18}}>{adjModal.currentStock}</strong></div>
        <div className="grid-2" style={{gap:12}}>
          <div className="form-group"><label className="form-label">Action</label><select className="form-select" value={adjType} onChange={e=>setAdjType(e.target.value)}><option value="ADD">Add Stock ↑</option><option value="SUBTRACT">Remove Stock ↓</option></select></div>
          <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" min={1} value={adjQty} onChange={e=>setAdjQty(e.target.value)} /></div>
        </div>
        <div style={{textAlign:'center',padding:'12px 0',color:'#5f6368',fontSize:13}}>New stock will be: <strong style={{color:adjType==='ADD'?'#009B00':'#A32D2D',fontSize:16}}>{adjType==='ADD'?adjModal.currentStock+parseInt(adjQty||0):Math.max(0,adjModal.currentStock-parseInt(adjQty||0))}</strong></div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setAdjModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleAdj}>Update Stock</button></div>
      </div>
    </div>)}
    {/* Create/Edit Modal */}
    {modalOpen&&(<div className="modal-overlay" onClick={()=>setModalOpen(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{editItem?'Edit Stock Item':'Add Stock Item'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Item Name *</label><input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} /></div>
          <div className="grid-2" style={{gap:12}}>
            <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e=>f('category',e.target.value)}><option value="PRODUCT">Product</option><option value="SPARE_PART">Spare Part</option></select></div>
            <div className="form-group"><label className="form-label">Unit</label><select className="form-select" value={form.unit} onChange={e=>f('unit',e.target.value)}>{['UNITS','PIECES','SETS'].map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Opening Stock</label><input className="form-input" type="number" value={form.openingStock} onChange={e=>f('openingStock',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Current Stock</label><input className="form-input" type="number" value={form.currentStock} onChange={e=>f('currentStock',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Min Stock Alert</label><input className="form-input" type="number" value={form.minStock} onChange={e=>f('minStock',e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Create')}</button></div>
      </div>
    </div>)}
    <ConfirmModal isOpen={!!deleteId} title="Delete Item" message="Remove this stock item?" danger onConfirm={async()=>{await stockAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
  </div>);
}

// ==================== EMPLOYEES ====================
const E_EMPTY = { name:'',mobile:'',email:'',role:'TECHNICIAN',joiningDate:'',salary:'',avatarInitials:'' };
const ROLES = ['SUPER_ADMIN','ADMIN','SALES_EXECUTIVE','TECHNICIAN','ACCOUNTANT','INVENTORY_MANAGER'];

export function AdminEmployees() {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);
  const [modalOpen,setModalOpen]=useState(false);const [editItem,setEditItem]=useState(null);const [form,setForm]=useState(E_EMPTY);
  const [saving,setSaving]=useState(false);const [deleteId,setDeleteId]=useState(null);
  const {show,ToastEl}=useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Employees');},[]);

  const load=()=>{setLoading(true);employeeAPI.getAll().then(r=>setItems(r.data.data?.content || r.data.data || [])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));};
  useEffect(load,[]);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    if(!form.name||!form.mobile){show('Name & mobile required','error');return;}
    setSaving(true);
    try{
      const initials=form.avatarInitials||form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const data={...form,salary:form.salary?parseFloat(form.salary):null,avatarInitials:initials};
      if(editItem) await employeeAPI.update(editItem.id,data);
      else await employeeAPI.create(data);
      show(editItem?'Updated':'Employee added');setModalOpen(false);load();
    }catch{show('Failed','error');}finally{setSaving(false);}
  };

  const ROLE_COLOR={'SUPER_ADMIN':'badge-lost','ADMIN':'badge-converted','SALES_EXECUTIVE':'badge-new','TECHNICIAN':'badge-followup','ACCOUNTANT':'badge-sent','INVENTORY_MANAGER':'badge-contacted'};

  return(<div>{ToastEl}
    <div className="flex-between mb-16">
      <div><div style={{fontSize:18,fontWeight:700}}>Employees</div><div className="text-muted text-sm">{items.length} active staff</div></div>
      <button className="btn btn-primary" onClick={()=>{setForm(E_EMPTY);setEditItem(null);setModalOpen(true);}}>+ Add Employee</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
      {loading&&<div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>}
      {items.map(emp=>(
        <div key={emp.id} className="section-card">
          <div style={{padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'#e0f9e0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#009B00',flexShrink:0}}>{emp.avatarInitials||emp.name[0]}</div>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{emp.name}</div>
                <span className={`badge ${ROLE_COLOR[emp.role]||'badge-new'}`} style={{fontSize:10}}>{emp.role?.replace('_',' ')}</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5,fontSize:13,color:'#5f6368'}}>
              <div>📞 <a href={`tel:${emp.mobile}`} style={{color:'#009B00'}}>{emp.mobile}</a></div>
              {emp.email&&<div>✉️ {emp.email}</div>}
              {emp.joiningDate&&<div>📅 Since {formatDate(emp.joiningDate)}</div>}
              {emp.salary&&<div>💰 ₹{Number(emp.salary).toLocaleString('en-IN')}/month</div>}
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>{setForm({name:emp.name,mobile:emp.mobile,email:emp.email||'',role:emp.role,joiningDate:emp.joiningDate||'',salary:emp.salary||'',avatarInitials:emp.avatarInitials||''});setEditItem(emp);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /> Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteId(emp.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {modalOpen&&(<div className="modal-overlay" onClick={()=>setModalOpen(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{editItem?'Edit Employee':'Add Employee'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="grid-2" style={{gap:12}}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Mobile *</label><input className="form-input" value={form.mobile} onChange={e=>f('mobile',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e=>f('email',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e=>f('role',e.target.value)}>{ROLES.map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Joining Date</label><input className="form-input" type="date" value={form.joiningDate} onChange={e=>f('joiningDate',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Salary (₹/month)</label><input className="form-input" type="number" value={form.salary} onChange={e=>f('salary',e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Add Employee')}</button></div>
      </div>
    </div>)}
    <ConfirmModal isOpen={!!deleteId} title="Remove Employee" message="Deactivate this employee?" danger onConfirm={async()=>{await employeeAPI.delete(deleteId);setDeleteId(null);load();show('Removed');}} onCancel={()=>setDeleteId(null)} />
  </div>);
}

// ==================== BLOGS ====================
const B_EMPTY = { title:'',slug:'',content:'',excerpt:'',featuredImageUrl:'',seoTitle:'',seoDescription:'',status:'DRAFT',author:'' };

export function AdminBlogs() {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);
  const [modalOpen,setModalOpen]=useState(false);const [editItem,setEditItem]=useState(null);const [form,setForm]=useState(B_EMPTY);
  const [saving,setSaving]=useState(false);const [deleteId,setDeleteId]=useState(null);
  const {show,ToastEl}=useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Blog Management');},[]);

  const load=()=>{setLoading(true);blogAPI.getAll().then(r=>setItems(r.data.data?.content || r.data.data || [])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));};
  useEffect(load,[]);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const genSlug=title=>title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const handleSave=async()=>{
    if(!form.title){show('Title required','error');return;}
    setSaving(true);
    try{
      const slug=form.slug||genSlug(form.title);
      if(editItem) await blogAPI.update(editItem.id,{...form,slug});
      else await blogAPI.create({...form,slug});
      show(editItem?'Blog updated':'Blog created');setModalOpen(false);load();
    }catch{show('Failed','error');}finally{setSaving(false);}
  };

  return(<div>{ToastEl}
    <div className="flex-between mb-16">
      <div><div style={{fontSize:18,fontWeight:700}}>Blog Management</div></div>
      <button className="btn btn-primary" onClick={()=>{setForm(B_EMPTY);setEditItem(null);setModalOpen(true);}}>+ New Blog Post</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {loading&&<div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>}
      {items.map(b=>(
        <div key={b.id} className="section-card">
          {b.featuredImageUrl&&<img src={b.featuredImageUrl} alt={b.title} style={{width:'100%',height:140,objectFit:'cover',borderRadius:'12px 12px 0 0'}} onError={e=>e.target.style.display='none'} />}
          <div style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <span className={`badge badge-${b.status?.toLowerCase()}`}>{b.status}</span>
              <span style={{fontSize:11,color:'#9aa0a6'}}>{formatDate(b.createdAt)}</span>
            </div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6,lineHeight:1.3}}>{b.title}</div>
            <div style={{fontSize:12,color:'#5f6368',marginBottom:10,lineHeight:1.5}}>{b.excerpt?.slice(0,80)||b.content?.slice(0,80)}…</div>
            <div style={{fontSize:11,color:'#9aa0a6',marginBottom:12}}>🔗 /blog/{b.slug}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>{setForm({title:b.title,slug:b.slug,content:b.content||'',excerpt:b.excerpt||'',featuredImageUrl:b.featuredImageUrl||'',seoTitle:b.seoTitle||'',seoDescription:b.seoDescription||'',status:b.status,author:b.author||''});setEditItem(b);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /> Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteId(b.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {modalOpen&&(<div className="modal-overlay" onClick={()=>setModalOpen(false)}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:680}}>
        <div className="modal-header"><div className="modal-title">{editItem?'Edit Blog Post':'New Blog Post'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
        <div style={{maxHeight:'65vh',overflowY:'auto',paddingRight:4}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>{f('title',e.target.value);if(!editItem)f('slug',genSlug(e.target.value));}} /></div>
            <div className="form-group"><label className="form-label">URL Slug</label><input className="form-input" value={form.slug} onChange={e=>f('slug',e.target.value)} placeholder="auto-generated from title" /></div>
            <div className="form-group"><label className="form-label">Excerpt</label><textarea className="form-textarea" style={{minHeight:60}} value={form.excerpt} onChange={e=>f('excerpt',e.target.value)} placeholder="Short summary shown in listings…" /></div>
            <div className="form-group"><label className="form-label">Content</label><textarea className="form-textarea" style={{minHeight:150}} value={form.content} onChange={e=>f('content',e.target.value)} placeholder="Full blog content (HTML supported)…" /></div>
            <ImageUploader
              label="Featured image"
              value={form.featuredImageUrl}
              onChange={url => f('featuredImageUrl', url)}
              folder="blogs"
            />
            <div className="grid-2" style={{gap:12}}>
              <div className="form-group"><label className="form-label">Author</label><input className="form-input" value={form.author} onChange={e=>f('author',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e=>f('status',e.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">SEO Title</label><input className="form-input" value={form.seoTitle} onChange={e=>f('seoTitle',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">SEO Description</label><input className="form-input" value={form.seoDescription} onChange={e=>f('seoDescription',e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update Post':'Publish Post')}</button></div>
      </div>
    </div>)}
    <ConfirmModal isOpen={!!deleteId} title="Delete Blog Post" message="Permanently delete this blog post?" danger onConfirm={async()=>{await blogAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
  </div>);
}

// ==================== REPORTS ====================
export function AdminReports() {
  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Reports');},[]);
  const REPORTS=[
    {icon:'🛒',title:'Sales Report',desc:'Daily, monthly, product-wise and salesperson performance',color:'#E6F1FB'},
    {icon:'🔧',title:'Service Report',desc:'Technician-wise, status-wise and monthly service analysis',color:'#EAF3DE'},
    {icon:'👥',title:'Customer Report',desc:'New, active, churned customers and Annual Service due list',color:'#FAEEDA'},
    {icon:'💡',title:'Lead Report',desc:'Source-wise, conversion rates and lead funnel',color:'#EEEDFE'},
    {icon:'🪪',title:'Employee Report',desc:'Sales, services and revenue generated per employee',color:'#FAECE7'},
    {icon:'📦',title:'Stock Report',desc:'Stock movement, low stock and reorder report',color:'#F1EFE8'},
    {icon:'💰',title:'Revenue Report',desc:'Daily, weekly, monthly and yearly revenue trend',color:'#E6F1FB'},
    {icon:'📩',title:'Enquiry Report',desc:'Enquiry source, conversion and response time analysis',color:'#EAF3DE'},
  ];
  return(<div>
    <div className="flex-between mb-20">
      <div><div style={{fontSize:18,fontWeight:700}}>Reports & Analytics</div><div className="text-muted text-sm">Export reports in PDF or Excel format</div></div>
      <div className="flex-gap">
        <button className="btn btn-ghost">📄 Export PDF</button>
        <button className="btn btn-primary">📥 Export Excel</button>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
      {REPORTS.map(r=>(
        <div key={r.title} className="section-card" style={{cursor:'pointer',transition:'transform .15s'}} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e=>e.currentTarget.style.transform='none'}>
          <div style={{padding:20}}>
            <div style={{width:48,height:48,background:r.color,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:12}}>{r.icon}</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:5}}>{r.title}</div>
            <div style={{fontSize:12,color:'#5f6368',lineHeight:1.5,marginBottom:14}}>{r.desc}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" style={{flex:1}}>View Report</button>
              <button className="btn btn-ghost btn-sm">📥 Export</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>);
}

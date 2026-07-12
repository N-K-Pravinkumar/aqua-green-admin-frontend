import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { serviceAPI } from '../../services/api';
import { ConfirmModal, formatCurrency, useToast } from '../../components/admin/AdminHelpers';
import ImageUploader from '../../components/admin/ImageUploader';

const EMPTY = { name:'',description:'',price:'',imageUrl:'',seoTitle:'',seoDescription:'',active:true,displayOrder:0,pricingMode:'SHOW_PRICE' };

export default function AdminServiceItems() {
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);
  const [modalOpen,setModalOpen]=useState(false);const [editItem,setEditItem]=useState(null);const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);const [deleteId,setDeleteId]=useState(null);
  const {show,ToastEl}=useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Service Management');},[]);

  const load=()=>{setLoading(true);serviceAPI.getAllAdmin().then(r=>setItems(r.data.data||[])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));};
  useEffect(load,[]);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async()=>{
    if(!form.name){show('Name required','error');return;}
    setSaving(true);
    try{
      const data={...form,price:form.price!==''?parseFloat(form.price):0,displayOrder:parseInt(form.displayOrder||0)};
      if(editItem) await serviceAPI.update(editItem.id,data);
      else await serviceAPI.create(data);
      show(editItem?'Updated':'Service created');setModalOpen(false);load();
    }catch{show('Failed','error');}finally{setSaving(false);}
  };

  return(<div>{ToastEl}
    <div className="flex-between mb-16">
      <div><div style={{fontSize:18,fontWeight:700}}>Service Management</div></div>
      <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setEditItem(null);setModalOpen(true);}}>+ Add Service</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
      {loading&&<div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>}
      {items.map(s=>(
        <div key={s.id} className="section-card">
          {s.imageUrl&&<img src={s.imageUrl} alt={s.name} style={{width:'100%',height:130,objectFit:'cover',borderRadius:'12px 12px 0 0'}} onError={e=>e.target.style.display='none'} />}
          <div style={{padding:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:12,color:'#5f6368',marginBottom:8,lineHeight:1.4}}>{s.description?.slice(0,80)}…</div>
            <div style={{fontWeight:700,color:'#009B00',fontSize:16,marginBottom:12}}>{Number(s.price)===0?'FREE':formatCurrency(s.price)}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>{setForm({name:s.name,description:s.description||'',price:s.price||'',imageUrl:s.imageUrl||'',seoTitle:s.seoTitle||'',seoDescription:s.seoDescription||'',active:s.active,displayOrder:s.displayOrder||0,pricingMode:s.pricingMode||'SHOW_PRICE'});setEditItem(s);setModalOpen(true);}}><Pencil size={13} style={{verticalAlign:'middle'}} /> Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteId(s.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {modalOpen&&(<div className="modal-overlay" onClick={()=>setModalOpen(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{editItem?'Edit Service':'Add Service'}</div><button className="modal-close" onClick={()=>setModalOpen(false)}>×</button></div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Service Name *</label><input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e=>f('description',e.target.value)} /></div>
          <div className="grid-2" style={{gap:12}}>
            <div className="form-group"><label className="form-label">Price (₹, 0 = Free)</label><input className="form-input" type="number" value={form.price} onChange={e=>f('price',e.target.value)} /></div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Pricing display on website</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                {[['SHOW_PRICE','Show price'],['CONTACT_FOR_PRICE','Enquire for best price'],['FREE','Free']].map(([val,lbl])=>(
                  <label key={val} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,padding:'7px 12px',borderRadius:8,border:`1.5px solid ${form.pricingMode===val?'#009B00':'#e9ecef'}`,background:form.pricingMode===val?'#e0f9e0':'#fff',fontWeight:form.pricingMode===val?700:400}}>
                    <input type="radio" name="svcPricingMode" value={val} checked={form.pricingMode===val} onChange={e=>f('pricingMode',e.target.value)} style={{accentColor:'#009B00'}} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Display Order</label><input className="form-input" type="number" value={form.displayOrder} onChange={e=>f('displayOrder',e.target.value)} /></div>
          </div>
          <ImageUploader
            label="Service image"
            value={form.imageUrl}
            onChange={url => f('imageUrl', url)}
            folder="services"
          />
          <div className="form-group"><label className="form-label">SEO Title</label><input className="form-input" value={form.seoTitle} onChange={e=>f('seoTitle',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">SEO Description</label><input className="form-input" value={form.seoDescription} onChange={e=>f('seoDescription',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.active} onChange={e=>f('active',e.target.value==='true')}><option value="true">Active</option><option value="false">Inactive</option></select></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Create Service')}</button></div>
      </div>
    </div>)}
    <ConfirmModal isOpen={!!deleteId} title="Delete Service" message="Deactivate this service?" danger onConfirm={async()=>{await serviceAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
  </div>);
}

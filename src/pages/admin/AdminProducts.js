import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { productAPI } from '../../services/api';
import { ConfirmModal, StatusBadge, useToast, formatCurrency } from '../../components/admin/AdminHelpers';

const CATS = ['DOMESTIC','COMMERCIAL','INDUSTRIAL'];
import ImageUploader from '../../components/admin/ImageUploader';

const EMPTY = { name:'',description:'',price:'',originalPrice:'',category:'DOMESTIC',capacityLitres:'',features:'',specifications:'',imageUrl:'',seoTitle:'',seoDescription:'',stock:'',minStock:'5',active:true,displayOrder:'0',pricingMode:'SHOW_PRICE' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [catFilter, setCatFilter] = useState('ALL');
  const { show, ToastEl } = useToast();

  useEffect(()=>{document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Product Management');},[]);

  const load = ()=>{
    setLoading(true);
    productAPI.getAllAdmin().then(r=>setProducts(r.data.data||[])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const filtered = catFilter==='ALL' ? products : products.filter(p=>p.category===catFilter);

  const openEdit = p => { setForm({name:p.name,description:p.description||'',price:p.price||'',originalPrice:p.originalPrice||'',category:p.category||'DOMESTIC',capacityLitres:p.capacityLitres||'',features:p.features||'',specifications:p.specifications||'',imageUrl:p.imageUrl||'',seoTitle:p.seoTitle||'',seoDescription:p.seoDescription||'',stock:p.stock||0,minStock:p.minStock||5,active:p.active,displayOrder:p.displayOrder||0,pricingMode:p.pricingMode||'SHOW_PRICE'}); setEditItem(p); setModalOpen(true); };
  const openCreate = ()=>{ setForm(EMPTY); setEditItem(null); setModalOpen(true); };

  const handleSave = async ()=>{
    if(!form.name){show('Product name is required','error');return;} if(form.pricingMode==='SHOW_PRICE'&&!form.price){show('Price is required when showing price','error');return;}
    setSaving(true);
    try {
      const data = {...form,price:parseFloat(form.price),originalPrice:form.originalPrice?parseFloat(form.originalPrice):null,stock:parseInt(form.stock)||0,minStock:parseInt(form.minStock)||5,displayOrder:parseInt(form.displayOrder)||0,capacityLitres:form.capacityLitres?parseInt(form.capacityLitres):null};
      if(editItem) await productAPI.update(editItem.id,data);
      else await productAPI.create(data);
      show(editItem?'Product updated':'Product created'); setModalOpen(false); load();
    } catch {show('Save failed','error');} finally {setSaving(false);}
  };

  const f = (field,val) => setForm(p=>({...p,[field]:val}));

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div><div style={{fontSize:18,fontWeight:700}}>Product Management</div><div className="text-muted text-sm">{products.length} products</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      <div className="filter-bar">
        {['ALL',...CATS].map(c=>(
          <button key={c} className={`filter-btn${catFilter===c?' active':''}`} onClick={()=>setCatFilter(c)}>{c==='ALL'?`All (${products.length})`:`${c} (${products.filter(p=>p.category===c).length})`}</button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
        {loading && <div style={{gridColumn:'1/-1',padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div>}
        {filtered.map(p=>(
          <div key={p.id} className="section-card" style={{overflow:'visible'}}>
            <div style={{position:'relative'}}>
              <img src={p.imageUrl||'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=220&fit=crop'} alt={p.name} style={{width:'100%',height:160,objectFit:'cover',borderRadius:'12px 12px 0 0'}} onError={e=>{e.target.src='https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=220&fit=crop';}} />
              <div style={{position:'absolute',top:8,right:8,display:'flex',gap:4}}>
                <span className={`badge ${p.active?'badge-converted':'badge-cancelled'}`}>{p.active?'Active':'Inactive'}</span>
                <StatusBadge status={p.category} />
              </div>
              {!p.active && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',borderRadius:'12px 12px 0 0',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700}}>INACTIVE</div>}
            </div>
            <div style={{padding:14}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{p.name}</div>
              <div style={{fontSize:12,color:'#5f6368',marginBottom:8,lineHeight:1.4}}>{p.description?.slice(0,80)}…</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:8}}>
                <span style={{fontSize:18,fontWeight:700,color:'#009B00'}}>{formatCurrency(p.price)}</span>
                {p.originalPrice && <span style={{fontSize:12,color:'#9aa0a6',textDecoration:'line-through'}}>{formatCurrency(p.originalPrice)}</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'#5f6368',marginBottom:10}}>
                <span>Stock: <strong style={{color:p.stock<=p.minStock?'#A32D2D':'#009B00'}}>{p.stock}</strong></span>
                <span>Min: {p.minStock}</span>
                <span>Order: #{p.displayOrder}</span>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>openEdit(p)}><Pencil size={13} style={{verticalAlign:'middle'}} /> Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteId(p.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen&&(
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:680}}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Product':'Add Product'}</div>
              <button className="modal-close" onClick={()=>setModalOpen(false)}>×</button>
            </div>
            <div style={{maxHeight:'65vh',overflowY:'auto',paddingRight:4}}>
              <div className="grid-2" style={{gap:12}}>
                <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Aqua Green RO 12L" /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e=>f('category',e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Price (₹) *</label><input className="form-input" type="number" value={form.price} onChange={e=>f('price',e.target.value)} placeholder="7499" /></div>
                <div className="form-group"><label className="form-label">Original Price (₹)</label><input className="form-input" type="number" value={form.originalPrice} onChange={e=>f('originalPrice',e.target.value)} placeholder="9000" /></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Pricing display on website</label>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:4}}>
                    {[['SHOW_PRICE','Show price'],['CONTACT_FOR_PRICE','Enquire for best price'],['FREE','Free / No charge']].map(([val,lbl])=>(
                      <label key={val} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,padding:'8px 14px',borderRadius:8,border:`1.5px solid ${form.pricingMode===val?'#009B00':'#e9ecef'}`,background:form.pricingMode===val?'#e0f9e0':'#fff',fontWeight:form.pricingMode===val?700:400}}>
                        <input type="radio" name="pricingMode" value={val} checked={form.pricingMode===val} onChange={e=>f('pricingMode',e.target.value)} style={{accentColor:'#009B00'}} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:'#9aa0a6',marginTop:5}}>
                    {form.pricingMode==='SHOW_PRICE' && '✓ Price is shown on the website product card'}
                    {form.pricingMode==='CONTACT_FOR_PRICE' && '✓ Shows "Enquire for Best Price" button — good for negotiable pricing'}
                    {form.pricingMode==='FREE' && '✓ Shows FREE on the card — price field is ignored'}
                  </div>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e=>f('description',e.target.value)} placeholder="Product description…" /></div>
                <div className="form-group"><label className="form-label">Features (comma-separated)</label><input className="form-input" value={form.features} onChange={e=>f('features',e.target.value)} placeholder="7-stage,UV,12L tank" /></div>
                <div className="form-group"><label className="form-label">Capacity (Litres)</label><input className="form-input" type="number" value={form.capacityLitres} onChange={e=>f('capacityLitres',e.target.value)} placeholder="12" /></div>
                <div className="form-group"><label className="form-label">Current Stock</label><input className="form-input" type="number" value={form.stock} onChange={e=>f('stock',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Min Stock Alert</label><input className="form-input" type="number" value={form.minStock} onChange={e=>f('minStock',e.target.value)} /></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <ImageUploader
                    label="Product image"
                    value={form.imageUrl}
                    onChange={url => f('imageUrl', url)}
                    folder="products"
                  />
                </div>
                <div className="form-group"><label className="form-label">SEO Title</label><input className="form-input" value={form.seoTitle} onChange={e=>f('seoTitle',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Display Order</label><input className="form-input" type="number" value={form.displayOrder} onChange={e=>f('displayOrder',e.target.value)} /></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">SEO Description</label><input className="form-input" value={form.seoDescription} onChange={e=>f('seoDescription',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.active} onChange={e=>f('active',e.target.value==='true')}><option value="true">Active</option><option value="false">Inactive</option></select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update Product':'Create Product')}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={!!deleteId} title="Delete Product" message="Deactivate this product?" danger onConfirm={async()=>{await productAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
    </div>
  );
}

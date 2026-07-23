import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Images, Grid2X2 } from 'lucide-react';
import { galleryAPI } from '../../services/api';
import { useToast, ConfirmModal, formatDate } from '../../components/admin/AdminHelpers';
import ImageUploader from '../../components/admin/ImageUploader';

const EMPTY = { title:'', description:'', imageUrl:'', imageAlt:'', category:'INSTALLATION', displayOrder:0, active:true };
const CATEGORIES = ['INSTALLATION','SERVICE','PRODUCT','TEAM','COMMERCIAL','AWARDS','EVENTS'];

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState('ALL');
  const { show, ToastEl } = useToast();

  useEffect(() => {
    document.getElementById('admin-page-title') &&
      (document.getElementById('admin-page-title').textContent = 'Gallery Management');
  },[]);

  const load = () => {
    setLoading(true);
    galleryAPI.getAll().then(r=>setItems(r.data.data||[])).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = item => { setForm({ title:item.title||'', description:item.description||'', imageUrl:item.imageUrl||'', imageAlt:item.imageAlt||'', category:item.category||'INSTALLATION', displayOrder:item.displayOrder||0, active:item.active!==false }); setEditId(item.id); setModal(true); };

  const handleSave = async () => {
    if (!form.title || !form.imageUrl) { show('Title and Image URL are required','error'); return; }
    setSaving(true);
    try {
      if (editId) await galleryAPI.update(editId, form);
      else await galleryAPI.create(form);
      show(editId ? 'Gallery item updated' : 'Gallery item added');
      setModal(false); load();
    } catch { show('Save failed','error'); }
    finally { setSaving(false); }
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const filtered = catFilter==='ALL' ? items : items.filter(i=>i.category===catFilter);

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-20">
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>Gallery Management</div>
          <div style={{ fontSize:13, color:'#6b7280' }}>{items.length} photos · {items.filter(i=>i.active).length} active</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span className="material-icons" style={{fontSize:16}}>add_photo_alternate</span>
          Add Photo
        </button>
      </div>

      {/* Category tabs */}
      <div className="filter-bar" style={{marginBottom:20}}>
        <button className={`filter-btn${catFilter==='ALL'?' active':''}`} onClick={()=>setCatFilter('ALL')}>All ({items.length})</button>
        {CATEGORIES.map(c=>(
          <button key={c} className={`filter-btn${catFilter===c?' active':''}`} onClick={()=>setCatFilter(c)}>
            {c} ({items.filter(i=>i.category===c).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{height:200,borderRadius:14}} />)}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
          {filtered.map(item => (
            <div key={item.id} className="card" style={{ overflow:'hidden', transition:'all .2s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.12)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{ position:'relative', height:170, overflow:'hidden', background:'#f3f4f6' }}>
                <img src={item.imageUrl} alt={item.imageAlt||item.title}
                  style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .35s ease' }}
                  onMouseEnter={e=>e.target.style.transform='scale(1.07)'}
                  onMouseLeave={e=>e.target.style.transform='scale(1)'}
                  onError={e=>{e.target.src='https://images.unsplash.com/photo-1581092162384-8987c1d64926?w=400&h=300&fit=crop&q=80';}} />
                {/* Status + category overlays */}
                <div style={{ position:'absolute', top:8, left:8, display:'flex', gap:5 }}>
                  <span style={{ background:'rgba(0,155,0,.85)', color:'#7fff7f', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>{item.category}</span>
                  {!item.active && <span style={{ background:'rgba(220,38,38,.85)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>Hidden</span>}
                </div>
                <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:4 }}>
                  <button onClick={()=>openEdit(item)} style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-icons" style={{fontSize:14,color:'#009B00'}}>edit</span>
                  </button>
                  <button onClick={()=>setDeleteId(item.id)} style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-icons" style={{fontSize:14,color:'#dc2626'}}>delete</span>
                  </button>
                </div>
              </div>
              <div style={{ padding:'10px 12px' }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{item.title}</div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>#{item.displayOrder || 0} · {formatDate(item.createdAt)}</div>
                {item.imageAlt && <div style={{ fontSize:10, color:'#6b7280', marginTop:3, fontStyle:'italic' }}>Alt: {item.imageAlt?.slice(0,45)}</div>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', padding:48, textAlign:'center', color:'#9ca3af' }}>
              <span className="material-icons" style={{fontSize:48, display:'block', marginBottom:12}}>photo_library</span>
              <p>No gallery items in {catFilter} yet</p>
              <button className="btn btn-primary mt-12" onClick={openCreate}>Add First Photo</button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Gallery Item' : 'Add Gallery Photo'}</div>
              <button className="modal-close" onClick={()=>setModal(false)}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e=>f('title',e.target.value)} placeholder="e.g. RO Installation at Saravanampatti" />
              </div>
              <ImageUploader
                value={form.imageUrl}
                onChange={url=>f('imageUrl',url)}
                folder="gallery"
                label="Image *"
              />
              <div className="form-group">
                <label className="form-label">SEO Alt Text</label>
                <input className="form-input" value={form.imageAlt} onChange={e=>f('imageAlt',e.target.value)} placeholder="RO Installation Coimbatore - Aqua Green Agencies" />
              </div>
              <div className="grid-2" style={{gap:12}}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e=>f('category',e.target.value)}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input className="form-input" type="number" value={form.displayOrder} onChange={e=>f('displayOrder',Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e=>f('description',e.target.value)} placeholder="Brief description for this photo..." style={{minHeight:70}} />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e=>f('active',e.target.checked)} />
                Visible on website
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : (editId ? '💾 Update' : '✅ Add Photo')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="Delete Photo" message="Remove this photo from the gallery?" danger
        onConfirm={async()=>{ await galleryAPI.delete(deleteId); setDeleteId(null); load(); show('Photo deleted'); }}
        onCancel={()=>setDeleteId(null)} />
    </div>
  );
}

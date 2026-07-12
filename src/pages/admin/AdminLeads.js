import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react';
import { leadAPI } from '../../services/api';
import Pagination from '../../components/admin/Pagination';
import SearchBox from '../../components/admin/SearchBox';
import { ConfirmModal, StatusBadge, formatDateTime, useToast } from '../../components/admin/AdminHelpers';
import { LeadDetailModal } from '../../components/admin/DetailModals';

const STATUSES = ['ALL','NEW','CONTACTED','FOLLOW_UP','QUOTATION_SENT','CONVERTED','LOST'];
const SOURCES = ['WEBSITE','GOOGLE_ADS','FACEBOOK','INSTAGRAM','WHATSAPP','REFERRAL'];
const EMPLOYEES = ['Murugan K','Senthil K','Karthik R','Arun Kumar'];

const EMPTY = { name:'',mobile:'',email:'',city:'',requirement:'',source:'WEBSITE',assignedEmployee:'',status:'NEW',notes:'' };

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [viewLead, setViewLead] = useState(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages:1, totalElements:0 });
  const PAGE_SIZE = 20;
  const debounce = useRef(null);
  const { show, ToastEl } = useToast();

  useEffect(() => { document.getElementById('admin-page-title') && (document.getElementById('admin-page-title').textContent = 'Lead Management'); }, []);

  const load = (pg = page, f = filter) => {
    setLoading(true);
    const status = f !== 'ALL' ? f : undefined;
    Promise.all([leadAPI.getAll(status, pg, PAGE_SIZE), leadAPI.getCounts()]).then(([r, cr]) => {
      const pdata = r.data.data;
      setLeads(pdata?.content || pdata || []);
      setPageInfo({ totalPages: pdata?.totalPages||1, totalElements: pdata?.totalElements||0 });
      setCounts(cr.data.data || {});
    }).catch(() => show('Failed to load leads', 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { load(0, filter); setPage(0); }, [filter]);
  useEffect(() => { load(page, filter); }, [page]);

  const handleSearchChange = v => {
    setSearch(v);
    clearTimeout(debounce.current);
    if (v.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const r = await leadAPI.getAll(undefined, 0, 8);
        const items = r.data.data?.content || r.data.data || [];
        const q = v.toLowerCase();
        setSuggestions(items
          .filter(l => l.name?.toLowerCase().includes(q) || l.mobile?.includes(v) || l.requirement?.toLowerCase().includes(q))
          .slice(0, 6)
          .map(l => ({ label: l.name, sub: `${l.mobile} · ${l.status} · ${l.source}`, value: l })));
      } catch {}
    }, 300);
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name?.toLowerCase().includes(q) || l.mobile?.includes(search) || l.requirement?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
  });

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (l) => { setForm({ name:l.name,mobile:l.mobile,email:l.email||'',city:l.city||'',requirement:l.requirement||'',source:l.source||'WEBSITE',assignedEmployee:l.assignedEmployee||'',status:l.status,notes:l.notes||'' }); setEditItem(l); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.mobile) { show('Name and mobile are required', 'error'); return; }
    setSaving(true);
    try {
      if (editItem) await leadAPI.update(editItem.id, form);
      else await leadAPI.create(form);
      show(editItem ? 'Lead updated' : 'Lead created');
      setModalOpen(false); load();
    } catch { show('Save failed', 'error'); } finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await leadAPI.updateStatus(id, status); load(); show('Status updated'); } catch { show('Failed', 'error'); }
  };

  const handleDelete = async () => {
    try { await leadAPI.delete(deleteId); setDeleteId(null); load(); show('Deleted'); } catch { show('Delete failed', 'error'); }
  };

  const handleNotesSave = async () => {
    try { await leadAPI.addNote(noteId, noteText); setNoteId(null); setNoteText(''); load(); show('Notes saved'); } catch { show('Failed', 'error'); }
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>Lead Management</div>
          <div className="text-muted text-sm">{counts.TOTAL || 0} total leads</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Lead</button>
      </div>

      <div className="filter-bar" style={{flexWrap:'wrap',gap:6}}>
        {STATUSES.map(s => (
          <button key={s} className={`filter-btn${filter===s?' active':''}`} onClick={() => setFilter(s)}>
            {s === 'ALL' ? `All (${counts.TOTAL||0})` : `${s.replace('_',' ')} (${counts[s]||0})`}
          </button>
        ))}
        <div style={{marginLeft:'auto'}}>
          <SearchBox value={search} onChange={handleSearchChange} placeholder="Search leads…" suggestions={suggestions} onSelect={s=>{ setSearch(s.label); setSuggestions([]); }} width="220px" />
        </div>
      </div>

      <div className="section-card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Mobile</th><th>City</th><th>Requirement</th><th>Source</th><th>Assigned to</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && <tr><td colSpan={10} style={{padding:32,textAlign:'center',color:'#9aa0a6'}}>No leads found</td></tr>}
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td style={{color:'#9aa0a6',fontSize:11}}>L-{String(l.id).padStart(3,'0')}</td>
                    <td>
                      <div style={{fontWeight:600}}>{l.name}</div>
                      {l.email && <div style={{fontSize:10,color:'#9aa0a6'}}>{l.email}</div>}
                    </td>
                    <td><a href={`tel:${l.mobile}`} style={{color:'#009B00',fontWeight:600}}>{l.mobile}</a></td>
                    <td>{l.city||'—'}</td>
                    <td style={{maxWidth:140,fontSize:12}}>{l.requirement?.slice(0,40)}{l.requirement?.length>40?'…':''}</td>
                    <td><span style={{fontSize:11}}>{l.source?.replace('_',' ')}</span></td>
                    <td style={{fontSize:12}}>{l.assignedEmployee||'—'}</td>
                    <td>
                      <select value={l.status} onChange={e=>handleStatusChange(l.id,e.target.value)}
                        style={{fontSize:11,padding:'3px 6px',borderRadius:6,border:'1px solid #e8eaed',cursor:'pointer',background:'#fff'}}>
                        {STATUSES.filter(s=>s!=='ALL').map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </td>
                    <td style={{fontSize:11,color:'#9aa0a6',whiteSpace:'nowrap'}}>{formatDateTime(l.createdAt)}</td>
                    <td>
                      <div className="flex-gap" style={{gap:4}}>
                        <button className="btn btn-xs" style={{background:'#e0f9e0',color:'#009B00',fontWeight:700,border:'none'}} onClick={()=>setViewLead(l)}>👁 View</button>
                        <a href={`tel:${l.mobile}`} className="btn btn-xs btn-ghost" title="Call"><Phone size={13} style={{verticalAlign:'middle'}} /></a>
                        <a href={`https://wa.me/91${l.mobile}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost" title="WhatsApp"><MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /></a>
                        <button className="btn btn-xs btn-ghost" title="Notes" onClick={()=>{setNoteId(l.id);setNoteText(l.notes||'');}}>📝</button>
                        <button className="btn btn-xs btn-ghost" onClick={()=>openEdit(l)}><Pencil size={13} style={{verticalAlign:'middle'}} /></button>
                        <button className="btn btn-xs btn-ghost" onClick={()=>setDeleteId(l.id)} style={{color:'#A32D2D'}}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Lead' : 'Add New Lead'}</div>
              <button className="modal-close" onClick={()=>setModalOpen(false)}>×</button>
            </div>
            <div className="grid-2">
              {[['Name *','name','text'],['Mobile *','mobile','tel'],['Email','email','email'],['City','city','text']].map(([label,field,type])=>(
                <div className="form-group" key={field}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder={label.replace(' *','')} />
                </div>
              ))}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Requirement</label>
                <input className="form-input" value={form.requirement} onChange={e=>setForm(f=>({...f,requirement:e.target.value}))} placeholder="What does the customer need?" />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
                  {SOURCES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to</label>
                <select className="form-select" value={form.assignedEmployee} onChange={e=>setForm(f=>({...f,assignedEmployee:e.target.value}))}>
                  <option value="">Unassigned</option>
                  {EMPLOYEES.map(e=><option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUSES.filter(s=>s!=='ALL').map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes about this lead…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner"></span> Saving…</> : (editItem ? 'Update Lead' : 'Create Lead')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {noteId && (
        <div className="modal-overlay" onClick={()=>setNoteId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add / Edit Notes</div>
              <button className="modal-close" onClick={()=>setNoteId(null)}>×</button>
            </div>
            <textarea className="form-textarea" style={{minHeight:120}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Type your notes…" />
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setNoteId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleNotesSave}>Save Notes</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteId} title="Delete Lead" message="Are you sure you want to delete this lead? This cannot be undone." danger onConfirm={handleDelete} onCancel={()=>setDeleteId(null)} />
      <LeadDetailModal lead={viewLead} onClose={()=>setViewLead(null)} />
    </div>
  );
}

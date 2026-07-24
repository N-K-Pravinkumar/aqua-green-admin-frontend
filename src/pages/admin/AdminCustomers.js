import { useState, useEffect, useRef } from 'react';
import { Eye, MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react';
import { customerAPI, seedCleanupAPI } from '../../services/api';
import Pagination from '../../components/admin/Pagination';
import SearchBox from '../../components/admin/SearchBox';
import { ConfirmModal, formatDate, useToast } from '../../components/admin/AdminHelpers';
import { CustomerDetailModal } from '../../components/admin/DetailModals';

const EMPTY = { name:'',mobile:'',email:'',address:'',city:'',gstNumber:'',customerType:'RESIDENTIAL' };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeQuery, setActiveQuery] = useState(''); // the query actually being searched for (post-debounce)
  const [suggestions, setSuggestions] = useState([]);
  const [singleResult, setSingleResult] = useState(null); // set when a suggestion is clicked — shows just that one customer
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages:1, totalElements:0 });
  const PAGE_SIZE = 20;
  const debounce = useRef(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const { show, ToastEl } = useToast();

  useEffect(()=>{ document.getElementById('admin-page-title')&&(document.getElementById('admin-page-title').textContent='Customers'); },[]);

  const isSearching = activeQuery.trim().length >= 2;

  // Single load function driving both normal browsing AND search — both are
  // properly paginated at PAGE_SIZE through the exact same Pagination control,
  // instead of search dumping every match onto one unpaginated page.
  const load = () => {
    if (singleResult) return; // showing exactly one clicked customer — nothing to load
    setLoading(true);
    const req = isSearching
      ? customerAPI.search(activeQuery.trim(), page, PAGE_SIZE)
      : customerAPI.getAll(page, PAGE_SIZE);
    req.then(r=>{
      const d=r.data.data; setCustomers(d?.content||d||[]);
      setPageInfo({totalPages:d?.totalPages||1,totalElements:d?.totalElements||0});
    }).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load,[page,activeQuery,singleResult]);

  const handleSearchChange = v => {
    setSearch(v);
    setSingleResult(null);
    clearTimeout(debounce.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      if (activeQuery) { setActiveQuery(''); setPage(0); } // back to normal browsing
      return;
    }
    debounce.current = setTimeout(async () => {
      // Suggestions dropdown: quick preview of the first few matches as you type
      try {
        const r = await customerAPI.search(v.trim(), 0, 6);
        const content = r.data.data?.content || [];
        setSuggestions(content.map(c=>({ label:c.name, sub:`${c.mobile} · ${c.address||c.city||''}`, value:c })));
      } catch { setSuggestions([]); }
      // Commit the search — this drives the actual (paginated) table
      setPage(0);
      setActiveQuery(v.trim());
    }, 300);
  };

  const selectSuggestion = (s) => {
    setSearch(s.label);
    setSuggestions([]);
    setActiveQuery('');
    setSingleResult(s.value); // show exactly this customer, first "page", nothing else
  };

  const clearSearch = () => { setSearch(''); setActiveQuery(''); setSuggestions([]); setSingleResult(null); setPage(0); };

  const filtered = singleResult ? [singleResult] : customers;
  const effectivePageInfo = singleResult ? { totalPages:1, totalElements:1 } : pageInfo;

  const openEdit = c => { setForm({name:c.name,mobile:c.mobile,email:c.email||'',address:c.address||'',city:c.city||'',gstNumber:c.gstNumber||'',customerType:c.customerType||'RESIDENTIAL'}); setEditItem(c); setModalOpen(true); };
  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name||!form.mobile){show('Name & mobile required','error');return;}
    setSaving(true);
    try {
      if(editItem) await customerAPI.update(editItem.id,form);
      else await customerAPI.create(form);
      show(editItem?'Updated':'Customer created'); setModalOpen(false); load();
    } catch {show('Save failed','error');} finally {setSaving(false);}
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div>
          <div style={{fontSize:18,fontWeight:700}}>Customers</div>
          <div className="text-muted text-sm">
            {singleResult
              ? `Showing 1 customer`
              : isSearching
                ? `${pageInfo.totalElements} result${pageInfo.totalElements!==1?'s':''} for "${activeQuery}"`
                : `${pageInfo.totalElements || customers.length} total customers`}
            {(isSearching || singleResult) && <button onClick={clearSearch} style={{marginLeft:8,background:'none',border:'none',color:'#009B00',fontWeight:600,cursor:'pointer',fontSize:12,padding:0}}>Clear</button>}
          </div>
        </div>
        <div className="flex-gap">
          <SearchBox value={search} onChange={handleSearchChange} placeholder="Search customers…" suggestions={suggestions} onSelect={selectSuggestion} width="240px" />
          <button className="btn btn-ghost" onClick={async()=>{
            try {
              const r = await customerAPI.assignCodes();
              show(r.data.message);
              load();
            } catch { show('Failed', 'error'); }
          }}>Assign Codes</button>
          <button className="btn btn-ghost" style={{color:'#A32D2D'}} onClick={async()=>{
            try {
              const r = await seedCleanupAPI.preview();
              const d = r.data.data;
              const total = d.fakeCustomers + d.fakeLeads + d.fakeSales + d.fakeServiceRequests + d.fakePayments;
              if (total === 0) { show('No demo/seed data found — nothing to clean up'); return; }
              const msg = `Found demo/test data:\n${d.fakeCustomers} customers, ${d.fakeLeads} leads, ${d.fakeSales} sales, ${d.fakeServiceRequests} service requests, ${d.fakePayments} payments.\n\nThis is auto-generated test data (Tamil-name-pool synthetic records), not your real business data. Delete it permanently?`;
              if (!window.confirm(msg)) return;
              const r2 = await seedCleanupAPI.execute();
              show(r2.data.message);
              load();
            } catch { show('Cleanup failed', 'error'); }
          }}>Remove Demo Data</button>
          <button className="btn btn-ghost" onClick={async()=>{
            if (!window.confirm('This will merge any customers sharing the same mobile number into one record. Safe to run — it only combines duplicates, nothing is lost. Continue?')) return;
            try {
              const r = await customerAPI.mergeDuplicates();
              show(r.data.message);
              load();
            } catch { show('Merge failed', 'error'); }
          }}>Merge Duplicates</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
        </div>
      </div>

      <div className="section-card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Email</th><th>City</th><th>Type</th><th>GST</th><th>Since</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={9} style={{padding:32,textAlign:'center',color:'#9aa0a6'}}>{isSearching ? `No customers match "${activeQuery}"` : 'No customers found'}</td></tr>}
                {filtered.map(c=>(
                  <tr key={c.id}>
                    <td style={{color:'#9aa0a6',fontSize:11,fontWeight:600}}>{c.customerCode || `C-${String(c.id).padStart(3,'0')}`}</td>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td><a href={`tel:${c.mobile}`} style={{color:'#009B00',fontWeight:600}}>{c.mobile}</a></td>
                    <td style={{fontSize:12,color:'#5f6368'}}>{c.email||'—'}</td>
                    <td style={{fontSize:12}}>{c.city||'—'}</td>
                    <td><span className={`badge ${c.customerType==='COMMERCIAL'?'badge-followup':'badge-new'}`}>{c.customerType}</span></td>
                    <td style={{fontSize:11,color:'#5f6368'}}>{c.gstNumber||'—'}</td>
                    <td style={{fontSize:11,color:'#9aa0a6'}}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="flex-gap" style={{gap:4}}>
                        <button className="btn btn-xs" style={{background:'#e0f9e0',color:'#009B00',fontWeight:700,border:'none'}} onClick={()=>setViewCustomer(c)}><Eye size={13} style={{verticalAlign:'middle'}} /> History</button>
                        <a href={`tel:${c.mobile}`} className="btn btn-xs btn-ghost"><Phone size={13} style={{verticalAlign:'middle'}} /></a>
                        <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost"><MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /></a>
                        <button className="btn btn-xs btn-ghost" onClick={()=>openEdit(c)}><Pencil size={13} style={{verticalAlign:'middle'}} /></button>
                        <button className="btn btn-xs btn-ghost" style={{color:'#A32D2D'}} onClick={()=>setDeleteId(c.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!singleResult && (
              <Pagination page={page} totalPages={effectivePageInfo.totalPages} totalElements={effectivePageInfo.totalElements} pageSize={PAGE_SIZE} onPageChange={p=>{setPage(p);}} />
            )}
          </div>
        )}
      </div>

      {modalOpen&&(
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem?'Edit Customer':'Add Customer'}</div>
              <button className="modal-close" onClick={()=>setModalOpen(false)}>×</button>
            </div>
            <div className="grid-2">
              {[['Name *','name'],['Mobile *','mobile'],['Email','email'],['City','city']].map(([l,f])=>(
                <div className="form-group" key={f}><label className="form-label">{l}</label><input className="form-input" value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} placeholder={l.replace(' *','')} /></div>
              ))}
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Address</label><textarea className="form-textarea" style={{minHeight:60}} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Full address…" /></div>
              <div className="form-group"><label className="form-label">Customer Type</label><select className="form-select" value={form.customerType} onChange={e=>setForm(p=>({...p,customerType:e.target.value}))}><option value="RESIDENTIAL">Residential</option><option value="COMMERCIAL">Commercial</option></select></div>
              <div className="form-group"><label className="form-label">GST Number</label><input className="form-input" value={form.gstNumber} onChange={e=>setForm(p=>({...p,gstNumber:e.target.value}))} placeholder="Optional" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"></span> Saving…</>:(editItem?'Update':'Create Customer')}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={!!deleteId} title="Remove Customer" message="Deactivate this customer?" danger onConfirm={async()=>{await customerAPI.delete(deleteId);setDeleteId(null);load();show('Removed');}} onCancel={()=>setDeleteId(null)} />
      <CustomerDetailModal customer={viewCustomer} onClose={()=>setViewCustomer(null)} />
    </div>
  );
}

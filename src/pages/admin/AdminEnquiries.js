import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Phone, Trash2 } from 'lucide-react';
import Pagination from '../../components/admin/Pagination';
import SearchBox from '../../components/admin/SearchBox';
import { useNavigate } from 'react-router-dom';
import { enquiryAPI } from '../../services/api';
import { ConfirmModal, formatDateTime, useToast } from '../../components/admin/AdminHelpers';

const STATUSES = ['ALL','NEW','CONTACTED','CONVERTED','CLOSED'];

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages:1, totalElements:0 });
  const PAGE_SIZE = 20;
  const debounce = useRef(null);
  const handleSearchChange = v => {
    setSearch(v);
    clearTimeout(debounce.current);
    if (v.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const r = await enquiryAPI.getAll(undefined, 0, 8);
        const q = v.toLowerCase();
        const arr = r.data.data?.content || r.data.data || [];
        setSuggestions(arr
          .filter(e => e.customerName?.toLowerCase().includes(q) || e.mobile?.includes(v) || e.serviceRequired?.toLowerCase().includes(q))
          .slice(0, 6)
          .map(e => ({ label: e.customerName, sub: `${e.mobile} · ${e.serviceRequired||'General'} · ${e.status}`, value: e })));
      } catch {}
    }, 300);
  };
  const { show, ToastEl } = useToast();
  const navigate = useNavigate();

  useEffect(() => { document.getElementById('admin-page-title') && (document.getElementById('admin-page-title').textContent = 'Enquiries'); }, []);

  const load = () => {
    setLoading(true);
    Promise.all([enquiryAPI.getAll(), enquiryAPI.getCounts()]).then(([r, cr]) => {
      const d = r.data.data; setEnquiries(d?.content||d||[]);
      setPageInfo({totalPages:d?.totalPages||1,totalElements:d?.totalElements||0});
      setCounts(cr.data.data || {});
    }).catch(()=>show('Load failed','error')).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const filtered = filter === 'ALL' ? enquiries : enquiries.filter(e => e.status === filter);

  const handleStatus = async (id, status) => {
    try { await enquiryAPI.updateStatus(id, status); load(); show('Status updated'); } catch { show('Failed','error'); }
  };

  return (
    <div>
      {ToastEl}
      <div className="flex-between mb-16">
        <div>
          <div style={{fontSize:18,fontWeight:700}}>Enquiries</div>
          <div className="text-muted text-sm">Website enquiries from customers</div>
        </div>
      </div>

      <div className="filter-bar">
        {STATUSES.map(s=>(
          <button key={s} className={`filter-btn${filter===s?' active':''}`} onClick={()=>setFilter(s)}>
            {s==='ALL'?`All (${counts.TOTAL||0})`:`${s} (${counts[s]||0})`}
          </button>
        ))}
      </div>

      <div className="section-card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'#9aa0a6'}}>Loading…</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Customer</th><th>Mobile</th><th>Product / Service</th><th>Message</th><th>Source</th><th>Status</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} style={{padding:32,textAlign:'center',color:'#9aa0a6'}}>No enquiries found</td></tr>}
                {filtered.map(e=>(
                  <tr key={e.id}>
                    <td style={{color:'#9aa0a6',fontSize:11}}>#{e.id}</td>
                    <td>
                      <div style={{fontWeight:600}}>{e.customerName}</div>
                      {e.email && <div style={{fontSize:10,color:'#9aa0a6'}}>{e.email}</div>}
                      {e.address && <div style={{fontSize:10,color:'#9aa0a6'}}>📍 {e.address}</div>}
                    </td>
                    <td><a href={`tel:${e.mobile}`} style={{color:'#009B00',fontWeight:600}}>{e.mobile}</a></td>
                    <td>
                      {e.productName && <div style={{fontWeight:600,fontSize:12,color:'#009B00'}}>{e.productName}</div>}
                      {e.serviceRequired && <div style={{fontSize:11,color:'#5f6368'}}>{e.serviceRequired}</div>}
                    </td>
                    <td style={{maxWidth:160,fontSize:11,color:'#5f6368'}}>{e.message?.slice(0,50)}{e.message?.length>50?'…':''||'—'}</td>
                    <td><span style={{fontSize:11,background:'#f1f3f4',padding:'2px 7px',borderRadius:10}}>{e.source}</span></td>
                    <td>
                      <select value={e.status} onChange={ev=>handleStatus(e.id,ev.target.value)}
                        style={{fontSize:11,padding:'3px 6px',borderRadius:6,border:'1px solid #e8eaed',cursor:'pointer',background:'#fff'}}>
                        {STATUSES.filter(s=>s!=='ALL').map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{fontSize:11,color:'#9aa0a6',whiteSpace:'nowrap'}}>{formatDateTime(e.createdAt)}</td>
                    <td>
                      <div className="flex-gap" style={{gap:4}}>
                        <a href={`tel:${e.mobile}`} className="btn btn-xs btn-ghost"><Phone size={13} style={{verticalAlign:'middle'}} /></a>
                        <a href={`https://wa.me/91${e.mobile}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost"><MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /></a>
                        <button className="btn btn-xs btn-primary" title="Go to billing for this customer"
                          onClick={async () => {
                            await enquiryAPI.updateStatus(e.id, 'CONVERTED');
                            navigate(`/admin/comms-hub?mobile=${e.mobile}&name=${encodeURIComponent(e.customerName)}&tab=billing`);
                          }}>🧾 Bill</button>
                        <button className="btn btn-xs btn-ghost" style={{color:'#A32D2D'}} onClick={()=>setDeleteId(e.id)}><Trash2 size={13} style={{verticalAlign:'middle'}} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={PAGE_SIZE} onPageChange={p=>setPage(p)} />
          </div>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteId} title="Delete Enquiry" message="Delete this enquiry record?" danger onConfirm={async()=>{await enquiryAPI.delete(deleteId);setDeleteId(null);load();show('Deleted');}} onCancel={()=>setDeleteId(null)} />
    </div>
  );
}

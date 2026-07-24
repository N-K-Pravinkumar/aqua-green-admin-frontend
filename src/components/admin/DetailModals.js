import { useState, useEffect } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { saleAPI, serviceRequestAPI, enquiryAPI, quotationAPI, customerAPI, saleInvoiceAPI, serviceRequestExtAPI } from '../../services/api';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function groupByDate(events) {
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return groups;
}

const TYPE_CONFIG = {
  sale:    { icon: '🛒', color: '#EAF3DE', iconColor: '#27500A', label: 'Purchase' },
  service: { icon: '🔧', color: '#FAEEDA', iconColor: '#633806', label: 'Service' },
  enquiry: { icon: '📩', color: '#E6F1FB', iconColor: '#0C447C', label: 'Enquiry' },
  quotation: { icon: '📋', color: '#EEEDFE', iconColor: '#3C3489', label: 'Quotation' },
};

function parseItems(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/**
 * Full itemized breakdown for a service request — what parts/products
 * were used, at what price, and how that adds up to the final total.
 * Usable both from the Service Requests table and from a customer's
 * History timeline (same underlying service request object either way).
 */
export function ServiceDetailModal({ service, onClose, onEdit }) {
  if (!service) return null;
  const spareParts = parseItems(service.sparePartsJson);
  const productsSold = parseItems(service.productsSoldJson);
  const serviceCharge = Number(service.serviceCharge || 0);
  const sparePartsTotal = Number(service.sparePartsTotal || 0);
  const productsSoldTotal = Number(service.productsSoldTotal || 0);
  const grandTotal = Number(service.totalBillAmount || (serviceCharge + sparePartsTotal + productsSoldTotal));

  const rows = [
    { label: 'Service Charge', qty: '', price: '', total: serviceCharge, show: serviceCharge > 0 },
    ...spareParts.map(p => ({ label: p.name || 'Spare Part', qty: p.qty || 1, price: p.unitPrice ?? p.price ?? '', total: Number(p.lineTotal ?? p.unitPrice ?? p.price ?? 0) * (p.lineTotal ? 1 : (p.qty || 1)), show: true })),
    ...productsSold.map(p => ({ label: p.productName || p.name || 'Product', qty: p.qty || 1, price: p.unitPrice ?? '', total: Number(p.lineTotal ?? (Number(p.unitPrice||0) * (p.qty||1))), show: true })),
  ].filter(r => r.show);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxWidth:640}}>
        <div className="modal-header">
          <div className="modal-title">Service Details — {service.ticketNumber || service.serviceCode}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:13}}>
            <div><span style={{color:'#9aa0a6'}}>Customer:</span> <strong>{service.customerName || '—'}</strong></div>
            <div><span style={{color:'#9aa0a6'}}>Mobile:</span> <strong>{service.customerMobile || '—'}</strong></div>
            <div><span style={{color:'#9aa0a6'}}>Product:</span> {service.productName || '—'}</div>
            <div><span style={{color:'#9aa0a6'}}>Technician:</span> {service.assignedTechnician || 'Unassigned'}</div>
            <div><span style={{color:'#9aa0a6'}}>Status:</span> {service.status}</div>
            <div><span style={{color:'#9aa0a6'}}>Payment:</span> {service.paymentStatus} {service.paymentMethod ? `(${service.paymentMethod})` : ''}</div>
            <div><span style={{color:'#9aa0a6'}}>Completed:</span> {formatDate(service.completedAt)}</div>
            <div><span style={{color:'#9aa0a6'}}>Ticket date:</span> {formatDate(service.createdAt)}</div>
          </div>

          {service.issueDescription && (
            <div style={{fontSize:13, background:'#f8fafc', padding:10, borderRadius:8}}>
              <span style={{color:'#9aa0a6'}}>Issue:</span> {service.issueDescription}
            </div>
          )}

          <div>
            <div style={{fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:6}}>WHAT WAS DONE</div>
            {rows.length === 0 ? (
              <div style={{fontSize:13, color:'#9aa0a6', padding:12, textAlign:'center', background:'#f8fafc', borderRadius:8}}>No itemized charges recorded for this ticket.</div>
            ) : (
              <table className="data-table" style={{fontSize:13}}>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={i}>
                      <td>{r.label}</td>
                      <td>{r.qty || '—'}</td>
                      <td>{r.price !== '' ? `₹${Number(r.price).toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{textAlign:'right', fontWeight:600}}>₹{Number(r.total||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <div style={{minWidth:220, fontSize:13}}>
              {sparePartsTotal > 0 && <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}><span>Spare Parts</span><span>₹{sparePartsTotal.toLocaleString('en-IN')}</span></div>}
              {productsSoldTotal > 0 && <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}><span>Products Sold</span><span>₹{productsSoldTotal.toLocaleString('en-IN')}</span></div>}
              {serviceCharge > 0 && <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}><span>Service Charge</span><span>₹{serviceCharge.toLocaleString('en-IN')}</span></div>}
              <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'2px solid #009B00', marginTop:4, fontWeight:800, fontSize:15, color:'#009B00'}}>
                <span>TOTAL</span><span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {service.technicianNotes && (
            <div style={{fontSize:12, color:'#6b7280', background:'#fffbeb', padding:10, borderRadius:8}}>
              <strong>Technician notes:</strong> {service.technicianNotes}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {onEdit && <button className="btn btn-primary" onClick={()=>{onClose(); onEdit(service);}}>Edit This Ticket</button>}
        </div>
      </div>
    </div>
  );
}

export function LeadDetailModal({ lead, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState(null);

  useEffect(() => {
    if (!lead) return;
    Promise.all([
      saleAPI.getAll(),
      serviceRequestAPI.getAll(),
      enquiryAPI.getAll(),
      quotationAPI.getAll(),
    ]).then(([sR, srR, eR, qR]) => {
      const mobile = lead.mobile?.replace(/\s/g,'');
      const events = [];

      (sR.data.data||[]).filter(s => s.customerName?.toLowerCase()===lead.name?.toLowerCase() || s.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(s => events.push({ type:'sale', date:s.createdAt, title:`Purchase — ${s.productName}`, sub:`Invoice: ${s.invoiceNumber} · ${s.paymentStatus}`, amount:s.totalAmount, raw:s }));

      (srR.data.data||[]).filter(s => s.customerName?.toLowerCase()===lead.name?.toLowerCase() || s.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(s => events.push({ type:'service', date:s.createdAt, title:`${s.issueDescription?.slice(0,50)}`, sub:`Technician: ${s.assignedTechnician||'Unassigned'} · ${s.status}`, amount:s.serviceCharge, raw:s }));

      (eR.data.data||[]).filter(e => e.customerName?.toLowerCase()===lead.name?.toLowerCase() || e.mobile?.replace(/\s/g,'')===mobile)
        .forEach(e => events.push({ type:'enquiry', date:e.createdAt, title:`Enquiry — ${e.serviceRequired||e.productName||'General'}`, sub:e.message?.slice(0,60)||'No message', raw:e }));

      (qR.data.data||[]).filter(q => q.customerName?.toLowerCase()===lead.name?.toLowerCase() || q.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(q => events.push({ type:'quotation', date:q.createdAt, title:`Quotation ${q.quotationNumber}`, sub:`Status: ${q.status} · Total: ₹${Number(q.totalAmount||0).toLocaleString('en-IN')}`, raw:q }));

      events.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTimeline(events);
      if (events.length > 0) {
        const firstDate = new Date(events[0].date).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
        setExpandedDate(firstDate);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [lead]);

  if (!lead) return null;
  const grouped = groupByDate(timeline);

  const STATUS_COLOR = { NEW:'#E6F1FB', CONTACTED:'#FAEEDA', FOLLOW_UP:'#EEEDFE', QUOTATION_SENT:'#FAEEDA', CONVERTED:'#EAF3DE', LOST:'#FCEBEB' };
  const STATUS_TEXT = { NEW:'#0C447C', CONTACTED:'#633806', FOLLOW_UP:'#3C3489', QUOTATION_SENT:'#633806', CONVERTED:'#27500A', LOST:'#791F1F' };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex:1100}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',animation:'scaleIn 0.3s ease'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#009B00,#007A00)',padding:'20px 24px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#7fff7f'}}>
                  {lead.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{color:'#fff',fontSize:18,fontWeight:700}}>{lead.name}</div>
                  <div style={{color:'#7fff7f',fontSize:13}}>Lead ID: L-{String(lead.id).padStart(3,'0')}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <span style={{color:'#b8dfd2',fontSize:12}}>📞 {lead.mobile}</span>
                {lead.email&&<span style={{color:'#b8dfd2',fontSize:12}}>✉️ {lead.email}</span>}
                {lead.city&&<span style={{color:'#b8dfd2',fontSize:12}}>📍 {lead.city}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:16}}>✕</button>
          </div>
        </div>

        {/* Details strip */}
        <div style={{background:'#f8fffe',borderBottom:'1px solid #e8eaed',padding:'12px 24px',display:'flex',gap:20,flexWrap:'wrap',flexShrink:0}}>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>REQUIREMENT</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{lead.requirement||'—'}</div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>SOURCE</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{lead.source?.replace('_',' ')||'—'}</div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>ASSIGNED TO</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{lead.assignedEmployee||'Unassigned'}</div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>STATUS</span><div style={{marginTop:2}}><span style={{background:STATUS_COLOR[lead.status],color:STATUS_TEXT[lead.status],fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{lead.status?.replace('_',' ')}</span></div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>CREATED</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{formatDate(lead.createdAt)}</div></div>
          <div style={{gridColumn:'1/-1'}}><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>NOTES</span><div style={{fontSize:13,marginTop:2,color:'#5f6368'}}>{lead.notes||'No notes added.'}</div></div>
        </div>

        {/* Timeline */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            📅 Customer History <span style={{fontSize:12,color:'#9aa0a6',fontWeight:400}}>({timeline.length} events)</span>
          </div>

          {loading&&<div style={{textAlign:'center',padding:32,color:'#9aa0a6'}}>Loading history…</div>}

          {!loading&&timeline.length===0&&(
            <div style={{textAlign:'center',padding:32,color:'#9aa0a6',background:'#f8f9fa',borderRadius:8}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div>No activity history found for this customer yet.</div>
            </div>
          )}

          {Object.entries(grouped).map(([date, events]) => (
            <div key={date} style={{marginBottom:12}}>
              {/* Date header — clickable */}
              <div onClick={()=>setExpandedDate(expandedDate===date?null:date)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:expandedDate===date?'#e0f9e0':'#f8f9fa',borderRadius:8,cursor:'pointer',border:`1px solid ${expandedDate===date?'#c5e8d8':'#e8eaed'}`,transition:'all .2s',userSelect:'none'}}>
                <span style={{fontSize:16}}>📅</span>
                <span style={{fontWeight:700,fontSize:13,color:expandedDate===date?'#009B00':'#202124'}}>{date}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:'#9aa0a6'}}>{events.length} event{events.length>1?'s':''}</span>
                <span style={{color:'#9aa0a6',fontSize:14,transition:'transform .2s',transform:expandedDate===date?'rotate(180deg)':'none'}}>▼</span>
              </div>

              {/* Events for this date */}
              {expandedDate===date&&(
                <div style={{marginTop:4,paddingLeft:8,display:'flex',flexDirection:'column',gap:6}}>
                  {events.map((ev,i)=>{
                    const cfg = TYPE_CONFIG[ev.type]||{icon:'•',color:'#f0f0f0',iconColor:'#333',label:ev.type};
                    return(
                      <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',background:cfg.color,borderRadius:8,border:`1px solid rgba(0,0,0,.06)`,animation:'fadeInUp 0.3s ease'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{cfg.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <span style={{fontSize:10,fontWeight:700,color:cfg.iconColor,textTransform:'uppercase',letterSpacing:.5}}>{cfg.label}</span>
                              <div style={{fontSize:13,fontWeight:600,marginTop:1}}>{ev.title}</div>
                              <div style={{fontSize:11,color:'#5f6368',marginTop:2}}>{ev.sub}</div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0,marginLeft:8}}>
                              {ev.amount&&<div style={{fontWeight:700,color:'#009B00',fontSize:14}}>₹{Number(ev.amount).toLocaleString('en-IN')}</div>}
                              <div style={{fontSize:10,color:'#9aa0a6',marginTop:2}}>{formatDateTime(ev.date)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div style={{padding:'12px 24px',borderTop:'1px solid #e8eaed',display:'flex',gap:8,flexShrink:0,background:'#fafafa'}}>
          <a href={`tel:${lead.mobile}`} className="btn btn-primary btn-sm"><Phone size={13} style={{verticalAlign:'middle'}} /> Call</a>
          <a href={`https://wa.me/91${lead.mobile?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm"><MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /> WhatsApp</a>
          <div style={{marginLeft:'auto',fontSize:12,color:'#9aa0a6',display:'flex',alignItems:'center'}}>
            Last updated: {formatDate(lead.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnquiryDetailModal({ enquiry, onClose }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState(null);

  useEffect(() => {
    if (!enquiry) return;
    Promise.all([
      saleAPI.getAll(),
      serviceRequestAPI.getAll(),
      enquiryAPI.getAll(),
      quotationAPI.getAll(),
    ]).then(([sR, srR, eR, qR]) => {
      const mobile = enquiry.mobile?.replace(/\s/g,'');
      const events = [];

      (sR.data.data||[]).filter(s => s.customerName?.toLowerCase()===enquiry.customerName?.toLowerCase() || s.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(s => events.push({ type:'sale', date:s.createdAt, title:`Purchase — ${s.productName}`, sub:`Invoice: ${s.invoiceNumber} · ${s.paymentStatus}`, amount:s.totalAmount, raw:s }));

      (srR.data.data||[]).filter(s => s.customerName?.toLowerCase()===enquiry.customerName?.toLowerCase() || s.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(s => events.push({ type:'service', date:s.createdAt, title:`${s.issueDescription?.slice(0,50)}`, sub:`Technician: ${s.assignedTechnician||'Unassigned'} · ${s.status}`, amount:s.serviceCharge, raw:s }));

      (eR.data.data||[]).filter(e => e.id !== enquiry.id && (e.customerName?.toLowerCase()===enquiry.customerName?.toLowerCase() || e.mobile?.replace(/\s/g,'')===mobile))
        .forEach(e => events.push({ type:'enquiry', date:e.createdAt, title:`Enquiry — ${e.serviceRequired||e.productName||'General'}`, sub:e.message?.slice(0,60)||'No message', raw:e }));

      (qR.data.data||[]).filter(q => q.customerName?.toLowerCase()===enquiry.customerName?.toLowerCase() || q.customerMobile?.replace(/\s/g,'')===mobile)
        .forEach(q => events.push({ type:'quotation', date:q.createdAt, title:`Quotation ${q.quotationNumber}`, sub:`Status: ${q.status} · Total: ₹${Number(q.totalAmount||0).toLocaleString('en-IN')}`, raw:q }));

      events.sort((a,b) => new Date(b.date) - new Date(a.date));
      setTimeline(events);
      if (events.length > 0) {
        const firstDate = new Date(events[0].date).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
        setExpandedDate(firstDate);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [enquiry]);

  if (!enquiry) return null;
  const grouped = groupByDate(timeline);

  const STATUS_COLOR = { NEW:'#E6F1FB', CONTACTED:'#FAEEDA', CONVERTED:'#EAF3DE', CLOSED:'#FCEBEB' };
  const STATUS_TEXT = { NEW:'#0C447C', CONTACTED:'#633806', CONVERTED:'#27500A', CLOSED:'#791F1F' };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex:1100}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',animation:'scaleIn 0.3s ease'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#009B00,#007A00)',padding:'20px 24px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#7fff7f'}}>
                  {enquiry.customerName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{color:'#fff',fontSize:18,fontWeight:700}}>{enquiry.customerName}</div>
                  <div style={{color:'#7fff7f',fontSize:13}}>Enquiry ID: E-{String(enquiry.id).padStart(3,'0')}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <span style={{color:'#b8dfd2',fontSize:12}}>📞 {enquiry.mobile}</span>
                {enquiry.email&&<span style={{color:'#b8dfd2',fontSize:12}}>✉️ {enquiry.email}</span>}
                {enquiry.address&&<span style={{color:'#b8dfd2',fontSize:12}}>📍 {enquiry.address}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:16}}>✕</button>
          </div>
        </div>

        {/* Details strip */}
        <div style={{background:'#f8fffe',borderBottom:'1px solid #e8eaed',padding:'12px 24px',display:'flex',gap:20,flexWrap:'wrap',flexShrink:0}}>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>PRODUCT / SERVICE</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{enquiry.serviceRequired||enquiry.productName||'—'}</div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>SOURCE</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{enquiry.source?.replace('_',' ')||'—'}</div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>STATUS</span><div style={{marginTop:2}}><span style={{background:STATUS_COLOR[enquiry.status],color:STATUS_TEXT[enquiry.status],fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{enquiry.status}</span></div></div>
          <div><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>RECEIVED</span><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{formatDate(enquiry.createdAt)}</div></div>
          <div style={{gridColumn:'1/-1'}}><span style={{fontSize:11,color:'#9aa0a6',fontWeight:600}}>MESSAGE</span><div style={{fontSize:13,marginTop:2,color:'#5f6368'}}>{enquiry.message||'No message added.'}</div></div>
        </div>

        {/* Timeline */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            📅 Customer History <span style={{fontSize:12,color:'#9aa0a6',fontWeight:400}}>({timeline.length} events)</span>
          </div>

          {loading&&<div style={{textAlign:'center',padding:32,color:'#9aa0a6'}}>Loading history…</div>}

          {!loading&&timeline.length===0&&(
            <div style={{textAlign:'center',padding:32,color:'#9aa0a6',background:'#f8f9fa',borderRadius:8}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div>No other activity history found for this customer yet.</div>
            </div>
          )}

          {Object.entries(grouped).map(([date, events]) => (
            <div key={date} style={{marginBottom:12}}>
              <div onClick={()=>setExpandedDate(expandedDate===date?null:date)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:expandedDate===date?'#e0f9e0':'#f8f9fa',borderRadius:8,cursor:'pointer',border:`1px solid ${expandedDate===date?'#c5e8d8':'#e8eaed'}`,transition:'all .2s',userSelect:'none'}}>
                <span style={{fontSize:16}}>📅</span>
                <span style={{fontWeight:700,fontSize:13,color:expandedDate===date?'#009B00':'#202124'}}>{date}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:'#9aa0a6'}}>{events.length} event{events.length>1?'s':''}</span>
                <span style={{color:'#9aa0a6',fontSize:14,transition:'transform .2s',transform:expandedDate===date?'rotate(180deg)':'none'}}>▼</span>
              </div>

              {expandedDate===date&&(
                <div style={{marginTop:4,paddingLeft:8,display:'flex',flexDirection:'column',gap:6}}>
                  {events.map((ev,i)=>{
                    const cfg = TYPE_CONFIG[ev.type]||{icon:'•',color:'#f0f0f0',iconColor:'#333',label:ev.type};
                    return(
                      <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',background:cfg.color,borderRadius:8,border:`1px solid rgba(0,0,0,.06)`,animation:'fadeInUp 0.3s ease'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{cfg.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <span style={{fontSize:10,fontWeight:700,color:cfg.iconColor,textTransform:'uppercase',letterSpacing:.5}}>{cfg.label}</span>
                              <div style={{fontSize:13,fontWeight:600,marginTop:1}}>{ev.title}</div>
                              <div style={{fontSize:11,color:'#5f6368',marginTop:2}}>{ev.sub}</div>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0,marginLeft:8}}>
                              {ev.amount&&<div style={{fontWeight:700,color:'#009B00',fontSize:14}}>₹{Number(ev.amount).toLocaleString('en-IN')}</div>}
                              <div style={{fontSize:10,color:'#9aa0a6',marginTop:2}}>{formatDateTime(ev.date)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div style={{padding:'12px 24px',borderTop:'1px solid #e8eaed',display:'flex',gap:8,flexShrink:0,background:'#fafafa'}}>
          <a href={`tel:${enquiry.mobile}`} className="btn btn-primary btn-sm"><Phone size={13} style={{verticalAlign:'middle'}} /> Call</a>
          <a href={`https://wa.me/91${enquiry.mobile?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm"><MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /> WhatsApp</a>
          <div style={{marginLeft:'auto',fontSize:12,color:'#9aa0a6',display:'flex',alignItems:'center'}}>
            Last updated: {formatDate(enquiry.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}


export function CustomerDetailModal({ customer, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]   = useState('');
  const [sendingWa, setSendingWa] = useState(null); // holds the event index currently sending
  const [viewingService, setViewingService] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [viewingEnquiry, setViewingEnquiry] = useState(null);

  useEffect(() => {
    if (!customer) return;
    setLoading(true); setActiveTab('all'); setSearch('');
    customerAPI.getTimeline(customer.id)
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;

  // Send an invoice/bill PDF via WhatsApp for a single timeline event.
  // No PDF is stored anywhere — it's generated fresh, downloaded straight
  // to this device, and WhatsApp opens at the same time with the number
  // pre-filled (wa.me can't attach files, so this is the standard
  // download-then-attach workaround).
  const sendEventPdf = async (ev, index) => {
    setSendingWa(index);
    try {
      const isService = ev.type === 'service';
      const res = isService
        ? await serviceRequestExtAPI.downloadInvoice(ev.raw.id)
        : await saleInvoiceAPI.downloadInvoice(ev.raw.id);
      const blob = res.data;
      const num = isService ? (ev.raw.invoiceNumber || ev.raw.ticketNumber) : ev.raw.invoiceNumber;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${isService ? 'ServiceBill' : 'Invoice'}-${num || ev.raw.id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);

      const digits = (customer.mobile || '').replace(/\D/g, '');
      const mobile = digits.length === 10 ? `91${digits}` : digits;
      const label = isService ? 'service invoice' : 'invoice';
      const msg = `Hi ${customer.name || ''}, here is your ${label} ${num || ''} from Aqua Green Agencies. Attaching the PDF that just downloaded to this device.`;
      window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch {
      alert('Could not generate the PDF for this record.');
    } finally {
      setSendingWa(null);
    }
  };

  // Build unified event list
  const allEvents = [];
  if (data) {
    (data.leads || []).forEach(l => allEvents.push({
      type: 'lead', date: l.createdAt,
      title: `Lead — ${l.requirement || 'General inquiry'}`,
      sub: `Source: ${(l.source||'').replace('_',' ')} · Status: ${l.status}`,
      badge: l.status, badgeColor: { NEW:'#185FA5', CONTACTED:'#854F0B', CONVERTED:'#0F6E56', LOST:'#791F1F' }[l.status] || '#888',
      raw: l,
    }));
    (data.enquiries || []).forEach(e => allEvents.push({
      type: 'enquiry', date: e.createdAt,
      title: `Enquiry — ${e.serviceRequired || e.productName || 'General'}`,
      sub: e.message?.slice(0, 80) || 'No message',
      badge: e.status, raw: e,
    }));
    (data.serviceRequests || []).forEach(s => allEvents.push({
      type: 'service', date: s.createdAt,
      title: s.issueDescription?.slice(0, 60) || 'Service visit',
      sub: `${s.ticketNumber} · Technician: ${s.assignedTechnician || 'Unassigned'}`,
      badge: s.status, amount: s.totalBillAmount || s.serviceCharge,
      badgeColor: { COMPLETED:'#0F6E56', PENDING:'#854F0B', CANCELLED:'#791F1F' }[s.status] || '#888',
      raw: s,
    }));
    (data.sales || []).forEach(s => allEvents.push({
      type: 'sale', date: s.createdAt,
      title: `Purchase — ${s.productName}`,
      sub: `Invoice: ${s.invoiceNumber} · ${s.paymentMethod || 'CASH'} · ${s.paymentStatus}`,
      badge: s.paymentStatus, amount: s.totalAmount,
      badgeColor: { PAID:'#0F6E56', PENDING:'#854F0B', PARTIAL:'#854F0B' }[s.paymentStatus] || '#888',
      raw: s,
    }));
    (data.quotations || []).forEach(q => allEvents.push({
      type: 'quotation', date: q.createdAt,
      title: `Quotation ${q.quotationNumber}`,
      sub: `Valid: ${q.validityDays || 30} days · Status: ${q.status}`,
      badge: q.status, amount: q.totalAmount,
      badgeColor: { ACCEPTED:'#0F6E56', DRAFT:'#185FA5', SENT:'#854F0B', REJECTED:'#791F1F' }[q.status] || '#888',
      raw: q,
    }));
    allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const TYPE_META = {
    lead:      { icon: '💡', bg: '#EEEDFE', accent: '#3C3489', label: 'Lead'      },
    enquiry:   { icon: '📩', bg: '#E6F1FB', accent: '#0C447C', label: 'Enquiry'   },
    service:   { icon: '🔧', bg: '#FAEEDA', accent: '#633806', label: 'Service'   },
    sale:      { icon: '🛒', bg: '#EAF3DE', accent: '#27500A', label: 'Purchase'  },
    quotation: { icon: '📋', bg: '#FAECE7', accent: '#712B13', label: 'Quotation' },
  };

  const TABS = [
    { key: 'all',       label: 'All',        count: allEvents.length },
    { key: 'lead',      label: 'Leads',      count: (data?.leads||[]).length },
    { key: 'enquiry',   label: 'Enquiries',  count: (data?.enquiries||[]).length },
    { key: 'service',   label: 'Services',   count: (data?.serviceRequests||[]).length },
    { key: 'sale',      label: 'Sales',      count: (data?.sales||[]).length },
    { key: 'quotation', label: 'Quotations', count: (data?.quotations||[]).length },
  ];

  const filtered = allEvents
    .filter(e => activeTab === 'all' || e.type === activeTab)
    .filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.sub?.toLowerCase().includes(search.toLowerCase()));

  const totalSpend = (data?.sales||[]).reduce((s,x) => s + Number(x.totalAmount||0), 0)
                   + (data?.serviceRequests||[]).filter(x=>x.status==='COMPLETED').reduce((s,x) => s + Number(x.totalBillAmount||0), 0);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.25s ease', boxShadow: '0 24px 64px rgba(0,0,0,.18)',
      }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#009B00,#007A00)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: '#7fff7f', flexShrink: 0,
              }}>
                {customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 3 }}>{customer.name}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 12 }}>📞 {customer.mobile}</span>
                  {customer.email && <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 12 }}>✉️ {customer.email}</span>}
                  {(customer.address || customer.city) && <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 12 }}>📍 {[customer.address, customer.city].filter(Boolean).join(', ')}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
              width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 18, flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total spend', value: `₹${totalSpend.toLocaleString('en-IN')}`, color: '#7fff7f' },
              { label: 'Purchases',   value: (data?.sales||[]).length,                  color: '#fff' },
              { label: 'Services',    value: (data?.serviceRequests||[]).length,        color: '#fff' },
              { label: 'Leads',       value: (data?.leads||[]).length,                  color: '#fff' },
              { label: 'Enquiries',   value: (data?.enquiries||[]).length,              color: '#fff' },
              { label: 'Customer since', value: (() => {
                  const earliest = allEvents.length > 0
                    ? allEvents.reduce((min, ev) => new Date(ev.date) < new Date(min) ? ev.date : min, allEvents[0].date)
                    : customer.createdAt;
                  return earliest ? new Date(earliest).toLocaleDateString('en-IN',{month:'short',year:'numeric'}) : '—';
                })(), color: 'rgba(255,255,255,.6)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,.12)', borderRadius: 8, padding: '6px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar + search ─────────────────────────────────── */}
        <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === t.key ? '#009B00' : '#6c757d',
                borderBottom: activeTab === t.key ? '2.5px solid #009B00' : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    background: activeTab === t.key ? '#009B00' : '#e9ecef',
                    color: activeTab === t.key ? '#fff' : '#6c757d',
                    borderRadius: 10, padding: '1px 6px', fontSize: 10,
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search ───────────────────────────────────────────── */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search history…"
            style={{ width: '100%', fontSize: 13, padding: '7px 12px', border: '1px solid #e9ecef', borderRadius: 8, outline: 'none', background: '#f8f9fa' }}
          />
        </div>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9aa0a6' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Loading history…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9aa0a6', background: '#f8f9fa', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No history found</div>
              <div style={{ fontSize: 12 }}>
                {search ? 'No events match your search.' : 'This customer has no recorded activity yet.'}
              </div>
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: 19, top: 0, bottom: 0,
                width: 2, background: '#e9ecef', borderRadius: 2,
              }} />
              {filtered.map((ev, i) => {
                const meta = TYPE_META[ev.type] || { icon: '•', bg: '#f0f0f0', accent: '#333', label: ev.type };
                const isFirst = i === 0;
                return (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, position: 'relative' }}>
                    {/* Icon dot */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: meta.bg,
                      border: `2.5px solid ${meta.accent}22`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16, flexShrink: 0, position: 'relative', zIndex: 1,
                      boxShadow: isFirst ? `0 0 0 3px ${meta.accent}22` : 'none',
                    }}>
                      {meta.icon}
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: meta.bg, borderRadius: 10,
                      border: `1px solid ${meta.accent}22`, padding: '10px 14px',
                      transition: 'box-shadow .15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          {/* Type + badge row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{meta.label}</span>
                            {ev.badge && (
                              <span style={{
                                fontSize: 10, padding: '1px 7px', borderRadius: 6,
                                background: (ev.badgeColor || '#888') + '22',
                                color: ev.badgeColor || '#888', fontWeight: 600,
                              }}>{ev.badge.replace('_',' ')}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>{ev.title}</div>
                          {ev.sub && <div style={{ fontSize: 11, color: '#5f6368', lineHeight: 1.5 }}>{ev.sub}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {ev.amount && Number(ev.amount) > 0 && (
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#009B00' }}>
                              ₹{Number(ev.amount).toLocaleString('en-IN')}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 2 }}>
                            {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                          </div>
                          <div style={{ fontSize: 9, color: '#bbb' }}>
                            {ev.date ? new Date(ev.date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}
                          </div>
                          {ev.type === 'service' && (
                            <button
                              onClick={() => setViewingService(ev.raw)}
                              title="View itemized breakdown"
                              style={{
                                marginTop: 6, marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 700, color: '#009B00', background: '#e0f9e0',
                                border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                              }}>
                              View
                            </button>
                          )}
                          {ev.type === 'lead' && (
                            <button
                              onClick={() => setViewingLead(ev.raw)}
                              title="View lead details"
                              style={{
                                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 700, color: '#0C447C', background: '#E6F1FB',
                                border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                              }}>
                              View
                            </button>
                          )}
                          {ev.type === 'enquiry' && (
                            <button
                              onClick={() => setViewingEnquiry(ev.raw)}
                              title="View enquiry details"
                              style={{
                                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 700, color: '#0C447C', background: '#E6F1FB',
                                border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                              }}>
                              View
                            </button>
                          )}
                          {(ev.type === 'service' || ev.type === 'sale') && (
                            <button
                              onClick={() => sendEventPdf(ev, i)}
                              disabled={sendingWa === i}
                              title="Download PDF and open WhatsApp to send it"
                              style={{
                                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 10, fontWeight: 700, color: '#fff', background: '#25D366',
                                border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                              }}>
                              <MessageCircle size={11} />
                              {sendingWa === i ? 'Preparing…' : 'Send PDF'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e9ecef',
          display: 'flex', gap: 8, background: '#fafafa', flexShrink: 0, alignItems: 'center',
        }}>
          <a href={`tel:${customer.mobile}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}><Phone size={13} style={{verticalAlign:'middle'}} /> Call</a>
          <a href={`https://wa.me/91${customer.mobile?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none', textDecoration: 'none' }}>
            <MessageCircle size={13} style={{verticalAlign:'middle',color:'#25D366'}} /> WhatsApp
          </a>
          <a href={`/admin/comms-hub?customerId=${customer.id}&tab=quotation`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }} onClick={onClose}>🧾 Bill / Quote</a>
          <a href={`mailto:${customer.email}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', display: customer.email ? 'inline-flex' : 'none' }}>✉️ Email</a>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa0a6' }}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''} · Customer ID: {customer.id}
          </div>
        </div>
      </div>
      {viewingService && (
        <ServiceDetailModal service={viewingService} onClose={()=>setViewingService(null)} />
      )}
      {viewingLead && (
        <LeadDetailModal lead={viewingLead} onClose={()=>setViewingLead(null)} />
      )}
      {viewingEnquiry && (
        <EnquiryDetailModal enquiry={viewingEnquiry} onClose={()=>setViewingEnquiry(null)} />
      )}
    </div>
  );
}

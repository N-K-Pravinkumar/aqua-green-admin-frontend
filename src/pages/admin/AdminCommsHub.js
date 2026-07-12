import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  customerAPI, quotationAPI, saleAPI, serviceRequestAPI,
  communicationAPI, alertAPI, templateAPI, smsAPI, stockAPI, productAPI
} from '../../services/api';
import api from '../../services/api';

// ─── helpers ─────────────────────────────────────────────────
const rupee = n => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const EMPTY_ITEM = { description:'', qty:1, unitPrice:'', gstPct:18, total:0 };
function calcItem(it){ const b=(parseFloat(it.unitPrice)||0)*(parseInt(it.qty)||1); return {...it,total:+(b+b*(parseFloat(it.gstPct)||0)/100).toFixed(2)}; }
function calcTotals(items){ const s=items.reduce((a,i)=>(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1)+a,0); const g=items.reduce((a,i)=>{const b=(parseFloat(i.unitPrice)||0)*(parseInt(i.qty)||1);return a+b*(parseFloat(i.gstPct)||0)/100;},0); return {subtotal:+s.toFixed(2),gstAmount:+g.toFixed(2),totalAmount:+(s+g).toFixed(2)}; }
const uid=()=>Math.random().toString(36).slice(2,8).toUpperCase();

function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
  return <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,background:type==='error'?'#E24B4A':'#0d8a00',color:'#fff',borderRadius:10,padding:'12px 20px',fontSize:13,fontWeight:500,maxWidth:380,boxShadow:'0 4px 20px rgba(0,0,0,.18)'}}>{msg}</div>;
}

// ─── Customer quick-search ────────────────────────────────────
function CustomerSearch({ onSelect, placeholder = 'Search customer by name or mobile…' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const debounce = useRef(null);
  const search = v => { setQ(v); clearTimeout(debounce.current); if(v.length<2){setResults([]);return;} debounce.current=setTimeout(async()=>{ try{const r=await customerAPI.search(v);setResults(r.data.data||[]);}catch{} },300); };
  return (
    <div style={{position:'relative'}}>
      <input className="form-input" placeholder={placeholder} value={q} onChange={e=>search(e.target.value)} />
      {results.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e9ecef',borderRadius:8,zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,.1)',maxHeight:200,overflowY:'auto'}}>
        {results.map(c=><div key={c.id} onClick={()=>{onSelect(c);setQ(c.name);setResults([]);}} style={{padding:'9px 14px',cursor:'pointer',borderBottom:'1px solid #f1f3f4',fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <div style={{fontWeight:600}}>{c.name}</div>
          <div style={{fontSize:11,color:'#9aa0a6'}}>{c.mobile} · {c.address||c.city||'—'}</div>
        </div>)}
      </div>}
    </div>
  );
}

// ─── Items table for quotation/billing ───────────────────────
function ItemsTable({items,onChange}){
  const upd=(i,k,v)=>onChange(items.map((it,x)=>x===i?calcItem({...it,[k]:v}):it));
  const add=()=>onChange([...items,calcItem({...EMPTY_ITEM})]);
  const rem=i=>items.length>1&&onChange(items.filter((_,x)=>x!==i));
  const tot=calcTotals(items);
  return <div>
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr style={{background:'#009B00',color:'#fff'}}>
          {['Description','Qty','Unit Price','GST%','Total',''].map(h=><th key={h} style={{padding:'7px 8px',textAlign:'left',fontWeight:600}}>{h}</th>)}
        </tr></thead>
        <tbody>{items.map((it,i)=><tr key={i} style={{borderBottom:'1px solid #f1f3f4'}}>
          <td style={{padding:'5px 4px'}}><input className="form-input" style={{minWidth:160}} value={it.description} onChange={e=>upd(i,'description',e.target.value)} placeholder="Item…"/></td>
          <td style={{padding:'5px 4px'}}><input className="form-input" style={{width:52}} type="number" min={1} value={it.qty} onChange={e=>upd(i,'qty',e.target.value)}/></td>
          <td style={{padding:'5px 4px'}}><input className="form-input" style={{width:90}} type="number" value={it.unitPrice} onChange={e=>upd(i,'unitPrice',e.target.value)} placeholder="0"/></td>
          <td style={{padding:'5px 4px'}}><select className="form-select" style={{width:64}} value={it.gstPct} onChange={e=>upd(i,'gstPct',e.target.value)}>{[0,5,12,18,28].map(r=><option key={r}>{r}%</option>)}</select></td>
          <td style={{padding:'5px 10px',fontWeight:600,color:'#009B00'}}>{rupee(it.total)}</td>
          <td><button onClick={()=>rem(i)} disabled={items.length===1} style={{background:'none',border:'none',color:'#E24B4A',cursor:'pointer',fontSize:16,opacity:items.length===1?.3:1}}>×</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <button className="btn btn-ghost btn-xs" style={{marginTop:6}} onClick={add}>+ Add row</button>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
      <div style={{minWidth:220}}>
        {[['Subtotal',tot.subtotal],['GST',tot.gstAmount]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #e9ecef',fontSize:12,color:'#5f6368'}}><span>{l}</span><span>{rupee(v)}</span></div>)}
        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',background:'#009B00',color:'#fff',borderRadius:8,marginTop:6,fontWeight:700,fontSize:14}}><span>TOTAL</span><span>{rupee(tot.totalAmount)}</span></div>
      </div>
    </div>
  </div>;
}

// ─── WhatsApp / SMS sender ────────────────────────────────────
function SendMessagePanel({customer, prefillMsg='', onSent}){
  const [channel, setChannel] = useState('WHATSAPP');
  const [msg, setMsg] = useState(prefillMsg);
  const [sending, setSending] = useState(false);
  useEffect(()=>setMsg(prefillMsg),[prefillMsg]);

  const openWhatsApp = () => {
    if(!customer?.mobile){alert('No mobile number');return;}
    const num = '91'+customer.mobile.replace(/[^0-9]/g,'');
    const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    window.open(url,'_blank');
    onSent&&onSent('WHATSAPP');
  };

  const sendSMS = async() => {
    if(!customer?.mobile||!msg){return;}
    setSending(true);
    try{
      await communicationAPI.send({
        customerId: customer.id, mobile: customer.mobile,
        channel:'SMS', content: msg,
      });
      onSent&&onSent('SMS');
    }catch(e){alert(e.response?.data?.message||'SMS failed');}
    setSending(false);
  };

  return <div style={{display:'flex',flexDirection:'column',gap:10}}>
    <div style={{display:'flex',gap:8}}>
      {[['WHATSAPP','💚','WhatsApp'],['SMS','💬','SMS']].map(([k,ic,lb])=><button key={k} onClick={()=>setChannel(k)} style={{flex:1,padding:'8px',border:`1.5px solid ${channel===k?'#009B00':'#e9ecef'}`,borderRadius:8,background:channel===k?'#e0f9e0':'#fff',cursor:'pointer',fontSize:12,fontWeight:channel===k?700:400}}>{ic} {lb}</button>)}
    </div>
    <textarea className="form-textarea" rows={4} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type your message…" style={{fontSize:12}}/>
    <div style={{fontSize:11,color:'#9aa0a6'}}>{msg.length} chars</div>
    {channel==='WHATSAPP'
      ? <button className="btn btn-primary" style={{background:'#25D366',border:'none'}} onClick={openWhatsApp} disabled={!msg||!customer}>💚 Open WhatsApp</button>
      : <button className="btn btn-primary" onClick={sendSMS} disabled={sending||!msg||!customer}>{sending?'Sending…':'💬 Send SMS'}</button>}
  </div>;
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
const TABS = [
  {key:'quotation', icon:'📋', label:'Quotation'},
  {key:'billing',   icon:'🧾', label:'Bill / Invoice'},
  {key:'message',   icon:'💬', label:'Send message'},
  {key:'alerts',    icon:'🔔', label:'Service alerts'},
];

export default function AdminCommsHub() {
  const [tab, setTab] = useState('quotation');
  const [toast, setToast] = useState(null);
  const notify=(msg,type='ok')=>setToast({msg,type});

  // ── Shared customer state ─────────────────────────────────────
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);

  // ── Quotation state ───────────────────────────────────────────
  const [qItems,    setQItems]    = useState([calcItem({...EMPTY_ITEM})]);
  const [qNotes,    setQNotes]    = useState('');
  const [qValidity, setQValidity] = useState(30);
  const [qSaved,    setQSaved]    = useState(null);
  const [qSaving,   setQSaving]   = useState(false);
  const [qDlMsg,    setQDlMsg]    = useState('');

  // ── Billing state ─────────────────────────────────────────────
  const [bType,     setBType]     = useState('service'); // service|sales
  const [bItems,    setBItems]    = useState([calcItem({...EMPTY_ITEM})]);
  const [bPayMethod,setBPayMethod]= useState('CASH');
  const [bPayStatus,setBPayStatus]= useState('PAID');
  const [bNotes,    setBNotes]    = useState('');
  const [bSaved,    setBSaved]    = useState(null);
  const [bSaving,   setBSaving]   = useState(false);

  // ── Message state ─────────────────────────────────────────────
  const [msgPrefill, setMsgPrefill] = useState('');

  // ── Alerts state ──────────────────────────────────────────────
  const [alerts,   setAlerts]   = useState([]);
  const [alertDays,setAlertDays]= useState(10);
  const [alertLoad,setAlertLoad]= useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(()=>{
    document.getElementById('admin-page-title')
      &&(document.getElementById('admin-page-title').textContent='Comms & Billing Hub');

    // Pre-fill customer from URL params — used when navigating from Customer History modal
    const customerId = searchParams.get('customerId');
    const mobile     = searchParams.get('mobile');
    const name       = searchParams.get('name');
    const tab        = searchParams.get('tab');

    if (tab) setTab(tab);

    if (customerId) {
      customerAPI.getById(customerId).then(r => {
        if (r.data.data) setCustomer(r.data.data);
      }).catch(()=>{});
    } else if (mobile) {
      customerAPI.lookupByMobile(mobile).then(r => {
        if (r.data.data) {
          setCustomer(r.data.data);
        } else if (name) {
          // Not in DB yet — create a stub so the form is pre-filled
          setCustomer({ id: null, name, mobile, email:'', address:'' });
        }
      }).catch(()=>{});
    }
  },[]);

  // Load alerts when tab opens
  useEffect(()=>{ if(tab==='alerts') loadAlerts(); },[tab,alertDays]);

  const loadAlerts=()=>{
    setAlertLoad(true);
    alertAPI.getDue(alertDays).then(r=>setAlerts(r.data.data||[])).catch(()=>{}).finally(()=>setAlertLoad(false));
  };

  const resetCustomer=()=>{ setCustomer(null); setQSaved(null); setBSaved(null); };

  // ── Save Quotation ────────────────────────────────────────────
  const saveQuotation=async()=>{
    if(!customer){notify('Select a customer first','error');return;}
    if(qItems.some(i=>!i.description||!i.unitPrice)){notify('All items need description and price','error');return;}
    setQSaving(true);
    try{
      const tot=calcTotals(qItems);
      const r=await quotationAPI.create({
        customer:{id:customer.id}, customerName:customer.name,
        customerMobile:customer.mobile, customerAddress:customer.address,
        itemsJson:JSON.stringify(qItems),
        subtotal:tot.subtotal, gstAmount:tot.gstAmount, totalAmount:tot.totalAmount,
        notes:qNotes, validityDays:qValidity, status:'DRAFT',
        quotationNumber:'QT-'+uid(),
      });
      setQSaved(r.data.data);
      notify(`Quotation ${r.data.data.quotationNumber} saved!`);
      // Pre-fill message panel
      setMsgPrefill(`Dear ${customer.name},\n\nPlease find your quotation ${r.data.data.quotationNumber} attached.\nTotal amount: ${rupee(tot.totalAmount)}\nValid for ${qValidity} days.\n\nFor queries call 09952828740.\n- Aqua Green Agencies, Coimbatore`);
    }catch(e){notify(e.response?.data?.message||'Save failed','error');}
    setQSaving(false);
  };

  const downloadQuotationPdf=async()=>{
    if(!qSaved)return;
    try{
      const token=localStorage.getItem('aga_token');
      const r=await fetch(`http://localhost:8080/api/quotations/${qSaved.id}/pdf`,{headers:{Authorization:`Bearer ${token}`}});
      if(!r.ok)throw new Error('PDF failed');
      const blob=await r.blob();
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`Quotation-${qSaved.quotationNumber}.pdf`; a.click(); URL.revokeObjectURL(a.href);
      notify('PDF downloaded');
    }catch{notify('PDF failed','error');}
  };

  const downloadQuotationDocx=async()=>{
    if(!qSaved)return;
    try{
      const token=localStorage.getItem('aga_token');
      const r=await fetch(`http://localhost:8080/api/templates/quotation/${qSaved.id}/pdf`,{headers:{Authorization:`Bearer ${token}`}});
      if(!r.ok)throw new Error('Word failed');
      const blob=await r.blob();
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`Quotation-${qSaved.quotationNumber}.docx`; a.click(); URL.revokeObjectURL(a.href);
      notify('Word file downloaded');
    }catch{notify('Word download failed','error');}
  };

  // ── Save Bill/Invoice ─────────────────────────────────────────
  const saveBill=async()=>{
    if(!customer){notify('Select a customer first','error');return;}
    if(bItems.some(i=>!i.description||!i.unitPrice)){notify('All items need description and price','error');return;}
    setBSaving(true);
    try{
      const tot=calcTotals(bItems);
      const first=bItems[0];
      const r=await saleAPI.create({
        customer:{id:customer.id}, customerName:customer.name,
        customerMobile:customer.mobile, customerAddress:customer.address,
        productName:first.description,
        quantity:parseInt(first.qty)||1,
        unitPrice:parseFloat(first.unitPrice)||0,
        gstAmount:tot.gstAmount, totalAmount:tot.totalAmount,
        paymentMethod:bPayMethod, paymentStatus:bPayStatus,
        notes:bNotes,
        invoiceNumber:(bType==='sales'?'INV-':'BILL-')+uid(),
        itemsJson:JSON.stringify(bItems),
      });
      setBSaved(r.data.data);
      notify(`${bType==='sales'?'Invoice':'Bill'} ${r.data.data.invoiceNumber} saved!`);
      setMsgPrefill(`Dear ${customer.name},\n\nYour ${bType==='sales'?'invoice':'service bill'} ${r.data.data.invoiceNumber} has been generated.\nAmount: ${rupee(tot.totalAmount)} · Payment: ${bPayStatus}.\n\nThank you for choosing Aqua Green Agencies!\nCall: 09952828740`);
    }catch(e){notify(e.response?.data?.message||'Save failed','error');}
    setBSaving(false);
  };

  const downloadBillPdf=async()=>{
    if(!bSaved)return;
    try{
      const token=localStorage.getItem('aga_token');
      const r=await fetch(`http://localhost:8080/api/sales/${bSaved.id}/invoice/pdf`,{headers:{Authorization:`Bearer ${token}`}});
      const blob=await r.blob();
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`Invoice-${bSaved.invoiceNumber}.pdf`; a.click(); URL.revokeObjectURL(a.href);
      notify('Invoice PDF downloaded');
    }catch{notify('PDF failed','error');}
  };

  // ── Send WhatsApp from alert ──────────────────────────────────
  const openAlertWhatsApp=(alert,msg)=>{
    const num='91'+alert.customerMobile.replace(/[^0-9]/g,'');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
  };

  const defaultAlertMsg=(a)=>a.alertType==='FILTER_DUE'
    ?`Dear ${a.customerName}, your RO water purifier filter replacement is due on ${fmtDate(a.dueDate)}. Please call 09952828740 to schedule. - Aqua Green Agencies, Coimbatore`
    :`Dear ${a.customerName}, your RO water purifier annual service is due on ${fmtDate(a.dueDate)}. Please call 09952828740 to schedule. - Aqua Green Agencies, Coimbatore`;

  const sendAllAlerts=async(channel)=>{
    setSendingAll(true);
    try{
      const r=await alertAPI.sendAllDue(channel,alertDays);
      notify(`Sent: ${r.data.data.sent}, Failed: ${r.data.data.failed}`);
    }catch{notify('Failed','error');}
    setSendingAll(false);
  };

  const totals=calcTotals(tab==='quotation'?qItems:bItems);

  return (
    <div style={{maxWidth:960}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Page header */}
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 4px'}}>Comms & Billing Hub</h2>
        <p style={{fontSize:13,color:'#5f6368',margin:0}}>Create quotations · Bill customers · Send messages · Manage service alerts — all in one place</p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1.5px solid #e9ecef',marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'10px 18px',border:'none',background:'transparent',cursor:'pointer',
            fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6,
            color:tab===t.key?'#009B00':'#6c757d',
            borderBottom:tab===t.key?'2.5px solid #009B00':'2.5px solid transparent',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── QUOTATION TAB ─────────────────────────────────────── */}
      {tab==='quotation'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Customer */}
          <div className="section-card">
            <div className="section-card-head">
              <div className="section-card-title">1 · Customer</div>
              {customer&&<button className="btn btn-ghost btn-xs" onClick={resetCustomer}>Change</button>}
            </div>
            <div className="section-card-body">
              {customer
                ?<div style={{background:'#e0f9e0',borderRadius:8,padding:'10px 14px',border:'1.5px solid #009B00'}}>
                    <div style={{fontWeight:700}}>{customer.name}</div>
                    <div style={{fontSize:12,color:'#5f6368'}}>{customer.mobile}{customer.address&&` · ${customer.address}`}</div>
                  </div>
                :<CustomerSearch onSelect={setCustomer}/>}
            </div>
          </div>

          {/* Items */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">2 · Products / services</div></div>
            <div className="section-card-body"><ItemsTable items={qItems} onChange={setQItems}/></div>
          </div>

          {/* Details */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">3 · Details</div></div>
            <div className="section-card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="form-group">
                <label className="form-label">Valid for (days)</label>
                <select className="form-select" value={qValidity} onChange={e=>setQValidity(Number(e.target.value))}>
                  {[7,15,30,45,60,90].map(d=><option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={qNotes} onChange={e=>setQNotes(e.target.value)} placeholder="Special terms, delivery notes…"/>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Summary */}
          <div className="section-card" style={{border:'2px solid #009B00'}}>
            <div className="section-card-head" style={{background:'#009B00',borderRadius:'10px 10px 0 0',margin:'-1px'}}>
              <div className="section-card-title" style={{color:'#fff'}}>Summary</div>
            </div>
            <div className="section-card-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{background:'#f8f9fa',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontSize:11,color:'#9aa0a6',marginBottom:3}}>CUSTOMER</div>
                  <div style={{fontWeight:700,fontSize:13}}>{customer?.name||'—'}</div>
                </div>
                <div style={{background:'#009B00',borderRadius:8,padding:'10px 14px',color:'#fff'}}>
                  <div style={{fontSize:11,opacity:.7,marginBottom:3}}>TOTAL</div>
                  <div style={{fontWeight:700,fontSize:18}}>{rupee(totals.totalAmount)}</div>
                </div>
              </div>
              {!qSaved
                ?<button className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:14}} onClick={saveQuotation} disabled={qSaving||!customer}>
                    {qSaving?'Saving…':'💾 Save quotation'}
                  </button>
                :<div>
                  <div style={{background:'#e0f9e0',border:'1.5px solid #009B00',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:600,color:'#009B00'}}>
                    ✓ Saved as {qSaved.quotationNumber}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button className="btn btn-primary" style={{width:'100%'}} onClick={downloadQuotationPdf}>📥 Download PDF</button>
                    <button className="btn btn-ghost" style={{width:'100%'}} onClick={downloadQuotationDocx}>📄 Download Word (.docx)</button>
                    <button className="btn btn-ghost" style={{width:'100%',background:'#e0f9e0',color:'#009B00',border:'none'}} onClick={()=>setTab('message')}>
                      💬 Send to customer
                    </button>
                    <button className="btn btn-ghost btn-xs" style={{marginTop:4}} onClick={()=>{setQSaved(null);setQItems([calcItem({...EMPTY_ITEM})]);resetCustomer();}}>New quotation</button>
                  </div>
                </div>}
            </div>
          </div>

          {/* WhatsApp/SMS quick send for quotation */}
          {qSaved&&customer&&<div className="section-card">
            <div className="section-card-head"><div className="section-card-title">Send quotation to customer</div></div>
            <div className="section-card-body">
              <SendMessagePanel customer={customer} prefillMsg={msgPrefill} onSent={c=>notify(`Sent via ${c}`)}/>
            </div>
          </div>}
        </div>
      </div>}

      {/* ── BILLING TAB ───────────────────────────────────────── */}
      {tab==='billing'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Bill type */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">1 · Bill type</div></div>
            <div className="section-card-body" style={{display:'flex',gap:10}}>
              {[['service','🔧','Service Bill'],['sales','🛒','Sales Invoice']].map(([k,ic,lb])=>(
                <div key={k} onClick={()=>{setBType(k);setBSaved(null);}} style={{flex:1,border:`1.5px solid ${bType===k?'#009B00':'#e9ecef'}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',background:bType===k?'#e0f9e0':'#fff',textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:4}}>{ic}</div>
                  <div style={{fontWeight:600,fontSize:13}}>{lb}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div className="section-card">
            <div className="section-card-head">
              <div className="section-card-title">2 · Customer</div>
              {customer&&<button className="btn btn-ghost btn-xs" onClick={resetCustomer}>Change</button>}
            </div>
            <div className="section-card-body">
              {customer
                ?<div style={{background:'#e0f9e0',borderRadius:8,padding:'10px 14px',border:'1.5px solid #009B00'}}>
                    <div style={{fontWeight:700}}>{customer.name}</div>
                    <div style={{fontSize:12,color:'#5f6368'}}>{customer.mobile}</div>
                  </div>
                :<CustomerSearch onSelect={setCustomer}/>}
            </div>
          </div>

          {/* Items */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">3 · Items</div></div>
            <div className="section-card-body"><ItemsTable items={bItems} onChange={setBItems}/></div>
          </div>

          {/* Payment */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">4 · Payment</div></div>
            <div className="section-card-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-select" value={bPayMethod} onChange={e=>setBPayMethod(e.target.value)}>
                  {['CASH','UPI','CARD','BANK_TRANSFER','CHEQUE'].map(m=><option key={m}>{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={bPayStatus} onChange={e=>setBPayStatus(e.target.value)}>
                  {['PAID','PENDING','PARTIAL'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={bNotes} onChange={e=>setBNotes(e.target.value)} placeholder="Any notes…"/>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="section-card" style={{border:'2px solid #009B00'}}>
            <div className="section-card-head" style={{background:'#009B00',borderRadius:'10px 10px 0 0',margin:'-1px'}}>
              <div className="section-card-title" style={{color:'#fff'}}>Summary</div>
            </div>
            <div className="section-card-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{background:'#f8f9fa',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontSize:11,color:'#9aa0a6',marginBottom:3}}>CUSTOMER</div>
                  <div style={{fontWeight:700,fontSize:13}}>{customer?.name||'—'}</div>
                </div>
                <div style={{background:'#009B00',borderRadius:8,padding:'10px 14px',color:'#fff'}}>
                  <div style={{fontSize:11,opacity:.7,marginBottom:3}}>TOTAL</div>
                  <div style={{fontWeight:700,fontSize:18}}>{rupee(calcTotals(bItems).totalAmount)}</div>
                </div>
              </div>
              {!bSaved
                ?<button className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:14}} onClick={saveBill} disabled={bSaving||!customer}>
                    {bSaving?'Saving…':'💾 Save bill'}
                  </button>
                :<div>
                  <div style={{background:'#e0f9e0',border:'1.5px solid #009B00',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:600,color:'#009B00'}}>
                    ✓ Saved as {bSaved.invoiceNumber}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button className="btn btn-primary" style={{width:'100%'}} onClick={downloadBillPdf}>📥 Download Invoice PDF</button>
                    <button className="btn btn-ghost" style={{width:'100%',background:'#e0f9e0',color:'#009B00',border:'none'}} onClick={()=>setTab('message')}>
                      💬 Send to customer
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>{setBSaved(null);setBItems([calcItem({...EMPTY_ITEM})]);resetCustomer();}}>New bill</button>
                  </div>
                </div>}
            </div>
          </div>
          {bSaved&&customer&&<div className="section-card">
            <div className="section-card-head"><div className="section-card-title">Send bill to customer</div></div>
            <div className="section-card-body"><SendMessagePanel customer={customer} prefillMsg={msgPrefill} onSent={c=>notify(`Sent via ${c}`)}/></div>
          </div>}
        </div>
      </div>}

      {/* ── SEND MESSAGE TAB ──────────────────────────────────── */}
      {tab==='message'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="section-card">
            <div className="section-card-head">
              <div className="section-card-title">Select customer</div>
              {customer&&<button className="btn btn-ghost btn-xs" onClick={resetCustomer}>Change</button>}
            </div>
            <div className="section-card-body">
              {customer
                ?<div style={{background:'#e0f9e0',borderRadius:8,padding:'10px 14px',border:'1.5px solid #009B00'}}>
                    <div style={{fontWeight:700}}>{customer.name}</div>
                    <div style={{fontSize:12,color:'#5f6368'}}>{customer.mobile}</div>
                  </div>
                :<CustomerSearch onSelect={setCustomer}/>}
            </div>
          </div>

          {/* Quick message templates */}
          <div className="section-card">
            <div className="section-card-head"><div className="section-card-title">Quick templates</div></div>
            <div className="section-card-body" style={{display:'flex',flexDirection:'column',gap:8}}>
              {customer&&[
                {label:'Filter due reminder', msg:`Dear ${customer.name}, your RO filter replacement is due soon. Please call 09952828740 to schedule. - Aqua Green Agencies`},
                {label:'Service due reminder', msg:`Dear ${customer.name}, your annual RO service is due. Please call 09952828740 to book a visit. - Aqua Green Agencies`},
                {label:'Payment reminder',     msg:`Dear ${customer.name}, we have a pending payment on your account. Kindly clear the dues at your earliest. Call 09952828740. - Aqua Green Agencies`},
                {label:'Thank you message',    msg:`Dear ${customer.name}, thank you for choosing Aqua Green Agencies! We appreciate your trust. For any queries call 09952828740.`},
              ].map(t=><button key={t.label} className="btn btn-ghost btn-xs" style={{textAlign:'left',justifyContent:'flex-start'}} onClick={()=>setMsgPrefill(t.msg)}>📋 {t.label}</button>)}
              {!customer&&<div style={{fontSize:12,color:'#9aa0a6',textAlign:'center',padding:16}}>Select a customer first to see quick templates</div>}
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head"><div className="section-card-title">Compose & send</div></div>
          <div className="section-card-body">
            {customer
              ?<SendMessagePanel customer={customer} prefillMsg={msgPrefill} onSent={c=>notify(`Message sent via ${c}`)}/>
              :<div style={{fontSize:13,color:'#9aa0a6',textAlign:'center',padding:32}}>Select a customer on the left to send a message</div>}
          </div>
        </div>
      </div>}

      {/* ── ALERTS TAB ────────────────────────────────────────── */}
      {tab==='alerts'&&<div>
        {/* Controls */}
        <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
            <span style={{color:'#5f6368'}}>Show customers due within</span>
            <select className="form-select" style={{width:100}} value={alertDays} onChange={e=>{setAlertDays(Number(e.target.value));}}>
              {[7,10,14,30,60,90].map(d=><option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={loadAlerts}>🔄 Refresh</button>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button className="btn btn-primary" style={{background:'#25D366',border:'none',fontSize:12}} onClick={()=>sendAllAlerts('WHATSAPP')} disabled={sendingAll||alerts.length===0}>
              {sendingAll?'Sending…':`💚 WhatsApp all (${alerts.length})`}
            </button>
            <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>sendAllAlerts('SMS')} disabled={sendingAll||alerts.length===0}>
              {sendingAll?'Sending…':`💬 SMS all (${alerts.length})`}
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{background:'#e0f9e0',border:'1px solid #009B00',borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:12,color:'#009B00',lineHeight:1.7}}>
          <strong>How this works:</strong> When a service is marked COMPLETED, the system automatically sets:
          filter replacement due = completed date + 1 year · next service due = completed date + 6 months.
          Customers appearing here are approaching those dates. Send them a reminder with one click.
        </div>

        {alertLoad&&<div style={{textAlign:'center',padding:40,color:'#9aa0a6'}}>Loading alerts…</div>}
        {!alertLoad&&alerts.length===0&&<div style={{textAlign:'center',padding:48,background:'#f8f9fa',borderRadius:12}}>
          <div style={{fontSize:32,marginBottom:8}}>🎉</div>
          <div style={{fontWeight:600,marginBottom:4}}>No upcoming alerts</div>
          <div style={{fontSize:12,color:'#9aa0a6'}}>No customers are due for filter replacement or service within the next {alertDays} days.</div>
        </div>}
        {!alertLoad&&alerts.length>0&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
          {alerts.map((a,i)=>{
            const isFilter=a.alertType==='FILTER_DUE';
            const urgent=a.daysUntilDue<=3;
            const msg=defaultAlertMsg(a);
            return <div key={i} style={{background:urgent?'#FCEBEB':'#f8f9fa',border:`1.5px solid ${urgent?'#E24B4A':'#e9ecef'}`,borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{fontSize:28}}>{isFilter?'💧':'🔧'}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:14}}>{a.customerName}</span>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:isFilter?'#E6F1FB':'#FAEEDA',color:isFilter?'#185FA5':'#854F0B',fontWeight:600}}>{isFilter?'Filter due':'Service due'}</span>
                  {urgent&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'#FCEBEB',color:'#A32D2D',fontWeight:700}}>⚠ URGENT</span>}
                </div>
                <div style={{fontSize:12,color:'#5f6368'}}>{a.customerMobile} · Due: {fmtDate(a.dueDate)} · {a.daysUntilDue} day{a.daysUntilDue!==1?'s':''} away · Ticket: {a.ticketNumber}</div>
              </div>
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <button className="btn btn-sm" style={{background:'#25D366',border:'none',color:'#fff',fontSize:11}} onClick={()=>openAlertWhatsApp(a,msg)}>💚 WhatsApp</button>
                <button className="btn btn-sm btn-ghost" style={{fontSize:11}} onClick={async()=>{
                  try{await alertAPI.sendAlert({serviceRequestId:a.serviceRequestId,channel:'SMS',alertType:a.alertType,customMessage:msg});notify('SMS sent');}
                  catch{notify('SMS failed','error');}
                }}>💬 SMS</button>
              </div>
            </div>;
          })}
        </div>}
      </div>}
    </div>
  );
}

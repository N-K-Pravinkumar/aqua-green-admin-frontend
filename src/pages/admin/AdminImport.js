import { useState, useEffect } from 'react';
import api from '../../services/api';

// ─── Pre-loaded data from the user's actual spreadsheets ─────
const SAMPLE_SERVICE_ROWS = [
  { name:"Magnolia Owners Association", address:"Race Course, Coimbatore", phone:"", date:"4-9-20", serviceFee:"750", total:"2000", services:["Level Controller Float Model / 1250"] },
  { name:"Magnolia Owners Association", address:"Race Course, Coimbatore", phone:"", date:"23-9-20", serviceFee:"750", total:"7750", services:["A T 5050-(1 AC model) / 7000"] },
  { name:"M.Karthikeyan", address:"N.K.Palayam, Coimbatore", phone:"880779990", date:"11/10/20", serviceFee:"200", total:"1700", services:["Span Filter Carbon Sediment / 1500"] },
  { name:"Naresh", address:"Ondipudur, Coimbatore", phone:"9344960687", date:"12-10-20", serviceFee:"", total:"3000", services:["Get Volve / 550","Carbon Set / 1500","Out Filter / 200","Tap D Model / 150","Fitting 2 Unit / 500","1/4 Tupe Elbow Set / 100"] },
  { name:"Mr.Rajendhiran", address:"N.K.Palayam, Coimbatore", phone:"9943738989", date:"10-10-20", serviceFee:"200", total:"450", services:["Spun Filter / 250"] },
  { name:"Mugeen", address:"Kuniyamuthur, Coimbatore", phone:"9385926640", date:"17-10-20", serviceFee:"", total:"1400", services:["Fitting Charges / 700","Aqua Fresh Float / 450","Cover / 250"] },
  { name:"Girish", address:"Uppilipalayam Green Appartment", phone:"9663372291", date:"16-10-20", serviceFee:"200", total:"1700", services:["Sediment Carbon inline Set / 1500"] },
  { name:"J.Amalanathan", address:"N.K.Palayam, Coimbatore", phone:"7010115295", date:"15-10-20", serviceFee:"200", total:"1600", services:["Carbon Filter inline / 950","Carbon Spun Out / 450"] },
  { name:"Mr.Sivakumar", address:"Sulur, Coimbatore", phone:"9842382433", date:"23-10-20", serviceFee:"200", total:"750", services:["Float / 550"] },
];

const SAMPLE_CUSTOMERS = [
  { customerCode:"AGA001", customerName:"BALAJI (Captain)R,ME", address:"N.K.Palayam(po), CBE-33", phones:["9543168500","9489800000"] },
  { customerCode:"AGA002", customerName:"Rajkumar.R", address:"18A, Ramasamy nagar, NK palayam(po), CBE-33", phones:["9842207749"] },
  { customerCode:"AGA003", customerName:"R.Thirumoorthy", address:"19, Thacham Thootam, NK Palayam(po), CBE-33", phones:["9842226361","9790545250"] },
  { customerCode:"AGA004", customerName:"Saravana Shankar", address:"12, Sakthi Nagar, Nethajipuram, NK Palayam(po), CBE-33", phones:["9043673494","9994598577"] },
  { customerCode:"AGA005", customerName:"Minu Pumps super", address:"14/116, Kattoor st, Papanaikenpalayam, CBE-37", phones:["4222241986","9894189646","9363147682"] },
  { customerCode:"AGA006", customerName:"A. Edward Selvaraj", address:"42/2 7th st Gandhi nagar, Sundarapuram, CBE-24", phones:["9787963139"] },
  { customerCode:"AGA007", customerName:"P.Dhamothiran", address:"16, Adal Amma layout, Uppilipalayam(po), Singanallur, CBE-15", phones:["9368258000"] },
  { customerCode:"AGA008", customerName:"Sri Krishnaraj Textiles", address:"77/4, Mahathma Gandhi road, Aerodrome Road, Nethaji puram, CBE-33", phones:["9443059292"] },
  { customerCode:"AGA009", customerName:"Stephen", address:"15, Kumaran Nagar, Pattanam Intriyal Road, Ondipudur, CBE-16", phones:["9940804738"] },
  { customerCode:"AGA010", customerName:"M.Balraj", address:"83/86, Ramanathapuram, Columbus, CBE-45", phones:["9364524176"] },
  { customerCode:"AGA011", customerName:"A.Antony Raj", address:"27, Krishnan Nagar, Sowripalayam, CBE-28", phones:["9489969613"] },
];

const SAMPLE_SALES = [
  { saleCode:"SAL001", billingName:"BALAJI (Captain)R,ME", customerCode:"AGA001", product:"DOLPHIN UV", saleDate:"03-02-2012", amount:"6700" },
  { saleCode:"SAL002", billingName:"Rajkumar.R", customerCode:"AGA002", product:"DOLPHIN UV", saleDate:"18-03-2012", amount:"6500" },
  { saleCode:"SAL003", billingName:"R.Thirumoorthy", customerCode:"AGA003", product:"DOLPHIN UV", saleDate:"19-04-2012", amount:"6500" },
  { saleCode:"SAL004", billingName:"Saravana Shankar", customerCode:"AGA004", product:"DOLPHIN UV", saleDate:"04-02-2012", amount:"6000" },
  { saleCode:"SAL005", billingName:"Minu Pumps super", customerCode:"AGA005", product:"DOLPHIN UV", saleDate:"04-12-2012", amount:"6500" },
  { saleCode:"SAL006", billingName:"A. Edward Selvaraj", customerCode:"AGA006", product:"RO DOLPHIN", saleDate:"05-09-2012", amount:"10500" },
  { saleCode:"SAL007", billingName:"P.Dhamothiran", customerCode:"AGA007", product:"DOLPHIN UV", saleDate:"05-10-2012", amount:"6500" },
  { saleCode:"SAL008", billingName:"Sri Krishnaraj Textiles", customerCode:"AGA008", product:"RO DOLPHIN", saleDate:"26-05-2012", amount:"9990" },
  { saleCode:"SAL009", billingName:"Stephen", customerCode:"AGA009", product:"DOLPHIN UV", saleDate:"24-05-2012", amount:"6500" },
  { saleCode:"SAL010", billingName:"M.Balraj", customerCode:"AGA010", product:"DOLPHIN UV", saleDate:"24-05-2012", amount:"6500" },
  { saleCode:"SAL011", billingName:"A.Antony Raj", customerCode:"AGA011", product:"DOLPHIN UV", saleDate:"06-06-2012", amount:"6500" },
];

// ─── helpers ─────────────────────────────────────────────────
function ResultBox({ result }) {
  if (!result) return null;
  const ok = result.errors === 0;
  return (
    <div style={{ marginTop:16, background: ok ? '#e0f9e0' : '#fef3c7',
      border: `1.5px solid ${ok?'#009B00':'#EF9F27'}`,
      borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontWeight:700, fontSize:14, color: ok?'#009B00':'#854F0B', marginBottom:8 }}>
        {ok ? '✅ Import complete' : '⚠ Import finished with errors'}
      </div>
      <div style={{ display:'flex', gap:20, fontSize:13 }}>
        <span>✓ Imported: <strong>{result.imported}</strong></span>
        <span>⏭ Skipped: <strong>{result.skipped}</strong></span>
        <span>✕ Errors: <strong style={{ color:'#E24B4A' }}>{result.errors}</strong></span>
      </div>
      {result.errorDetails?.length > 0 && (
        <div style={{ marginTop:10, fontSize:11, color:'#5f6368' }}>
          {result.errorDetails.slice(0,5).map((e,i) => <div key={i}>• {e}</div>)}
          {result.errorDetails.length > 5 && <div>…and {result.errorDetails.length - 5} more</div>}
        </div>
      )}
    </div>
  );
}

// ─── Summary widget ───────────────────────────────────────────
function Summary({ summary, onRefresh }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
      {[
        ['Customers in DB', summary?.customers, '👥'],
        ['Service records', summary?.serviceRecords, '🔧'],
        ['Sales records',   summary?.sales,          '🛒'],
      ].map(([l,v,ic]) => (
        <div key={l} style={{ background:'#f8f9fa', borderRadius:10, padding:'14px 16px',
          border:'1px solid #e9ecef', textAlign:'center' }}>
          <div style={{ fontSize:22, marginBottom:4 }}>{ic}</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#009B00' }}>{v ?? '—'}</div>
          <div style={{ fontSize:11, color:'#9aa0a6' }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function AdminImport() {
  const [tab, setTab]         = useState('service');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState(true); // show preview table before import

  useEffect(() => {
    document.getElementById('admin-page-title')
      && (document.getElementById('admin-page-title').textContent = 'Import Historical Data');
    loadSummary();
  }, []);

  const loadSummary = () => {
    api.get('/import/summary').then(r => setSummary(r.data.data)).catch(() => {});
  };

  const run = async (endpoint, payload) => {
    setLoading(true); setResult(null);
    try {
      const r = await api.post(endpoint, payload);
      setResult(r.data.data);
      loadSummary();
    } catch (e) {
      setResult({ imported:0, skipped:0, errors:1,
        errorDetails:[e.response?.data?.message || e.message] });
    }
    setLoading(false);
  };

  const importService = () => run('/import/service-records', { rows: SAMPLE_SERVICE_ROWS });
  const importSales   = () => run('/import/sales', {
    sales:     SAMPLE_SALES,
    customers: SAMPLE_CUSTOMERS.map(c => ({ customerCode:c.customerCode, customerName:c.customerName, address:c.address })),
    phones:    SAMPLE_CUSTOMERS.flatMap(c => c.phones.map(p => ({ customerCode:c.customerCode, phone:p }))),
  });

  const TABS = [
    { key:'service', label:'🔧 Service records' },
    { key:'sales',   label:'🛒 Sales & customers' },
  ];

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 4px' }}>Import historical data</h2>
        <p style={{ fontSize:13, color:'#5f6368', margin:0 }}>
          Import your existing service records and sales data from the old spreadsheets.
          Customers are auto-created if they don't already exist in the database.
          Duplicate phone numbers are skipped automatically.
        </p>
      </div>

      <Summary summary={summary} onRefresh={loadSummary} />

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1.5px solid #e9ecef', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }} style={{
            padding:'10px 22px', border:'none', background:'transparent', cursor:'pointer',
            fontSize:13, fontWeight:600,
            color: tab===t.key ? '#009B00' : '#6c757d',
            borderBottom: tab===t.key ? '2.5px solid #009B00' : '2.5px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── SERVICE RECORDS TAB ───────────────────────────────── */}
      {tab === 'service' && (
        <div>
          <div className="section-card" style={{ marginBottom:16 }}>
            <div className="section-card-head">
              <div className="section-card-title">Service records to import ({SAMPLE_SERVICE_ROWS.length} rows)</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setPreview(p=>!p)}>
                {preview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
            {preview && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8f9fa' }}>
                      {['Name','Phone','Date','Service Fee','Total','Services / Parts'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600,
                          color:'#5f6368', borderBottom:'1px solid #e9ecef', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_SERVICE_ROWS.map((r,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f3f4' }}>
                        <td style={{ padding:'7px 10px', fontWeight:500 }}>{r.name}</td>
                        <td style={{ padding:'7px 10px', color:'#009B00' }}>{r.phone||'—'}</td>
                        <td style={{ padding:'7px 10px' }}>{r.date}</td>
                        <td style={{ padding:'7px 10px' }}>{r.serviceFee ? `₹${r.serviceFee}` : '—'}</td>
                        <td style={{ padding:'7px 10px', fontWeight:600 }}>₹{r.total}</td>
                        <td style={{ padding:'7px 10px', color:'#5f6368', maxWidth:300 }}>
                          {r.services.filter(Boolean).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ background:'#e0f9e0', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13 }}>
            <strong>What will happen:</strong>
            <ul style={{ margin:'8px 0 0', paddingLeft:20, lineHeight:2 }}>
              <li>Each row creates one completed service request ticket</li>
              <li>Customer is looked up by phone — if found, linked. If not, a new customer record is created.</li>
              <li>Service items (e.g. "Level Controller Float Model / 1250") are stored as spare parts with amounts</li>
              <li>Service date from the spreadsheet is preserved as the ticket date</li>
              <li>All records are marked as COMPLETED and PAID</li>
            </ul>
          </div>

          <ResultBox result={result} />

          <button className="btn btn-primary" style={{ marginTop:16, minWidth:220, fontSize:14, padding:'12px 24px' }}
            onClick={importService} disabled={loading}>
            {loading ? 'Importing…' : `▶ Import ${SAMPLE_SERVICE_ROWS.length} service records`}
          </button>
        </div>
      )}

      {/* ── SALES TAB ─────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div>
          {/* Customer preview */}
          <div className="section-card" style={{ marginBottom:16 }}>
            <div className="section-card-head">
              <div className="section-card-title">Customers to import ({SAMPLE_CUSTOMERS.length})</div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f8f9fa' }}>
                    {['Code','Name','Address','Phone(s)'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600,
                        color:'#5f6368', borderBottom:'1px solid #e9ecef' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_CUSTOMERS.map((c,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f3f4' }}>
                      <td style={{ padding:'7px 10px', fontWeight:600, color:'#009B00' }}>{c.customerCode}</td>
                      <td style={{ padding:'7px 10px', fontWeight:500 }}>{c.customerName}</td>
                      <td style={{ padding:'7px 10px', color:'#5f6368', maxWidth:240 }}>{c.address}</td>
                      <td style={{ padding:'7px 10px', color:'#009B00' }}>{c.phones.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales preview */}
          <div className="section-card" style={{ marginBottom:16 }}>
            <div className="section-card-head">
              <div className="section-card-title">Sales to import ({SAMPLE_SALES.length})</div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f8f9fa' }}>
                    {['Sale Code','Customer','Product','Date','Amount'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600,
                        color:'#5f6368', borderBottom:'1px solid #e9ecef' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_SALES.map((s,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f3f4' }}>
                      <td style={{ padding:'7px 10px', fontWeight:600, color:'#185FA5' }}>{s.saleCode}</td>
                      <td style={{ padding:'7px 10px', fontWeight:500 }}>{s.billingName}</td>
                      <td style={{ padding:'7px 10px' }}>{s.product}</td>
                      <td style={{ padding:'7px 10px' }}>{s.saleDate}</td>
                      <td style={{ padding:'7px 10px', fontWeight:600, color:'#009B00' }}>₹{Number(s.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {/* Total */}
                  <tr style={{ background:'#f8f9fa', fontWeight:700 }}>
                    <td colSpan={4} style={{ padding:'9px 10px', textAlign:'right', color:'#5f6368' }}>Total</td>
                    <td style={{ padding:'9px 10px', color:'#009B00' }}>
                      ₹{SAMPLE_SALES.reduce((s,r)=>s+Number(r.amount),0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background:'#e0f9e0', borderRadius:10, padding:'14px 16px', marginBottom:16, fontSize:13 }}>
            <strong>What will happen:</strong>
            <ul style={{ margin:'8px 0 0', paddingLeft:20, lineHeight:2 }}>
              <li>11 customers created with their AGA customer codes and all phone numbers</li>
              <li>If a customer's phone already exists in DB, the existing record is linked (no duplicate)</li>
              <li>11 sales records created and linked to their customers</li>
              <li>Sale dates from 2012 are preserved as the sale date</li>
              <li>All sales marked as PAID / CASH</li>
              <li>Original sale codes (SAL001 etc.) preserved as invoice numbers</li>
            </ul>
          </div>

          <ResultBox result={result} />

          <button className="btn btn-primary" style={{ marginTop:16, minWidth:220, fontSize:14, padding:'12px 24px' }}
            onClick={importSales} disabled={loading}>
            {loading ? 'Importing…' : `▶ Import ${SAMPLE_CUSTOMERS.length} customers + ${SAMPLE_SALES.length} sales`}
          </button>
        </div>
      )}
    </div>
  );
}

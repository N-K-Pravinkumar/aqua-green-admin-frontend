import { useState } from 'react';
import {
  FileText, FileSpreadsheet, Download, Calendar,
  TrendingUp, Users, ShoppingCart, Wrench,
  CreditCard, Mail, ClipboardList, Loader, ChevronRight
} from 'lucide-react';
import api from '../../services/api';

// ── Report definitions ─────────────────────────────────────────
const REPORTS = [
  {
    key: 'sales',
    label: 'Sales Report',
    desc: 'All sales transactions with invoice, product, amount and payment details',
    icon: ShoppingCart,
    color: '#009B00',
    bg: '#e0f9e0',
    fields: ['Invoice No', 'Customer', 'Product', 'Amount', 'Status', 'Method'],
  },
  {
    key: 'services',
    label: 'Service Request Report',
    desc: 'All service tickets with technician, status, charge and completion details',
    icon: Wrench,
    color: '#2563eb',
    bg: '#dbeafe',
    fields: ['Ticket', 'Customer', 'Issue', 'Technician', 'Charge', 'Status'],
  },
  {
    key: 'leads',
    label: 'Leads Report',
    desc: 'All leads with source, status, assigned employee and conversion tracking',
    icon: TrendingUp,
    color: '#7c3aed',
    bg: '#ede9fe',
    fields: ['Name', 'Mobile', 'City', 'Source', 'Assigned To', 'Status'],
  },
  {
    key: 'customers',
    label: 'Customer Report',
    desc: 'All customers with contact details, type and onboarding dates',
    icon: Users,
    color: '#0891b2',
    bg: '#cffafe',
    fields: ['Name', 'Mobile', 'Email', 'City', 'Type', 'Date Joined'],
  },
  {
    key: 'payments',
    label: 'Payment / Revenue Report',
    desc: 'All payments received with method, amount and transaction details',
    icon: CreditCard,
    color: '#d97706',
    bg: '#fef3c7',
    fields: ['Payment No', 'Customer', 'Invoice', 'Amount', 'Method', 'Status'],
  },
  {
    key: 'enquiries',
    label: 'Enquiry Report',
    desc: 'All website and walk-in enquiries with product, service and follow-up status',
    icon: Mail,
    color: '#dc2626',
    bg: '#fee2e2',
    fields: ['Customer', 'Mobile', 'Service', 'Source', 'Status', 'Date'],
  },
  {
    key: 'quotations',
    label: 'Quotation Report',
    desc: 'All quotations with customer, amounts, GST breakdown and acceptance status',
    icon: ClipboardList,
    color: '#008800',
    bg: '#d1fae5',
    fields: ['Quot. No', 'Customer', 'Total', 'GST', 'Status', 'Date'],
  },
];

function DownloadBtn({ loading, onClick, icon: Icon, label, color, bg }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${color}`,
        background: loading ? bg : '#fff', color, cursor: loading ? 'wait' : 'pointer',
        fontSize: 13, fontWeight: 700, transition: 'all .18s', minWidth: 130,
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = bg; } }}
      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#fff'; } }}
    >
      {loading
        ? <Loader size={15} style={{ animation: 'spin .7s linear infinite' }} />
        : <Icon size={15} />
      }
      {loading ? 'Downloading…' : label}
    </button>
  );
}

function ReportCard({ report, dateRange }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlLoading, setXlLoading] = useState(false);
  const [lastDownload, setLastDownload] = useState(null);
  const Icon = report.icon;

  const buildParams = () => {
    const p = new URLSearchParams();
    if (dateRange.from) p.append('from', new Date(dateRange.from).toISOString());
    if (dateRange.to) {
      // Set end of day
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      p.append('to', endDate.toISOString());
    }
    return p.toString();
  };

  const download = async (format) => {
    const setLoading = format === 'pdf' ? setPdfLoading : setXlLoading;
    setLoading(true);
    try {
      const params = buildParams();
      const url = `/api/reports/${report.key}/${format}${params ? '?' + params : ''}`;
      const token = localStorage.getItem('aga_token');
      const response = await fetch('http://localhost:8080' + url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      let filename = `${report.label.replace(/ /g, '-')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      const match = disposition.match(/filename="(.+)"/);
      if (match) filename = match[1];

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      setLastDownload({ format, time: new Date().toLocaleTimeString() });
    } catch (err) {
      alert('Download failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
      overflow: 'hidden', transition: 'all .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Card header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: report.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color={report.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 4 }}>{report.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{report.desc}</div>
          </div>
        </div>

        {/* Field pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {report.fields.map(f => (
            <span key={f} style={{ fontSize: 10, background: report.bg, color: report.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Download buttons */}
      <div style={{ padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <DownloadBtn
          loading={pdfLoading}
          onClick={() => download('pdf')}
          icon={FileText}
          label="Download PDF"
          color="#dc2626"
          bg="#fee2e2"
        />
        <DownloadBtn
          loading={xlLoading}
          onClick={() => download('excel')}
          icon={FileSpreadsheet}
          label="Download Excel"
          color="#008800"
          bg="#d1fae5"
        />
        {lastDownload && (
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
            ✓ {lastDownload.format.toUpperCase()} downloaded at {lastDownload.time}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [preset, setPreset] = useState('custom');

  // Quick date presets
  const applyPreset = (key) => {
    setPreset(key);
    const now = new Date();
    const fmt = d => d.toISOString().split('T')[0];

    if (key === 'today') {
      setDateRange({ from: fmt(now), to: fmt(now) });
    } else if (key === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      setDateRange({ from: fmt(start), to: fmt(now) });
    } else if (key === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRange({ from: fmt(start), to: fmt(now) });
    } else if (key === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      setDateRange({ from: fmt(start), to: fmt(now) });
    } else if (key === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      setDateRange({ from: fmt(start), to: fmt(now) });
    } else if (key === 'all') {
      setDateRange({ from: '', to: '' });
    } else {
      setPreset('custom');
    }
  };

  const clearDates = () => { setDateRange({ from: '', to: '' }); setPreset('all'); };

  const PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Last 7 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ];

  const dateLabel = dateRange.from && dateRange.to
    ? `${dateRange.from}  →  ${dateRange.to}`
    : dateRange.from ? `From ${dateRange.from}` : dateRange.to ? `Until ${dateRange.to}` : 'All time';

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={22} color="#009B00" /> Reports & Exports
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          Download bank-statement style PDF or formatted Excel for any date range
        </div>
      </div>

      {/* Date Range Picker */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Calendar size={18} color="#009B00" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Select Date Range</span>
          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8, background: '#f3f4f6', padding: '3px 12px', borderRadius: 20 }}>
            {dateLabel}
          </span>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${preset === p.key ? '#009B00' : '#e5e7eb'}`, background: preset === p.key ? '#009B00' : '#fff', color: preset === p.key ? '#fff' : '#4b5563', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
            <input type="date" value={dateRange.from}
              onChange={e => { setDateRange(d => ({ ...d, from: e.target.value })); setPreset('custom'); }}
              style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', cursor: 'pointer' }} />
          </div>
          <div style={{ fontSize: 18, color: '#9ca3af', paddingBottom: 8 }}>→</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
            <input type="date" value={dateRange.to}
              onChange={e => { setDateRange(d => ({ ...d, to: e.target.value })); setPreset('custom'); }}
              style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', cursor: 'pointer' }} />
          </div>
          {(dateRange.from || dateRange.to) && (
            <button onClick={clearDates} style={{ padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Clear
            </button>
          )}
        </div>

        {/* Active filter info */}
        {(dateRange.from || dateRange.to) && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#e0f9e0', borderRadius: 8, fontSize: 13, color: '#009B00', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChevronRight size={14} />
            All reports below will be filtered: <strong>{dateLabel}</strong>
          </div>
        )}
      </div>

      {/* PDF Format note */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fee2e2', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FileText size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#7f1d1d', marginBottom: 4 }}>PDF — Bank Statement Style</div>
            <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
              Landscape A4 format with company header, summary cards, alternating row table, and footer with timestamp. Professional format suitable for printing and sharing.
            </div>
          </div>
        </div>
        <div style={{ background: '#d1fae5', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FileSpreadsheet size={20} color="#008800" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#065f46', marginBottom: 4 }}>Excel — Formatted Workbook</div>
            <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>
              XLSX format with branded header, frozen rows, alternating row colors, currency formatting, totals row, and auto-column widths. Ready for further analysis in Excel or Google Sheets.
            </div>
          </div>
        </div>
      </div>

      {/* Report cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {REPORTS.map(report => (
          <ReportCard key={report.key} report={report} dateRange={dateRange} />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, padding: '16px', fontSize: 12, color: '#9ca3af' }}>
        All reports include company branding, date range header, and generation timestamp.
        PDF is landscape A4. Excel (.xlsx) works with Microsoft Excel, Google Sheets, LibreOffice.
      </div>
    </div>
  );
}

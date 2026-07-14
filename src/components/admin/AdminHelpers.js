import { useState } from 'react';

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, danger }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title || 'Confirm'}</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <p style={{ color: '#5f6368', fontSize: 14 }}>{message}</p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    NEW: 'badge-new', CONTACTED: 'badge-contacted', FOLLOW_UP: 'badge-followup',
    QUOTATION_SENT: 'badge-sent', CONVERTED: 'badge-converted', LOST: 'badge-lost',
    PENDING: 'badge-pending', ASSIGNED: 'badge-assigned', IN_PROGRESS: 'badge-inprogress',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
    DRAFT: 'badge-draft', SENT: 'badge-sent', ACCEPTED: 'badge-accepted', REJECTED: 'badge-lost',
    PAID: 'badge-paid', OVERDUE: 'badge-overdue',
    PUBLISHED: 'badge-published',
    DOMESTIC: 'badge-new', COMMERCIAL: 'badge-followup', INDUSTRIAL: 'badge-contacted',
  };
  const label = status?.replace(/_/g, ' ');
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{label}</span>;
}

export function Spinner() {
  return <div className="spinner" />;
}

export function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon || '📭'}</div>
      <p>{text || 'No data found.'}</p>
    </div>
  );
}

export function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const ToastEl = toast ? (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: toast.type === 'success' ? '#009B00' : '#A32D2D',
      color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 14,
      boxShadow: '0 4px 12px rgba(0,0,0,.2)', maxWidth: 320
    }}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.message}
    </div>
  ) : null;
  return { show, ToastEl };
}

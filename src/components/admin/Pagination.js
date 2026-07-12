import React from 'react';

/**
 * Reusable pagination bar.
 * Props:
 *   page         — current 0-based page index
 *   totalPages   — total number of pages from Spring Page<T>
 *   totalElements— total record count
 *   pageSize     — records per page
 *   onPageChange — called with new 0-based page index
 */
export default function Pagination({ page, totalPages, totalElements, pageSize, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, totalElements);

  // Build page window: always show first, last, current ±2
  const pages = new Set([0, totalPages - 1]);
  for (let i = Math.max(0, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) pages.add(i);
  const pageList = [...pages].sort((a, b) => a - b);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderTop: '1px solid var(--border, #e9ecef)',
      marginTop: 8, flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 12, color: '#6c757d' }}>
        Showing {from}–{to} of {totalElements}
      </span>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          style={{
            padding: '5px 10px', borderRadius: 6, border: '1px solid #e9ecef',
            background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13, color: page === 0 ? '#ccc' : '#374151',
          }}>‹</button>

        {/* Page numbers */}
        {pageList.map((p, i) => {
          const prev = pageList[i - 1];
          const showEllipsis = prev !== undefined && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <span style={{ padding: '5px 6px', fontSize: 13, color: '#9aa0a6' }}>…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 13,
                  border: p === page ? '1.5px solid #009B00' : '1px solid #e9ecef',
                  background: p === page ? '#009B00' : '#fff',
                  color: p === page ? '#fff' : '#374151',
                  cursor: 'pointer', fontWeight: p === page ? 700 : 400,
                  minWidth: 34,
                }}>
                {p + 1}
              </button>
            </React.Fragment>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          style={{
            padding: '5px 10px', borderRadius: 6, border: '1px solid #e9ecef',
            background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            fontSize: 13, color: page >= totalPages - 1 ? '#ccc' : '#374151',
          }}>›</button>
      </div>
    </div>
  );
}

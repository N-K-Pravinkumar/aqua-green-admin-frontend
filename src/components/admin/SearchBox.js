import { useState, useRef, useEffect } from 'react';

/**
 * SearchBox — live search input with dropdown suggestions.
 *
 * Props:
 *   value          — controlled string value
 *   onChange       — called on every keystroke (for filtering)
 *   onSearch       — called when user commits (Enter / click suggestion)
 *   placeholder    — input placeholder
 *   suggestions    — array of { label, sub, value } objects to show in dropdown
 *   onSelect       — called with the selected suggestion object
 *   loading        — shows a spinner in the input
 *   width          — CSS width (default '260px')
 */
export default function SearchBox({
  value, onChange, onSearch,
  placeholder = 'Search…',
  suggestions = [],
  onSelect,
  loading = false,
  width = '260px',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setOpen(suggestions.length > 0 && value?.length > 1);
  }, [suggestions, value]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: '#9aa0a6', pointerEvents: 'none',
        }}>🔍</span>
        <input
          className="form-input"
          style={{ paddingLeft: 32, paddingRight: loading ? 32 : 8 }}
          value={value}
          placeholder={placeholder}
          onChange={e => { onChange(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter') { onSearch && onSearch(value); setOpen(false); } if (e.key === 'Escape') setOpen(false); }}
          onFocus={() => { if (suggestions.length > 0 && value?.length > 1) setOpen(true); }}
          autoComplete="off"
        />
        {loading && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: '#9aa0a6',
          }}>⏳</span>
        )}
        {!loading && value && (
          <button onClick={() => { onChange(''); onSearch && onSearch(''); setOpen(false); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0a6', fontSize: 16, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.1)', maxHeight: 260, overflowY: 'auto',
          marginTop: 2,
        }}>
          {suggestions.map((s, i) => (
            <div key={i}
              onClick={() => { onSelect && onSelect(s); onChange(s.label); setOpen(false); }}
              style={{
                padding: '9px 14px', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f1f3f4' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 1 }}>{s.sub}</div>}
            </div>
          ))}
          {suggestions.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#9aa0a6', textAlign: 'center' }}>
              No results
            </div>
          )}
        </div>
      )}
    </div>
  );
}

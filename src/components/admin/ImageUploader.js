import { useState, useRef, useCallback } from 'react';

/**
 * ImageUploader — four ways to add an image:
 *
 *  1. 📁 From device    — pick or drag-drop a local file (JPG/PNG/WebP/GIF, max 10 MB)
 *                         Saves to ./uploads/<folder>/ on the backend.
 *                         If Supabase is configured, uploads there instead.
 *
 *  2. 📷 Camera         — take a photo directly using the device camera (mobile/webcam).
 *                         Uploads the captured photo to the same backend endpoint.
 *
 *  3. 🔗 Paste URL      — type or paste any public image URL.
 *                         Stored as-is. Quick but depends on the URL staying live.
 *
 *  4. 💾 URL → server   — paste a URL, backend fetches and saves it locally.
 *                         Best for Unsplash/Google images — makes them self-hosted.
 *
 * Props:
 *   value       — current image URL string (controlled)
 *   onChange    — called with new URL string when image is set
 *   folder      — storage sub-folder (default: 'general')
 *   label       — field label text  (default: 'Image')
 *   showPreview — show thumbnail below  (default: true)
 */
export default function ImageUploader({
  value,
  onChange,
  folder = 'general',
  label = 'Image',
  showPreview = true,
}) {
  const [tab, setTab]           = useState('device');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState({ text:'', type:'' });
  const [urlInput, setUrlInput] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream]     = useState(null);

  const fileRef    = useRef(null);
  const cameraRef  = useRef(null);   // <input type=file capture=environment>
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);

  const ok  = text => setMsg({ text, type:'ok' });
  const err = text => setMsg({ text, type:'error' });
  const clr = ()   => setMsg({ text:'', type:'' });

  // ── Core upload to backend ──────────────────────────────────
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      err('Please select an image file (JPG, PNG, WebP, GIF)'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      err('File too large — maximum 10 MB'); return;
    }
    setLoading(true); clr();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    try {
      const token = localStorage.getItem('aga_token');
      const r = await fetch('http://localhost:8080/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await r.json();
      if (data.success && data.data?.url) {
        onChange(data.data.url);
        ok(`✓ Uploaded${data.data.storage === 'supabase' ? ' to Supabase' : ' to server'} — ${file.name}`);
      } else {
        err(data.message || 'Upload failed');
      }
    } catch {
      err('Network error — is the backend running on port 8080?');
    } finally { setLoading(false); }
  }, [folder, onChange]);

  // ── Tab 1: File from device (click or drag-drop) ───────────
  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    uploadFile(e.dataTransfer.files?.[0]);
  };

  // ── Tab 2a: Camera via input[capture] — works on Android/iOS──
  const handleCameraInput = e => uploadFile(e.target.files?.[0]);

  // ── Tab 2b: WebRTC camera (desktop) ────────────────────────
  const openWebcam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } });
      setStream(s);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Webcam blocked or not available — fall back to file input with capture
      cameraRef.current?.click();
    }
  };

  const captureWebcam = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type:'image/jpeg' });
      stopWebcam();
      uploadFile(file);
    }, 'image/jpeg', 0.92);
  };

  const stopWebcam = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  // ── Tab 3: Paste URL (stored as-is) ────────────────────────
  // value is used directly

  // ── Tab 4: Fetch URL → save to server ──────────────────────
  const saveUrlToServer = async () => {
    if (!urlInput.trim()) { err('Paste a URL first'); return; }
    if (!urlInput.startsWith('http')) { err('URL must start with http:// or https://'); return; }
    setLoading(true); clr();
    try {
      const token = localStorage.getItem('aga_token');
      const r = await fetch('http://localhost:8080/api/upload/image-from-url', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: urlInput.trim(), folder }),
      });
      const data = await r.json();
      if (data.success && data.data?.url) {
        onChange(data.data.url);
        setUrlInput('');
        ok('✓ Image downloaded and saved to server');
      } else {
        err(data.message || 'Could not fetch image from that URL');
      }
    } catch {
      err('Network error — is the backend running?');
    } finally { setLoading(false); }
  };

  const TABS = [
    { key:'device',   icon:'📁', label:'From device' },
    { key:'camera',   icon:'📷', label:'Camera' },
    { key:'url',      icon:'🔗', label:'Paste URL' },
    { key:'url-save', icon:'💾', label:'URL → server' },
  ];

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      {/* Tab bar */}
      <div style={{ display:'flex', border:'1.5px solid #e5e7eb', borderRadius:9,
        overflow:'hidden', marginBottom:12 }}>
        {TABS.map(t => (
          <button key={t.key} type="button"
            onClick={() => { setTab(t.key); clr(); if(cameraOpen) stopWebcam(); }}
            style={{ flex:1, padding:'8px 4px', border:'none', cursor:'pointer',
              fontSize:11, fontWeight:600, lineHeight:1.3,
              background: tab===t.key ? '#009B00' : '#fff',
              color:      tab===t.key ? '#fff'    : '#6b7280',
              transition: 'all .15s' }}>
            <div>{t.icon}</div>
            <div>{t.label}</div>
          </button>
        ))}
      </div>

      {/* ── Tab 1: Upload from device ─────────────────────────── */}
      {tab === 'device' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#009B00' : '#d1d5db'}`,
            borderRadius: 10, padding: '28px 20px', textAlign: 'center',
            cursor: loading ? 'wait' : 'pointer',
            background: dragging ? '#e0f9e0' : '#fafafa',
            transition: 'all .15s',
          }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => uploadFile(e.target.files?.[0])} />
          {loading ? (
            <div>
              <div style={{ fontSize:28, marginBottom:6 }}>⏳</div>
              <div style={{ fontSize:13, color:'#5f6368' }}>Uploading…</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:36, marginBottom:8 }}>📁</div>
              <div style={{ fontWeight:600, fontSize:14, color:'#374151', marginBottom:4 }}>
                Click to pick a photo, or drag & drop here
              </div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>
                JPG · PNG · WebP · GIF &nbsp;·&nbsp; Max 10 MB
              </div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>
                Saved to server automatically.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Camera ─────────────────────────────────────── */}
      {tab === 'camera' && (
        <div>
          {/* Hidden file input with capture — best for mobile */}
          <input ref={cameraRef} type="file" accept="image/*"
            capture="environment" style={{ display:'none' }}
            onChange={handleCameraInput} />

          {!cameraOpen ? (
            <div style={{ display:'flex', gap:10, flexDirection:'column' }}>
              {/* Mobile-first: direct camera button */}
              <button type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={loading}
                style={{ padding:'20px', border:'2px dashed #d1d5db', borderRadius:10,
                  background:'#fafafa', cursor:'pointer', fontSize:14, fontWeight:600,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:40 }}>📷</span>
                <span>Take photo with camera</span>
                <span style={{ fontSize:11, fontWeight:400, color:'#9ca3af' }}>
                  Opens camera on mobile · Uses device camera
                </span>
              </button>

              {/* Desktop: open webcam in-page */}
              <div style={{ textAlign:'center', fontSize:12, color:'#9aa0a6' }}>
                Or &nbsp;
                <button type="button" onClick={openWebcam}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:'#009B00', fontWeight:600, textDecoration:'underline', fontSize:12 }}>
                  use webcam in this page
                </button>
                &nbsp; (desktop)
              </div>
            </div>
          ) : (
            /* Webcam live feed */
            <div>
              <div style={{ position:'relative', borderRadius:10, overflow:'hidden',
                background:'#000', maxWidth:'100%' }}>
                <video ref={videoRef} autoPlay playsInline
                  style={{ width:'100%', maxHeight:300, display:'block', objectFit:'cover' }} />
                <canvas ref={canvasRef} style={{ display:'none' }} />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button type="button" className="btn btn-primary" style={{ flex:1 }}
                  onClick={captureWebcam} disabled={loading}>
                  📸 Capture photo
                </button>
                <button type="button" className="btn btn-ghost"
                  onClick={stopWebcam}>Cancel</button>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign:'center', padding:12, fontSize:13, color:'#5f6368' }}>
              ⏳ Uploading photo…
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Paste URL (stored as-is) ───────────────────── */}
      {tab === 'url' && (
        <div>
          <input className="form-input"
            value={value || ''}
            onChange={e => { onChange(e.target.value); clr(); }}
            placeholder="https://example.com/image.jpg"
            style={{ fontSize:13 }}
          />
          <div style={{ fontSize:11, color:'#9aa0a6', marginTop:5, lineHeight:1.6 }}>
            URL is stored directly — no file downloaded. If the URL goes offline the image breaks.
            Use <strong>URL → server</strong> tab to save a permanent copy.
          </div>
        </div>
      )}

      {/* ── Tab 4: Fetch URL → save to server ─────────────────── */}
      {tab === 'url-save' && (
        <div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-input" style={{ flex:1, fontSize:13 }}
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); clr(); }}
              placeholder="https://images.unsplash.com/photo-…"
              onKeyDown={e => e.key==='Enter' && saveUrlToServer()}
            />
            <button type="button" className="btn btn-primary"
              onClick={saveUrlToServer}
              disabled={loading || !urlInput.trim()}
              style={{ whiteSpace:'nowrap' }}>
              {loading ? 'Saving…' : '💾 Save to server'}
            </button>
          </div>
          <div style={{ fontSize:11, color:'#9aa0a6', marginTop:5, lineHeight:1.6 }}>
            Backend downloads the image and saves it on your server. The stored URL
            becomes your own server's URL — works even if the original goes offline.
            Good for Unsplash, Google Images, or any public URL.
          </div>
        </div>
      )}

      {/* Status message */}
      {msg.text && (
        <div style={{
          marginTop:8, padding:'8px 12px', borderRadius:8, fontSize:12,
          background: msg.type==='ok' ? '#e0f9e0' : '#fee2e2',
          color:      msg.type==='ok' ? '#065f46' : '#dc2626',
          borderLeft: `3px solid ${msg.type==='ok' ? '#009B00' : '#dc2626'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Current image preview */}
      {showPreview && value && (
        <div style={{ marginTop:12, position:'relative', display:'inline-block' }}>
          <img src={value} alt="Preview"
            style={{ maxWidth:'100%', maxHeight:200, borderRadius:8,
              border:'1.5px solid #e5e7eb', objectFit:'cover', display:'block' }}
            onError={e => { e.target.style.display='none'; }}
          />
          <button type="button" onClick={() => { onChange(''); clr(); }}
            style={{ position:'absolute', top:6, right:6, width:28, height:28,
              borderRadius:'50%', border:'none', cursor:'pointer',
              background:'rgba(0,0,0,.6)', color:'#fff',
              fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ×
          </button>
          <div style={{ fontSize:10, color:'#9aa0a6', marginTop:4,
            maxWidth:320, wordBreak:'break-all', overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {value}
          </div>
        </div>
      )}
    </div>
  );
}

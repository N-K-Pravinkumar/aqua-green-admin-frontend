import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, Loader, HelpCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';

export default function LoginPage() {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerError('');
    try {
      const userData = await login(form.email, form.password);
      if (['SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE'].includes(userData.role)) {
        navigate('/admin');
      } else {
        setServerError('Access denied. This portal is for authorized staff only.');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const f = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
    if (serverError) setServerError('');
  };

  const fillDemo = (email, password) => {
    setForm({ email, password });
    setErrors({}); setServerError('');
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#0a3d2e 0%,#009B00 40%,#007A00 70%,#062e23 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
      position:'relative', overflow:'hidden'
    }}>
      {/* Decorative */}
      <div style={{ position:'fixed', top:-120, right:-120, width:400, height:400, background:'rgba(127,232,197,.05)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:-150, left:-100, width:500, height:500, background:'rgba(127,232,197,.04)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, position:'relative' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src="/aga-logo.jpeg" alt="Aqua Green Agencies"
              style={{ width:76, height:76, borderRadius:'50%', border:'3px solid rgba(127,232,197,.5)', objectFit:'cover', boxShadow:'0 8px 32px rgba(0,0,0,.3)', display:'block' }} />
            <div style={{ position:'absolute', bottom:0, right:0, background:'#7fff7f', width:22, height:22, borderRadius:'50%', border:'3px solid #009B00', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={11} color="#009B00" />
            </div>
          </div>
          <div style={{ color:'#fff', fontSize:22, fontWeight:800, marginTop:12, letterSpacing:'-0.5px' }}>Aqua Green Agencies</div>
          <div style={{ color:'#7fff7f', fontSize:12, marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Shield size={11} /> Admin Portal · Coimbatore
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,.97)', borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.28)', overflow:'hidden' }}>
          {/* Card header */}
          <div style={{ background:'linear-gradient(135deg,#009B00,#007A00)', padding:'20px 28px' }}>
            <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>Welcome back</h2>
            <p style={{ color:'rgba(255,255,255,.7)', fontSize:13, margin:'5px 0 0' }}>Sign in to access the admin portal</p>
          </div>

          <div style={{ padding:'28px 28px 24px' }}>
            {/* Error */}
            {serverError && (
              <div style={{ background:'#fee2e2', color:'#7f1d1d', padding:'11px 14px', borderRadius:10, fontSize:13, marginBottom:18, borderLeft:'4px solid #ef4444', display:'flex', alignItems:'flex-start', gap:8 }}>
                <Lock size={14} style={{ flexShrink:0, marginTop:1 }} /> {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Mail size={11} /> Email Address
                </label>
                <div style={{ position:'relative' }}>
                  <input className={`form-input${errors.email?' error':''}`}
                    type="email" placeholder="your@aquagreen.com"
                    value={form.email} onChange={e => f('email', e.target.value)}
                    autoFocus style={{ paddingLeft:38 }} />
                  <Mail size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
                </div>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5, margin:0 }}>
                    <Lock size={11} /> Password
                  </label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'#009B00', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    <HelpCircle size={11} /> Forgot password?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <input className={`form-input${errors.password?' error':''}`}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password} onChange={e => f('password', e.target.value)}
                    style={{ paddingLeft:38, paddingRight:44 }} />
                  <Lock size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn btn-primary"
                style={{ width:'100%', justifyContent:'center', padding:13, fontSize:15, marginTop:4 }}>
                {loading
                  ? <><Loader size={16} style={{ animation:'spin .7s linear infinite' }} /> Signing in…</>
                  : 'Sign In to Admin Portal'
                }
              </button>
            </form>

            {/* Demo credentials */}
            <div style={{ marginTop:22, padding:'14px 16px', background:'#f0fff0', borderRadius:12, border:'1px solid #c5e8d8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#009B00', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Demo Access — click to fill
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  ['Super Admin', 'mohanbabu@aquagreen.com', 'MohanAGA@2026', '#7c3aed', '#ede9fe'],
                  ['Admin',       'admin@aquagreen.com',     'admin123',      '#2563eb', '#dbeafe'],
                  ['Manager',     'senthil@aquagreen.com',   'mgr123',        '#0891b2', '#cffafe'],
                  ['Employee',    'murugan@aquagreen.com',   'emp123',        '#009B00', '#d1fae5'],
                ].map(([role, email, pwd, color, bg]) => (
                  <button key={role} type="button" onClick={() => fillDemo(email, pwd)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = bg}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <span style={{ background:bg, color, fontSize:9, padding:'2px 7px', borderRadius:8, fontWeight:700, minWidth:68, textAlign:'center', flexShrink:0 }}>{role}</span>
                    <span style={{ fontSize:11, color:'#374151', fontFamily:'monospace' }}>{email}</span>
                    <span style={{ fontSize:10, color:'#9ca3af', marginLeft:'auto', fontFamily:'monospace' }}>{pwd}</span>
                  </button>
                ))}
              </div>
            </div>

            <p style={{ textAlign:'center', marginTop:18, fontSize:12 }}>
              <Link to="/" style={{ color:'#9ca3af' }}>← Back to Website</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

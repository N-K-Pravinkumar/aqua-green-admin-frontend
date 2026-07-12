import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, CheckCircle,
  ArrowLeft, Shield, AlertCircle, RefreshCw,
  KeyRound, Loader
} from 'lucide-react';
import { authAPI } from '../services/api';

// ── Shared wrapper ─────────────────────────────────────────────
function AuthCard({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a3d2e 0%, #009B00 40%, #007A00 70%, #062e23 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative circles */}
      <div style={{ position:'fixed', top:-120, right:-120, width:400, height:400, background:'rgba(127,232,197,.05)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:-150, left:-100, width:500, height:500, background:'rgba(127,232,197,.04)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src="/aga-logo.jpeg" alt="Aqua Green Agencies"
              style={{ width:72, height:72, borderRadius:'50%', border:'3px solid rgba(127,232,197,.5)', objectFit:'cover', boxShadow:'0 8px 32px rgba(0,0,0,.3)', display:'block' }} />
            <div style={{ position:'absolute', bottom:0, right:0, background:'#7fff7f', width:20, height:20, borderRadius:'50%', border:'3px solid #009B00', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={10} color="#009B00" />
            </div>
          </div>
          <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginTop:12, letterSpacing:'-0.3px' }}>Aqua Green Agencies</div>
          <div style={{ color:'#7fff7f', fontSize:12, marginTop:4 }}>RO Water Purifier · Coimbatore</div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,.97)', borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.28)', overflow:'hidden' }}>
          <div style={{ background:'linear-gradient(135deg,#009B00,#007A00)', padding:'20px 28px' }}>
            <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>{title}</h2>
            {subtitle && <p style={{ color:'rgba(255,255,255,.7)', fontSize:13, margin:'5px 0 0' }}>{subtitle}</p>}
          </div>
          <div style={{ padding:'28px 28px 24px' }}>
            {children}
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:18, fontSize:12, color:'rgba(255,255,255,.5)' }}>
          <Link to="/" style={{ color:'rgba(255,255,255,.6)' }}>← Back to website</Link>
        </p>
      </div>
    </div>
  );
}

// ── Error box ──────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:'#fee2e2', color:'#7f1d1d', padding:'11px 14px', borderRadius:10, fontSize:13, marginBottom:16, borderLeft:'4px solid #ef4444', display:'flex', alignItems:'flex-start', gap:9 }}>
      <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }} /> {msg}
    </div>
  );
}

// ── Password strength meter ────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#00bb00'];
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < score ? colors[score-1] : '#e5e7eb', transition:'background .3s' }} />
        ))}
      </div>
      <div style={{ fontSize:11, color: score > 0 ? colors[score-1] : '#9ca3af', fontWeight:600 }}>
        {score > 0 ? labels[score-1] : ''}
        {score > 0 && <span style={{ color:'#9ca3af', fontWeight:400 }}>
          {score < 4 && ' — try adding ' + [!checks[1]&&'uppercase',!checks[2]&&'number',!checks[3]&&'symbol'].filter(Boolean).join(', ')}
        </span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setResendTimer(60);
    } catch {}
    finally { setLoading(false); }
  };

  if (sent) {
    return (
      <AuthCard title="Check Your Email" subtitle="Reset link has been sent">
        {/* Success state */}
        <div style={{ textAlign:'center', padding:'12px 0 8px' }}>
          <div style={{ width:72, height:72, background:'#d1fae5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Mail size={32} color="#008800" />
          </div>
          <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:8 }}>Email Sent!</h3>
          <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.6, marginBottom:6 }}>
            We've sent a password reset link to:
          </p>
          <div style={{ background:'#f0fff0', border:'1px solid #c5e8d8', borderRadius:10, padding:'10px 16px', marginBottom:20 }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#009B00' }}>{email}</span>
          </div>

          {/* Steps */}
          <div style={{ background:'#f9fafb', borderRadius:12, padding:'16px 20px', textAlign:'left', marginBottom:22 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Next steps</div>
            {[
              ['1', 'Open your email inbox'],
              ['2', 'Look for email from Aqua Green Agencies'],
              ['3', 'Click "Reset My Password" button'],
              ['4', 'Set your new password'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:22, height:22, background:'#009B00', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{n}</div>
                <span style={{ fontSize:13, color:'#4b5563' }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:16 }}>
            Didn't receive it? Check your spam folder or
          </div>
          <button onClick={handleResend} disabled={resendTimer > 0 || loading}
            style={{ fontSize:13, fontWeight:700, color: resendTimer > 0 ? '#9ca3af' : '#009B00', background:'none', border:'none', cursor: resendTimer > 0 ? 'default' : 'pointer', display:'flex', alignItems:'center', gap:6, margin:'0 auto 20px' }}>
            <RefreshCw size={14} />
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
          </button>

          <Link to="/admin/login" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', display:'flex', alignItems:'center', gap:7 }}>
            <ArrowLeft size={15} /> Back to Login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot Password" subtitle="Enter your email to receive a reset link">
      <ErrorBox msg={error} />

      <div style={{ marginBottom:24, padding:'12px 14px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a', fontSize:13, color:'#92400e', display:'flex', gap:8 }}>
        <AlertCircle size={15} style={{ flexShrink:0, marginTop:1, color:'#d97706' }} />
        Enter the email address linked to your admin account. Only registered staff email addresses will receive a reset link.
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div className="form-group">
          <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Mail size={12} /> Email Address
          </label>
          <div style={{ position:'relative' }}>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="mohanbabu@aquagreen.com"
              autoFocus
              style={{ paddingLeft:38 }}
            />
            <Mail size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', padding:13, fontSize:15 }}>
          {loading
            ? <><Loader size={16} style={{ animation:'spin .7s linear infinite' }} /> Sending…</>
            : <><Mail size={16} /> Send Reset Link</>
          }
        </button>
      </form>

      <div style={{ marginTop:20, textAlign:'center' }}>
        <Link to="/admin/login" style={{ fontSize:13, color:'#009B00', fontWeight:600, display:'inline-flex', alignItems:'center', gap:5 }}>
          <ArrowLeft size={13} /> Back to Login
        </Link>
      </div>
    </AuthCard>
  );
}

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
export function ResetPasswordPage() {
  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [show, setShow]       = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();
  const token                 = searchParams.get('token');

  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { navigate('/admin/login'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  const validate = () => {
    if (!form.password) return 'Please enter a new password';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired. Please request a new one.');
    } finally { setLoading(false); }
  };

  const f = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };
  const toggleShow = (k) => setShow(p => ({ ...p, [k]: !p[k] }));

  // ── No token ────────────────────────────────────────────────
  if (!token) {
    return (
      <AuthCard title="Invalid Link" subtitle="This reset link is not valid">
        <div style={{ textAlign:'center', padding:'12px 0' }}>
          <div style={{ width:64, height:64, background:'#fee2e2', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <AlertCircle size={28} color="#dc2626" />
          </div>
          <p style={{ fontSize:14, color:'#6b7280', marginBottom:24, lineHeight:1.6 }}>
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:7, justifyContent:'center' }}>
            <Mail size={15} /> Request New Link
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Success state ────────────────────────────────────────────
  if (done) {
    return (
      <AuthCard title="Password Reset!" subtitle="Your password has been updated">
        <div style={{ textAlign:'center', padding:'12px 0' }}>
          <div style={{ width:72, height:72, background:'#d1fae5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircle size={36} color="#008800" />
          </div>
          <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', marginBottom:8 }}>Password Updated!</h3>
          <p style={{ fontSize:14, color:'#6b7280', marginBottom:24, lineHeight:1.6 }}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <div style={{ background:'#f0fff0', border:'1px solid #c5e8d8', borderRadius:10, padding:'10px 16px', marginBottom:22, fontSize:13, color:'#009B00', fontWeight:600 }}>
            Redirecting to login in {countdown}s…
          </div>
          <Link to="/admin/login" className="btn btn-primary" style={{ display:'flex', alignItems:'center', gap:7, justifyContent:'center' }}>
            <ArrowLeft size={15} /> Go to Login Now
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  const passwordsMatch = form.confirm && form.password === form.confirm;
  const passwordsMismatch = form.confirm && form.password !== form.confirm;

  return (
    <AuthCard title="Set New Password" subtitle="Choose a strong password for your account">
      <ErrorBox msg={error} />

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

        {/* New Password */}
        <div className="form-group">
          <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Lock size={12} /> New Password *
          </label>
          <div style={{ position:'relative' }}>
            <input
              className="form-input"
              type={show.password ? 'text' : 'password'}
              value={form.password}
              onChange={e => f('password', e.target.value)}
              placeholder="Enter new password"
              autoFocus
              style={{ paddingLeft:38, paddingRight:44 }}
            />
            <Lock size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
            <button type="button" onClick={() => toggleShow('password')}
              style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center' }}>
              {show.password ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength password={form.password} />
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
            <KeyRound size={12} /> Confirm Password *
          </label>
          <div style={{ position:'relative' }}>
            <input
              className={`form-input${passwordsMismatch ? ' error' : ''}`}
              type={show.confirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={e => f('confirm', e.target.value)}
              placeholder="Repeat your new password"
              style={{ paddingLeft:38, paddingRight:44, borderColor: passwordsMatch ? '#00bb00' : passwordsMismatch ? '#ef4444' : undefined }}
            />
            <KeyRound size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
            <button type="button" onClick={() => toggleShow('confirm')}
              style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex', alignItems:'center' }}>
              {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {/* Match indicator */}
            {passwordsMatch && (
              <CheckCircle size={16} color="#00bb00" style={{ position:'absolute', right:38, top:'50%', transform:'translateY(-50%)' }} />
            )}
            {passwordsMismatch && (
              <AlertCircle size={16} color="#ef4444" style={{ position:'absolute', right:38, top:'50%', transform:'translateY(-50%)' }} />
            )}
          </div>
          {passwordsMismatch && <span className="form-error">Passwords do not match</span>}
          {passwordsMatch   && <span style={{ fontSize:11, color:'#00bb00', fontWeight:600 }}>✓ Passwords match</span>}
        </div>

        {/* Requirements */}
        <div style={{ background:'#f9fafb', borderRadius:10, padding:'12px 14px', border:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>Password requirements</div>
          {[
            [form.password.length >= 8, 'At least 8 characters'],
            [/[A-Z]/.test(form.password), 'One uppercase letter'],
            [/[0-9]/.test(form.password), 'One number'],
            [/[^A-Za-z0-9]/.test(form.password), 'One special character (@, #, ! etc.)'],
          ].map(([met, label]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background: met ? '#d1fae5' : '#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {met
                  ? <CheckCircle size={10} color="#008800" />
                  : <div style={{ width:6, height:6, borderRadius:'50%', background:'#d1d5db' }} />
                }
              </div>
              <span style={{ fontSize:12, color: met ? '#008800' : '#9ca3af', fontWeight: met ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading || !form.password || !form.confirm} className="btn btn-primary"
          style={{ width:'100%', justifyContent:'center', padding:13, fontSize:15, marginTop:4, opacity: (!form.password || !form.confirm) ? 0.6 : 1 }}>
          {loading
            ? <><Loader size={16} style={{ animation:'spin .7s linear infinite' }} /> Updating password…</>
            : <><CheckCircle size={16} /> Reset Password</>
          }
        </button>
      </form>

      <div style={{ marginTop:20, textAlign:'center' }}>
        <Link to="/forgot-password" style={{ fontSize:13, color:'#6b7280', display:'inline-flex', alignItems:'center', gap:5 }}>
          <ArrowLeft size={13} /> Request a new reset link
        </Link>
      </div>
    </AuthCard>
  );
}

// ── RegisterPage (kept for completeness) ──────────────────────
export function RegisterPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#009B00,#062e23)', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px', textAlign:'center', maxWidth:400, width:'100%' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🚫</div>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Registration Closed</h2>
        <p style={{ fontSize:14, color:'#6b7280', marginBottom:24 }}>This is an internal admin portal. Contact Mohan Babu to get an account created.</p>
        <p style={{ fontSize:13, color:'#009B00', fontWeight:700 }}>📞 09952828740</p>
        <Link to="/admin/login" style={{ display:'inline-flex', alignItems:'center', gap:7, marginTop:20, color:'#009B00', fontWeight:700, fontSize:14 }}>
          <ArrowLeft size={14} /> Go to Login
        </Link>
      </div>
    </div>
  );
}

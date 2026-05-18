import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Register = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { firstName, lastName, email, password } = form;
      await register({ firstName, lastName, email, password });
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bg} />
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>TS</div>
          <div>
            <div style={styles.logoTitle}>BOM Engineers</div>
            <div style={styles.logoSub}>Create your account</div>
          </div>
        </div>

        <h2 style={styles.heading}>Get started for free</h2>
        <p style={styles.subheading}>Join your team on BOM Engineers. No credit card required.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" placeholder="John" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" placeholder="Doe" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              required
            />
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', background: 'var(--bg-base)' },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18), transparent)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-lg), var(--shadow-glow)', position: 'relative', animation: 'slideUp 0.3s ease' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  logoBox: { width: 42, height: 42, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' },
  logoTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' },
  logoSub: { fontSize: 11, color: 'var(--text-muted)' },
  heading: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
  subheading: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
};

export default Register;

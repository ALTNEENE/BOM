import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Login = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bg} />
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>B</div>
          <div>
            <div style={styles.logoTitle}>BOM Engineers</div>
            <div style={styles.logoSub}>Project Management Platform</div>
          </div>
        </div>

        <h2 style={styles.heading}>Sign in to your account</h2>
        <p style={styles.subheading}>Enter your credentials to access your workspace</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" style={{ fontSize: 12.5, color: 'var(--text-accent)' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>Don't have an account?</span>
          <div style={styles.dividerLine} />
        </div>

        <Link to="/register">
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            Create Account
          </button>
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139,92,246,0.12), transparent)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '36px 32px',
    boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
    position: 'relative',
    animation: 'slideUp 0.3s ease',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBox: {
    width: 42, height: 42,
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, color: '#fff',
  },
  logoTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' },
  logoSub: { fontSize: 11, color: 'var(--text-muted)' },
  heading: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
  subheading: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  dividerLine: { flex: 1, height: 1, background: 'var(--border-subtle)' },
  dividerText: { fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' },
};

export default Login;

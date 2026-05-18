import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import { useToast } from '../../context/ToastContext';

const ResetPassword = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { token } = useParams();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
      await resetPassword(token, { password: form.password });
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
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
          <div style={styles.logoTitle}>BOM Engineers</div>
        </div>

        <h2 style={styles.heading}>Set new password</h2>
        <p style={styles.subheading}>Enter your new password below. Make it strong!</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Resetting...</> : 'Reset Password'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', background: 'var(--bg-base)' },
  bg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18), transparent)', pointerEvents: 'none' },
  card: { width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-lg), var(--shadow-glow)', animation: 'slideUp 0.3s ease' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBox: { width: 36, height: 36, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' },
  logoTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' },
  heading: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 },
  subheading: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
};

export default ResetPassword;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
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

        {sent ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Check your inbox!</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              We've sent a password reset link to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>. Please check your inbox (and spam folder).
            </p>
            <Link to="/login">
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                Back to Sign In
              </button>
            </Link>
          </div>
        ) : (
          <>
            <h2 style={styles.heading}>Reset your password</h2>
            <p style={styles.subheading}>Enter your email address and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
                disabled={loading}
              >
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Sending...</> : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Remember your password?{' '}
              <Link to="/login" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </>
        )}
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
  subheading: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
};

export default ForgotPassword;

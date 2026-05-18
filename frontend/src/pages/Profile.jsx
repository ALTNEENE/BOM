import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateProfile, updatePreferences } from '../api/users';
import { changePassword } from '../api/auth';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', jobTitle: '', timezone: '', avatar: '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [prefForm, setPrefForm] = useState({ notifications: {}, theme: 'system' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        jobTitle: user.jobTitle || '',
        timezone: user.timezone || 'UTC',
        avatar: user.avatar || '',
      });
      setPrefForm({
        notifications: { ...{ email: true, push: true, taskReminders: true, projectUpdates: true }, ...(user.preferences?.notifications || {}) },
        theme: user.preferences?.theme || 'system',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateProfile(profileForm);
      updateUser(data.data?.user || data.data || profileForm);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed! Please login again.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPw(false); }
  };

  const handlePrefSave = async () => {
    setSavingPref(true);
    try {
      const { data } = await updatePreferences(prefForm);
      updateUser({ preferences: prefForm });
      toast.success('Preferences saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save preferences'); }
    finally { setSavingPref(false); }
  };

  const toggleNotif = (key) => {
    setPrefForm((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: !prev.notifications[key] } }));
  };

  const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 24, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar user={user} size="xl" />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {user?.firstName} {user?.lastName}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 10 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge type={user?.role} />
              {user?.isEmailVerified ? (
                <span className="badge badge-active">✓ Email Verified</span>
              ) : (
                <span className="badge badge-blocked">⚠ Email Not Verified</span>
              )}
              {user?.isActive ? <span className="badge badge-active">Active</span> : <span className="badge badge-blocked">Inactive</span>}
              {user?.department && <span className="tag">{user.department}</span>}
              {user?.jobTitle && <span className="tag">👔 {user.jobTitle}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
            {user?.lastLogin && <div>Last login: {new Date(user.lastLogin).toLocaleString()}</div>}
            <div>Timezone: {user?.timezone || 'UTC'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {['profile', 'security', 'preferences'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Personal Information</h3>
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
              <span className="form-hint">Changing email requires reverification</span>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select value={profileForm.timezone} onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}>
                  {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Department</label>
                <input value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} placeholder="e.g. Engineering" />
              </div>
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input value={profileForm.jobTitle} onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })} placeholder="e.g. Senior Developer" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input value={profileForm.avatar} onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="https://example.com/avatar.jpg" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Change Password</h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type={showPw ? 'text' : 'password'} value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required placeholder="Min. 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type={showPw ? 'text' : 'password'} value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={savingPw}>
                  {savingPw ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Active sessions note */}
          <div className="card" style={{ borderLeft: '3px solid var(--accent-warning)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>⚠️ Active Sessions</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              You have active sessions across devices. Changing your password is recommended if you suspect unauthorized access.
              Use "Sign Out All Devices" from the sidebar to revoke all refresh tokens.
            </p>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Notifications */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                { key: 'taskReminders', label: 'Task Reminders', desc: 'Get reminders before tasks are due' },
                { key: 'projectUpdates', label: 'Project Updates', desc: 'Updates from projects you manage or belong to' },
              ].map((pref, i) => (
                <div key={pref.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{pref.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pref.desc}</div>
                  </div>
                  <div
                    onClick={() => toggleNotif(pref.key)}
                    style={{
                      width: 44, height: 24, borderRadius: '99px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      background: prefForm.notifications[pref.key] ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 2,
                      left: prefForm.notifications[pref.key] ? 22 : 2,
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Appearance</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {['light', 'dark', 'system'].map((theme) => (
                <div key={theme} onClick={() => setPrefForm({ ...prefForm, theme })}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: prefForm.theme === theme ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: prefForm.theme === theme ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
                    textAlign: 'center', transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>
                    {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: prefForm.theme === theme ? 700 : 400, color: prefForm.theme === theme ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handlePrefSave} disabled={savingPref}>
              {savingPref ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

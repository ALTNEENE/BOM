import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import Avatar from '../common/Avatar';

const navItems = [
  { path: '/dashboard', icon: '⊞', key: 'sidebar.dashboard' },
  { path: '/projects', icon: '📁', key: 'sidebar.projects' },
  { path: '/tasks', icon: '✓', key: 'sidebar.my_tasks' },
  { path: '/teams', icon: '👥', key: 'sidebar.teams' },
  { path: '/notifications', icon: '🔔', key: 'sidebar.notifications' },
];

const adminItems = [
  { path: '/admin/users', icon: '👤', key: 'sidebar.users' },
];

const Sidebar = ({ unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className="sidebar" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      insetInlineStart: 0,
      top: 0,
      background: 'var(--bg-surface)',
      borderInlineEnd: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
          }}>
            TS
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>BOM Engineers</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Project Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 10px 4px' }}>
          Main
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 2,
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-primary)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13.5,
              transition: 'all 0.15s ease',
              position: 'relative',
            })}
            className={({ isActive }) => isActive ? '' : 'sidebar-link'}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{t(item.key)}</span>
            {item.icon === '🔔' && unreadCount > 0 && (
              <span style={{
                background: 'var(--accent-danger)',
                color: '#fff',
                borderRadius: '99px',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                minWidth: 18,
                textAlign: 'center',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Admin section */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 10px 4px' }}>
              {t('sidebar.admin')}
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 2,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13.5,
                  transition: 'all 0.15s ease',
                })}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                <span>{t(item.key)}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 6,
            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
            transition: 'background 0.15s ease',
            color: 'var(--text-primary)',
          })}
        >
          <Avatar user={user} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.role}
            </div>
          </div>
        </NavLink>

        <button
          className="btn btn-ghost"
          onClick={handleLogout}
          style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '9px 12px', fontSize: 13.5 }}
        >
          <span>🚪</span> {t('sidebar.sign_out')}
        </button>
      </div>

      <style>{`
        .sidebar-link:hover {
          background: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;

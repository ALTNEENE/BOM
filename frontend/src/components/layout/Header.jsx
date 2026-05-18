import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Header = ({ unreadCount }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return t('sidebar.dashboard');
    if (path.startsWith('/projects')) return t('sidebar.projects');
    if (path.startsWith('/tasks')) return t('sidebar.my_tasks');
    if (path.startsWith('/teams')) return t('sidebar.teams');
    if (path === '/notifications') return t('sidebar.notifications');
    if (path === '/profile') return t('sidebar.profile');
    if (path.startsWith('/admin/users')) return t('sidebar.users');
    return 'App';
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="app-header" style={{
      position: 'fixed',
      top: 0,
      insetInlineStart: 'var(--sidebar-width)',
      insetInlineEnd: 0,
      height: 'var(--header-height)',
      background: 'rgba(10, 15, 30, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      zIndex: 100,
    }}>
      <div style={{ minWidth: 0, flexShrink: 0 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{getTitle()}</h1>
      </div>

      <div style={{ flex: '1 1 260px', maxWidth: 400, minWidth: 160, margin: '0 24px' }}>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input placeholder={t('header.search_placeholder')} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={toggleLanguage} style={{ fontSize: 13 }}>
          {t('header.change_language')}
        </button>

        {/* Notification Bell */}
        <Link
          to="/notifications"
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'all 0.15s ease',
            color: 'var(--text-secondary)',
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -3,
              insetInlineEnd: -3,
              background: 'var(--accent-danger)',
              color: '#fff',
              borderRadius: '99px',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 4px',
              minWidth: 16,
              textAlign: 'center',
              lineHeight: '14px',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Time */}
        <div style={{
          padding: '0 12px',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {user?.role && (
            <span style={{
              padding: '2px 8px',
              background: 'rgba(99,102,241,0.15)',
              color: 'var(--text-accent)',
              borderRadius: '99px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}>
              {user.role}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

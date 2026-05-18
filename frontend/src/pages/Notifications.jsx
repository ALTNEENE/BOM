import { useState, useEffect } from 'react';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
  clearReadNotifications, clearAllNotifications, markManyAsRead,
} from '../api/notifications';
import { useToast } from '../context/ToastContext';

const typeIcons = {
  'task.assigned': '📋',
  'task.due_soon': '⏰',
  'task.overdue': '🚨',
  'task.completed': '✅',
  'task.comment': '💬',
  'task.mention': '🔔',
  'project.invited': '📁',
  'project.removed': '🚫',
  'project.update': '📝',
  'team.invited': '👥',
  'team.joined': '🎉',
  'team.removed': '🚫',
  'system.announcement': '📢',
  'system.maintenance': '🔧',
};

const Notifications = () => {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications({ page, limit, unreadOnly: filter === 'unread' });
      const res = data.data;
      setNotifications(res?.notifications || res || []);
      setTotalPages(res?.pagination?.pages || 1);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, page]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (_) { toast.error('Failed to mark all as read'); }
  };

  const handleMarkSelected = async () => {
    if (selected.size === 0) return;
    try {
      await markManyAsRead([...selected]);
      setNotifications((prev) => prev.map((n) => selected.has(n._id) ? { ...n, isRead: true } : n));
      setSelected(new Set());
      toast.success(`${selected.size} notifications marked as read`);
    } catch (_) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (_) { toast.error('Failed to delete'); }
  };

  const handleClearRead = async () => {
    if (!confirm('Clear all read notifications?')) return;
    try { await clearReadNotifications(); toast.success('Read notifications cleared'); load(); }
    catch (_) { toast.error('Failed to clear'); }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL notifications? This cannot be undone.')) return;
    try { await clearAllNotifications(); toast.success('All notifications cleared'); setNotifications([]); }
    catch (_) { toast.error('Failed to clear'); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up ✨'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selected.size > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkSelected}>
              ✓ Mark {selected.size} as read
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAll}>Mark all read</button>
          <button className="btn btn-secondary btn-sm" onClick={handleClearRead}>Clear read</button>
          <button className="btn btn-danger btn-sm" onClick={handleClearAll}>Clear all</button>
        </div>
      </div>

      {/* Filter */}
      <div className="tabs" style={{ marginBottom: 20, width: 'fit-content' }}>
        {['all', 'unread'].map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); setPage(1); }}>
            {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner spinner-lg"></div></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <div className="empty-title">{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</div>
          <div className="empty-desc">You're all caught up!</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n) => (
              <div key={n._id}
                className="card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  opacity: n.isRead ? 0.65 : 1,
                  cursor: 'pointer',
                  borderLeft: n.isRead ? undefined : '3px solid var(--accent-primary)',
                  transition: 'all 0.15s',
                }}
              >
                {/* Checkbox */}
                <input type="checkbox" checked={selected.has(n._id)} onChange={() => toggleSelect(n._id)}
                  style={{ width: 15, height: 15, marginTop: 3, flexShrink: 0, accentColor: 'var(--accent-primary)' }}
                  onClick={(e) => e.stopPropagation()} />

                {/* Icon */}
                <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>{typeIcons[n.type] || '🔔'}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => !n.isRead && handleMarkRead(n._id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13.5, fontWeight: n.isRead ? 400 : 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.title}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{n.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11.5 }}>
                    <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.08)', color: 'var(--text-muted)', borderRadius: '99px' }}>{n.type?.replace(/\./g, ' → ')}</span>
                    {n.data?.actor && <span style={{ color: 'var(--text-accent)' }}>by {n.data.actor.firstName} {n.data.actor.lastName}</span>}
                    {!n.isRead && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>● Unread</span>}
                    {n.isEmailSent && <span style={{ color: 'var(--accent-success)' }}>✉ Email sent</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!n.isRead && (
                    <button className="btn btn-ghost btn-icon btn-sm" title="Mark as read" onClick={() => handleMarkRead(n._id)} style={{ fontSize: 14 }}>✓</button>
                  )}
                  <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDelete(n._id)} style={{ fontSize: 14 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;

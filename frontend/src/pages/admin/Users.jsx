import { useState, useEffect } from 'react';
import { getUsers, getUserStats, updateUser, deactivateUser, activateUser, deleteUser } from '../../api/users';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';

const Users = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search) params.search = search;

      const [uRes, sRes] = await Promise.allSettled([
        getUsers(params),
        getUserStats(),
      ]);
      if (uRes.status === 'fulfilled') {
        const d = uRes.value.data.data;
        setUsers(d?.users || d || []);
        setTotalPages(d?.pagination?.pages || 1);
      }
      if (sRes.status === 'fulfilled') setStats(sRes.value.data.data);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, department: u.department || '', jobTitle: u.jobTitle || '', phone: u.phone || '' });
    setShowEdit(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(editingUser._id, editForm);
      toast.success('User updated!');
      setShowEdit(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (u) => {
    const action = u.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.firstName}?`)) return;
    try {
      u.isActive ? await deactivateUser(u._id) : await activateUser(u._id);
      toast.success(`User ${action}d`);
      load();
    } catch (_) { toast.error(`Failed to ${action} user`); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Permanently delete ${u.firstName} ${u.lastName}? This cannot be undone.`)) return;
    try { await deleteUser(u._id); toast.success('User deleted'); load(); }
    catch (_) { toast.error('Failed to delete user'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">User Management</h2>
          <p className="page-subtitle">Manage all platform users</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>👤</div>
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-success)' }}>
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>✅</div>
            <div className="stat-value">{stats.active || 0}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-warning)' }}>
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>⚠️</div>
            <div className="stat-value">{stats.unverified || 0}</div>
            <div className="stat-label">Unverified</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-secondary)' }}>
            <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>👑</div>
            <div className="stat-value">{stats.admins || 0}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
          <div className="search-wrapper" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search by name, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner spinner-lg"></div></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Email Verified</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No users found</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar user={u} size="sm" />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.email}</div>
                          {u.jobTitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.jobTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td><Badge type={u.role} /></td>
                    <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.department || '—'}</span></td>
                    <td>
                      {u.isActive ? (
                        <span className="badge badge-active">Active</span>
                      ) : (
                        <span className="badge badge-blocked">Inactive</span>
                      )}
                    </td>
                    <td>
                      {u.isEmailVerified ? (
                        <span style={{ color: 'var(--accent-success)', fontSize: 13 }}>✓ Verified</span>
                      ) : (
                        <span style={{ color: 'var(--accent-warning)', fontSize: 13 }}>⚠ Pending</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Edit">✏️</button>
                        {currentUser?.role === 'admin' && u._id !== currentUser._id && (
                          <>
                            <button
                              className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {u.isActive ? '🚫' : '✓'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)} title="Delete">🗑️</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit User — ${editingUser?.firstName} ${editingUser?.lastName}`} size="lg">
        <form onSubmit={handleUpdate} className="modal-body">
          <div className="grid-2">
            <div className="form-group"><label className="form-label">First Name</label>
              <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
            </div>
            <div className="form-group"><label className="form-label">Last Name</label>
              <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="form-group"><label className="form-label">Email</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          </div>
          <div className="form-group"><label className="form-label">Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Department</label>
              <input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} placeholder="Engineering" />
            </div>
            <div className="form-group"><label className="form-label">Job Title</label>
              <input value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} placeholder="Senior Developer" />
            </div>
          </div>
          <div className="form-group"><label className="form-label">Phone</label>
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+1 555 000 0000" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;

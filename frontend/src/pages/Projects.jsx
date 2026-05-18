import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, archiveProject } from '../api/projects';
import { searchUsers } from '../api/users';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';

const statusOptions = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
const priorityOptions = ['low', 'medium', 'high', 'critical'];
const visibilityOptions = ['private', 'team', 'public'];

const Projects = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', visibility: 'team', color: '#6366f1', startDate: '', dueDate: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getProjects({ limit: 50 });
      setProjects(data.data?.projects || data.data || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createProject(form);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name: '', description: '', status: 'planning', priority: 'medium', visibility: 'team', color: '#6366f1', startDate: '', dueDate: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setCreating(false); }
  };

  const handleArchive = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    try { await archiveProject(id); toast.success('Project archived'); load(); }
    catch (err) { toast.error('Failed to archive'); }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try { await deleteProject(id); toast.success('Project deleted'); load(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">{filtered.length} {filter === 'all' ? 'total' : filter} projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <span className="search-icon">🔍</span>
          <input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          {['all', ...statusOptions].map((s) => (
            <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner spinner-lg"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-title">No projects found</div>
          <div className="empty-desc">Create your first project to get started</div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>+ New Project</button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((p) => (
            <Link key={p._id} to={`/projects/${p._id}`}>
              <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color || '#6366f1', flexShrink: 0, marginTop: 2 }}></div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.visibility} · {p.members?.length || 0} members
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Archive"
                      onClick={(e) => handleArchive(p._id, e)} style={{ fontSize: 14 }}>📦</button>
                    {user?.role === 'admin' && (
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete"
                        onClick={(e) => handleDelete(p._id, e)} style={{ fontSize: 14 }}>🗑️</button>
                    )}
                  </div>
                </div>

                {p.description && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <Badge status={p.status} />
                  <Badge priority={p.priority} />
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6, color: 'var(--text-muted)' }}>
                    <span>Progress</span><span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.progress || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p.progress || 0}%` }}></div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {p.dueDate && <span>Due {new Date(p.dueDate).toLocaleDateString()}</span>}
                  {p.budget?.estimated && (
                    <span>💰 {p.budget.currency || 'USD'} {p.budget.estimated?.toLocaleString()}</span>
                  )}
                </div>

                {/* Tags */}
                {p.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {p.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="lg">
        <form onSubmit={handleCreate} className="modal-body">
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input placeholder="e.g. Website Redesign" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea placeholder="What is this project about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorityOptions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              {visibilityOptions.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colors.map((c) => (
                <div key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '2px solid transparent', transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;

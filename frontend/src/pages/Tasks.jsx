import { useState, useEffect } from 'react';
import { getMyTasks, updateTaskStatus, deleteTask, updateChecklistItem } from '../api/tasks';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

const statusOptions = [
  { value: 'todo', label: 'To Do', color: '#64748b' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'review', label: 'Review', color: '#f59e0b' },
  { value: 'completed', label: 'Completed', color: '#10b981' },
  { value: 'blocked', label: 'Blocked', color: '#ef4444' },
];

const Tasks = () => {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getMyTasks({ limit: 100 });
      setTasks(data.data?.tasks || data.data || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleStatusChange = async (id, status) => {
    try {
      await updateTaskStatus(id, { status });
      setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status } : t));
    } catch (_) { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try { await deleteTask(id); setTasks((prev) => prev.filter((t) => t._id !== id)); toast.success('Task deleted'); }
    catch (_) { toast.error('Failed to delete'); }
  };

  const handleChecklistToggle = async (taskId, itemId, current) => {
    try {
      await updateChecklistItem(taskId, itemId, { isCompleted: !current });
      setTasks((prev) => prev.map((t) => {
        if (t._id !== taskId) return t;
        return { ...t, checklist: t.checklist.map((c) => c._id === itemId ? { ...c, isCompleted: !current } : c) };
      }));
    } catch (_) { toast.error('Failed to update checklist'); }
  };

  const counts = { all: tasks.length };
  statusOptions.forEach((s) => { counts[s.value] = tasks.filter((t) => t.status === s.value).length; });
  const overdue = tasks.filter((t) => t.isOverdue).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">My Tasks</h2>
          <p className="page-subtitle">{filtered.length} tasks · {overdue > 0 ? <span style={{ color: 'var(--accent-danger)' }}>{overdue} overdue</span> : 'All on time'}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {statusOptions.map((s) => (
          <div key={s.value} className="stat-card" style={{ borderLeft: `3px solid ${s.color}`, cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}>
            <div className="stat-value">{counts[s.value] || 0}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: '1 1 220px', maxWidth: 300 }}>
          <span className="search-icon">🔍</span>
          <input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Priorities</option>
          {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner spinner-lg"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-desc">{search ? 'Try a different search term' : 'You have no assigned tasks'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((task) => {
            const isExpanded = expandedTask === task._id;
            const checklistDone = task.checklist?.filter((c) => c.isCompleted).length || 0;
            const checklistTotal = task.checklist?.length || 0;

            return (
              <div key={task._id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Task row */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Status indicator */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: statusOptions.find((s) => s.value === task.status)?.color || '#64748b' }}></div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
                      <Badge priority={task.priority} />
                      {task.isOverdue && <span className="badge badge-blocked">⚠ Overdue</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                      {task.project?.name && <span>📁 {task.project.name}</span>}
                      {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
                      {checklistTotal > 0 && <span>☑ {checklistDone}/{checklistTotal}</span>}
                      {task.estimatedHours && <span>⏱ {task.actualHours || 0}/{task.estimatedHours}h</span>}
                      {task.watchers?.length > 0 && <span>👁 {task.watchers.length}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <select value={task.status} onChange={(e) => handleStatusChange(task._id, e.target.value)}
                      style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
                      onClick={(e) => e.stopPropagation()}>
                      {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {task.checklist?.length > 0 && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpandedTask(isExpanded ? null : task._id)} title="Toggle checklist">
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(task._id)}>🗑️</button>
                  </div>
                </div>

                {/* Checklist */}
                {isExpanded && task.checklist?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 18px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Checklist — {checklistDone}/{checklistTotal}
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 10 }}>
                      <div className="progress-fill" style={{ width: `${checklistTotal > 0 ? Math.round(checklistDone / checklistTotal * 100) : 0}%` }}></div>
                    </div>
                    {task.checklist.map((item) => (
                      <div key={item._id} className={`checklist-item ${item.isCompleted ? 'done' : ''}`}>
                        <input type="checkbox" checked={item.isCompleted} onChange={() => handleChecklistToggle(task._id, item._id, item.isCompleted)} />
                        <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{item.text}</span>
                        {item.isCompleted && item.completedAt && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(item.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    ))}
                    {task.description && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {task.description}
                      </div>
                    )}
                    {task.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        {task.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tasks;

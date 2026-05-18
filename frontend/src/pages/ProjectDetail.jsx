import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, updateProject, getProjectActivity, getProjectStats, addProjectMember, removeProjectMember, updateProjectMemberRole, assignTeamToProject } from '../api/projects';
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from '../api/tasks';
import { searchUsers } from '../api/users';
import { getTeams } from '../api/teams';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';

const statusCols = [
  { key: 'todo', label: 'To Do', color: '#64748b' },
  { key: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'In Review', color: '#f59e0b' },
  { key: 'completed', label: 'Completed', color: '#10b981' },
  { key: 'blocked', label: 'Blocked', color: '#ef4444' },
];

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showAssignTeam, setShowAssignTeam] = useState(false);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');

  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', estimatedHours: '', assignee: '' });
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRole, setMemberRole] = useState('member');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [pRes, tRes, aRes, sRes] = await Promise.allSettled([
        getProject(id),
        getTasks({ project: id, limit: 100 }),
        getProjectActivity(id),
        getProjectStats(id),
      ]);
      if (pRes.status === 'fulfilled') {
        const proj = pRes.value.data.data?.project || pRes.value.data.data;
        setProject(proj);
        setEditForm({ name: proj?.name || '', description: proj?.description || '', status: proj?.status || 'planning', priority: proj?.priority || 'medium', color: proj?.color || '#6366f1' });
      }
      if (tRes.status === 'fulfilled') setTasks(tRes.value.data.data?.tasks || tRes.value.data.data || []);
      if (aRes.status === 'fulfilled') setActivity(aRes.value.data.data?.activities || aRes.value.data.data || []);
      if (sRes.status === 'fulfilled') setStats(sRes.value.data.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createTask({ ...taskForm, project: id, reporter: user._id });
      toast.success('Task created!');
      setShowCreateTask(false);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', estimatedHours: '', assignee: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create task'); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch (_) { toast.error('Failed to update status'); }
  };

  const handleAssigneeChange = async (taskId, newAssignee) => {
    try {
      await updateTask(taskId, { assignee: newAssignee || null });
      setTasks((prev) => prev.map((t) => {
        if (t._id === taskId) {
          const assigneeUser = newAssignee ? (project.owner._id === newAssignee ? project.owner : project.members?.find((m) => m.user._id === newAssignee)?.user) : null;
          return { ...t, assignee: assigneeUser };
        }
        return t;
      }));
      toast.success('Assignee updated');
    } catch (_) { toast.error('Failed to update assignee'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try { await deleteTask(taskId); toast.success('Task deleted'); setTasks((prev) => prev.filter((t) => t._id !== taskId)); }
    catch (_) { toast.error('Failed to delete task'); }
  };

  const handleMemberSearch = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    try {
      const { data } = await searchUsers(q);
      setMemberResults(data.data || []);
    } catch (_) {}
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      await addProjectMember(id, { userId: selectedMember._id, role: memberRole });
      toast.success('Member added!');
      setShowAddMember(false);
      setSelectedMember(null); setMemberSearch(''); setMemberResults([]);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try { await removeProjectMember(id, userId); toast.success('Member removed'); load(); }
    catch (_) { toast.error('Failed to remove member'); }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateProject(id, editForm);
      toast.success('Project updated!');
      setShowEditProject(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg"></div></div>
  );

  const handleOpenAssignTeam = async () => {
    setShowAssignTeam(true);
    try {
      const { data } = await getTeams();
      setTeams(data.data?.teams || data.data || []);
    } catch (_) {}
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam) return;
    try {
      await assignTeamToProject(id, selectedTeam);
      toast.success('Team assigned and members synced!');
      setShowAssignTeam(false);
      setSelectedTeam('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to assign team'); }
  };
  if (!project) return (
    <div className="empty-state"><div className="empty-icon">❌</div><div className="empty-title">Project not found</div></div>
  );

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status && !t.isArchived);

  const allMembers = [
    { user: project.owner, role: 'owner', joinedAt: project.createdAt },
    ...(project.members || []),
  ];

  return (
    <div>
      {/* Project Header */}
      <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.color || '#6366f1', marginTop: 5, flexShrink: 0 }}></div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{project.name}</h2>
              {project.description && <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 10, maxWidth: 600 }}>{project.description}</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge status={project.status} />
                <Badge priority={project.priority} />
                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)' }}>
                  👁 {project.visibility}
                </span>
                {project.isArchived && <span className="badge badge-blocked">Archived</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEditProject(true)}>✏️ Edit</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>+ Task</button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, color: 'var(--text-muted)' }}>
            <span>Overall Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{project.progress || 0}%</span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
          </div>
        </div>

        {/* Meta Row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
          {project.startDate && <span>📅 Start: {new Date(project.startDate).toLocaleDateString()}</span>}
          {project.dueDate && <span>🏁 Due: {new Date(project.dueDate).toLocaleDateString()}</span>}
          {project.budget?.estimated && <span>💰 Budget: {project.budget.currency} {project.budget.estimated?.toLocaleString()} (Spent: {project.budget.spent?.toLocaleString() || 0})</span>}
          {project.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {project.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {statusCols.map((col) => (
            <div key={col.key} className="stat-card" style={{ borderLeft: `3px solid ${col.color}` }}>
              <div className="stat-value">{stats[col.key] || 0}</div>
              <div className="stat-label">{col.label}</div>
            </div>
          ))}
          <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {['board', 'list', 'members', 'activity', 'settings'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Board */}
      {tab === 'board' && (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12 }}>
          {statusCols.map((col) => {
            const colTasks = tasksByStatus(col.key);
            return (
              <div key={col.key} style={{ minWidth: 250, flex: '1 1 250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }}></div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 7px', borderRadius: '99px' }}>{colTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map((task) => (
                    <div key={task._id} className="card" style={{ padding: '14px', cursor: 'default' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
                      {task.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</p>}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        <Badge priority={task.priority} />
                        {task.isOverdue && <span className="badge badge-blocked">Overdue</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {statusCols.filter((s) => s.key !== col.key).slice(0, 2).map((s) => (
                            <button key={s.key} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => handleStatusChange(task._id, s.key)} title={`Move to ${s.label}`}>
                              → {s.label.split(' ')[s.label.split(' ').length - 1]}
                            </button>
                          ))}
                        </div>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTask(task._id)} style={{ fontSize: 12 }}>🗑️</button>
                      </div>
                      {task.dueDate && (
                        <div style={{ fontSize: 11, color: task.isOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: 6 }}>
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      {task.assignee && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}><Avatar user={task.assignee} size="sm" /><span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{task.assignee.firstName}</span></div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {tab === 'list' && (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th>Hours</th><th></th></tr></thead>
            <tbody>
              {tasks.filter((t) => !t.isArchived).map((task) => (
                <tr key={task._id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13.5 }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</div>}
                    {task.checklist?.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>✓ {task.checklist.filter((c) => c.isCompleted).length}/{task.checklist.length} checklist</div>}
                  </td>
                  <td>
                    <select value={task.status} onChange={(e) => handleStatusChange(task._id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      {statusCols.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td><Badge priority={task.priority} /></td>
                  <td>
                    <select value={task.assignee?._id || ''} onChange={(e) => handleAssigneeChange(task._id, e.target.value)}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <option value="">Unassigned</option>
                      {allMembers.map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>{m.user?.firstName} {m.user?.lastName}</option>
                      ))}
                    </select>
                  </td>
                  <td><span style={{ fontSize: 12.5, color: task.isOverdue ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</span></td>
                  <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{task.estimatedHours ? `${task.actualHours || 0}/${task.estimatedHours}h` : '—'}</span></td>
                  <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTask(task._id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No tasks yet</div></div>}
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenAssignTeam}>+ Assign Team</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Member</th><th>Role</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={project.owner} size="sm" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{project.owner?.firstName} {project.owner?.lastName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{project.owner?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-active">Owner</span></td>
                  <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{new Date(project.createdAt).toLocaleDateString()}</span></td>
                  <td></td>
                </tr>
                {project.members?.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar user={m.user} size="sm" />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{m.user?.firstName} {m.user?.lastName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge type={m.role} /></td>
                    <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{new Date(m.joinedAt).toLocaleDateString()}</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.user?._id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activity.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No activity yet</div></div>
          ) : activity.map((a) => (
            <div key={a._id} className="card" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar user={a.actor} size="sm" />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{a.actor?.firstName} {a.actor?.lastName} </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.type?.replace(/\./g, ' ').replace(/_/g, ' ')}</span>
                {a.task && <span style={{ fontSize: 13, color: 'var(--text-accent)' }}> — {a.task?.title}</span>}
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Project Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'allowMemberInvites', label: 'Allow member invites', desc: 'Members can invite others to this project' },
              { key: 'taskApprovalRequired', label: 'Task approval required', desc: 'Tasks need approval before being marked complete' },
            ].map((s) => (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: '99px',
                  background: project.settings?.[s.key] ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: project.settings?.[s.key] ? 20 : 2, transition: 'left 0.2s' }}></div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>Auto-archive after (days)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto archive completed tasks</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{project.settings?.autoArchiveDays || 30} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} title="Create Task" size="lg">
        <form onSubmit={handleCreateTask} className="modal-body">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea placeholder="Task details..." value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                {statusCols.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {allMembers.map((m) => (
                  <option key={m.user?._id} value={m.user?._id}>
                    {m.user?.firstName} {m.user?.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Est. Hours</label>
            <input type="number" min="0" step="0.5" placeholder="0" value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTask(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Task</button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Search User</label>
            <input placeholder="Type name or email..." value={memberSearch} onChange={(e) => handleMemberSearch(e.target.value)} />
            {memberResults.length > 0 && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginTop: 6, overflow: 'hidden' }}>
                {memberResults.map((u) => (
                  <div key={u._id} onClick={() => { setSelectedMember(u); setMemberSearch(`${u.firstName} ${u.lastName}`); setMemberResults([]); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <Avatar user={u} size="sm" />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              {['viewer', 'member', 'lead'].map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddMember} disabled={!selectedMember}>Add Member</button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={showEditProject} onClose={() => setShowEditProject(false)} title="Edit Project">
        <form onSubmit={handleUpdateProject} className="modal-body">
          <div className="form-group"><label className="form-label">Name *</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {['planning', 'active', 'on-hold', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditProject(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Team Modal */}
      <Modal isOpen={showAssignTeam} onClose={() => setShowAssignTeam(false)} title="Assign Team">
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Select Team</label>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
              <option value="">-- Choose a team --</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              This will link the team and add all of its members to this project automatically.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowAssignTeam(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssignTeam} disabled={!selectedTeam}>Assign</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDetail;

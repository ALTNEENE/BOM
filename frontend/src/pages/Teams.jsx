import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeams, createTeam, deleteTeam, joinTeamWithCode } from '../api/teams';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';

const Teams = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getTeams({ limit: 50 });
      setTeams(data.data?.teams || data.data || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createTeam(form);
      toast.success('Team created!');
      setShowCreate(false);
      setForm({ name: '', description: '', color: '#6366f1' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create team'); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await joinTeamWithCode(inviteCode.trim().toUpperCase());
      toast.success('Joined team successfully!');
      setShowJoin(false);
      setInviteCode('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid or expired invite code'); }
    finally { setJoining(false); }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this team? This cannot be undone.')) return;
    try { await deleteTeam(id); toast.success('Team deleted'); load(); }
    catch (_) { toast.error('Failed to delete team'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Teams</h2>
          <p className="page-subtitle">{filtered.length} teams you're part of</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>🔗 Join with Code</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Team</button>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ maxWidth: 340, marginBottom: 20 }}>
        <span className="search-icon">🔍</span>
        <input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner spinner-lg"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">No teams found</div>
          <div className="empty-desc">Create a team or join one with an invite code</div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>+ New Team</button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((team) => {
            const memberCount = (team.members?.length || 0) + 1;
            const isOwner = team.owner?._id === user?._id || team.owner === user?._id;

            return (
              <Link key={team._id} to={`/teams/${team._id}`}>
                <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {team.avatar ? (
                        <img src={team.avatar} alt={team.name} style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 44, height: 44, borderRadius: 'var(--radius-md)',
                          background: team.color || '#6366f1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 800, color: '#fff',
                        }}>
                          {team.name[0]}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{team.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {isOwner && (
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete team"
                        onClick={(e) => handleDelete(team._id, e)} style={{ fontSize: 14 }}>🗑️</button>
                    )}
                  </div>

                  {team.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {team.description}
                    </p>
                  )}

                  {/* Member avatars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                    <div style={{ display: 'flex' }}>
                      <Avatar user={team.owner} size="sm" />
                      {team.members?.slice(0, 4).map((m, i) => (
                        <Avatar key={m._id || i} user={m.user} size="sm" style={{ marginLeft: -8 }} />
                      ))}
                    </div>
                    {memberCount > 5 && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 4 }}>+{memberCount - 5} more</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!team.isActive && <span className="badge badge-blocked">Inactive</span>}
                      {isOwner && <span className="badge badge-active">Owner</span>}
                      {team.settings?.isPublic && <span className="badge badge-in-progress">Public</span>}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Team">
        <form onSubmit={handleCreate} className="modal-body">
          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input placeholder="e.g. Engineering Team" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea placeholder="What does this team work on?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 80 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Team Color</label>
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
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join a Team">
        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Enter the invite code shared by your team admin to join an existing team.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Invite Code</label>
            <input
              placeholder="e.g. AB12CD34"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: 18, fontWeight: 700 }}
              maxLength={10}
            />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleJoin} disabled={joining || !inviteCode.trim()}>
              {joining ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Teams;

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTeam, updateTeam, addTeamMember, removeTeamMember, updateTeamMemberRole, generateInviteCode } from '../api/teams';
import { searchUsers } from '../api/users';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';

const TeamDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRole, setMemberRole] = useState('member');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await getTeam(id);
      const t = data.data?.team || data.data;
      setTeam(t);
      setEditForm({ name: t?.name || '', description: t?.description || '', color: t?.color || '#6366f1' });
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const currentUserId = user?._id;
  const ownerId = team?.owner?._id || team?.owner;
  const currentMember = team?.members?.find((member) => {
    const memberId = member.user?._id || member.user;
    return memberId && currentUserId && memberId.toString() === currentUserId.toString();
  });
  const currentMemberRole = ownerId && currentUserId && ownerId.toString() === currentUserId.toString()
    ? 'owner'
    : currentMember?.role;
  const isOwner = currentMemberRole === 'owner';
  const isGlobalAdmin = user?.role === 'admin';
  const canManageTeam = ['owner', 'admin'].includes(currentMemberRole) || isGlobalAdmin;
  const canAddMembers = canManageTeam || (Boolean(currentMemberRole) && team?.settings?.allowMemberInvites);
  const canChangeRoles = isOwner || isGlobalAdmin;

  const handleMemberSearch = async (q) => {
    setMemberSearch(q);
    setSelectedMember(null);
    if (q.length < 2) { setMemberResults([]); return; }
    try {
      const { data } = await searchUsers(q);
      const users = data.data?.users || data.data || [];
      setMemberResults(Array.isArray(users) ? users : []);
    } catch (_) {}
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      await addTeamMember(id, { userId: selectedMember._id, role: memberRole });
      toast.success('Member added!');
      setShowAddMember(false);
      setSelectedMember(null); setMemberSearch(''); setMemberResults([]);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try { await removeTeamMember(id, userId); toast.success('Member removed'); load(); }
    catch (_) { toast.error('Failed to remove member'); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await updateTeamMemberRole(id, userId, { role }); toast.success('Role updated'); load(); }
    catch (_) { toast.error('Failed to update role'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await updateTeam(id, editForm); toast.success('Team updated!'); setShowEdit(false); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleGenerateInvite = async (days, limit) => {
    try {
      const { data } = await generateInviteCode(id, { expiresInDays: days, usageLimit: limit });
      const code = data.data?.inviteCode?.code || data.data?.code;
      setGeneratedCode(code);
      toast.success('Invite code generated!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate code'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg"></div></div>;
  if (!team) return <div className="empty-state"><div className="empty-icon">❌</div><div className="empty-title">Team not found</div></div>;

  const allMembers = [
    { user: team.owner, role: 'owner', joinedAt: team.createdAt },
    ...(team.members || []),
  ];

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

  return (
    <div>
      {/* Team Header */}
      <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: team.color || '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {team.name[0]}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{team.name}</h2>
              {team.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 500 }}>{team.description}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {!team.isActive && <span className="badge badge-blocked">Inactive</span>}
                {team.settings?.isPublic && <span className="badge badge-in-progress">Public</span>}
                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)' }}>
                  👥 {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          {(canManageTeam || canAddMembers) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {canManageTeam && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(true)}>🔗 Invite Code</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
                </>
              )}
              {canAddMembers && <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Member</button>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {['members', 'settings'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Members */}
      {tab === 'members' && (
        <div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Member</th><th>Job Title</th><th>Role</th><th>Joined</th>{canManageTeam && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {allMembers.map((m, i) => {
                  const u = m.user;
                  const isThisOwner = m.role === 'owner';
                  return (
                    <tr key={u?._id || i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar user={u} size="sm" />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{u?.firstName} {u?.lastName}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u?.jobTitle || '—'}</span></td>
                      <td>
                        {canChangeRoles && !isThisOwner ? (
                          <select value={m.role} onChange={(e) => handleRoleChange(u?._id, e.target.value)}
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                            {['member', 'moderator', 'admin'].map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                        ) : <Badge type={m.role} />}
                      </td>
                      <td><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{new Date(m.joinedAt || team.createdAt).toLocaleDateString()}</span></td>
                      {canManageTeam && (
                        <td>
                          {!isThisOwner && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(u?._id)}>Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Team Settings</h3>

          {/* Invite code info */}
          {team.inviteCode?.code && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Active Invite Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-accent)', letterSpacing: '0.15em' }}>{team.inviteCode.code}</span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <div>Expires: {new Date(team.inviteCode.expiresAt).toLocaleDateString()}</div>
                  <div>Uses: {team.inviteCode.usageCount}/{team.inviteCode.usageLimit || '∞'}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'isPublic', label: 'Public Team', desc: 'Anyone can find and request to join this team' },
              { key: 'allowMemberInvites', label: 'Allow Member Invites', desc: 'Members can generate invite codes' },
            ].map((s) => (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: '99px', background: team.settings?.[s.key] ? 'var(--accent-primary)' : 'var(--bg-elevated)', border: '1px solid var(--border-default)', position: 'relative' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: team.settings?.[s.key] ? 20 : 2, transition: 'left 0.2s' }}></div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
              Default Project Visibility: <Badge type={team.settings?.defaultProjectVisibility || 'team'} />
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Team Member">
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Search User</label>
            <input placeholder="Type name or email..." value={memberSearch} onChange={(e) => handleMemberSearch(e.target.value)} />
            {memberResults.length > 0 && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginTop: 6, overflow: 'hidden' }}>
                {memberResults.map((u) => (
                  <div key={u._id} onClick={() => { setSelectedMember(u); setMemberSearch(`${u.firstName} ${u.lastName}`); setMemberResults([]); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
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
              {['member', 'moderator', 'admin'].map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddMember} disabled={!selectedMember}>Add Member</button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Team">
        <form onSubmit={handleUpdate} className="modal-body">
          <div className="form-group"><label className="form-label">Name *</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div className="form-group"><label className="form-label">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {colors.map((c) => (
                <div key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: editForm.color === c ? '3px solid white' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Invite Code Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Generate Invite Code">
        <div className="modal-body">
          {generatedCode ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Invite Code</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-accent)', letterSpacing: '0.2em', padding: '16px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                {generatedCode}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Share this code with your team members. Valid for 7 days.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Generate a unique invite code that others can use to join this team.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => handleGenerateInvite(7, null)}>Generate 7-day code (unlimited uses)</button>
                <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => handleGenerateInvite(1, 10)}>Generate 24h code (max 10 uses)</button>
              </div>
            </>
          )}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => { setShowInvite(false); setGeneratedCode(''); }}>Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamDetail;

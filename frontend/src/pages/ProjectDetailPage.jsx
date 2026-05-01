import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const STATUS_COLS = ['todo', 'in_progress', 'done'];
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

function TaskModal({ projectId, members, task, onSave, onClose, isAdmin }) {
  const { user } = useAuth();
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description || '',
    assignee_id: task.assignee_id || '', status: task.status,
    priority: task.priority, due_date: task.due_date || '',
  } : { title: '', description: '', assignee_id: '', status: 'todo', priority: 'medium', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      if (task) {
        const { data } = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
        onSave(data);
      } else {
        const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
        onSave(data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input placeholder="Task title" value={form.title} onChange={set('title')} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea placeholder="Details…" value={form.description} onChange={set('description')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assignee</label>
              <select value={form.assignee_id} onChange={set('assignee_id')}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MemberModal({ projectId, onAdd, onClose }) {
  const [form, setForm] = useState({ email: '', role: 'member' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, form);
      onAdd(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Member</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleSubmit}>
          <div className="form-group">
            <label>User Email</label>
            <input type="email" placeholder="member@example.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kanban');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const loadProject = () => api.get(`/projects/${id}`).then(r => setProject(r.data));
  const loadTasks = () => api.get(`/projects/${id}/tasks`).then(r => setTasks(r.data));

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false));
  }, [id]);

  const isAdmin = project?.my_role === 'admin';

  const allMembers = project ? [
    { id: project.owner.id, name: project.owner.name + ' (owner)', email: project.owner.email },
    ...(project.members || []),
  ] : [];

  const handleTaskSave = (saved) => {
    setTasks(ts => {
      const idx = ts.findIndex(t => t.id === saved.id);
      if (idx >= 0) { const copy = [...ts]; copy[idx] = saved; return copy; }
      return [saved, ...ts];
    });
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const { data } = await api.put(`/projects/${id}/tasks/${task.id}`, { status: newStatus });
      handleTaskSave(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== userId) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project? This is irreversible.')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div style={{ paddingTop: 60 }}><div className="spinner" /></div>;
  if (!project) return <div className="empty-state"><h3>Project not found</h3></div>;

  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const tasksByStatus = STATUS_COLS.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s) }), {});

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ padding: '4px 10px' }}>← Back</button>
          </div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && <button className="btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ New Task</button>}
          {!isAdmin && <button className="btn-ghost" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ New Task</button>}
          {isAdmin && project.owner_id === user.id && (
            <button className="btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['kanban', 'list', 'members'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', padding: '10px 18px', cursor: 'pointer',
            fontFamily: 'Syne', fontWeight: 600, fontSize: 14,
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t === 'kanban' ? 'Board' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Kanban */}
      {tab === 'kanban' && (
        <div className="kanban-board">
          {STATUS_COLS.map(status => (
            <div key={status} className="kanban-col">
              <div className="kanban-col-header">
                <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                <span className="kanban-count">{tasksByStatus[status].length}</span>
              </div>
              <div className="kanban-tasks">
                {tasksByStatus[status].map(t => (
                  <div key={t.id} className={`task-card ${t.is_overdue ? 'overdue' : ''}`}>
                    <div className="task-title" onClick={() => { setEditingTask(t); setShowTaskModal(true); }}>{t.title}</div>
                    <div className="task-meta">
                      <span className={`badge badge-${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span>
                      {t.assignee_name && <span className="task-assignee">👤 {t.assignee_name}</span>}
                      {t.due_date && <span className={`task-due ${t.is_overdue ? 'overdue' : ''}`}>📅 {t.due_date}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {STATUS_COLS.filter(s => s !== status).map(s => (
                        <button key={s} className="btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                          onClick={() => handleStatusChange(t, s)}>→ {STATUS_LABEL[s]}</button>
                      ))}
                      <button className="btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 8px', marginLeft: 'auto' }}
                        onClick={() => handleDeleteTask(t.id)}>✕</button>
                    </div>
                  </div>
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {tab === 'list' && (
        <div>
          <div className="task-filters">
            {['all', ...STATUS_COLS].map(s => (
              <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredTasks.length === 0 ? (
              <div className="empty-state"><div className="icon">✓</div><p>No tasks here</p></div>
            ) : (
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => { setEditingTask(t); setShowTaskModal(true); }}>
                        {t.title}
                        {t.is_overdue ? <span className="badge badge-overdue" style={{ marginLeft: 8 }}>Overdue</span> : null}
                      </td>
                      <td><span className={`badge badge-${t.status}`}>{STATUS_LABEL[t.status]}</span></td>
                      <td><span className={`badge badge-${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.assignee_name || '—'}</td>
                      <td style={{ color: t.is_overdue ? 'var(--red)' : 'var(--text-muted)', fontSize: 13 }}>{t.due_date || '—'}</td>
                      <td>
                        <button className="btn-danger btn-sm" onClick={() => handleDeleteTask(t.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>{1 + (project.members?.length || 0)} members</h3>
            {isAdmin && <button className="btn-primary btn-sm" onClick={() => setShowMemberModal(true)}>+ Add Member</button>}
          </div>
          <div className="members-list">
            {/* Owner */}
            <div className="member-row">
              <div className="user-avatar">{project.owner.name[0].toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{project.owner.name}</div>
                <div className="member-email">{project.owner.email}</div>
              </div>
              <span className="badge badge-admin">Owner</span>
            </div>
            {project.members?.map(m => (
              <div key={m.id} className="member-row">
                <div className="user-avatar">{m.name[0].toUpperCase()}</div>
                <div className="member-info">
                  <div className="member-name">{m.name}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
                {isAdmin && (
                  <button className="btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal projectId={id} members={allMembers} task={editingTask}
          onSave={handleTaskSave} onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          isAdmin={isAdmin} />
      )}
      {showMemberModal && (
        <MemberModal projectId={id}
          onAdd={m => setProject(p => ({ ...p, members: [...(p.members || []), m] }))}
          onClose={() => setShowMemberModal(false)} />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      navigate(`/projects/${data.id}`);
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map(e => e.msg).join(', ') : err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ paddingTop: 60 }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {!projects.length ? (
        <div className="empty-state">
          <div className="icon">◧</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => {
            const pct = p.task_count ? 0 : 0;
            return (
              <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="project-card-name">{p.name}</div>
                    <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
                  </div>
                  {p.description && <div className="project-card-desc">{p.description}</div>}
                </div>
                <div className="project-card-meta">
                  <span>👤 {p.owner_name}</span>
                  <span>✔ {p.task_count} tasks</span>
                  <span>◎ {p.member_count} members</span>
                </div>
                <div className="project-progress">
                  <div className="project-progress-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Project</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name</label>
                <input placeholder="e.g. Website Redesign" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea placeholder="What is this project about?" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

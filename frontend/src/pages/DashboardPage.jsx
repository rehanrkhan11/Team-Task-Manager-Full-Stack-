import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ paddingTop: 60 }}><div className="spinner" /></div>;

  const { total_projects, total_tasks, my_tasks, overdue, by_status, recent_tasks, projects } = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening across your projects</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value accent">{total_projects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value blue">{total_tasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">My Tasks</div>
          <div className="stat-value">{my_tasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value red">{overdue}</div>
        </div>
      </div>

      {by_status && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Task Status Breakdown</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {Object.entries(by_status).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge badge-${status}`}>{statusLabel[status]}</span>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20 }}>{count}</span>
              </div>
            ))}
          </div>
          {total_tasks > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 4, height: 8 }}>
              {Object.entries(by_status).map(([status, count]) => {
                const colors = { todo: 'var(--text-muted)', in_progress: 'var(--blue)', done: 'var(--green)' };
                const pct = total_tasks ? (count / total_tasks) * 100 : 0;
                return pct > 0 ? (
                  <div key={status} style={{ flex: pct, background: colors[status], borderRadius: 4, transition: 'flex 0.4s' }} />
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Recent Tasks</h3>
          {!recent_tasks?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tasks yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent_tasks.slice(0, 6).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--surface2)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${t.project_id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project_name}</div>
                  </div>
                  <span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span>
                  {t.is_overdue ? <span className="badge badge-overdue">Overdue</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Projects Progress</h3>
          {!projects?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No projects yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {projects.map(p => {
                const pct = p.total_tasks ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <div key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                    <div className="project-progress">
                      <div className="project-progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

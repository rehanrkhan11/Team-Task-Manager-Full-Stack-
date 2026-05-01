const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await db.all(`
      SELECT p.id, p.name FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.owner_id = ? OR pm.user_id = ?
    `, [userId, userId, userId]);

    const projectIds = projects.map(p => p.id);

    if (!projectIds.length) {
      return res.json({
        total_projects: 0, total_tasks: 0, my_tasks: 0,
        overdue: 0, by_status: { todo: 0, in_progress: 0, done: 0 },
        recent_tasks: [], projects: []
      });
    }

    const inClause = projectIds.map(() => '?').join(',');

    const byStatus = await db.all(`
      SELECT status, COUNT(*) as count FROM tasks
      WHERE project_id IN (${inClause})
      GROUP BY status
    `, projectIds);

    const statusMap = { todo: 0, in_progress: 0, done: 0 };
    byStatus.forEach(r => { statusMap[r.status] = r.count; });

    const myTasksRow = await db.get(`
      SELECT COUNT(*) as count FROM tasks WHERE project_id IN (${inClause}) AND assignee_id = ?
    `, [...projectIds, userId]);

    const overdueRow = await db.get(`
      SELECT COUNT(*) as count FROM tasks
      WHERE project_id IN (${inClause}) AND due_date < date('now') AND status != 'done'
    `, projectIds);

    const recentTasks = await db.all(`
      SELECT t.*, p.name as project_name, u.name as assignee_name,
        CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id IN (${inClause})
      ORDER BY t.updated_at DESC LIMIT 10
    `, projectIds);

    const projectStats = await Promise.all(projectIds.map(async pid => {
      const p = projects.find(x => x.id === pid);
      const stats = await db.get(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
        FROM tasks WHERE project_id = ?
      `, [pid]);
      return { ...p, total_tasks: stats.total, done_tasks: stats.done };
    }));

    res.json({
      total_projects: projectIds.length,
      total_tasks: statusMap.todo + statusMap.in_progress + statusMap.done,
      my_tasks: myTasksRow.count,
      overdue: overdueRow.count,
      by_status: statusMap,
      recent_tasks: recentTasks,
      projects: projectStats,
    });
  } catch (err) { next(err); }
});

module.exports = router;

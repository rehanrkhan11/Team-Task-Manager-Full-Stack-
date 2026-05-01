const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.use(requireProjectRole());

router.get('/', async (req, res, next) => {
  try {
    const { status, assignee, priority } = req.query;
    let query = `
      SELECT t.*,
        u.name as assignee_name, u.email as assignee_email,
        c.name as created_by_name,
        CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = ?
    `;
    const params = [req.params.projectId];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
    query += ' ORDER BY t.created_at DESC';
    const tasks = await db.all(query, params);
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, assignee_id, status, priority, due_date } = req.body;

    if (assignee_id) {
      const isMember = await db.get(`
        SELECT 1 as found FROM project_members WHERE project_id = ? AND user_id = ?
        UNION SELECT 1 FROM projects WHERE id = ? AND owner_id = ?
      `, [req.params.projectId, assignee_id, req.params.projectId, assignee_id]);
      if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    const result = await db.run(`
      INSERT INTO tasks (title, description, project_id, assignee_id, created_by, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, description || null, req.params.projectId, assignee_id || null, req.user.id, status || 'todo', priority || 'medium', due_date || null]);

    const task = await db.get(`
      SELECT t.*, u.name as assignee_name, c.name as created_by_name
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = ?
    `, [result.lastID]);
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.put('/:taskId', [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], async (req, res, next) => {
  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [req.params.taskId, req.params.projectId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.projectRole === 'member' && task.assignee_id !== req.user.id && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    const { title, description, assignee_id, status, priority, due_date } = req.body;
    await db.run(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        assignee_id = COALESCE(?, assignee_id),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title || null, description || null, assignee_id || null, status || null, priority || null, due_date || null, req.params.taskId]);

    const updated = await db.get(`
      SELECT t.*, u.name as assignee_name, c.name as created_by_name
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = ?
    `, [req.params.taskId]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:taskId', async (req, res, next) => {
  try {
    const task = await db.get('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [req.params.taskId, req.params.projectId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.projectRole === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });
    }

    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.taskId]);
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

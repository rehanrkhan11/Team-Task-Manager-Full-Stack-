const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const projects = await db.all(`
      SELECT p.*, u.name as owner_name,
        COALESCE(pm.role, 'admin') as my_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.owner_id = ? OR pm.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id, req.user.id, req.user.id]);
    res.json(projects);
  } catch (err) { next(err); }
});

router.post('/', [body('name').trim().notEmpty().withMessage('Project name required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description } = req.body;
      const result = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', [name, description || null, req.user.id]);
      const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
      res.status(201).json(project);
    } catch (err) { next(err); }
  }
);

router.get('/:id', requireProjectRole(), async (req, res, next) => {
  try {
    const members = await db.all(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [req.params.id]);
    const owner = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.project.owner_id]);
    res.json({ ...req.project, members, owner, my_role: req.projectRole });
  } catch (err) { next(err); }
});

router.put('/:id', requireProjectRole('admin'), [body('name').trim().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { name, description } = req.body;
      await db.run('UPDATE projects SET name = ?, description = ? WHERE id = ?', [name, description || null, req.params.id]);
      const updated = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only project owner can delete' });
    await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

router.post('/:projectId/members', requireProjectRole('admin'), [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, role } = req.body;
    const user = await db.get('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.project.owner_id) return res.status(400).json({ error: 'User is already the owner' });

    try {
      await db.run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [req.params.projectId, user.id, role]);
      res.status(201).json({ ...user, role });
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ error: 'User already a member' });
      throw e;
    }
  } catch (err) { next(err); }
});

router.put('/:projectId/members/:userId', requireProjectRole('admin'), [
  body('role').isIn(['admin', 'member']),
], async (req, res, next) => {
  try {
    const { role } = req.body;
    const result = await db.run('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, req.params.projectId, req.params.userId]);
    if (!result.changes) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Role updated' });
  } catch (err) { next(err); }
});

router.delete('/:projectId/members/:userId', requireProjectRole('admin'), async (req, res, next) => {
  try {
    const result = await db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.projectId, req.params.userId]);
    if (!result.changes) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

module.exports = router;

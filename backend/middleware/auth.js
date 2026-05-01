const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'projectflow_secret_change_in_prod';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireProjectRole(...roles) {
  return async (req, res, next) => {
    const projectId = req.params.projectId || req.params.id;
    try {
      const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (project.owner_id === req.user.id) {
        req.projectRole = 'admin';
        req.project = project;
        return next();
      }

      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );

      if (!membership) return res.status(403).json({ error: 'Not a project member' });
      if (roles.length && !roles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.projectRole = membership.role;
      req.project = project;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireProjectRole, JWT_SECRET };

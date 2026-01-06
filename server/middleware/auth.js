import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user details
    const userResult = await query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.status, r.role_code, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role_code)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Alias for compatibility
export const requireRole = (...allowedRoles) => {
  return authorizeRoles(...allowedRoles);
};

export const auditLog = async (req, entityType, entityId, action, oldValue, newValue, metadata = {}) => {
  try {
    await query(
      `INSERT INTO audit_events (
        event_type, entity_type, entity_id, user_id, action, 
        old_value, new_value, metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        `${entityType}_${action}`,
        entityType,
        entityId,
        req.user?.user_id || null,
        action,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        JSON.stringify(metadata),
        req.ip,
        req.get('user-agent')
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

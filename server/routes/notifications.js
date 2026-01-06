import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_read, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        notification_id, notification_type, title, message,
        related_entity_type, related_entity_id,
        is_read, is_email_sent, priority, created_at, read_at
      FROM notifications
      WHERE user_id = $1
    `;
    
    const params = [req.user.user_id];
    let paramCount = 2;
    
    if (is_read !== undefined) {
      sql += ` AND is_read = $${paramCount}`;
      params.push(is_read === 'true');
      paramCount++;
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.user_id]
    );
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2',
      [notificationId, req.user.user_id]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
      [req.user.user_id]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

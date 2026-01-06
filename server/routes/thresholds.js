import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, auditLog } from '../middleware/auth.js';

const router = express.Router();

// Get all satisfaction thresholds
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT threshold_id, status, min_percentage, max_percentage, description, created_at, updated_at
      FROM satisfaction_thresholds
      ORDER BY min_percentage DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update satisfaction threshold
router.put('/:id', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { min_percentage, max_percentage } = req.body;
    
    if (min_percentage === undefined || max_percentage === undefined) {
      return res.status(400).json({ error: 'Min and max percentages required' });
    }
    
    if (min_percentage < 0 || max_percentage > 100 || min_percentage >= max_percentage) {
      return res.status(400).json({ error: 'Invalid percentage range' });
    }
    
    const result = await query(`
      UPDATE satisfaction_thresholds
      SET min_percentage = $1, max_percentage = $2, updated_at = CURRENT_TIMESTAMP
      WHERE threshold_id = $3
      RETURNING *
    `, [min_percentage, max_percentage, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Threshold not found' });
    }
    
    await auditLog(req.user.userId, 'UPDATE', 'satisfaction_thresholds', id, 
      { min_percentage, max_percentage });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global threshold
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT gts.*, u.full_name as set_by_name
      FROM global_threshold_settings gts
      LEFT JOIN users u ON gts.set_by = u.user_id
      ORDER BY threshold_year DESC
      LIMIT 1
    `);
    
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching global threshold:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set global threshold (CEO only)
router.post('/global', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    const { threshold_year, threshold_percentage } = req.body;
    
    if (!threshold_year || !threshold_percentage) {
      return res.status(400).json({ error: 'Year and threshold percentage required' });
    }
    
    if (threshold_percentage < 0 || threshold_percentage > 100) {
      return res.status(400).json({ error: 'Threshold must be between 0 and 100' });
    }
    
    // Check if already exists for this year
    const existingResult = await query(
      'SELECT setting_id FROM global_threshold_settings WHERE threshold_year = $1',
      [threshold_year]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Threshold already set for this year' });
    }
    
    // Insert new threshold
    const result = await query(`
      INSERT INTO global_threshold_settings (threshold_year, threshold_percentage, set_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [threshold_year, threshold_percentage, req.user.user_id]);
    
    const newThreshold = result.rows[0];
    
    // Audit log
    await auditLog(req, 'THRESHOLD', newThreshold.setting_id, 'CREATE', null, {
      threshold_year,
      threshold_percentage
    });
    
    // Create notifications for all Group GMs and Risk
    const gmRoles = ['GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_OPERATIONS', 'GM_RISK', 'GM_COMPLIANCE'];
    const gmsResult = await query(`
      SELECT u.user_id 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE r.role_code = ANY($1)
    `, [gmRoles]);
    
    for (const gm of gmsResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
        VALUES ($1, 'THRESHOLD_SET', $2, $3, 'high', 'THRESHOLD', $4)
      `, [
        gm.user_id,
        `Global Threshold Set for ${threshold_year}`,
        `CEO has set the global satisfaction threshold to ${threshold_percentage}% for year ${threshold_year}.`,
        newThreshold.setting_id
      ]);
    }
    
    // Mark notification as sent
    await query(
      'UPDATE global_threshold_settings SET notification_sent = true WHERE setting_id = $1',
      [newThreshold.setting_id]
    );
    
    res.status(201).json(newThreshold);
  } catch (error) {
    console.error('Error setting global threshold:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee-specific threshold exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
  try {
    const { status, fee_id } = req.query;
    
    let sql = `
      SELECT 
        fte.*, 
        fd.fee_name, tc.segment, tc.category,
        u_req.full_name as requested_by_name,
        u_fin.full_name as finance_reviewed_by_name,
        u_risk.full_name as risk_reviewed_by_name,
        u_appr.full_name as approved_by_name
      FROM fee_threshold_exceptions fte
      JOIN fee_definitions fd ON fte.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN users u_req ON fte.requested_by = u_req.user_id
      LEFT JOIN users u_fin ON fte.finance_reviewed_by = u_fin.user_id
      LEFT JOIN users u_risk ON fte.risk_reviewed_by = u_risk.user_id
      LEFT JOIN users u_appr ON fte.approved_by = u_appr.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      sql += ` AND fte.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (fee_id) {
      sql += ` AND fte.fee_id = $${paramCount}`;
      params.push(fee_id);
      paramCount++;
    }
    
    sql += ' ORDER BY fte.created_at DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching threshold exceptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request fee-specific threshold exception (Group GM)
router.post('/exceptions', authenticateToken, authorizeRoles('GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_OPERATIONS'), async (req, res) => {
  try {
    const { fee_id, requested_threshold, justification, start_date, end_date } = req.body;
    
    if (!fee_id || !requested_threshold || !justification || !start_date || !end_date) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (requested_threshold < 0 || requested_threshold > 100) {
      return res.status(400).json({ error: 'Threshold must be between 0 and 100' });
    }
    
    // Insert request
    const result = await query(`
      INSERT INTO fee_threshold_exceptions (
        fee_id, requested_threshold, justification, start_date, end_date, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [fee_id, requested_threshold, justification, start_date, end_date, req.user.user_id]);
    
    const exception = result.rows[0];
    
    // Audit log
    await auditLog(req, 'THRESHOLD_EXCEPTION', exception.exception_id, 'CREATE', null, {
      fee_id,
      requested_threshold,
      start_date,
      end_date
    });
    
    // Notify Finance and Risk for review
    const financeResult = await query(`
      SELECT u.user_id FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_code = 'GM_FINANCE'
    `);
    const riskResult = await query(`
      SELECT u.user_id FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_code = 'GM_RISK'
    `);
    
    for (const user of [...financeResult.rows, ...riskResult.rows]) {
      await query(`
        INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
        VALUES ($1, 'THRESHOLD_EXCEPTION_REQUEST', $2, $3, 'high', 'THRESHOLD_EXCEPTION', $4)
      `, [
        user.user_id,
        'Fee-Specific Threshold Exception Request',
        `${req.user.full_name} has requested a threshold exception for fee ID ${fee_id} to ${requested_threshold}%.`,
        exception.exception_id
      ]);
    }
    
    res.status(201).json(exception);
  } catch (error) {
    console.error('Error creating threshold exception request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finance review threshold exception
router.patch('/exceptions/:exceptionId/finance-review', authenticateToken, authorizeRoles('GM_FINANCE'), async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const { approved } = req.body;
    
    await query(`
      UPDATE fee_threshold_exceptions
      SET finance_reviewed_by = $1, finance_reviewed_at = CURRENT_TIMESTAMP
      WHERE exception_id = $2
    `, [req.user.user_id, exceptionId]);
    
    // Audit log
    await auditLog(req, 'THRESHOLD_EXCEPTION', exceptionId, 'FINANCE_REVIEW', null, { approved });
    
    res.json({ message: 'Finance review recorded' });
  } catch (error) {
    console.error('Error recording finance review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Risk review threshold exception
router.patch('/exceptions/:exceptionId/risk-review', authenticateToken, authorizeRoles('GM_RISK'), async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const { approved } = req.body;
    
    await query(`
      UPDATE fee_threshold_exceptions
      SET risk_reviewed_by = $1, risk_reviewed_at = CURRENT_TIMESTAMP
      WHERE exception_id = $2
    `, [req.user.user_id, exceptionId]);
    
    // Audit log
    await auditLog(req, 'THRESHOLD_EXCEPTION', exceptionId, 'RISK_REVIEW', null, { approved });
    
    res.json({ message: 'Risk review recorded' });
  } catch (error) {
    console.error('Error recording risk review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CEO approve/reject threshold exception
router.patch('/exceptions/:exceptionId/approve', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const { decision } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected' });
    }
    
    // Check reviews completed
    const exceptionResult = await query(
      'SELECT * FROM fee_threshold_exceptions WHERE exception_id = $1',
      [exceptionId]
    );
    
    if (exceptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exception not found' });
    }
    
    const exception = exceptionResult.rows[0];
    
    if (!exception.finance_reviewed_by) {
      return res.status(400).json({ error: 'Finance review required before CEO approval' });
    }
    
    // Update status
    await query(`
      UPDATE fee_threshold_exceptions
      SET approved_by = $1, approved_at = CURRENT_TIMESTAMP, status = $2, activated_at = CURRENT_TIMESTAMP
      WHERE exception_id = $3
    `, [req.user.user_id, decision, exceptionId]);
    
    // Audit log
    await auditLog(req, 'THRESHOLD_EXCEPTION', exceptionId, decision === 'approved' ? 'APPROVE' : 'REJECT', 
      exception, { decision });
    
    // Notify requester
    await query(`
      INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
      VALUES ($1, 'THRESHOLD_EXCEPTION_DECISION', $2, $3, 'high', 'THRESHOLD_EXCEPTION', $4)
    `, [
      exception.requested_by,
      `Threshold Exception ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `CEO has ${decision} your threshold exception request for fee ID ${exception.fee_id}.`,
      exceptionId
    ]);
    
    res.json({ message: `Exception ${decision} successfully` });
  } catch (error) {
    console.error('Error approving threshold exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active threshold for a specific fee
router.get('/active/:feeId', authenticateToken, async (req, res) => {
  try {
    const { feeId } = req.params;
    
    // Check for active fee-specific exception
    const exceptionResult = await query(`
      SELECT requested_threshold, end_date
      FROM fee_threshold_exceptions
      WHERE fee_id = $1 
        AND status = 'approved' 
        AND CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY created_at DESC
      LIMIT 1
    `, [feeId]);
    
    if (exceptionResult.rows.length > 0) {
      return res.json({
        threshold: exceptionResult.rows[0].requested_threshold,
        type: 'fee_specific',
        expires_at: exceptionResult.rows[0].end_date
      });
    }
    
    // Fall back to global threshold
    const globalResult = await query(`
      SELECT threshold_percentage
      FROM global_threshold_settings
      ORDER BY threshold_year DESC
      LIMIT 1
    `);
    
    if (globalResult.rows.length === 0) {
      return res.status(404).json({ error: 'No threshold set' });
    }
    
    res.json({
      threshold: globalResult.rows[0].threshold_percentage,
      type: 'global',
      expires_at: null
    });
  } catch (error) {
    console.error('Error fetching active threshold:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, auditLog } from '../middleware/auth.js';

const router = express.Router();

// Get all temporary exemptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, fee_id } = req.query;
    
    let sql = `
      SELECT 
        cet.exemption_id, cet.exemption_type, cet.percentage_exempted,
        cet.start_date, cet.end_date, cet.justification, cet.status, cet.approval_chain,
        EXTRACT(DAY FROM CAST(cet.end_date - CURRENT_DATE AS INTERVAL)) as days_remaining,
        c.customer_id, c.customer_number, c.customer_name, c.segment, c.tier,
        sd.sector_code, sd.sector_name,
        fd.fee_id, fd.fee_name, tc.category,
        u_rec.full_name as recommended_by_name,
        u_appr.full_name as approved_by_name
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      JOIN sector_definitions sd ON c.sector_id = sd.sector_id
      JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN users u_rec ON cet.recommended_by = u_rec.user_id
      LEFT JOIN users u_appr ON cet.approved_by = u_appr.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      sql += ` AND cet.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (fee_id) {
      sql += ` AND cet.fee_id = $${paramCount}`;
      params.push(fee_id);
      paramCount++;
    }
    
    sql += ' ORDER BY cet.end_date DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching temporary exemptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get temporary exemptions report
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        cet.exemption_id,
        c.customer_number, c.customer_name, c.segment, c.tier,
        sd.sector_code, sd.sector_name,
        fd.fee_name, tc.category,
        cet.start_date, cet.end_date,
        EXTRACT(DAY FROM CAST(cet.end_date - CURRENT_DATE AS INTERVAL)) as days_remaining,
        cet.status,
        u_rec.full_name as recommended_by_name, r_rec.role_name as recommender_role,
        u_appr.full_name as approved_by_name, r_appr.role_name as approver_role,
        cet.approval_chain,
        -- Calculate exempted amount impact
        CASE 
          WHEN tc.fee_type = 'FIXED' THEN 
            (SELECT COALESCE(SUM(fee_value), 0) FROM tariff_tiers WHERE tariff_id = tc.tariff_id)
          ELSE 0
        END * (cet.percentage_exempted / 100.0) as exempted_amount_impact
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      JOIN sector_definitions sd ON c.sector_id = sd.sector_id
      JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN users u_rec ON cet.recommended_by = u_rec.user_id
      LEFT JOIN roles r_rec ON u_rec.role_id = r_rec.role_id
      LEFT JOIN users u_appr ON cet.approved_by = u_appr.user_id
      LEFT JOIN roles r_appr ON u_appr.role_id = r_appr.role_id
      WHERE cet.status IN ('pending', 'active')
      ORDER BY cet.end_date ASC, c.customer_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating temporary exemptions report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recommend temporary exemption (RM or Branch Manager)
router.post('/recommend', authenticateToken, authorizeRoles('RM', 'BRANCH_MGR'), async (req, res) => {
  try {
    const { customer_id, fee_id, exemption_type, percentage_exempted, start_date, end_date, justification } = req.body;
    
    if (!customer_id || !fee_id || !start_date || !end_date || !justification) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate dates
    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // Create approval chain
    const approvalChain = [
      {
        step: 1,
        role: req.user.role_code,
        user_id: req.user.user_id,
        action: 'recommended',
        timestamp: new Date()
      }
    ];
    
    // Insert recommendation
    const result = await query(`
      INSERT INTO customer_exemptions_temporary (
        customer_id, fee_id, exemption_type, percentage_exempted,
        start_date, end_date, justification, recommended_by, status, approval_chain
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      RETURNING *
    `, [
      customer_id, fee_id, exemption_type || 'FULL', percentage_exempted || 100.00,
      start_date, end_date, justification, req.user.user_id, JSON.stringify(approvalChain)
    ]);
    
    const exemption = result.rows[0];
    
    // Audit log
    await auditLog(req, 'TEMP_EXEMPTION', exemption.exemption_id, 'RECOMMEND', null, {
      customer_id, fee_id, start_date, end_date
    });
    
    // Notify Group GMs for approval
    const gmResult = await query(`
      SELECT DISTINCT os.owner_user_id
      FROM fee_definitions fd
      JOIN org_structure os ON fd.org_id = os.org_id
      WHERE fd.fee_id = $1 AND os.org_type = 'GROUP_GM'
    `, [fee_id]);
    
    for (const gm of gmResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
        VALUES ($1, 'TEMP_EXEMPTION_RECOMMENDATION', $2, $3, 'normal', 'TEMP_EXEMPTION', $4)
      `, [
        gm.owner_user_id,
        'Temporary Exemption Recommendation',
        `${req.user.full_name} has recommended a temporary exemption for customer ${customer_id} on fee ${fee_id}.`,
        exemption.exemption_id
      ]);
    }
    
    res.status(201).json(exemption);
  } catch (error) {
    console.error('Error recommending temporary exemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve temporary exemption (Group GM)
router.patch('/:exemptionId/approve', authenticateToken, authorizeRoles('GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_OPERATIONS'), async (req, res) => {
  try {
    const { exemptionId } = req.params;
    const { decision, comments } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected' });
    }
    
    // Get exemption
    const exemptionResult = await query(
      'SELECT * FROM customer_exemptions_temporary WHERE exemption_id = $1',
      [exemptionId]
    );
    
    if (exemptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exemption not found' });
    }
    
    const exemption = exemptionResult.rows[0];
    
    if (exemption.status !== 'pending') {
      return res.status(400).json({ error: 'Exemption is not pending' });
    }
    
    // Update approval chain
    const approvalChain = JSON.parse(exemption.approval_chain || '[]');
    approvalChain.push({
      step: approvalChain.length + 1,
      role: req.user.role_code,
      user_id: req.user.user_id,
      action: decision,
      comments: comments || null,
      timestamp: new Date()
    });
    
    // Update exemption
    const newStatus = decision === 'approved' ? 'active' : 'rejected';
    await query(`
      UPDATE customer_exemptions_temporary
      SET approved_by = $1, status = $2, activated_at = CURRENT_TIMESTAMP, 
          approval_chain = $3, updated_at = CURRENT_TIMESTAMP
      WHERE exemption_id = $4
    `, [req.user.user_id, newStatus, JSON.stringify(approvalChain), exemptionId]);
    
    // Audit log
    await auditLog(req, 'TEMP_EXEMPTION', exemptionId, decision === 'approved' ? 'APPROVE' : 'REJECT',
      { status: exemption.status }, { status: newStatus });
    
    // Notify recommender
    await query(`
      INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
      VALUES ($1, 'TEMP_EXEMPTION_DECISION', $2, $3, 'normal', 'TEMP_EXEMPTION', $4)
    `, [
      exemption.recommended_by,
      `Temporary Exemption ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your temporary exemption recommendation has been ${decision} by ${req.user.full_name}. ${comments || ''}`,
      exemptionId
    ]);
    
    res.json({ message: `Exemption ${decision} successfully` });
  } catch (error) {
    console.error('Error approving temporary exemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get temporary exemption limits
router.get('/limits', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        tel.limit_id, tel.limit_type, tel.limit_value, tel.currency, tel.status,
        tel.maker_at, tel.checker_at,
        fd.fee_name, tc.segment, tc.category,
        u_maker.full_name as maker_name,
        u_checker.full_name as checker_name
      FROM temporary_exemption_limits tel
      JOIN fee_definitions fd ON tel.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN users u_maker ON tel.maker_user_id = u_maker.user_id
      LEFT JOIN users u_checker ON tel.checker_user_id = u_checker.user_id
      ORDER BY tel.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exemption limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create temporary exemption limit (Maker)
router.post('/limits', authenticateToken, authorizeRoles('ADMIN_MAKER'), async (req, res) => {
  try {
    const { fee_id, limit_type, limit_value, currency } = req.body;
    
    if (!fee_id || !limit_type || !limit_value) {
      return res.status(400).json({ error: 'Fee ID, limit type, and limit value are required' });
    }
    
    const result = await query(`
      INSERT INTO temporary_exemption_limits (fee_id, limit_type, limit_value, currency, maker_user_id, maker_at, status)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'pending')
      RETURNING *
    `, [fee_id, limit_type, limit_value, currency || 'QAR', req.user.user_id]);
    
    const limit = result.rows[0];
    
    // Audit log
    await auditLog(req, 'TEMP_EXEMPTION_LIMIT', limit.limit_id, 'CREATE', null, {
      fee_id, limit_type, limit_value
    });
    
    // Notify checkers
    const checkersResult = await query(`
      SELECT u.user_id FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_code = 'ADMIN_CHECKER'
    `);
    
    for (const checker of checkersResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
        VALUES ($1, 'MAKER_CHECKER_PENDING', $2, $3, 'high', 'TEMP_EXEMPTION_LIMIT', $4)
      `, [
        checker.user_id,
        'Temporary Exemption Limit Approval Required',
        `${req.user.full_name} has created a temporary exemption limit for fee ${fee_id}. Your approval is required.`,
        limit.limit_id
      ]);
    }
    
    res.status(201).json(limit);
  } catch (error) {
    console.error('Error creating exemption limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject temporary exemption limit (Checker)
router.patch('/limits/:limitId/check', authenticateToken, authorizeRoles('ADMIN_CHECKER'), async (req, res) => {
  try {
    const { limitId } = req.params;
    const { decision } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected' });
    }
    
    // Get limit
    const limitResult = await query('SELECT * FROM temporary_exemption_limits WHERE limit_id = $1', [limitId]);
    
    if (limitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Limit not found' });
    }
    
    const limit = limitResult.rows[0];
    
    if (limit.status !== 'pending') {
      return res.status(400).json({ error: 'Limit is not pending' });
    }
    
    // Cannot check own entry
    if (limit.maker_user_id === req.user.user_id) {
      return res.status(403).json({ error: 'Cannot approve your own entry' });
    }
    
    // Update limit
    await query(`
      UPDATE temporary_exemption_limits
      SET checker_user_id = $1, checker_at = CURRENT_TIMESTAMP, status = $2
      WHERE limit_id = $3
    `, [req.user.user_id, decision, limitId]);
    
    // Audit log
    await auditLog(req, 'TEMP_EXEMPTION_LIMIT', limitId, decision === 'approved' ? 'APPROVE' : 'REJECT',
      { status: limit.status }, { status: decision });
    
    // Notify maker
    await query(`
      INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
      VALUES ($1, 'MAKER_CHECKER_DECISION', $2, $3, 'normal', 'TEMP_EXEMPTION_LIMIT', $4)
    `, [
      limit.maker_user_id,
      `Exemption Limit ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your temporary exemption limit entry has been ${decision} by ${req.user.full_name}.`,
      limitId
    ]);
    
    res.json({ message: `Limit ${decision} successfully` });
  } catch (error) {
    console.error('Error checking exemption limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

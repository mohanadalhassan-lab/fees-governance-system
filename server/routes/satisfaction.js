import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, auditLog } from '../middleware/auth.js';

const router = express.Router();

// Get satisfaction data with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { period, segment } = req.query;
    
    // Summary counts
    const summaryResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE satisfaction_state = 'SATISFIED') as green,
        COUNT(*) FILTER (WHERE satisfaction_state = 'CONDITIONALLY_ELIGIBLE') as yellow,
        COUNT(*) FILTER (WHERE satisfaction_state = 'PENDING_CEO_APPROVAL') as orange,
        COUNT(*) FILTER (WHERE satisfaction_state = 'NOT_SATISFIED') as red,
        COUNT(*) as total,
        AVG(matching_ratio) as overall_score
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = $1
        ${segment && segment !== 'all' ? 'AND tc.segment = $2' : ''}
    `, segment && segment !== 'all' ? ['ANNUAL', segment] : ['ANNUAL']);
    
    // By segment
    const segmentResult = await query(`
      SELECT 
        tc.segment,
        AVG(fp.matching_ratio) as avg_score,
        COUNT(*) FILTER (WHERE satisfaction_state = 'SATISFIED') as green,
        COUNT(*) FILTER (WHERE satisfaction_state = 'CONDITIONALLY_ELIGIBLE') as yellow,
        COUNT(*) FILTER (WHERE satisfaction_state = 'PENDING_CEO_APPROVAL') as orange,
        COUNT(*) FILTER (WHERE satisfaction_state = 'NOT_SATISFIED') as red
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = 'ANNUAL'
      GROUP BY tc.segment
    `);
    
    // By fee
    const feeResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment,
        fp.matching_ratio as matching_percentage,
        fp.satisfaction_state,
        'stable' as trend
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = 'ANNUAL'
        ${segment && segment !== 'all' ? 'AND tc.segment = $1' : ''}
      ORDER BY fp.matching_ratio DESC
    `, segment && segment !== 'all' ? [segment] : []);
    
    res.json({
      summary: {
        ...summaryResult.rows[0],
        trend: 'up',
        change: 2.5
      },
      by_segment: segmentResult.rows,
      by_fee: feeResult.rows,
      trends: []
    });
  } catch (error) {
    console.error('Error fetching satisfaction data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit GM acknowledgment
router.post('/acknowledge', authenticateToken, authorizeRoles('GM_RETAIL', 'GM_CORPORATE', 'GM_FINANCE', 'GM_OPERATIONS', 'GM_RISK', 'GM_COMPLIANCE', 'GM_IT'), async (req, res) => {
  try {
    const { performance_id, fee_id, notes } = req.body;
    
    if (!performance_id || !fee_id || !notes) {
      return res.status(400).json({ error: 'Performance ID, fee ID, and notes are required' });
    }
    
    // Check if already acknowledged
    const existingResult = await query(
      'SELECT acknowledgment_id FROM gm_acknowledgments WHERE performance_id = $1 AND gm_user_id = $2',
      [performance_id, req.user.user_id]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted an acknowledgment for this fee' });
    }
    
    // Insert acknowledgment
    const result = await query(`
      INSERT INTO gm_acknowledgments (performance_id, fee_id, gm_user_id, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [performance_id, fee_id, req.user.user_id, notes]);
    
    const acknowledgment = result.rows[0];
    
    // Audit log
    await auditLog(req, 'GM_ACKNOWLEDGMENT', acknowledgment.acknowledgment_id, 'CREATE', null, {
      performance_id,
      fee_id,
      notes
    });
    
    // Check if all required GMs have acknowledged
    const requiredGMsResult = await query(`
      SELECT DISTINCT os.owner_user_id
      FROM fee_definitions fd
      JOIN org_structure os ON fd.org_id = os.org_id
      WHERE fd.fee_id = $1 AND os.org_type = 'GROUP_GM'
    `, [fee_id]);
    
    const acknowledgedGMsResult = await query(`
      SELECT COUNT(DISTINCT gm_user_id) as count
      FROM gm_acknowledgments
      WHERE performance_id = $1
    `, [performance_id]);
    
    const requiredCount = requiredGMsResult.rows.length;
    const acknowledgedCount = parseInt(acknowledgedGMsResult.rows[0].count);
    
    // If all GMs acknowledged, update state to PENDING_CEO_APPROVAL
    if (acknowledgedCount >= requiredCount && requiredCount > 0) {
      await query(`
        UPDATE fee_performance
        SET satisfaction_state = 'PENDING_CEO_APPROVAL', updated_at = CURRENT_TIMESTAMP
        WHERE performance_id = $1
      `, [performance_id]);
      
      // Notify CEO
      const ceoResult = await query(`
        SELECT u.user_id FROM users u JOIN roles r ON u.role_id = r.role_id WHERE r.role_code = 'CEO'
      `);
      
      if (ceoResult.rows.length > 0) {
        const feeResult = await query('SELECT fee_name FROM fee_definitions WHERE fee_id = $1', [fee_id]);
        await query(`
          INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
          VALUES ($1, 'CEO_APPROVAL_REQUIRED', $2, $3, 'high', 'FEE_PERFORMANCE', $4)
        `, [
          ceoResult.rows[0].user_id,
          'Fee Satisfaction Approval Required',
          `All Group GMs have acknowledged fee "${feeResult.rows[0].fee_name}". Your approval is required.`,
          performance_id
        ]);
      }
    }
    
    res.status(201).json(acknowledgment);
  } catch (error) {
    console.error('Error submitting acknowledgment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get acknowledgments for a performance record
router.get('/performance/:performanceId', authenticateToken, async (req, res) => {
  try {
    const { performanceId } = req.params;
    
    const result = await query(`
      SELECT 
        ga.acknowledgment_id, ga.notes, ga.submitted_at,
        u.full_name as gm_name, r.role_name
      FROM gm_acknowledgments ga
      JOIN users u ON ga.gm_user_id = u.user_id
      JOIN roles r ON u.role_id = r.role_id
      WHERE ga.performance_id = $1
      ORDER BY ga.submitted_at DESC
    `, [performanceId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching acknowledgments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CEO approve satisfaction
router.post('/ceo-approval', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    const { performance_id, fee_id, decision, comments } = req.body;
    
    if (!performance_id || !fee_id || !decision) {
      return res.status(400).json({ error: 'Performance ID, fee ID, and decision are required' });
    }
    
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
    }
    
    // Check state is PENDING_CEO_APPROVAL
    const performanceResult = await query(
      'SELECT satisfaction_state FROM fee_performance WHERE performance_id = $1',
      [performance_id]
    );
    
    if (performanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Performance record not found' });
    }
    
    if (performanceResult.rows[0].satisfaction_state !== 'PENDING_CEO_APPROVAL') {
      return res.status(400).json({ error: 'Fee is not pending CEO approval' });
    }
    
    // Insert CEO approval
    const approvalResult = await query(`
      INSERT INTO ceo_approvals (performance_id, fee_id, approved_by, decision, comments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [performance_id, fee_id, req.user.user_id, decision, comments]);
    
    const approval = approvalResult.rows[0];
    
    // Update satisfaction state
    const newState = decision === 'APPROVED' ? 'SATISFIED' : 'CONDITIONALLY_ELIGIBLE';
    await query(`
      UPDATE fee_performance
      SET satisfaction_state = $1, updated_at = CURRENT_TIMESTAMP
      WHERE performance_id = $2
    `, [newState, performance_id]);
    
    // Audit log
    await auditLog(req, 'CEO_APPROVAL', approval.approval_id, 'CREATE', 
      { satisfaction_state: performanceResult.rows[0].satisfaction_state },
      { satisfaction_state: newState, decision, comments }
    );
    
    // Notify relevant GMs
    const gmsResult = await query(`
      SELECT DISTINCT ga.gm_user_id
      FROM gm_acknowledgments ga
      WHERE ga.performance_id = $1
    `, [performance_id]);
    
    const feeResult = await query('SELECT fee_name FROM fee_definitions WHERE fee_id = $1', [fee_id]);
    
    for (const gm of gmsResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
        VALUES ($1, 'CEO_DECISION', $2, $3, 'high', 'FEE_PERFORMANCE', $4)
      `, [
        gm.gm_user_id,
        `CEO ${decision === 'APPROVED' ? 'Approved' : 'Rejected'} Fee Satisfaction`,
        `CEO has ${decision === 'APPROVED' ? 'approved' : 'rejected'} satisfaction for fee "${feeResult.rows[0].fee_name}". ${comments || ''}`,
        performance_id
      ]);
    }
    
    res.status(201).json(approval);
  } catch (error) {
    console.error('Error processing CEO approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get CEO approvals
router.get('/ceo-approvals', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        ca.approval_id, ca.decision, ca.comments, ca.approved_at,
        fd.fee_name, tc.segment, tc.category,
        fp.matching_ratio, fp.satisfaction_state
      FROM ceo_approvals ca
      JOIN fee_definitions fd ON ca.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      JOIN fee_performance fp ON ca.performance_id = fp.performance_id
      WHERE ca.approved_by = $1
      ORDER BY ca.approved_at DESC
    `, [req.user.user_id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching CEO approvals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

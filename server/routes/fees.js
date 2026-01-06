import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, auditLog } from '../middleware/auth.js';

const router = express.Router();

// Get all fees with performance data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { segment, status, satisfaction_state, org_id } = req.query;
    
    let sql = `
      SELECT 
        fd.fee_id, fd.fee_code, fd.fee_name, fd.version, fd.status as fee_status,
        tc.segment, tc.tier, tc.category, tc.subcategory, tc.fee_type, tc.currency,
        fp.performance_id, fp.measurement_period, fp.period_start, fp.period_end,
        fp.total_customers, fp.sector_exempted_customers, fp.permanent_exempted_customers,
        fp.temporary_exempted_customers, fp.chargeable_customers,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount, 
        fp.matching_ratio, fp.satisfaction_state,
        os.org_name, os.org_type
      FROM fee_definitions fd
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      LEFT JOIN org_structure os ON fd.org_id = os.org_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (segment) {
      sql += ` AND tc.segment = $${paramCount}`;
      params.push(segment);
      paramCount++;
    }
    
    if (status) {
      sql += ` AND fd.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (satisfaction_state) {
      sql += ` AND fp.satisfaction_state = $${paramCount}`;
      params.push(satisfaction_state);
      paramCount++;
    }
    
    if (org_id) {
      sql += ` AND fd.org_id = $${paramCount}`;
      params.push(org_id);
      paramCount++;
    }
    
    sql += ' ORDER BY fp.matching_ratio ASC, fd.fee_name';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single fee details
router.get('/:feeId', authenticateToken, async (req, res) => {
  try {
    const { feeId } = req.params;
    
    const result = await query(`
      SELECT 
        fd.fee_id, fd.fee_code, fd.fee_name, fd.version, fd.status as fee_status,
        tc.tariff_id, tc.tariff_code, tc.segment, tc.tier, tc.category, tc.subcategory, 
        tc.fee_type, tc.currency, tc.formula, tc.min_amount, tc.max_amount,
        tc.effective_from, tc.effective_to, tc.source_reference,
        fp.performance_id, fp.measurement_period, fp.period_start, fp.period_end,
        fp.total_customers, fp.sector_exempted_customers, fp.permanent_exempted_customers,
        fp.temporary_exempted_customers, fp.chargeable_customers,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount, 
        fp.matching_ratio, fp.satisfaction_state,
        os.org_id, os.org_name, os.org_type,
        u.full_name as owner_name
      FROM fee_definitions fd
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      LEFT JOIN org_structure os ON fd.org_id = os.org_id
      LEFT JOIN users u ON os.owner_user_id = u.user_id
      WHERE fd.fee_id = $1
    `, [feeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fee not found' });
    }
    
    // Get tiers if applicable
    const tiersResult = await query(`
      SELECT tier_level, range_from, range_to, fee_value, percentage_value
      FROM tariff_tiers
      WHERE tariff_id = $1
      ORDER BY tier_level
    `, [result.rows[0].tariff_id]);
    
    // Get ownership history
    const ownershipResult = await query(`
      SELECT fo.ownership_id, fo.ownership_type, fo.effective_from, fo.effective_to,
             u_owner.full_name as owner_name, u_assigned.full_name as assigned_by_name,
             os.org_name
      FROM fee_ownership fo
      LEFT JOIN users u_owner ON fo.owner_user_id = u_owner.user_id
      LEFT JOIN users u_assigned ON fo.assigned_by = u_assigned.user_id
      LEFT JOIN org_structure os ON fo.org_id = os.org_id
      WHERE fo.fee_id = $1
      ORDER BY fo.effective_from DESC
    `, [feeId]);
    
    const fee = result.rows[0];
    fee.tiers = tiersResult.rows;
    fee.ownership_history = ownershipResult.rows;
    
    res.json(fee);
  } catch (error) {
    console.error('Error fetching fee details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fees by ownership (for GM/AGM)
router.get('/my-fees/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(`
      SELECT DISTINCT
        fd.fee_id, fd.fee_code, fd.fee_name, fd.version, fd.status as fee_status,
        tc.segment, tc.tier, tc.category, tc.subcategory,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount, 
        fp.matching_ratio, fp.satisfaction_state,
        fp.chargeable_customers
      FROM fee_definitions fd
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      LEFT JOIN org_structure os ON fd.org_id = os.org_id
      WHERE os.owner_user_id = $1 AND fd.status = 'active'
      ORDER BY fp.satisfaction_state, fp.matching_ratio ASC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my fees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fee status
router.patch('/:feeId/status', authenticateToken, authorizeRoles('CEO', 'GM_RETAIL', 'GM_CORPORATE', 'ADMIN_MAKER'), async (req, res) => {
  try {
    const { feeId } = req.params;
    const { status } = req.body;
    
    // Get old value
    const oldResult = await query('SELECT status FROM fee_definitions WHERE fee_id = $1', [feeId]);
    const oldValue = oldResult.rows[0];
    
    // Update
    await query('UPDATE fee_definitions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE fee_id = $2', [status, feeId]);
    
    // Audit log
    await auditLog(req, 'FEE', feeId, 'UPDATE', oldValue, { status });
    
    res.json({ message: 'Fee status updated successfully' });
  } catch (error) {
    console.error('Error updating fee status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee exemptions summary
router.get('/:feeId/exemptions', authenticateToken, async (req, res) => {
  try {
    const { feeId } = req.params;
    
    // Sector exemptions
    const sectorResult = await query(`
      SELECT sep.exemption_id, sep.exemption_type, sep.percentage_exempted,
             sep.effective_from, sep.effective_to, sep.justification,
             sd.sector_code, sd.sector_name, u.full_name as approved_by_name
      FROM sector_exemptions_policy sep
      JOIN sector_definitions sd ON sep.sector_id = sd.sector_id
      LEFT JOIN users u ON sep.approved_by = u.user_id
      WHERE sep.fee_id = $1
      ORDER BY sep.created_at DESC
    `, [feeId]);
    
    // Permanent exemptions
    const permanentResult = await query(`
      SELECT cep.exemption_id, cep.exemption_type, cep.percentage_exempted,
             cep.justification, cep.approved_at,
             c.customer_number, c.customer_name, c.segment, c.tier,
             u.full_name as approved_by_name
      FROM customer_exemptions_permanent cep
      JOIN customers c ON cep.customer_id = c.customer_id
      LEFT JOIN users u ON cep.approved_by = u.user_id
      WHERE cep.fee_id = $1
      ORDER BY cep.created_at DESC
    `, [feeId]);
    
    // Temporary exemptions
    const temporaryResult = await query(`
      SELECT cet.exemption_id, cet.exemption_type, cet.percentage_exempted,
             cet.start_date, cet.end_date, cet.justification, cet.status,
             EXTRACT(DAY FROM (cet.end_date - CURRENT_DATE)) as days_remaining,
             c.customer_number, c.customer_name, c.segment, c.tier,
             u_rec.full_name as recommended_by_name,
             u_appr.full_name as approved_by_name
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      LEFT JOIN users u_rec ON cet.recommended_by = u_rec.user_id
      LEFT JOIN users u_appr ON cet.approved_by = u_appr.user_id
      WHERE cet.fee_id = $1
      ORDER BY cet.end_date DESC
    `, [feeId]);
    
    res.json({
      sector_exemptions: sectorResult.rows,
      permanent_exemptions: permanentResult.rows,
      temporary_exemptions: temporaryResult.rows
    });
  } catch (error) {
    console.error('Error fetching exemptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

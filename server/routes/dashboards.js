import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorizeRoles, auditLog } from '../middleware/auth.js';

const router = express.Router();

// Get CEO dashboard data
router.get('/ceo', authenticateToken, authorizeRoles('CEO'), async (req, res) => {
  try {
    // Global threshold
    const thresholdResult = await query(`
      SELECT threshold_year, threshold_percentage, set_at, u.full_name as set_by_name
      FROM global_threshold_settings gts
      LEFT JOIN users u ON gts.set_by = u.user_id
      ORDER BY threshold_year DESC
      LIMIT 1
    `);
    
    // Satisfaction state counts
    const stateCountsResult = await query(`
      SELECT satisfaction_state, COUNT(*) as count
      FROM fee_performance
      WHERE measurement_period = 'ANNUAL'
      GROUP BY satisfaction_state
    `);
    
    const stateCounts = {
      NOT_SATISFIED: 0,
      CONDITIONALLY_ELIGIBLE: 0,
      PENDING_CEO_APPROVAL: 0,
      SATISFIED: 0
    };
    
    stateCountsResult.rows.forEach(row => {
      stateCounts[row.satisfaction_state] = parseInt(row.count);
    });
    
    // Exempted customers summary
    const exemptionsResult = await query(`
      SELECT 
        (SELECT COUNT(DISTINCT c.customer_id) 
         FROM customers c 
         JOIN sector_exemptions_policy sep ON c.sector_id = sep.sector_id) as sector_exempted,
        (SELECT COUNT(DISTINCT customer_id) FROM customer_exemptions_permanent) as permanent_exempted,
        (SELECT COUNT(DISTINCT customer_id) FROM customer_exemptions_temporary WHERE status = 'active') as temporary_exempted,
        (SELECT COUNT(*) FROM customers WHERE status = 'active') as total_customers
    `);
    
    const exemptionsSummary = exemptionsResult.rows[0];
    const totalExempted = parseInt(exemptionsSummary.sector_exempted) + 
                          parseInt(exemptionsSummary.permanent_exempted) + 
                          parseInt(exemptionsSummary.temporary_exempted);
    
    // Top fees by value
    const topFeesResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment, tc.category,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount,
        fp.matching_ratio, fp.satisfaction_state
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = 'ANNUAL'
      ORDER BY fp.expected_amount DESC
      LIMIT 10
    `);
    
    // Worst matching ratios
    const worstMatchingResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment, tc.category,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount,
        fp.matching_ratio, fp.satisfaction_state
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = 'ANNUAL'
      ORDER BY fp.matching_ratio ASC
      LIMIT 10
    `);
    
    // Pending approvals
    const pendingApprovalsResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment,
        fp.matching_ratio, fp.satisfaction_state,
        COUNT(DISTINCT ga.gm_user_id) as acknowledged_gms
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN gm_acknowledgments ga ON fp.performance_id = ga.performance_id
      WHERE fp.satisfaction_state IN ('CONDITIONALLY_ELIGIBLE', 'PENDING_CEO_APPROVAL')
      GROUP BY fd.fee_id, fd.fee_name, tc.segment, fp.matching_ratio, fp.satisfaction_state
      ORDER BY fp.matching_ratio DESC
    `);
    
    res.json({
      global_threshold: thresholdResult.rows[0] || null,
      satisfaction_counts: stateCounts,
      exemptions_summary: {
        total_exempted: totalExempted,
        sector_exempted: parseInt(exemptionsSummary.sector_exempted),
        permanent_exempted: parseInt(exemptionsSummary.permanent_exempted),
        temporary_exempted: parseInt(exemptionsSummary.temporary_exempted),
        total_customers: parseInt(exemptionsSummary.total_customers)
      },
      top_fees_by_value: topFeesResult.rows,
      worst_matching_ratios: worstMatchingResult.rows,
      pending_approvals: pendingApprovalsResult.rows
    });
  } catch (error) {
    console.error('Error fetching CEO dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get GM dashboard data
router.get('/gm/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get GM's fees
    const feesResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_code, fd.fee_name,
        tc.segment, tc.tier, tc.category, tc.subcategory,
        fp.performance_id, fp.total_customers, fp.chargeable_customers,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount,
        fp.matching_ratio, fp.satisfaction_state,
        fp.sector_exempted_customers, fp.permanent_exempted_customers, 
        fp.temporary_exempted_customers
      FROM fee_definitions fd
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      LEFT JOIN org_structure os ON fd.org_id = os.org_id
      WHERE os.owner_user_id = $1 AND fd.status = 'active'
      ORDER BY fp.satisfaction_state, fp.matching_ratio ASC
    `, [userId]);
    
    // Get pending acknowledgments
    const pendingAckResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment,
        fp.performance_id, fp.matching_ratio, fp.satisfaction_state
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      LEFT JOIN org_structure os ON fd.org_id = os.org_id
      LEFT JOIN gm_acknowledgments ga ON fp.performance_id = ga.performance_id AND ga.gm_user_id = $1
      WHERE os.owner_user_id = $1 
        AND fp.satisfaction_state IN ('CONDITIONALLY_ELIGIBLE', 'PENDING_CEO_APPROVAL')
        AND ga.acknowledgment_id IS NULL
    `, [userId]);
    
    // Get threshold exception requests
    const thresholdExceptionsResult = await query(`
      SELECT 
        fte.exception_id, fte.requested_threshold, fte.justification,
        fte.start_date, fte.end_date, fte.status,
        fd.fee_name, tc.segment
      FROM fee_threshold_exceptions fte
      JOIN fee_definitions fd ON fte.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fte.requested_by = $1
      ORDER BY fte.created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.json({
      fees: feesResult.rows,
      pending_acknowledgments: pendingAckResult.rows,
      threshold_exception_requests: thresholdExceptionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching GM dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Risk dashboard data
router.get('/risk', authenticateToken, authorizeRoles('GM_RISK'), async (req, res) => {
  try {
    // Global threshold history
    const thresholdHistoryResult = await query(`
      SELECT threshold_year, threshold_percentage, set_at, u.full_name as set_by_name
      FROM global_threshold_settings gts
      LEFT JOIN users u ON gts.set_by = u.user_id
      ORDER BY threshold_year DESC
      LIMIT 5
    `);
    
    // Exception trends - threshold exceptions
    const thresholdExceptionTrendsResult = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as exception_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
      FROM fee_threshold_exceptions
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);
    
    // Temporary exemptions trends
    const tempExemptionTrendsResult = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as exemption_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
      FROM customer_exemptions_temporary
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);
    
    // Worst matching ratio fees
    const worstFeesResult = await query(`
      SELECT 
        fd.fee_id, fd.fee_name, tc.segment, tc.category,
        fp.expected_amount, fp.collected_amount, fp.accrued_amount,
        fp.matching_ratio, fp.satisfaction_state,
        fp.chargeable_customers
      FROM fee_performance fp
      JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE fp.measurement_period = 'ANNUAL'
      ORDER BY fp.matching_ratio ASC
      LIMIT 15
    `);
    
    // Active temporary exemptions nearing expiry
    const expiringExemptionsResult = await query(`
      SELECT 
        cet.exemption_id, cet.end_date,
        EXTRACT(DAY FROM (cet.end_date - CURRENT_DATE)) as days_remaining,
        c.customer_number, c.customer_name, c.segment,
        fd.fee_name, tc.category
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
      JOIN tariff_catalog tc ON fd.tariff_id = tc.tariff_id
      WHERE cet.status = 'active' AND cet.end_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY cet.end_date ASC
    `);
    
    res.json({
      threshold_history: thresholdHistoryResult.rows,
      threshold_exception_trends: thresholdExceptionTrendsResult.rows,
      temporary_exemption_trends: tempExemptionTrendsResult.rows,
      worst_matching_fees: worstFeesResult.rows,
      expiring_exemptions: expiringExemptionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching Risk dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive reports (CEO only)
router.get('/', authenticateToken, requireRole(['CEO']), async (req, res) => {
  const { type, period, segment, status } = req.query;

  try {
    let reportData = {};

    // Build date filter based on period
    let dateFilter = '';
    const now = new Date();
    switch (period) {
      case 'current-month':
        dateFilter = `AND EXTRACT(MONTH FROM fp.period_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                     AND EXTRACT(YEAR FROM fp.period_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
        break;
      case 'last-month':
        dateFilter = `AND EXTRACT(MONTH FROM fp.period_date) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
                     AND EXTRACT(YEAR FROM fp.period_date) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')`;
        break;
      case 'current-quarter':
        dateFilter = `AND EXTRACT(QUARTER FROM fp.period_date) = EXTRACT(QUARTER FROM CURRENT_DATE)
                     AND EXTRACT(YEAR FROM fp.period_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
        break;
      case 'last-quarter':
        dateFilter = `AND EXTRACT(QUARTER FROM fp.period_date) = EXTRACT(QUARTER FROM CURRENT_DATE - INTERVAL '3 months')
                     AND EXTRACT(YEAR FROM fp.period_date) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '3 months')`;
        break;
      case 'ytd':
        dateFilter = `AND EXTRACT(YEAR FROM fp.period_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
        break;
      default:
        dateFilter = '';
    }

    // Segment filter
    const segmentFilter = segment && segment !== 'all' ? `AND fd.segment = $1` : '';
    const params = segment && segment !== 'all' ? [segment] : [];

    switch (type) {
      case 'fee-performance':
        reportData = await getFeePerformanceReport(dateFilter, segmentFilter, params);
        break;
      case 'exemptions':
        reportData = await getExemptionsReport(dateFilter, segmentFilter, params);
        break;
      case 'satisfaction':
        reportData = await getSatisfactionReport(dateFilter, segmentFilter, params, status);
        break;
      case 'financial':
        reportData = await getFinancialReport(dateFilter, segmentFilter, params);
        break;
      case 'executive-summary':
        reportData = await getExecutiveSummary(dateFilter, segmentFilter, params);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json(reportData);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Fee Performance Report
async function getFeePerformanceReport(dateFilter, segmentFilter, params) {
  const query = `
    SELECT 
      fd.fee_id,
      fd.fee_name_en as fee_name,
      fd.segment,
      fd.category,
      COUNT(DISTINCT fp.customer_id) as customers_charged,
      SUM(fp.expected_amount) as expected_amount,
      SUM(fp.collected_amount) as collected_amount,
      SUM(fp.accrued_amount) as accrued_amount,
      CASE 
        WHEN SUM(fp.expected_amount) > 0 
        THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
        ELSE 0 
      END as matching_ratio,
      CASE 
        WHEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / NULLIF(SUM(fp.expected_amount), 0) * 100) >= 98 THEN 'Satisfied'
        WHEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / NULLIF(SUM(fp.expected_amount), 0) * 100) >= 90 THEN 'Eligible'
        ELSE 'Not Satisfied'
      END as status
    FROM fee_definitions fd
    LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
    WHERE fd.status = 'Active'
    ${dateFilter}
    ${segmentFilter}
    GROUP BY fd.fee_id, fd.fee_name_en, fd.segment, fd.category
    ORDER BY matching_ratio ASC
  `;

  const result = await pool.query(query, params);

  const summary = {
    total_fees: result.rows.length,
    total_expected: result.rows.reduce((sum, row) => sum + parseFloat(row.expected_amount || 0), 0),
    total_actual: result.rows.reduce((sum, row) => sum + parseFloat(row.collected_amount || 0) + parseFloat(row.accrued_amount || 0), 0)
  };
  summary.overall_match_rate = summary.total_expected > 0 ? (summary.total_actual / summary.total_expected * 100) : 0;

  return {
    summary,
    fees: result.rows
  };
}

// Exemptions Report
async function getExemptionsReport(dateFilter, segmentFilter, params) {
  const query = `
    SELECT 
      'sector' as type,
      NULL as customer_id,
      sd.sector_name as customer_name,
      fd.fee_name_en as fee_name,
      se.start_date,
      se.end_date,
      'System' as recommender_name,
      se.exemption_value as impact_amount,
      CASE 
        WHEN se.end_date IS NULL OR se.end_date > CURRENT_DATE THEN 'Active'
        ELSE 'Expired'
      END as status
    FROM sector_exemptions se
    JOIN sector_definitions sd ON se.sector_id = sd.sector_id
    JOIN fee_definitions fd ON se.fee_id = fd.fee_id
    WHERE se.status = 'Active'
    ${segmentFilter.replace('fd.segment', 'fd.segment')}
    
    UNION ALL
    
    SELECT 
      'permanent' as type,
      ce.customer_id,
      c.customer_name_en as customer_name,
      fd.fee_name_en as fee_name,
      ce.start_date,
      NULL as end_date,
      u.full_name as recommender_name,
      0 as impact_amount,
      'Active' as status
    FROM customer_exemptions_permanent ce
    JOIN customers c ON ce.customer_id = c.customer_id
    JOIN fee_definitions fd ON ce.fee_id = fd.fee_id
    LEFT JOIN users u ON ce.approved_by = u.user_id
    WHERE ce.status = 'Active'
    ${segmentFilter.replace('fd.segment', 'fd.segment')}
    
    UNION ALL
    
    SELECT 
      'temporary' as type,
      cet.customer_id,
      c.customer_name_en as customer_name,
      fd.fee_name_en as fee_name,
      cet.start_date,
      cet.end_date,
      u.full_name as recommender_name,
      cet.exemption_amount as impact_amount,
      CASE 
        WHEN cet.end_date > CURRENT_DATE THEN 'Active'
        WHEN cet.end_date <= CURRENT_DATE THEN 'Expired'
        ELSE 'Pending'
      END as status
    FROM customer_exemptions_temporary cet
    JOIN customers c ON cet.customer_id = c.customer_id
    JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
    LEFT JOIN users u ON cet.recommended_by = u.user_id
    WHERE cet.status IN ('Active', 'Pending')
    ${segmentFilter.replace('fd.segment', 'fd.segment')}
    
    ORDER BY start_date DESC
  `;

  const result = await pool.query(query, params);

  const summary = {
    total_exemptions: result.rows.length,
    sector_exemptions: result.rows.filter(r => r.type === 'sector').length,
    permanent_exemptions: result.rows.filter(r => r.type === 'permanent').length,
    temporary_exemptions: result.rows.filter(r => r.type === 'temporary').length
  };

  return {
    summary,
    exemptions: result.rows
  };
}

// Satisfaction Report
async function getSatisfactionReport(dateFilter, segmentFilter, params, statusFilter) {
  let statusCondition = '';
  if (statusFilter && statusFilter !== 'all') {
    switch (statusFilter) {
      case 'satisfied':
        statusCondition = `AND ca.approved_by_ceo = TRUE`;
        break;
      case 'pending':
        statusCondition = `AND ca.approved_by_ceo = FALSE AND ga.acknowledgment_count >= fd.required_gm_count`;
        break;
      case 'eligible':
        statusCondition = `AND ca.approved_by_ceo = FALSE`;
        break;
      case 'not-satisfied':
        statusCondition = `AND ca.approved_by_ceo = FALSE AND ga.acknowledgment_count < fd.required_gm_count`;
        break;
    }
  }

  const query = `
    SELECT 
      fd.fee_id,
      fd.fee_name_en as fee_name,
      fd.segment,
      COALESCE(fp.matching_ratio, 0) as matching_ratio,
      COALESCE(st.green_threshold, 98) as applicable_threshold,
      COALESCE(ga.acknowledgment_count, 0) as gm_acknowledgments,
      2 as required_gm_acks,
      COALESCE(ca.approved_by_ceo, FALSE) as ceo_approved,
      CASE 
        WHEN ca.approved_by_ceo = TRUE THEN 'Satisfied'
        WHEN ga.acknowledgment_count >= 2 AND ca.approved_by_ceo = FALSE THEN 'Pending CEO'
        WHEN fp.matching_ratio >= COALESCE(st.green_threshold, 98) THEN 'Eligible'
        ELSE 'Not Satisfied'
      END as final_status
    FROM fee_definitions fd
    LEFT JOIN (
      SELECT 
        fee_id,
        CASE 
          WHEN SUM(expected_amount) > 0 
          THEN ((SUM(collected_amount) + SUM(accrued_amount)) / SUM(expected_amount) * 100)
          ELSE 0 
        END as matching_ratio
      FROM fee_performance
      WHERE 1=1 ${dateFilter.replace('fp.', '')}
      GROUP BY fee_id
    ) fp ON fd.fee_id = fp.fee_id
    LEFT JOIN satisfaction_thresholds st ON st.threshold_id = 1
    LEFT JOIN (
      SELECT fee_id, COUNT(*) as acknowledgment_count
      FROM gm_acknowledgments
      WHERE status = 'Acknowledged'
      GROUP BY fee_id
    ) ga ON fd.fee_id = ga.fee_id
    LEFT JOIN (
      SELECT fee_id, MAX(approved_by_ceo) as approved_by_ceo
      FROM ceo_approvals
      GROUP BY fee_id
    ) ca ON fd.fee_id = ca.fee_id
    WHERE fd.status = 'Active'
    ${segmentFilter}
    ${statusCondition}
    ORDER BY final_status, matching_ratio ASC
  `;

  const result = await pool.query(query, params);

  const summary = {
    total: result.rows.length,
    satisfied: result.rows.filter(r => r.final_status === 'Satisfied').length,
    pending_ceo: result.rows.filter(r => r.final_status === 'Pending CEO').length,
    eligible: result.rows.filter(r => r.final_status === 'Eligible').length,
    not_satisfied: result.rows.filter(r => r.final_status === 'Not Satisfied').length
  };

  return {
    summary,
    satisfaction: result.rows
  };
}

// Financial Report
async function getFinancialReport(dateFilter, segmentFilter, params) {
  const query = `
    SELECT 
      fd.segment,
      SUM(fp.expected_amount) as expected,
      SUM(fp.collected_amount) as collected,
      SUM(fp.accrued_amount) as accrued,
      (SUM(fp.expected_amount) - (SUM(fp.collected_amount) + SUM(fp.accrued_amount))) as gap,
      CASE 
        WHEN SUM(fp.expected_amount) > 0 
        THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
        ELSE 0 
      END as collection_rate
    FROM fee_definitions fd
    LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
    WHERE fd.status = 'Active'
    ${dateFilter}
    ${segmentFilter}
    GROUP BY fd.segment
    ORDER BY fd.segment
  `;

  const result = await pool.query(query, params);

  const summary = {
    total_expected: result.rows.reduce((sum, row) => sum + parseFloat(row.expected || 0), 0),
    total_realized: result.rows.reduce((sum, row) => sum + parseFloat(row.collected || 0) + parseFloat(row.accrued || 0), 0),
    revenue_gap: result.rows.reduce((sum, row) => sum + parseFloat(row.gap || 0), 0)
  };
  summary.collection_rate = summary.total_expected > 0 ? (summary.total_realized / summary.total_expected * 100) : 0;

  return {
    summary,
    financial: result.rows
  };
}

// Executive Summary
async function getExecutiveSummary(dateFilter, segmentFilter, params) {
  // Overall score
  const scoreQuery = `
    SELECT 
      CASE 
        WHEN SUM(fp.expected_amount) > 0 
        THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
        ELSE 0 
      END as overall_score
    FROM fee_performance fp
    JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
    WHERE fd.status = 'Active'
    ${dateFilter}
    ${segmentFilter}
  `;

  const scoreResult = await pool.query(scoreQuery, params);

  // Satisfaction counts
  const satQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE ca.approved_by_ceo = TRUE) as satisfied_count,
      COUNT(*) as total_fees,
      COUNT(*) FILTER (WHERE ga.acknowledgment_count >= 2 AND ca.approved_by_ceo = FALSE) as pending_actions,
      COUNT(*) FILTER (WHERE fp.matching_ratio < 70) as critical_issues
    FROM fee_definitions fd
    LEFT JOIN (
      SELECT fee_id, 
        CASE WHEN SUM(expected_amount) > 0 
        THEN ((SUM(collected_amount) + SUM(accrued_amount)) / SUM(expected_amount) * 100)
        ELSE 0 END as matching_ratio
      FROM fee_performance
      GROUP BY fee_id
    ) fp ON fd.fee_id = fp.fee_id
    LEFT JOIN (SELECT fee_id, COUNT(*) as acknowledgment_count FROM gm_acknowledgments WHERE status = 'Acknowledged' GROUP BY fee_id) ga ON fd.fee_id = ga.fee_id
    LEFT JOIN (SELECT fee_id, MAX(approved_by_ceo) as approved_by_ceo FROM ceo_approvals GROUP BY fee_id) ca ON fd.fee_id = ca.fee_id
    WHERE fd.status = 'Active'
    ${segmentFilter}
  `;

  const satResult = await pool.query(satQuery, params);

  // Top performers
  const topQuery = `
    SELECT fd.fee_name_en as name,
      CASE WHEN SUM(fp.expected_amount) > 0 
      THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
      ELSE 0 END as rate
    FROM fee_definitions fd
    JOIN fee_performance fp ON fd.fee_id = fp.fee_id
    WHERE fd.status = 'Active' ${dateFilter} ${segmentFilter}
    GROUP BY fd.fee_id, fd.fee_name_en
    ORDER BY rate DESC
    LIMIT 5
  `;

  const topResult = await pool.query(topQuery, params);

  // Attention needed
  const attentionQuery = `
    SELECT fd.fee_name_en as name,
      CASE WHEN SUM(fp.expected_amount) > 0 
      THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
      ELSE 0 END as rate
    FROM fee_definitions fd
    JOIN fee_performance fp ON fd.fee_id = fp.fee_id
    WHERE fd.status = 'Active' ${dateFilter} ${segmentFilter}
    GROUP BY fd.fee_id, fd.fee_name_en
    ORDER BY rate ASC
    LIMIT 5
  `;

  const attentionResult = await pool.query(attentionQuery, params);

  // Trend (last 6 months)
  const trendQuery = `
    SELECT 
      TO_CHAR(fp.period_date, 'Mon YYYY') as label,
      CASE WHEN SUM(fp.expected_amount) > 0 
      THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
      ELSE 0 END as score
    FROM fee_performance fp
    JOIN fee_definitions fd ON fp.fee_id = fd.fee_id
    WHERE fd.status = 'Active' 
    AND fp.period_date >= CURRENT_DATE - INTERVAL '6 months'
    ${segmentFilter}
    GROUP BY TO_CHAR(fp.period_date, 'Mon YYYY'), fp.period_date
    ORDER BY fp.period_date
  `;

  const trendResult = await pool.query(trendQuery, params);

  return {
    executive: {
      overall_score: Math.round(scoreResult.rows[0]?.overall_score || 0),
      satisfied_count: parseInt(satResult.rows[0]?.satisfied_count || 0),
      total_fees: parseInt(satResult.rows[0]?.total_fees || 0),
      pending_actions: parseInt(satResult.rows[0]?.pending_actions || 0),
      critical_issues: parseInt(satResult.rows[0]?.critical_issues || 0),
      top_performers: topResult.rows,
      attention_needed: attentionResult.rows,
      trend: trendResult.rows
    }
  };
}

// Export to PDF
router.get('/export/pdf', authenticateToken, requireRole(['CEO']), async (req, res) => {
  try {
    // TODO: Implement PDF export with pdfkit
    res.status(501).json({ error: 'PDF export will be implemented soon' });
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export to Excel
router.get('/export/xlsx', authenticateToken, requireRole(['CEO']), async (req, res) => {
  try {
    // TODO: Implement Excel export with exceljs
    res.status(501).json({ error: 'Excel export will be implemented soon' });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

export default router;

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GM Retail Dashboard
router.get('/gm-retail', authenticateToken, authorizeRoles('GM_RETAIL'), async (req, res) => {
  try {
    // Summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT fd.fee_id) as total_fees,
        AVG(CASE 
          WHEN SUM(fp.expected_amount) > 0 
          THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
          ELSE 0 
        END) as overall_performance,
        COUNT(DISTINCT CASE WHEN cet.status = 'Active' THEN cet.customer_id END) as active_exemptions
      FROM fee_definitions fd
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      LEFT JOIN customer_exemptions_temporary cet ON fd.fee_id = cet.fee_id
      WHERE fd.segment = 'Retail' AND fd.status = 'Active'
    `;
    const summaryResult = await pool.query(summaryQuery);

    // Retail fees with performance
    const feesQuery = `
      SELECT 
        fd.fee_id,
        fd.fee_name_en as fee_name,
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
        EXISTS(
          SELECT 1 FROM gm_acknowledgments ga 
          WHERE ga.fee_id = fd.fee_id 
          AND ga.gm_user_id = $1 
          AND ga.status = 'Acknowledged'
        ) as gm_acknowledged
      FROM fee_definitions fd
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      WHERE fd.segment = 'Retail' AND fd.status = 'Active'
      GROUP BY fd.fee_id, fd.fee_name_en, fd.category
      ORDER BY matching_ratio ASC
    `;
    const feesResult = await pool.query(feesQuery, [req.user.user_id]);

    // Active exemptions
    const exemptionsQuery = `
      SELECT 
        c.customer_name_en as customer_name,
        fd.fee_name_en as fee_name,
        'temporary' as type,
        cet.start_date,
        cet.end_date,
        EXTRACT(DAY FROM CAST(cet.end_date - CURRENT_DATE AS INTERVAL)) as days_remaining
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
      WHERE fd.segment = 'Retail' 
      AND cet.status = 'Active'
      AND cet.end_date > CURRENT_DATE
      ORDER BY cet.end_date ASC
      LIMIT 10
    `;
    const exemptionsResult = await pool.query(exemptionsQuery);

    // Notifications
    const notificationsQuery = `
      SELECT 
        notification_id,
        message,
        created_at,
        is_read
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const notificationsResult = await pool.query(notificationsQuery, [req.user.user_id]);

    res.json({
      summary: summaryResult.rows[0],
      fees: feesResult.rows,
      exemptions: exemptionsResult.rows,
      notifications: notificationsResult.rows
    });
  } catch (error) {
    console.error('GM Retail dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GM Corporate Dashboard
router.get('/gm-corporate', authenticateToken, authorizeRoles('GM_CORPORATE'), async (req, res) => {
  try {
    // Summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT fd.fee_id) as total_fees,
        AVG(CASE 
          WHEN SUM(fp.expected_amount) > 0 
          THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
          ELSE 0 
        END) as overall_performance,
        SUM(CASE WHEN fd.category LIKE '%Trade%' THEN fp.expected_amount ELSE 0 END) as trade_finance_volume
      FROM fee_definitions fd
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      WHERE fd.segment = 'Corporate' AND fd.status = 'Active'
    `;
    const summaryResult = await pool.query(summaryQuery);

    // Categories breakdown
    const categoriesQuery = `
      SELECT 
        CASE 
          WHEN fd.category LIKE '%Trade%' THEN 'trade_finance'
          WHEN fd.category LIKE '%FX%' OR fd.category LIKE '%Treasury%' THEN 'fx'
          ELSE 'services'
        END as category_group,
        COUNT(fd.fee_id) as count,
        AVG(CASE 
          WHEN SUM(fp.expected_amount) > 0 
          THEN ((SUM(fp.collected_amount) + SUM(fp.accrued_amount)) / SUM(fp.expected_amount) * 100)
          ELSE 0 
        END) as performance
      FROM fee_definitions fd
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      WHERE fd.segment = 'Corporate' AND fd.status = 'Active'
      GROUP BY category_group
    `;
    const categoriesResult = await pool.query(categoriesQuery);

    const categories = {
      trade_finance: { count: 0, performance: 0 },
      services: { count: 0, performance: 0 },
      fx: { count: 0, performance: 0 }
    };
    
    categoriesResult.rows.forEach(row => {
      categories[row.category_group] = {
        count: parseInt(row.count),
        performance: parseFloat(row.performance) || 0
      };
    });

    // Corporate fees
    const feesQuery = `
      SELECT 
        fd.fee_id,
        fd.fee_name_en as fee_name,
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
        EXISTS(
          SELECT 1 FROM gm_acknowledgments ga 
          WHERE ga.fee_id = fd.fee_id 
          AND ga.gm_user_id = $1 
          AND ga.status = 'Acknowledged'
        ) as gm_acknowledged
      FROM fee_definitions fd
      LEFT JOIN fee_performance fp ON fd.fee_id = fp.fee_id
      WHERE fd.segment = 'Corporate' AND fd.status = 'Active'
      GROUP BY fd.fee_id, fd.fee_name_en, fd.category
      ORDER BY matching_ratio ASC
    `;
    const feesResult = await pool.query(feesQuery, [req.user.user_id]);

    // Active exemptions
    const exemptionsQuery = `
      SELECT 
        c.customer_name_en as customer_name,
        fd.fee_name_en as fee_name,
        'temporary' as type,
        cet.exemption_amount as impact_amount,
        cet.start_date,
        cet.end_date,
        EXTRACT(DAY FROM CAST(cet.end_date - CURRENT_DATE AS INTERVAL)) as days_remaining
      FROM customer_exemptions_temporary cet
      JOIN customers c ON cet.customer_id = c.customer_id
      JOIN fee_definitions fd ON cet.fee_id = fd.fee_id
      WHERE fd.segment = 'Corporate' 
      AND cet.status = 'Active'
      AND cet.end_date > CURRENT_DATE
      ORDER BY cet.exemption_amount DESC
      LIMIT 10
    `;
    const exemptionsResult = await pool.query(exemptionsQuery);

    // Notifications
    const notificationsQuery = `
      SELECT 
        notification_id,
        message,
        created_at,
        is_read
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const notificationsResult = await pool.query(notificationsQuery, [req.user.user_id]);

    res.json({
      summary: summaryResult.rows[0],
      categories,
      fees: feesResult.rows,
      exemptions: exemptionsResult.rows,
      notifications: notificationsResult.rows
    });
  } catch (error) {
    console.error('GM Corporate dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get pending acknowledgments
router.get('/acknowledgments/pending', authenticateToken, async (req, res) => {
  try {
    const { segment } = req.query;
    
    let segmentFilter = '';
    if (segment && segment.toLowerCase() !== 'all') {
      segmentFilter = `AND fd.segment = '${segment.charAt(0).toUpperCase() + segment.slice(1)}'`;
    }

    const query = `
      SELECT 
        fd.fee_id,
        fd.fee_name_en as fee_name,
        fd.segment,
        fd.category,
        fp.matching_ratio,
        st.green_threshold as threshold
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
        GROUP BY fee_id
      ) fp ON fd.fee_id = fp.fee_id
      LEFT JOIN satisfaction_thresholds st ON st.threshold_id = 1
      WHERE fd.status = 'Active'
      ${segmentFilter}
      AND fp.matching_ratio >= COALESCE(st.green_threshold, 98)
      AND NOT EXISTS (
        SELECT 1 FROM gm_acknowledgments ga
        WHERE ga.fee_id = fd.fee_id
        AND ga.gm_user_id = $1
        AND ga.status = 'Acknowledged'
      )
      ORDER BY fp.matching_ratio DESC
    `;
    
    const result = await pool.query(query, [req.user.user_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending acknowledgments error:', error);
    res.status(500).json({ error: 'Failed to fetch pending acknowledgments' });
  }
});

// Submit GM acknowledgment
router.post('/acknowledgments', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { fee_id, notes, segment } = req.body;

    if (!fee_id || !notes || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Fee ID and notes are required' });
    }

    await client.query('BEGIN');

    // Insert acknowledgment
    const insertQuery = `
      INSERT INTO gm_acknowledgments (
        fee_id, gm_user_id, notes, status, acknowledged_at
      ) VALUES ($1, $2, $3, 'Acknowledged', CURRENT_TIMESTAMP)
      RETURNING acknowledgment_id
    `;
    const insertResult = await client.query(insertQuery, [fee_id, req.user.user_id, notes]);

    // Create notification for CEO
    const notificationQuery = `
      INSERT INTO notifications (
        user_id, message, notification_type, entity_type, entity_id, created_at
      )
      SELECT 
        u.user_id,
        'GM ' || $1 || ' acknowledged fee: ' || fd.fee_name_en,
        'acknowledgment',
        'fee',
        $2,
        CURRENT_TIMESTAMP
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      CROSS JOIN fee_definitions fd
      WHERE r.role_code = 'CEO'
      AND fd.fee_id = $2
    `;
    await client.query(notificationQuery, [segment || 'Unknown', fee_id]);

    // Audit trail
    const auditQuery = `
      INSERT INTO audit_events (
        event_type, entity_type, entity_id, user_id, action, 
        new_value, ip_address, user_agent, created_at
      ) VALUES (
        'acknowledgment', 'fee', $1, $2, 'GM Acknowledged',
        $3, $4, $5, CURRENT_TIMESTAMP
      )
    `;
    await client.query(auditQuery, [
      fee_id,
      req.user.user_id,
      JSON.stringify({ notes, segment }),
      req.ip,
      req.get('user-agent')
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      acknowledgment_id: insertResult.rows[0].acknowledgment_id,
      message: 'Acknowledgment submitted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit acknowledgment error:', error);
    res.status(500).json({ error: 'Failed to submit acknowledgment' });
  } finally {
    client.release();
  }
});

export default router;

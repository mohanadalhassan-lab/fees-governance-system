import bcrypt from 'bcrypt';
import { query } from '../config/database.js';

const seedDatabase = async () => {
  console.log('Starting database seeding...');

  try {
    // ========================================
    // 1. SEED ROLES
    // ========================================
    console.log('Seeding roles...');
    const roles = [
      { name: 'CEO', code: 'CEO', desc: 'Chief Executive Officer - Executive Oversight' },
      { name: 'Group GM - Retail', code: 'GM_RETAIL', desc: 'Group General Manager - Retail Banking' },
      { name: 'Group GM - Corporate', code: 'GM_CORPORATE', desc: 'Group General Manager - Corporate Banking' },
      { name: 'Group GM - Finance', code: 'GM_FINANCE', desc: 'Group General Manager - Finance Group' },
      { name: 'Group GM - Risk', code: 'GM_RISK', desc: 'Group General Manager - Risk' },
      { name: 'Group GM - Compliance', code: 'GM_COMPLIANCE', desc: 'Group General Manager - Compliance & Conformity' },
      { name: 'Group GM - Operations', code: 'GM_OPERATIONS', desc: 'Group General Manager - Operations' },
      { name: 'Group GM - IT', code: 'GM_IT', desc: 'Group General Manager - IT/Information Systems' },
      { name: 'Assistant GM', code: 'AGM', desc: 'Assistant General Manager' },
      { name: 'Department Manager', code: 'MANAGER', desc: 'Department Manager' },
      { name: 'Head of Legal', code: 'LEGAL', desc: 'Head of Legal' },
      { name: 'RM', code: 'RM', desc: 'Relationship Manager' },
      { name: 'Branch Manager', code: 'BRANCH_MGR', desc: 'Branch Manager' },
      { name: 'Admin - Maker', code: 'ADMIN_MAKER', desc: 'Admin - Maker' },
      { name: 'Admin - Checker', code: 'ADMIN_CHECKER', desc: 'Admin - Checker' }
    ];

    for (const role of roles) {
      await query(
        'INSERT INTO roles (role_name, role_code, description) VALUES ($1, $2, $3) ON CONFLICT (role_code) DO NOTHING',
        [role.name, role.code, role.desc]
      );
    }

    // ========================================
    // 2. SEED USERS
    // ========================================
    console.log('Seeding users...');
    const password = await bcrypt.hash('Demo@2026', 10);

    const users = [
      { username: 'ceo', email: 'ceo@qib.com', name: 'Mohannad Al-Hassan', role: 'CEO' },
      { username: 'gm.retail', email: 'gm.retail@qib.com', name: 'Ahmed Al-Kuwari', role: 'GM_RETAIL' },
      { username: 'gm.corporate', email: 'gm.corporate@qib.com', name: 'Fatima Al-Thani', role: 'GM_CORPORATE' },
      { username: 'gm.finance', email: 'gm.finance@qib.com', name: 'Khalid Al-Mannai', role: 'GM_FINANCE' },
      { username: 'gm.risk', email: 'gm.risk@qib.com', name: 'Sara Al-Mohannadi', role: 'GM_RISK' },
      { username: 'gm.compliance', email: 'gm.compliance@qib.com', name: 'Omar Al-Malki', role: 'GM_COMPLIANCE' },
      { username: 'agm.payments', email: 'agm.payments@qib.com', name: 'Layla Hassan', role: 'AGM' },
      { username: 'agm.trade', email: 'agm.trade@qib.com', name: 'Ali Al-Ansari', role: 'AGM' },
      { username: 'manager.transfers', email: 'manager.transfers@qib.com', name: 'Noor Abdullah', role: 'MANAGER' },
      { username: 'rm.doha', email: 'rm.doha@qib.com', name: 'Hassan Al-Sulaiti', role: 'RM' },
      { username: 'branch.westbay', email: 'branch.westbay@qib.com', name: 'Maryam Al-Kaabi', role: 'BRANCH_MGR' },
      { username: 'admin.maker', email: 'admin.maker@qib.com', name: 'System Maker', role: 'ADMIN_MAKER' },
      { username: 'admin.checker', email: 'admin.checker@qib.com', name: 'System Checker', role: 'ADMIN_CHECKER' }
    ];

    for (const user of users) {
      const roleRes = await query('SELECT role_id FROM roles WHERE role_code = $1', [user.role]);
      if (roleRes.rows.length > 0) {
        await query(
          'INSERT INTO users (username, email, password_hash, full_name, role_id, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
          [user.username, user.email, password, user.name, roleRes.rows[0].role_id, 'active']
        );
      }
    }

    // ========================================
    // 3. SEED ORGANIZATIONAL STRUCTURE
    // ========================================
    console.log('Seeding organizational structure...');
    
    const getUserId = async (username) => {
      const res = await query('SELECT user_id FROM users WHERE username = $1', [username]);
      return res.rows[0]?.user_id;
    };

    // Group GM level
    const retailGmId = await getUserId('gm.retail');
    const corporateGmId = await getUserId('gm.corporate');
    
    const retailOrgRes = await query(
      'INSERT INTO org_structure (org_name, org_type, owner_user_id) VALUES ($1, $2, $3) RETURNING org_id',
      ['Retail Banking Group', 'GROUP_GM', retailGmId]
    );
    const retailOrgId = retailOrgRes.rows[0].org_id;

    const corporateOrgRes = await query(
      'INSERT INTO org_structure (org_name, org_type, owner_user_id) VALUES ($1, $2, $3) RETURNING org_id',
      ['Corporate Banking Group', 'GROUP_GM', corporateGmId]
    );
    const corporateOrgId = corporateOrgRes.rows[0].org_id;

    // AGM level
    const paymentsAgmId = await getUserId('agm.payments');
    const tradeAgmId = await getUserId('agm.trade');

    await query(
      'INSERT INTO org_structure (parent_org_id, org_name, org_type, owner_user_id) VALUES ($1, $2, $3, $4)',
      [retailOrgId, 'Payments & Transfers', 'AGM', paymentsAgmId]
    );

    await query(
      'INSERT INTO org_structure (parent_org_id, org_name, org_type, owner_user_id) VALUES ($1, $2, $3, $4)',
      [corporateOrgId, 'Trade Finance', 'AGM', tradeAgmId]
    );

    // ========================================
    // 4. SEED SECTOR DEFINITIONS
    // ========================================
    console.log('Seeding sectors...');
    const sectors = [
      { code: 'GOV', name: 'Government', desc: 'Government entities' },
      { code: 'HEALTH', name: 'Healthcare', desc: 'Healthcare sector' },
      { code: 'EDU', name: 'Education', desc: 'Educational institutions' },
      { code: 'ENERGY', name: 'Energy & Utilities', desc: 'Energy and utilities sector' },
      { code: 'RETAIL', name: 'Retail', desc: 'Retail sector' },
      { code: 'REAL_ESTATE', name: 'Real Estate', desc: 'Real estate sector' },
      { code: 'FINANCE', name: 'Financial Services', desc: 'Financial services sector' },
      { code: 'TELECOM', name: 'Telecommunications', desc: 'Telecommunications sector' }
    ];

    for (const sector of sectors) {
      await query(
        'INSERT INTO sector_definitions (sector_code, sector_name, description) VALUES ($1, $2, $3) ON CONFLICT (sector_code) DO NOTHING',
        [sector.code, sector.name, sector.desc]
      );
    }

    // ========================================
    // 5. SEED TARIFF CATALOG (Based on BRD)
    // ========================================
    console.log('Seeding tariff catalog...');

    // Retail - Local Transfers
    const localTransferRes = await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, min_amount, max_amount, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_LOCALTRF', 'RETAIL', 'MASS', 'Transfers', 'Local Transfer to Other Bank',
        'Local transfer to other local bank', 'TIERED', 'QAR', NULL, NULL, 
        '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      ) ON CONFLICT (tariff_code) DO UPDATE SET status = 'active'
      RETURNING tariff_id
    `);
    const localTransferTariffId = localTransferRes.rows[0].tariff_id;

    // Add tiers for local transfer
    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [localTransferTariffId, 1, 0, 100, 0.60]
    );
    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [localTransferTariffId, 2, 100, 1000000, 4.00]
    );
    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [localTransferTariffId, 3, 1000000, 999999999, 6.00]
    );

    // Retail - Internal Transfer
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_INTERNALTRF', 'RETAIL', 'MASS', 'Transfers', 'Internal Transfer',
        'Transfers within the bank (< QAR 1,000)', 'FIXED', 'QAR', 
        '{"amount": 0.50}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Retail - Standing Order Amendment
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_SO_AMEND', 'RETAIL', 'MASS', 'Standing Orders', 'Amendment/Cancellation',
        'Standing order amendment/cancellation', 'FIXED', 'QAR', 
        '{"amount": 50.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Retail - FX Markup
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_FX_USD_GCC', 'RETAIL', 'MASS', 'FX', 'Card Purchases Outside GCC',
        'FX markup for USD & GCC currencies', 'PERCENTAGE', 'QAR', 
        '{"percentage": 2.0}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_FX_GBP_EUR', 'RETAIL', 'MASS', 'FX', 'Card Purchases Outside GCC',
        'FX markup for GBP & EUR', 'PERCENTAGE', 'QAR', 
        '{"percentage": 2.5}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Corporate - Import LC
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_IMPORT_LC', 'CORPORATE', NULL, 'Trade Finance', 'Import LC',
        'Import LC Opening', 'PERCENTAGE', 'QAR', 
        '{"first_quarter": 0.5, "additional_month": 0.125, "min_months": 3}', 
        500.00, '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // Corporate - Standby LC
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_STANDBY_LC', 'CORPORATE', NULL, 'Trade Finance', 'Standby LC',
        'Standby LC issuance', 'PERCENTAGE', 'QAR', 
        '{"monthly_rate": 0.20, "min_months": 3}', 
        750.00, '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // Corporate - Letter of Guarantee
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_LG', 'CORPORATE', NULL, 'Trade Finance', 'Letter of Guarantee',
        'Letter of Guarantee issuance', 'PERCENTAGE', 'QAR', 
        '{"monthly_rate": 0.20, "min_months": 3}', 
        500.00, '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // ========================================
    // RETAIL MASS - Additional Fees
    // ========================================
    
    // ATM Withdrawal
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_ATM_INTL', 'RETAIL', 'MASS', 'ATM', 'International Withdrawal',
        'ATM withdrawal outside Qatar', 'FIXED', 'QAR', 
        '{"amount": 10.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Account Statement
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_STMT_PAPER', 'RETAIL', 'MASS', 'Statements', 'Paper Statement',
        'Paper account statement', 'FIXED', 'QAR', 
        '{"amount": 25.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Checkbook Issuance
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_CHECKBOOK', 'RETAIL', 'MASS', 'Checks', 'Checkbook Issuance',
        'Checkbook issuance (25 leaves)', 'FIXED', 'QAR', 
        '{"amount": 50.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Stop Cheque
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_CHEQUE_STOP', 'RETAIL', 'MASS', 'Checks', 'Stop Cheque',
        'Stop cheque payment', 'FIXED', 'QAR', 
        '{"amount": 50.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Debit Card Annual Fee
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_CARD_DEBIT', 'RETAIL', 'MASS', 'Cards', 'Debit Card Annual',
        'Debit card annual fee', 'FIXED', 'QAR', 
        '{"amount": 100.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Credit Card Annual Fee
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_CARD_CREDIT', 'RETAIL', 'MASS', 'Cards', 'Credit Card Annual',
        'Credit card annual fee', 'FIXED', 'QAR', 
        '{"amount": 300.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // SMS Alerts
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_SMS_MONTHLY', 'RETAIL', 'MASS', 'Services', 'SMS Alerts',
        'SMS alerts monthly subscription', 'FIXED', 'QAR', 
        '{"amount": 10.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // Swift Transfer Outgoing
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_MASS_SWIFT_OUT', 'RETAIL', 'MASS', 'Transfers', 'SWIFT Outgoing',
        'SWIFT transfer outgoing', 'FIXED', 'QAR', 
        '{"amount": 75.00}', '2025-01-01', 'active', 'Retail Mass Tariff 2025'
      )
    `);

    // ========================================
    // RETAIL PRIVATE - Preferential Rates
    // ========================================

    // Private - Local Transfer
    const privateLocalRes = await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, min_amount, max_amount, effective_from, status, source_reference
      ) VALUES (
        'RET_PRIV_LOCALTRF', 'RETAIL', 'PRIVATE', 'Transfers', 'Local Transfer',
        'Local transfer to other bank (Private)', 'TIERED', 'QAR', NULL, NULL, 
        '2025-01-01', 'active', 'Retail Private Tariff 2025'
      ) RETURNING tariff_id
    `);
    const privateLocalTariffId = privateLocalRes.rows[0].tariff_id;

    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [privateLocalTariffId, 1, 0, 100, 0.40]
    );
    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [privateLocalTariffId, 2, 100, 1000000, 3.00]
    );
    await query(
      'INSERT INTO tariff_tiers (tariff_id, tier_level, range_from, range_to, fee_value) VALUES ($1, $2, $3, $4, $5)',
      [privateLocalTariffId, 3, 1000000, 999999999, 5.00]
    );

    // Private - SWIFT
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_PRIV_SWIFT_OUT', 'RETAIL', 'PRIVATE', 'Transfers', 'SWIFT Outgoing',
        'SWIFT transfer outgoing (Private)', 'FIXED', 'QAR', 
        '{"amount": 50.00}', '2025-01-01', 'active', 'Retail Private Tariff 2025'
      )
    `);

    // Private - Debit Card
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_PRIV_CARD_DEBIT', 'RETAIL', 'PRIVATE', 'Cards', 'Debit Card Annual',
        'Platinum debit card annual fee', 'FIXED', 'QAR', 
        '{"amount": 0.00}', '2025-01-01', 'active', 'Retail Private Tariff 2025'
      )
    `);

    // Private - Credit Card
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_PRIV_CARD_CREDIT', 'RETAIL', 'PRIVATE', 'Cards', 'Credit Card Annual',
        'Platinum credit card annual fee', 'FIXED', 'QAR', 
        '{"amount": 200.00}', '2025-01-01', 'active', 'Retail Private Tariff 2025'
      )
    `);

    // Private - Checkbook
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_PRIV_CHECKBOOK', 'RETAIL', 'PRIVATE', 'Checks', 'Checkbook Issuance',
        'Checkbook issuance (Private)', 'FIXED', 'QAR', 
        '{"amount": 0.00}', '2025-01-01', 'active', 'Retail Private Tariff 2025'
      )
    `);

    // ========================================
    // RETAIL TAMAYUZ - VIP Package
    // ========================================

    // Tamayuz - All Transfers Free
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_TAMA_LOCALTRF', 'RETAIL', 'TAMAYUZ', 'Transfers', 'Local Transfer',
        'Local transfer (Tamayuz VIP)', 'FIXED', 'QAR', 
        '{"amount": 0.00}', '2025-01-01', 'active', 'Retail Tamayuz Tariff 2025'
      )
    `);

    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_TAMA_SWIFT_OUT', 'RETAIL', 'TAMAYUZ', 'Transfers', 'SWIFT Outgoing',
        'SWIFT transfer (Tamayuz VIP)', 'FIXED', 'QAR', 
        '{"amount": 0.00}', '2025-01-01', 'active', 'Retail Tamayuz Tariff 2025'
      )
    `);

    // Tamayuz - Premium Services
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_TAMA_CARD_INFINITE', 'RETAIL', 'TAMAYUZ', 'Cards', 'Infinite Card',
        'Visa Infinite card annual fee', 'FIXED', 'QAR', 
        '{"amount": 0.00}', '2025-01-01', 'active', 'Retail Tamayuz Tariff 2025'
      )
    `);

    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'RET_TAMA_RELATIONSHIP', 'RETAIL', 'TAMAYUZ', 'Services', 'Relationship Package',
        'Tamayuz relationship annual package', 'FIXED', 'QAR', 
        '{"amount": 1000.00}', '2025-01-01', 'active', 'Retail Tamayuz Tariff 2025'
      )
    `);

    // ========================================
    // CORPORATE - Trade Finance Additional
    // ========================================

    // Export LC Advising
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_EXPORT_LC_ADVISE', 'CORPORATE', NULL, 'Trade Finance', 'Export LC Advising',
        'Export LC advising fee', 'PERCENTAGE', 'QAR', 
        '{"rate": 0.125}', 
        250.00, '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // LC Amendment
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_LC_AMENDMENT', 'CORPORATE', NULL, 'Trade Finance', 'LC Amendment',
        'LC amendment fee', 'FIXED', 'QAR', 
        '{"amount": 200.00}', '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // Bill Discounting
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_BILL_DISCOUNT', 'CORPORATE', NULL, 'Trade Finance', 'Bill Discounting',
        'Bill discounting service', 'PERCENTAGE', 'QAR', 
        '{"rate": 0.25, "min_days": 30}', '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // Shipping Guarantee
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_SHIPPING_GUARANTEE', 'CORPORATE', NULL, 'Trade Finance', 'Shipping Guarantee',
        'Shipping guarantee issuance', 'FIXED', 'QAR', 
        '{"amount": 500.00}', '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // Collection Services
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_COLLECTION', 'CORPORATE', NULL, 'Trade Finance', 'Collection Services',
        'Documentary collection', 'PERCENTAGE', 'QAR', 
        '{"rate": 0.15}', 
        150.00, '2025-01-01', 'active', 'Trade Finance Tariff 2025'
      )
    `);

    // ========================================
    // CORPORATE - Services
    // ========================================

    // Cash Management Platform
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_CASH_MGMT_MONTHLY', 'CORPORATE', NULL, 'Services', 'Cash Management',
        'Cash management platform monthly', 'FIXED', 'QAR', 
        '{"amount": 500.00}', '2025-01-01', 'active', 'Corporate Services Tariff 2025'
      )
    `);

    // Payroll Processing
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_PAYROLL', 'CORPORATE', NULL, 'Services', 'Payroll Services',
        'Payroll processing per transaction', 'FIXED', 'QAR', 
        '{"amount": 2.00}', '2025-01-01', 'active', 'Corporate Services Tariff 2025'
      )
    `);

    // Corporate Card
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_CARD_ANNUAL', 'CORPORATE', NULL, 'Cards', 'Corporate Card',
        'Corporate card annual fee', 'FIXED', 'QAR', 
        '{"amount": 250.00}', '2025-01-01', 'active', 'Corporate Services Tariff 2025'
      )
    `);

    // Account Analysis
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_ACCOUNT_ANALYSIS', 'CORPORATE', NULL, 'Services', 'Account Analysis',
        'Detailed account analysis report', 'FIXED', 'QAR', 
        '{"amount": 100.00}', '2025-01-01', 'active', 'Corporate Services Tariff 2025'
      )
    `);

    // Treasury Services
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_TREASURY_ADVISORY', 'CORPORATE', NULL, 'Services', 'Treasury Advisory',
        'Treasury advisory services', 'FIXED', 'QAR', 
        '{"amount": 1000.00}', '2025-01-01', 'active', 'Corporate Services Tariff 2025'
      )
    `);

    // ========================================
    // CORPORATE - FX Services
    // ========================================

    // FX Transaction Fee
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_FX_TRANSACTION', 'CORPORATE', NULL, 'FX', 'FX Transaction',
        'Foreign exchange transaction fee', 'PERCENTAGE', 'QAR', 
        '{"rate": 0.10}', 
        50.00, '2025-01-01', 'active', 'Corporate FX Tariff 2025'
      )
    `);

    // FX Forward Contract
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, effective_from, status, source_reference
      ) VALUES (
        'CORP_FX_FORWARD', 'CORPORATE', NULL, 'FX', 'Forward Contract',
        'FX forward contract booking', 'FIXED', 'QAR', 
        '{"amount": 200.00}', '2025-01-01', 'active', 'Corporate FX Tariff 2025'
      )
    `);

    // Currency Swap
    await query(`
      INSERT INTO tariff_catalog (
        tariff_code, segment, tier, category, subcategory, fee_name, fee_type, 
        currency, formula, min_amount, effective_from, status, source_reference
      ) VALUES (
        'CORP_CURRENCY_SWAP', 'CORPORATE', NULL, 'FX', 'Currency Swap',
        'Currency swap arrangement', 'PERCENTAGE', 'QAR', 
        '{"rate": 0.15}', 
        300.00, '2025-01-01', 'active', 'Corporate FX Tariff 2025'
      )
    `);

    // ========================================
    // 6. CREATE FEE DEFINITIONS
    // ========================================
    console.log('Creating fee definitions...');
    
    const tariffs = await query('SELECT tariff_id, tariff_code, fee_name FROM tariff_catalog WHERE status = $1', ['active']);
    
    for (const tariff of tariffs.rows) {
      const feeCode = 'FEE_' + tariff.tariff_code;
      await query(`
        INSERT INTO fee_definitions (tariff_id, fee_code, fee_name, version, status, org_id)
        VALUES ($1, $2, $3, 1, 'active', $4)
        ON CONFLICT (fee_code) DO NOTHING
      `, [tariff.tariff_id, feeCode, tariff.fee_name, tariff.tariff_code.includes('RET') ? retailOrgId : corporateOrgId]);
    }

    // ========================================
    // 7. SEED CUSTOMERS
    // ========================================
    console.log('Seeding customers...');
    
    const sectorIds = {};
    const sectorsRes = await query('SELECT sector_id, sector_code FROM sector_definitions');
    sectorsRes.rows.forEach(row => {
      sectorIds[row.sector_code] = row.sector_id;
    });

    // Create 100 retail customers
    for (let i = 1; i <= 100; i++) {
      const tier = i <= 70 ? 'MASS' : (i <= 90 ? 'PRIVATE' : 'TAMAYUZ');
      const sectors = Object.keys(sectorIds);
      const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
      
      await query(`
        INSERT INTO customers (customer_number, customer_name, segment, tier, sector_id, status)
        VALUES ($1, $2, 'RETAIL', $3, $4, 'active')
      `, [`RET${String(i).padStart(6, '0')}`, `Retail Customer ${i}`, tier, sectorIds[randomSector]]);
    }

    // Create 50 corporate customers
    for (let i = 1; i <= 50; i++) {
      const sectors = Object.keys(sectorIds);
      const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
      
      await query(`
        INSERT INTO customers (customer_number, customer_name, segment, tier, sector_id, status)
        VALUES ($1, $2, 'CORPORATE', NULL, $3, 'active')
      `, [`CORP${String(i).padStart(6, '0')}`, `Corporate Customer ${i}`, sectorIds[randomSector]]);
    }

    // ========================================
    // 8. SEED EXEMPTIONS
    // ========================================
    console.log('Seeding exemptions...');
    
    const ceoId = await getUserId('ceo');
    
    // Sector exemption for Government sector on local transfers
    const localTransferFeeRes = await query(
      "SELECT fee_id FROM fee_definitions WHERE fee_code = 'FEE_RET_MASS_LOCALTRF'"
    );
    if (localTransferFeeRes.rows.length > 0) {
      await query(`
        INSERT INTO sector_exemptions_policy (sector_id, fee_id, exemption_type, percentage_exempted, effective_from, justification, approved_by)
        VALUES ($1, $2, 'FULL', 100.00, '2025-01-01', 'Government sector policy exemption', $3)
      `, [sectorIds['GOV'], localTransferFeeRes.rows[0].fee_id, ceoId]);
    }

    // Permanent customer exemption (VIP customer)
    const vipCustomerRes = await query("SELECT customer_id FROM customers WHERE customer_number = 'RET000091' LIMIT 1");
    if (vipCustomerRes.rows.length > 0 && localTransferFeeRes.rows.length > 0) {
      await query(`
        INSERT INTO customer_exemptions_permanent (customer_id, fee_id, exemption_type, percentage_exempted, justification, approved_by, approved_at)
        VALUES ($1, $2, 'FULL', 100.00, 'VIP relationship - permanent exemption', $3, CURRENT_TIMESTAMP)
      `, [vipCustomerRes.rows[0].customer_id, localTransferFeeRes.rows[0].fee_id, ceoId]);
    }

    // Temporary exemption (RM recommended)
    const rmId = await getUserId('rm.doha');
    const gmRetailId = await getUserId('gm.retail');
    const tempCustomerRes = await query("SELECT customer_id FROM customers WHERE customer_number = 'RET000015' LIMIT 1");
    
    if (tempCustomerRes.rows.length > 0 && localTransferFeeRes.rows.length > 0) {
      await query(`
        INSERT INTO customer_exemptions_temporary (
          customer_id, fee_id, exemption_type, percentage_exempted, 
          start_date, end_date, justification, recommended_by, approved_by, 
          status, activated_at, approval_chain
        ) VALUES (
          $1, $2, 'FULL', 100.00, '2026-01-01', '2026-06-30',
          'Temporary relief due to business restructuring', $3, $4, 
          'active', CURRENT_TIMESTAMP, $5
        )
      `, [
        tempCustomerRes.rows[0].customer_id, 
        localTransferFeeRes.rows[0].fee_id, 
        rmId, 
        gmRetailId,
        JSON.stringify([
          { step: 1, role: 'RM', user_id: rmId, action: 'recommended', timestamp: new Date() },
          { step: 2, role: 'GM_RETAIL', user_id: gmRetailId, action: 'approved', timestamp: new Date() }
        ])
      ]);
    }

    // ========================================
    // 9. SEED FEE PERFORMANCE DATA
    // ========================================
    console.log('Seeding fee performance data...');
    
    const fees = await query('SELECT fee_id, fee_code FROM fee_definitions WHERE status = $1', ['active']);
    
    for (const fee of fees.rows) {
      // Count customers by segment
      const segment = fee.fee_code.includes('RET') ? 'RETAIL' : 'CORPORATE';
      const customerCount = await query('SELECT COUNT(*) as count FROM customers WHERE segment = $1', [segment]);
      const totalCustomers = parseInt(customerCount.rows[0].count);
      
      // Mock exemptions count
      const sectorExempted = Math.floor(totalCustomers * 0.05); // 5%
      const permanentExempted = Math.floor(totalCustomers * 0.02); // 2%
      const temporaryExempted = Math.floor(totalCustomers * 0.01); // 1%
      
      const chargeableCustomers = totalCustomers - sectorExempted - permanentExempted - temporaryExempted;
      
      // Mock amounts (simplified calculation)
      const avgFeeAmount = segment === 'RETAIL' ? 4.00 : 750.00;
      const expectedAmount = chargeableCustomers * avgFeeAmount;
      
      // Vary collection ratios for demo purposes
      const collectionRatio = 0.85 + (Math.random() * 0.15); // 85% to 100%
      const totalCollected = expectedAmount * collectionRatio;
      const collectedAmount = totalCollected * 0.95; // 95% collected
      const accruedAmount = totalCollected * 0.05; // 5% accrued
      
      const matchingRatio = (collectedAmount + accruedAmount) / expectedAmount * 100;
      
      // Determine satisfaction state
      let satisfactionState = 'NOT_SATISFIED';
      if (matchingRatio >= 98) { // Assuming 98% threshold
        satisfactionState = 'CONDITIONALLY_ELIGIBLE';
      }
      
      await query(`
        INSERT INTO fee_performance (
          fee_id, measurement_period, period_start, period_end,
          total_customers, sector_exempted_customers, permanent_exempted_customers, 
          temporary_exempted_customers, chargeable_customers,
          expected_amount, collected_amount, accrued_amount, matching_ratio, satisfaction_state
        ) VALUES (
          $1, 'ANNUAL', '2025-01-01', '2025-12-31',
          $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
      `, [
        fee.fee_id, totalCustomers, sectorExempted, permanentExempted, temporaryExempted, chargeableCustomers,
        expectedAmount.toFixed(2), collectedAmount.toFixed(2), accruedAmount.toFixed(2), matchingRatio.toFixed(2), satisfactionState
      ]);
    }

    // ========================================
    // 10. SEED GLOBAL THRESHOLD
    // ========================================
    console.log('Seeding global threshold...');
    
    await query(`
      INSERT INTO global_threshold_settings (threshold_year, threshold_percentage, set_by, notification_sent)
      VALUES (2026, 98.00, $1, true)
    `, [ceoId]);

    // ========================================
    // 11. SEED SAMPLE NOTIFICATIONS
    // ========================================
    console.log('Seeding sample notifications...');
    
    const gmRetailUserId = await getUserId('gm.retail');
    const gmCorporateUserId = await getUserId('gm.corporate');
    const gmRiskUserId = await getUserId('gm.risk');
    
    await query(`
      INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type)
      VALUES 
        ($1, 'THRESHOLD_SET', 'Global Threshold Set for 2026', 'CEO has set the global satisfaction threshold to 98% for year 2026.', 'high', 'THRESHOLD'),
        ($2, 'THRESHOLD_SET', 'Global Threshold Set for 2026', 'CEO has set the global satisfaction threshold to 98% for year 2026.', 'high', 'THRESHOLD'),
        ($3, 'THRESHOLD_SET', 'Global Threshold Set for 2026', 'CEO has set the global satisfaction threshold to 98% for year 2026.', 'high', 'THRESHOLD')
    `, [gmRetailUserId, gmCorporateUserId, gmRiskUserId]);

    // ========================================
    // COMPLETION
    // ========================================
    console.log('✓ Database seeding completed successfully!');
    console.log('\nSample Login Credentials:');
    console.log('Username: ceo | Password: Demo@2026');
    console.log('Username: gm.retail | Password: Demo@2026');
    console.log('Username: gm.corporate | Password: Demo@2026');
    console.log('Username: gm.risk | Password: Demo@2026');
    console.log('Username: rm.doha | Password: Demo@2026');

  } catch (error) {
    console.error('✗ Seeding failed:', error);
    throw error;
  }
};

// Run seeding
seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database seeding failed:', error);
    process.exit(1);
  });

import { query } from '../config/database.js';

const createTables = async () => {
  const client = await query('SELECT NOW()');
  console.log('Database connection successful:', client.rows[0]);

  // Create schemas SQL
  const schemas = `
    -- ========================================
    -- MASTER DATA TABLES
    -- ========================================

    -- Roles and Users
    CREATE TABLE IF NOT EXISTS roles (
      role_id SERIAL PRIMARY KEY,
      role_name VARCHAR(100) UNIQUE NOT NULL,
      role_code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role_id INTEGER REFERENCES roles(role_id),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Organizational Structure
    CREATE TABLE IF NOT EXISTS org_structure (
      org_id SERIAL PRIMARY KEY,
      parent_org_id INTEGER REFERENCES org_structure(org_id),
      org_name VARCHAR(255) NOT NULL,
      org_type VARCHAR(50) NOT NULL, -- 'GROUP_GM', 'AGM', 'DEPARTMENT'
      owner_user_id INTEGER REFERENCES users(user_id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sector Definitions
    CREATE TABLE IF NOT EXISTS sector_definitions (
      sector_id SERIAL PRIMARY KEY,
      sector_code VARCHAR(50) UNIQUE NOT NULL,
      sector_name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- TARIFF CATALOG
    -- ========================================

    CREATE TABLE IF NOT EXISTS tariff_catalog (
      tariff_id SERIAL PRIMARY KEY,
      tariff_code VARCHAR(100) UNIQUE NOT NULL,
      segment VARCHAR(50) NOT NULL, -- 'RETAIL', 'CORPORATE'
      tier VARCHAR(50), -- 'MASS', 'PRIVATE', 'TAMAYUZ', NULL for corporate
      category VARCHAR(255) NOT NULL, -- 'Transfers', 'Cheques', 'FX', 'Trade Finance'
      subcategory VARCHAR(255),
      fee_name TEXT NOT NULL,
      fee_type VARCHAR(50) NOT NULL, -- 'FIXED', 'TIERED', 'PERCENTAGE'
      currency VARCHAR(10) DEFAULT 'QAR',
      formula TEXT, -- JSON or structured formula definition
      min_amount DECIMAL(15,2),
      max_amount DECIMAL(15,2),
      effective_from DATE NOT NULL,
      effective_to DATE,
      status VARCHAR(20) DEFAULT 'active',
      source_reference VARCHAR(255), -- PDF name/version
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tariff_tiers (
      tier_id SERIAL PRIMARY KEY,
      tariff_id INTEGER REFERENCES tariff_catalog(tariff_id) ON DELETE CASCADE,
      tier_level INTEGER NOT NULL,
      range_from DECIMAL(15,2),
      range_to DECIMAL(15,2),
      fee_value DECIMAL(15,2) NOT NULL,
      percentage_value DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Fee Definitions (active instances with versions)
    CREATE TABLE IF NOT EXISTS fee_definitions (
      fee_id SERIAL PRIMARY KEY,
      tariff_id INTEGER REFERENCES tariff_catalog(tariff_id),
      fee_code VARCHAR(100) UNIQUE NOT NULL,
      fee_name TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'active',
      org_id INTEGER REFERENCES org_structure(org_id), -- ownership
      created_by INTEGER REFERENCES users(user_id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- CUSTOMERS
    -- ========================================

    CREATE TABLE IF NOT EXISTS customers (
      customer_id SERIAL PRIMARY KEY,
      customer_number VARCHAR(100) UNIQUE NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      segment VARCHAR(50) NOT NULL,
      tier VARCHAR(50),
      sector_id INTEGER REFERENCES sector_definitions(sector_id),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- EXEMPTIONS
    -- ========================================

    -- Sector-based exemptions
    CREATE TABLE IF NOT EXISTS sector_exemptions_policy (
      exemption_id SERIAL PRIMARY KEY,
      sector_id INTEGER REFERENCES sector_definitions(sector_id),
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      exemption_type VARCHAR(50) DEFAULT 'FULL', -- 'FULL', 'PARTIAL'
      percentage_exempted DECIMAL(5,2) DEFAULT 100.00,
      effective_from DATE NOT NULL,
      effective_to DATE,
      justification TEXT NOT NULL,
      approved_by INTEGER REFERENCES users(user_id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Permanent customer exemptions
    CREATE TABLE IF NOT EXISTS customer_exemptions_permanent (
      exemption_id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(customer_id),
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      exemption_type VARCHAR(50) DEFAULT 'FULL',
      percentage_exempted DECIMAL(5,2) DEFAULT 100.00,
      justification TEXT NOT NULL,
      approved_by INTEGER REFERENCES users(user_id),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Temporary exemptions
    CREATE TABLE IF NOT EXISTS customer_exemptions_temporary (
      exemption_id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(customer_id),
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      exemption_type VARCHAR(50) DEFAULT 'FULL',
      percentage_exempted DECIMAL(5,2) DEFAULT 100.00,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      justification TEXT NOT NULL,
      recommended_by INTEGER REFERENCES users(user_id), -- RM or Branch Manager
      approved_by INTEGER REFERENCES users(user_id), -- Group GM
      approval_chain TEXT, -- JSON array of approval steps
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'expired', 'rejected'
      activated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Temporary exemption limits (Maker/Checker)
    CREATE TABLE IF NOT EXISTS temporary_exemption_limits (
      limit_id SERIAL PRIMARY KEY,
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      limit_type VARCHAR(50) NOT NULL, -- 'PERCENTAGE', 'VALUE'
      limit_value DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'QAR',
      maker_user_id INTEGER REFERENCES users(user_id),
      checker_user_id INTEGER REFERENCES users(user_id),
      maker_at TIMESTAMP,
      checker_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- FEE PERFORMANCE & MEASUREMENT
    -- ========================================

    CREATE TABLE IF NOT EXISTS fee_performance (
      performance_id SERIAL PRIMARY KEY,
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      measurement_period VARCHAR(50) NOT NULL, -- 'ANNUAL', 'QUARTERLY', 'MONTHLY'
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_customers INTEGER DEFAULT 0,
      sector_exempted_customers INTEGER DEFAULT 0,
      permanent_exempted_customers INTEGER DEFAULT 0,
      temporary_exempted_customers INTEGER DEFAULT 0,
      chargeable_customers INTEGER DEFAULT 0,
      expected_amount DECIMAL(15,2) DEFAULT 0.00,
      collected_amount DECIMAL(15,2) DEFAULT 0.00,
      accrued_amount DECIMAL(15,2) DEFAULT 0.00,
      matching_ratio DECIMAL(5,2) DEFAULT 0.00,
      satisfaction_state VARCHAR(50) DEFAULT 'NOT_SATISFIED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- SATISFACTION GOVERNANCE
    -- ========================================

    -- Global CEO Threshold
    CREATE TABLE IF NOT EXISTS global_threshold_settings (
      setting_id SERIAL PRIMARY KEY,
      threshold_year INTEGER NOT NULL UNIQUE,
      threshold_percentage DECIMAL(5,2) NOT NULL,
      set_by INTEGER REFERENCES users(user_id),
      set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notification_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Fee-Specific Threshold Exceptions
    CREATE TABLE IF NOT EXISTS fee_threshold_exceptions (
      exception_id SERIAL PRIMARY KEY,
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      requested_threshold DECIMAL(5,2) NOT NULL,
      justification TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      requested_by INTEGER REFERENCES users(user_id), -- Group GM
      finance_reviewed_by INTEGER REFERENCES users(user_id),
      finance_reviewed_at TIMESTAMP,
      risk_reviewed_by INTEGER REFERENCES users(user_id),
      risk_reviewed_at TIMESTAMP,
      approved_by INTEGER REFERENCES users(user_id), -- CEO
      approved_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
      maker_user_id INTEGER REFERENCES users(user_id),
      checker_user_id INTEGER REFERENCES users(user_id),
      activated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GM Acknowledgments
    CREATE TABLE IF NOT EXISTS gm_acknowledgments (
      acknowledgment_id SERIAL PRIMARY KEY,
      performance_id INTEGER REFERENCES fee_performance(performance_id),
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      gm_user_id INTEGER REFERENCES users(user_id),
      notes TEXT NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- CEO Approvals
    CREATE TABLE IF NOT EXISTS ceo_approvals (
      approval_id SERIAL PRIMARY KEY,
      performance_id INTEGER REFERENCES fee_performance(performance_id),
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      approved_by INTEGER REFERENCES users(user_id), -- CEO
      decision VARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED'
      comments TEXT,
      approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- FEE OWNERSHIP DECOMPOSITION
    -- ========================================

    CREATE TABLE IF NOT EXISTS fee_ownership (
      ownership_id SERIAL PRIMARY KEY,
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      org_id INTEGER REFERENCES org_structure(org_id),
      owner_user_id INTEGER REFERENCES users(user_id),
      assigned_by INTEGER REFERENCES users(user_id),
      ownership_type VARCHAR(50) NOT NULL, -- 'PRIMARY', 'DELEGATED'
      effective_from DATE NOT NULL,
      effective_to DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_domains (
      domain_id SERIAL PRIMARY KEY,
      domain_name VARCHAR(255) NOT NULL,
      parent_domain_id INTEGER REFERENCES fee_domains(domain_id),
      org_id INTEGER REFERENCES org_structure(org_id),
      created_by INTEGER REFERENCES users(user_id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_domain_assignments (
      assignment_id SERIAL PRIMARY KEY,
      fee_id INTEGER REFERENCES fee_definitions(fee_id),
      domain_id INTEGER REFERENCES fee_domains(domain_id),
      assigned_by INTEGER REFERENCES users(user_id),
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- NOTIFICATIONS
    -- ========================================

    CREATE TABLE IF NOT EXISTS notifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id),
      notification_type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_entity_type VARCHAR(50), -- 'FEE', 'EXEMPTION', 'THRESHOLD'
      related_entity_id INTEGER,
      is_read BOOLEAN DEFAULT false,
      is_email_sent BOOLEAN DEFAULT false,
      priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP
    );

    -- ========================================
    -- AUDIT TRAIL (IMMUTABLE)
    -- ========================================

    CREATE TABLE IF NOT EXISTS audit_events (
      event_id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      user_id INTEGER REFERENCES users(user_id),
      action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
      old_value TEXT,
      new_value TEXT,
      metadata TEXT, -- JSON
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- MAKER/CHECKER CONTROLS
    -- ========================================

    CREATE TABLE IF NOT EXISTS maker_checker_queue (
      queue_id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      action VARCHAR(50) NOT NULL,
      maker_user_id INTEGER REFERENCES users(user_id),
      checker_user_id INTEGER REFERENCES users(user_id),
      maker_data TEXT, -- JSON of proposed changes
      maker_comments TEXT,
      checker_comments TEXT,
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      maker_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checker_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- REPORTS & ANALYTICS CACHE
    -- ========================================

    CREATE TABLE IF NOT EXISTS report_cache (
      cache_id SERIAL PRIMARY KEY,
      report_type VARCHAR(100) NOT NULL,
      report_filters TEXT, -- JSON
      report_data TEXT, -- JSON
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    );

    -- ========================================
    -- INDEXES FOR PERFORMANCE
    -- ========================================

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_tariff_segment ON tariff_catalog(segment);
    CREATE INDEX IF NOT EXISTS idx_tariff_tier ON tariff_catalog(tier);
    CREATE INDEX IF NOT EXISTS idx_tariff_status ON tariff_catalog(status);
    CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
    CREATE INDEX IF NOT EXISTS idx_customers_sector ON customers(sector_id);
    CREATE INDEX IF NOT EXISTS idx_fee_performance_fee ON fee_performance(fee_id);
    CREATE INDEX IF NOT EXISTS idx_fee_performance_period ON fee_performance(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_fee_performance_state ON fee_performance(satisfaction_state);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_exemptions_temp_dates ON customer_exemptions_temporary(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_exemptions_temp_status ON customer_exemptions_temporary(status);
  `;

  try {
    await query(schemas);
    console.log('✓ All database tables created successfully');
  } catch (error) {
    console.error('✗ Error creating tables:', error);
    throw error;
  }
};

// Run migration
createTables()
  .then(() => {
    console.log('Database migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exit(1);
  });

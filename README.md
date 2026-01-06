# Fees Governance & Satisfaction Management System

**M.A - Simplify the Vision**

Executive-grade system for governing bank fees (tariffs), exemptions, collections, settlement matching, and satisfaction with full accountability and controlled exceptions.

## System Overview

This system implements the complete BRD requirements for executive fees governance including:

- **Single Source of Truth** for bank fees and tariffs (Retail & Corporate)
- **Expected vs Actual** performance measurement (Collected + Accrued)
- **4-State Satisfaction Engine** (Not Satisfied → Conditionally Eligible → Pending CEO → Satisfied)
- **Hierarchical Approval Workflows** with mandatory GM acknowledgments and CEO final approval
- **Comprehensive Exemptions Management** (Sector, Permanent, Temporary)
- **Threshold Management** (Global CEO threshold + Fee-specific exceptions)
- **Maker/Checker Controls** for governance-critical operations
- **Complete Audit Trail** for all actions
- **Role-Based Access Control** (CEO, Group GMs, AGMs, Managers, Risk, Finance, etc.)

## Technology Stack

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- RESTful API architecture

### Frontend
- React 18
- Tailwind CSS (Executive minimalist design)
- React Router for navigation
- Axios for API calls

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

1. **Clone and navigate to project**
```bash
cd "fees-governance-system"
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. **Initialize database**
```bash
# Create PostgreSQL database named 'fees_governance'
# Then run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

6. **Start development servers**
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:5000
- Frontend on http://localhost:5173

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| CEO | ceo | Demo@2026 |
| GM - Retail | gm.retail | Demo@2026 |
| GM - Corporate | gm.corporate | Demo@2026 |
| GM - Risk | gm.risk | Demo@2026 |
| RM | rm.doha | Demo@2026 |

## Key Features Implemented

### ✅ Core Business Logic
- Chargeable customers = Total - Sector exemptions - Permanent - Temporary
- Expected amount calculation with tariff formulas
- Matching ratio = (Collected + Accrued) / Expected × 100
- Satisfaction state machine with mandatory approvals

### ✅ Governance & Controls
- Global CEO threshold setting (annual)
- Fee-specific threshold exceptions (GM request → CEO approval)
- Temporary exemption limits with Maker/Checker
- Immutable audit trail for all actions

### ✅ Workflows
- RM/Branch Manager recommend temporary exemptions
- Group GM approval chain for exemptions
- Mandatory GM acknowledgments before CEO approval
- Finance and Risk review for threshold exceptions

### ✅ Dashboards
- CEO Executive Overview
- Group GM Fee Management
- Risk Management Analytics
- Real-time notifications

### ✅ Reports
- Temporary Exemptions Report (mandatory)
- Fee Performance Reports
- Exemptions Summary
- Audit Trail Reports

## Project Structure

```
fees-governance-system/
├── server/
│   ├── config/          # Database configuration
│   ├── db/              # Migrations and seed scripts
│   ├── middleware/      # Auth, RBAC, audit logging
│   ├── routes/          # API endpoints
│   └── index.js         # Express app entry point
├── client/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # React contexts (Auth)
│   │   ├── pages/       # Page components
│   │   ├── utils/       # Helpers and API client
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # React entry point
│   ├── index.html
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user

### Dashboards
- `GET /api/dashboards/ceo` - CEO dashboard data
- `GET /api/dashboards/gm/:userId` - GM dashboard data
- `GET /api/dashboards/risk` - Risk dashboard data

### Fees
- `GET /api/fees` - List all fees with filters
- `GET /api/fees/:feeId` - Get fee details
- `GET /api/fees/:feeId/exemptions` - Get fee exemptions

### Thresholds
- `GET /api/thresholds/global` - Get global threshold
- `POST /api/thresholds/global` - Set global threshold (CEO only)
- `GET /api/thresholds/exceptions` - Get threshold exceptions
- `POST /api/thresholds/exceptions` - Request threshold exception

### Satisfaction
- `POST /api/satisfaction` - Submit GM acknowledgment
- `POST /api/satisfaction/ceo-approval` - CEO approve/reject

### Exemptions
- `GET /api/exemptions` - List temporary exemptions
- `GET /api/exemptions/report` - Generate exemptions report
- `POST /api/exemptions/recommend` - Recommend temporary exemption
- `PATCH /api/exemptions/:id/approve` - Approve/reject exemption

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read

## Design Philosophy

The UI follows **Executive Minimalism** principles:

- **Numbers speak louder than text**
- Clean grids and modern spacing
- Calm authority and professional tone
- State-of-the-art executive design
- High contrast and clear hierarchy
- Responsive and accessible

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Maker/Checker for critical operations
- Immutable audit logs
- No silent edits allowed
- IP and user agent tracking

## Compliance & Governance

- Complete audit trail for all actions
- Approval chains with timestamps
- Notification system for escalations
- Automatic expiry of temporary exemptions
- Threshold exception expiry management

## Database Schema Highlights

- `tariff_catalog` - Source of truth for all fees
- `fee_performance` - Performance metrics per fee
- `fee_threshold_exceptions` - Fee-specific thresholds
- `customer_exemptions_temporary` - Time-bound exemptions
- `gm_acknowledgments` - GM notes for satisfaction
- `ceo_approvals` - Final satisfaction approvals
- `audit_events` - Immutable audit log
- `maker_checker_queue` - Maker/Checker workflow

## Production Readiness

- Environment-based configuration
- Database connection pooling
- Error handling middleware
- Request logging (Morgan)
- Security headers (Helmet)
- CORS configuration
- Compression middleware

## Future Phase 2 Enhancements

- Core Banking (T24) integration
- Email gateway integration
- SSO/Identity integration
- HR scorecard linkage
- Advanced analytics and ML predictions
- Mobile application

## Support & Documentation

For detailed business requirements, refer to the BRD document: `brd fees`

## License

PROPRIETARY - Qatar Islamic Bank (QIB)
© 2026 All rights reserved.

---

**M.A - Simplify the Vision**
*Executive Fees Governance & Satisfaction Management System*

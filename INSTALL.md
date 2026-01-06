# Fees Governance System - Setup & Installation Guide

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL 14+ installed

## Installation Steps

### 1. PostgreSQL Setup (macOS)

If PostgreSQL is not installed, run:

```bash
# Run the automated setup script
./setup-db.sh
```

Or manually install:

```bash
# Install via Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb fees_governance
```

### 2. Update Environment Configuration

Edit the `.env` file with your database credentials:

```bash
# For local development on macOS, typically:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fees_governance
DB_USER=your_mac_username  # Usually your macOS username
DB_PASSWORD=               # Leave empty for local dev
```

### 3. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 4. Initialize Database

```bash
# Run migrations to create tables
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 5. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| CEO | ceo | Demo@2026 |
| GM - Retail | gm.retail | Demo@2026 |
| GM - Corporate | gm.corporate | Demo@2026 |
| GM - Risk | gm.risk | Demo@2026 |

## Troubleshooting

### PostgreSQL Connection Issues

If you get connection errors:

1. **Check if PostgreSQL is running:**
   ```bash
   brew services list | grep postgresql
   ```

2. **Start PostgreSQL if not running:**
   ```bash
   brew services start postgresql@14
   ```

3. **Verify database exists:**
   ```bash
   psql -l | grep fees_governance
   ```

4. **Update .env with correct credentials:**
   - On macOS, default user is usually your system username
   - Password is often empty for local development

### Port Already in Use

If port 5000 or 5173 is in use:

1. **Change backend port in `.env`:**
   ```
   PORT=5001
   ```

2. **Change frontend port in `client/vite.config.js`:**
   ```javascript
   server: { port: 5174 }
   ```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules
npm install
cd client && npm install && cd ..
```

## Verifying Installation

After setup, verify everything works:

1. ✓ Backend API responds: http://localhost:5000/health
2. ✓ Frontend loads: http://localhost:5173
3. ✓ Can login with demo credentials
4. ✓ Dashboard shows data

## Next Steps

After successful installation:

1. Explore the CEO Dashboard
2. Review fee performance metrics
3. Check exemptions and thresholds
4. Test approval workflows
5. Review audit trail

## Support

If issues persist:

1. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgresql@14/*.log`
2. Check application logs in terminal
3. Verify all prerequisites are met
4. Review error messages carefully

---

**M.A - Simplify the Vision**

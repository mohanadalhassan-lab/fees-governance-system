#!/bin/bash

# PostgreSQL Setup Script for macOS
echo "=== PostgreSQL Setup for Fees Governance System ==="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed."
    echo "Please install Homebrew first: https://brew.sh"
    echo "Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✓ Homebrew is installed"

# Check if PostgreSQL is installed
if ! brew list postgresql@14 &> /dev/null && ! brew list postgresql &> /dev/null; then
    echo ""
    echo "Installing PostgreSQL..."
    brew install postgresql@14
else
    echo "✓ PostgreSQL is already installed"
fi

# Start PostgreSQL service
echo ""
echo "Starting PostgreSQL service..."
brew services start postgresql@14 || brew services start postgresql

# Wait for service to start
echo "Waiting for PostgreSQL to start..."
sleep 3

# Create database
echo ""
echo "Creating database 'fees_governance'..."
createdb fees_governance 2>/dev/null && echo "✓ Database created" || echo "ℹ Database may already exist"

# Update .env if needed
echo ""
echo "=== Database Configuration ==="
echo "Database Name: fees_governance"
echo "Default User: $USER"
echo "Host: localhost"
echo "Port: 5432"
echo ""
echo "Please update your .env file with these credentials if needed:"
echo "DB_USER=$USER"
echo "DB_PASSWORD=  (leave empty for local development)"
echo ""
echo "=== Next Steps ==="
echo "1. Update .env file with correct database credentials"
echo "2. Run: npm run db:migrate"
echo "3. Run: npm run db:seed"
echo "4. Run: npm run dev"

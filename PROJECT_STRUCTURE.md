# Smart Factory - Project Structure

## Overview
The Smart Factory project has been organized following Node.js/Express best practices and a clear separation of concerns.

---

## Root Level Files

### Core Application Files
```
├── server.js              # Main Express server entry point
├── database.js            # PostgreSQL database connection configuration
├── package.json           # NPM dependencies and scripts
├── package-lock.json      # Locked dependency versions
└── smart_factory.db       # SQLite database (legacy/backup)
```

---

## Directory Structure

### `/config`
Configuration files for the application
```
├── ecosystem.config.js    # PM2 ecosystem configuration
└── nodemon.json           # Nodemon development server configuration
```

### `/src` (Future: Planned for refactoring)
Refactored source code structure (currently in root directories)
```
├── config/               # Application configuration
├── middleware/           # Express middleware
├── routes/               # API route handlers
└── services/             # Business logic services
```

### `/routes`
Express route handlers (currently maintained here)
```
├── auth.js               # Authentication routes
├── boms.js               # Bill of Materials management
├── dashboard.js          # Dashboard API endpoints
├── deliveryOrders.js     # Delivery orders management
├── devices.js            # Device/PLC management
├── downtime.js           # Downtime tracking
├── entities.js           # Customer/Vendor management
├── inventory.js          # Inventory management
├── injectionParameters.js # Injection parameters
├── invoices.js           # Invoice management
├── items.js              # Item/Product management
├── machines.js           # Machine management
├── manufacturingOrders.js # Manufacturing orders
├── permissions.js        # Role-based permissions
├── productionRecords.js  # Production record tracking
├── purchaseOrders.js     # Purchase orders
├── quality.js            # Quality control
├── receipts.js           # Receipt management
├── roles.js              # User role management
└── salesOrders.js        # Sales orders management
```

### `/middleware`
Express middleware functions
```
├── auth.js               # Authentication middleware
└── ...                   # Other middleware
```

### `/services`
Business logic and service layer
```
├── ...                   # Service implementations
```

### `/views`
EJS template files for server-side rendering
```
├── dashboard.ejs         # Dashboard template
├── deliveryOrders.ejs    # Delivery orders template
├── manufacturingOrders.ejs
├── roles.ejs             # Role management template
├── permissions.ejs       # Permission management template
└── partials/             # Reusable template components
    ├── sidebar.ejs
    └── ...
```

### `/public`
Static client-side assets
```
├── index.html            # Main page
├── login.html            # Login page
├── register.html         # Registration page
├── delivery-orders.html  # Delivery orders list
├── delivery-order-detail.html
├── machines.html         # Machine management page
├── mo-detail.html        # Manufacturing order detail
├── bom-details.js        # BOM detail page script
├── edit-bom.js           # BOM edit script
└── js/
    ├── auth-client.js    # Client-side auth helpers
    └── ...
└── css/
    ├── style.css
    └── ...
└── uploads/              # User uploaded files
    ├── items/            # Item images
    ├── quality_drawings/ # Quality control drawings
    └── ...
```

### `/scripts`
Utility scripts for development and deployment

#### `/scripts/database`
Database-related scripts
```
├── checks/               # Database schema verification scripts
│   ├── check_*.js        # Individual table checks
│   └── ...
├── fixes/                # Database schema fix scripts
│   ├── fix_*.js
│   ├── fix_*.sql
│   └── ...
├── migrations/           # Database schema creation/migration scripts
│   ├── create_*.js
│   ├── create_*.sql
│   ├── add_*.sql
│   └── ...
├── seeds/                # Database seeding scripts
│   ├── seed_*.js         # Seed data generators
│   ├── mock_*.js         # Mock data generators
│   └── ...
└── init/                 # Database initialization scripts
    ├── init_*.js
    └── ...
```

#### `/scripts/python`
Python-based utility scripts (PLC integration, data processing)
```
├── app.py                # Main Python application
├── app_fixed.py          # Fixed version of app
├── main_collector.py     # Data collection script
├── plc_tester.py         # PLC connection testing
├── mockup_generator.py   # Mock data generator
├── test_db_connection.py # Database connection test
├── recreate_mapping_table.py
├── delete_test_data.py
├── update_db.py
├── find_postgres_password.py
├── probe_*.py            # Diagnostic scripts
├── *.sr3                 # Modbus/PLC configuration files
└── ...
```

#### `/scripts/utilities`
General utility and helper scripts
```
├── debug_*.js            # Debug scripts for various modules
├── generate_*.js         # Generator scripts
├── inject_*.js           # Data injection scripts
├── probe_*.js            # Diagnostic/probe scripts
├── register_*.js         # Registration helper scripts
├── reseed_*.js           # Data reseeding scripts
├── update_*.js           # Update utility scripts
├── upgrade_*.js          # Schema upgrade scripts
├── reset_*.js            # Reset utility scripts
├── clear_*.js            # Cleanup scripts
└── ...
```

### `/docker`
Docker-related configuration files
```
├── Dockerfile            # Node.js application container
├── Dockerfile.python     # Python service container
├── docker-compose.yml    # Docker Compose orchestration
└── build-and-run-docker.ps1
```

### `/deploy`
Deployment and setup scripts
```
├── setup-environment.ps1 # Environment setup
├── deploy_fix.ps1        # Deployment fix script
├── fix_data_only.bat     # Data fix script
├── fix_database-1.py     # Python database fix
├── fix_schema.bat        # Schema fix script
├── fix_time.sh           # Time fix script
├── force_fix.sh          # Force fix script
├── run_check.bat         # Verification script
├── run_debug_*.bat       # Debug scripts
├── repair_system.bat     # System repair script
└── ...
```

### `/backup`
Backup and archived files
```
├── database.sql          # Database backup dumps
├── factory_backup.sql
├── *.sql                 # Other backups
├── database.js.bak_old   # Old database configuration
├── database copy.js      # Database copy
├── smart_factory.db      # SQLite database backup
├── entity db.json        # Entity data backup
└── package copy.json     # Package.json backup
```

### `/docs`
Documentation and setup guides
```
└── setup/
    ├── PROJECT_SUMMARY.md
    ├── DEPLOY_INSTRUCTIONS_TH.md (Thai)
    ├── README-docker.md
    ├── INSTALL_DOCKER.txt
    ├── FIXES_2026-05-26.md
    └── ...
```

### `/tests`
Test files and test data
```
└── data/
    ├── test_*.js         # Test scripts
    ├── *_payload.json    # API test payloads
    ├── *.html            # HTML test files
    ├── cookies.txt       # Session cookies
    ├── session_*.txt     # Session data
    └── ...
```

### `/template`
Template or boilerplate files

### `.vscode`
VS Code workspace settings
```
└── *.code-workspace     # Workspace configuration files
```

---

## File Organization Benefits

### Before Organization
- 96+ files in root directory
- Difficult to locate files
- Unclear project structure
- Hard to maintain and scale

### After Organization
✅ **Clear separation of concerns**
- Database scripts organized by purpose
- Python scripts grouped together
- Configuration files in dedicated folder
- Tests and data in separate directory
- Deployment scripts in deploy folder
- Documentation centralized

✅ **Easier maintenance**
- Quick access to needed files
- Clear naming conventions
- Organized by functionality

✅ **Better scalability**
- Ready for microservices expansion
- Separate concerns for different teams
- Clear path for future refactoring

---

## Key Directories Summary

| Directory | Purpose | File Count |
|-----------|---------|-----------|
| `/routes` | API endpoints | 20+ |
| `/public` | Frontend assets & pages | 30+ |
| `/views` | Server-side templates | 10+ |
| `/scripts/database/checks` | DB validation | 11 |
| `/scripts/database/fixes` | DB corrections | 8 |
| `/scripts/database/migrations` | Schema creation | 3 |
| `/scripts/database/seeds` | Test data | 8 |
| `/scripts/python` | PLC integration | 15+ |
| `/scripts/utilities` | Helper tools | 20+ |
| `/backup` | Backup files | 10+ |
| `/docker` | Container config | 5+ |
| `/deploy` | Deployment scripts | 10+ |
| `/docs` | Documentation | 8+ |

---

## Running the Application

### Development
```bash
# Install dependencies
npm install

# Start development server with nodemon
npm start

# The server will use configuration from /config/nodemon.json
```

### Production with Docker
```bash
# Build and run with Docker Compose
cd docker
docker-compose up -d

# Logs for debugging
docker-compose logs -f
```

### Database Setup
```bash
# Run database initialization
node scripts/database/init/init_finance_tables.js

# Run database checks
node scripts/database/checks/check_users.js

# Apply fixes if needed
node scripts/database/fixes/fix_items_schema.js
```

### Seeding Test Data
```bash
# Seed sample data
node scripts/database/seeds/seed_entities.js
node scripts/database/seeds/seed_mock_data.js
```

---

## Important Notes

1. **Database Connection**: Configured in `database.js`, uses PostgreSQL
2. **Session Management**: Uses PostgreSQL session store via `express-session`
3. **Authentication**: JWT/Session-based with role-based access control
4. **File Uploads**: Stored in `/public/uploads/` with Multer
5. **Environment Variables**: Use `.env` file for configuration

---

## Next Steps for Further Improvement

1. Move existing `/routes`, `/middleware`, `/services` to `/src/` directory
2. Create `/src/models/` for database models/schemas
3. Create `/src/utils/` for utility functions
4. Create `/src/constants/` for application constants
5. Create `/src/validators/` for request validation
6. Implement proper error handling middleware
7. Add comprehensive logging system
8. Create automated test suite in `/tests/`
9. Add integration tests

---

**Last Updated**: 2026-05-26  
**Organization Version**: 1.0

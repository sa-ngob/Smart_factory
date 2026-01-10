// --- Imports ---
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const morgan = require('morgan');
const util = require('util');
require('dotenv').config();

// server.js บรรทัดบนสุด
process.env.TZ = 'Asia/Bangkok';

// --- Database & Routes Imports ---
const db = require('./database.js');
const authRoutes = require('./routes/auth.js');
const apiRoutes = require('./routes/index.js');

// --- Initializations ---
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
    console.error('FATAL ERROR: SESSION_SECRET is not defined in your environment variables.');
    process.exit(1);
}

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session Configuration (PostgreSQL Only) ---
let sessionStore;
if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL for session storage.');
    const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
    });
    sessionStore = new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
    });
} else {
    console.error('FATAL: DATABASE_URL not set. Cannot configure session storage.');
    process.exit(1);
}

app.use(session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        sameSite: 'lax'
    }
}));

// --- Template Engine Setup (EJS) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Security: Clear Sessions on Startup (Enforce Login after Restart) ---
const clearSessionsOnStartup = async () => {
    try {
        console.log('🔒 Security: Attempting to clear sessions...');
        if (process.env.DATABASE_URL) {
            // Use db.runAsync implementation from database.js which wraps pool.query
            await db.runAsync('TRUNCATE TABLE session');
            console.log('🔒 Security: All active sessions cleared from PostgreSQL.');
        }
    } catch (err) {
        // If table doesn't exist yet (first run), this might fail, which is fine
        console.warn('⚠️ Note: Could not clear sessions (Table might be missing or DB error):', err.message);
    }
};

// --- Security Middleware for Static HTML ---
const protectStaticHtml = (req, res, next) => {
    const p = req.path;
    // Allow assets and public pages
    if (
        !p.endsWith('.html') && p !== '/' || // Not HTML (js, css, png)
        p === '/login.html' ||
        p === '/register.html'
    ) {
        return next();
    }

    // Check Authentication
    if (!req.session || !req.session.userId) {
        // If it's an API call/AJAX (though unlikely for static .html request source), 401
        if (req.xhr || req.headers.accept && req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login.html');
    }

    // Pass to static handler
    next();
};

app.use(protectStaticHtml);

// --- Static Files (Now protected) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Custom Middleware for Auth (For Routes/API) ---
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, message: 'Unauthorized, please login.', redirectTo: '/login.html' });
        }
        return res.redirect('/login.html');
    }
    next();
};

/**
 * Middleware to check if the user's role has permission to access a specific page.
 */
const hasPermission = async (req, res, next) => {
    const userRole = req.session.role;
    const requestedPath = req.path.startsWith('/') ? req.path : '/' + req.path;

    try {
        const sql = `SELECT 1 FROM role_pages rp
                     JOIN roles r ON rp.role_id = r.id
                     JOIN pages p ON rp.page_id = p.id
                     WHERE r.name = $1 AND p.url = $2`;
        const permission = await db.getAsync(sql, [userRole, requestedPath]);

        if (permission) {
            return next();
        }
        return res.status(403).send('<h1>403 Forbidden</h1><p>You do not have permission to access this page.</p>');
    } catch (err) { return next(err); }
};

const isAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
        }
        return res.status(403).send('<h1>403 Forbidden</h1><p>You do not have permission to access this page.</p>');
    }
    next();
};

// --- Authentication Routes ---
app.use('/auth', authRoutes);

app.get('/manage_roles.html', isAuthenticated, isAdmin, async (req, res, next) => {
    const sql = `SELECT p.name, p.url FROM pages p
                 JOIN role_pages rp ON p.id = rp.page_id
                 JOIN roles r ON rp.role_id = r.id
                 WHERE r.name = $1 ORDER BY p.id`;

    try {
        const pages = await db.allAsync(sql, [req.session.role]);
        res.render('roles', { accessiblePages: pages });
    } catch (err) {
        next(err);
    }
});

app.get('/manage_permissions.html', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
        const accessiblePages = await db.allAsync(`SELECT p.name, p.url FROM pages p
            JOIN role_pages rp ON p.id = rp.page_id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = $1 ORDER BY p.id`, [req.session.role]);

        const roles = await db.allAsync(`SELECT * FROM roles ORDER BY name`, []);
        const allPages = await db.allAsync(`SELECT * FROM pages ORDER BY name`, []);
        const permissions = await db.allAsync(`SELECT role_id, page_id FROM role_pages`, []);

        const permsLookup = {};
        permissions.forEach(p => {
            if (!permsLookup[p.role_id]) permsLookup[p.role_id] = [];
            permsLookup[p.role_id].push(p.page_id);
        });

        res.render('permissions', { accessiblePages, roles, pages: allPages, permissions: permsLookup });
    } catch (err) {
        next(err);
    }
});

// --- Dynamic HTML Page Serving with Permissions ---
app.get('/*.html', isAuthenticated, (req, res, next) => {
    if (req.path === '/sidebar.html') {
        return res.status(404).send('Not Found');
    }
    hasPermission(req, res, next);
}, (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// --- Protected Main Route ---
app.get('/', isAuthenticated, (req, res) => {
    res.redirect('/dashboard.html');
});

// --- API Routes Mounting ---
app.use('/api', isAuthenticated, apiRoutes);

// --- API 404 Handler ---
app.use('/api', (req, res, next) => {
    res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
});

// --- API Error Handling Middleware ---
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// --- Server Start with Port Fallback ---
const startServer = (initialPort) => {
    const server = app.listen(initialPort, '0.0.0.0', () => { // Listen on all interfaces
        console.log(`🚀 Smart Factory server is running at http://0.0.0.0:${initialPort}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${initialPort} is in use, trying ${initialPort + 1}...`);
            startServer(initialPort + 1);
        } else {
            console.error('❌ Server error:', err);
        }
    });
};

// Start the server after clearing sessions
(async () => {
    await clearSessionsOnStartup();
    startServer(port);
})();

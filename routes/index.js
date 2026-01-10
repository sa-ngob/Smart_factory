const express = require('express');
const router = express.Router();
const db = require('../database.js'); // ✅ เพิ่มบรรทัดนี้

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, error: 'User not authenticated' });
}

// --- นำเข้า Routes ทั้งหมดของ API ---
const userRoutes = require('./users.js'); // ✅ เพิ่มเข้ามา
const roleRoutes = require('./roles.js');   // ✅ เพิ่มเข้ามา
const permissionRoutes = require('./permissions.js'); // ✅ เพิ่มเข้ามา
const entityRoutes = require('./entities.js');
const moldRoutes = require('./molds.js');
const purchaseOrderRoutes = require('./purchaseOrders.js');
const itemRoutes = require('./items.js');
const bomRoutes = require('./boms.js');
const projectRoutes = require('./projects.js');
const salesOrderRoutes = require('./salesOrders.js');
const manufacturingOrderRoutes = require('./manufacturingOrders.js');
const machineRoutes = require('./machines.js');
const scheduleRoutes = require('./schedule.js');
const dashboardRoutes = require('./dashboard.js');
const productionRecordRoutes = require('./productionRecords.js');
const inventoryRoutes = require('./inventory.js');
const deliveryOrderRoutes = require('./deliveryOrders.js');
const invoiceRoutes = require('./invoices.js');
const billingNoteRoutes = require('./billingNotes.js');
const receiptRoutes = require('./receipts.js');
const qualityRoutes = require('./quality.js');
const injectionParameterRoutes = require('./injectionParameters.js');
// --- Import Dashboard & Workflow API Routes ---
const workflowRoutes = require('./workflow.js');
const overviewDashboardRoutes = require('./overviewDashboard.js');
const productionDashboardRoutes = require('./productionDashboard.js');
const salesDashboardRoutes = require('./salesDashboard.js');
const inventoryDashboardRoutes = require('./inventoryDashboard.js');



// --- กำหนด Path ให้กับแต่ละ Route ---
router.use('/users', userRoutes); // ✅ เพิ่มเข้ามา
router.use('/roles', roleRoutes);   // ✅ เพิ่มเข้ามา
router.use('/permissions', permissionRoutes); // ✅ เพิ่มเข้ามา
router.use('/entities', entityRoutes);
router.use('/molds', moldRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/items', itemRoutes);
router.use('/boms', bomRoutes);
router.use('/projects', projectRoutes);
router.use('/sales-orders', salesOrderRoutes);
router.use('/manufacturing-orders', manufacturingOrderRoutes);
router.use('/machines', machineRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/production-records', productionRecordRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/delivery-orders', deliveryOrderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/billing-notes', billingNoteRoutes);
router.use('/receipts', receiptRoutes);
router.use('/quality', qualityRoutes);
router.use('/injection-parameters', injectionParameterRoutes);
// Dashboard & Workflow Routes
router.use('/workflow', workflowRoutes);
router.use('/overview-dashboard', overviewDashboardRoutes);
router.use('/production-dashboard', productionDashboardRoutes);
router.use('/sales-dashboard', salesDashboardRoutes);
router.use('/inventory-dashboard', inventoryDashboardRoutes);


router.get('/user-info', (req, res) => {
    // --- FIX: ส่งข้อมูลจาก session กลับไปให้ถูกต้อง ---
    if (req.session && req.session.userId) {
        res.json({ success: true, displayName: req.session.name, role: req.session.role });
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    }
});
// API สำหรับ Sidebar
router.get('/sidebar', (req, res) => {
    const userRole = req.session.role;
    if (!userRole) {
        return res.status(403).send('');
    }
    const sql = `
        SELECT p.name, p.url FROM pages p
        JOIN role_pages rp ON p.id = rp.page_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = $1 ORDER BY p.id;
    `;
    db.all(sql, [userRole], (err, accessiblePages) => {
        if (err) {
            console.error("Error fetching sidebar pages:", err);
            return res.status(500).send('');
        }
        res.render('partials/sidebar', { accessiblePages: accessiblePages || [] });
    });
});

// Export ตัว router ที่รวบรวมทุกอย่างแล้วออกไป
module.exports = router;
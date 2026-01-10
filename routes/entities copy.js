// routes/entities.js
const express = require('express');
const db = require('../database.js');
const router = express.Router();
const { checkRole } = require('../middleware/auth.js'); // <-- ✅ เพิ่มบรรทัดนี้เข้าไป

// GET /api/entities/ - Endpoint หลักสำหรับดึงข้อมูล (รองรับการกรอง)
router.get('/', (req, res) => {
    const role = req.query.role || req.query.type;
    const searchQuery = req.query.q;

    let sql = `
        SELECT 
            e.id, e.name, e.tax_id, e.phone, e.email,
            GROUP_CONCAT(er.role_name, ', ') as roles
        FROM entities e
        LEFT JOIN entity_roles er ON e.id = er.entity_id
        WHERE 1=1
    `;
    const params = [];

    if (role) {
        sql += ` AND e.id IN (SELECT entity_id FROM entity_roles WHERE role_name = ?)`;
        params.push(role);
    }
    
    if (searchQuery) {
        sql += ` AND e.name LIKE ?`;
        params.push(`%${searchQuery}%`);
    }

    sql += ` GROUP BY e.id ORDER BY e.id DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ success: true, data: rows }); // <-- ปรับรูปแบบ response ให้ตรงกัน
    });
});

// GET /api/entities/customers - ดึงข้อมูลลูกค้าทั้งหมดสำหรับ Dropdown (แก้ไขให้สมบูรณ์)
router.get('/customers', (req, res) => {
    const sql = `
        SELECT
            e.id, e.name, e.tax_id, e.address
        FROM entities e
        JOIN entity_roles er ON e.id = er.entity_id
        WHERE er.role_name = 'customer'
        ORDER BY e.name ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching customers:", err.message);
            return res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า" });
        }
        res.json({ success: true, data: rows }); // <-- ปรับรูปแบบ response ให้ตรงกัน
    });
});

// GET /api/entities/vendors - ดึงข้อมูลผู้ขายทั้งหมดสำหรับ Dropdown
router.get('/vendors', (req, res) => {
    const sql = `
        SELECT e.id, e.name 
        FROM entities e
        JOIN entity_roles er ON e.id = er.entity_id
        WHERE er.role_name = 'vendor'
        ORDER BY e.name
    `;
     db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, data: rows }); // <-- ปรับรูปแบบ response ให้ตรงกัน
    });
});

// **API ใหม่**: ดึงรายการสินค้าที่ค้างส่งทั้งหมดของลูกค้ารายเดียว (ฉบับแก้ไข)
router.get('/customers/:id/outstanding-items', (req, res) => {
    const customerId = req.params.id;
    
    // === จุดที่แก้ไข: เปลี่ยนจาก HAVING เป็น WHERE และปรับเงื่อนไข ===
    const sql = `
        SELECT
            soi.id as sales_order_item_id,
            soi.item_code,
            i.item_name,
            so.id as so_id,
            so.so_number,
            so.customer_po_number,
            soi.quantity as quantity_ordered,
            COALESCE(shipped.total_shipped, 0) as quantity_shipped,
            (soi.quantity - COALESCE(shipped.total_shipped, 0)) as quantity_outstanding
        FROM sales_order_items soi
        JOIN items i ON soi.item_code = i.item_code
        JOIN sales_orders so ON soi.so_id = so.id
        LEFT JOIN (
            SELECT so_item_id, SUM(quantity_shipped) as total_shipped
            FROM delivery_order_items
            GROUP BY so_item_id
        ) shipped ON soi.id = shipped.so_item_id
        WHERE 
            so.customer_id = ? 
            AND so.status IN ('confirmed', 'in_production', 'partially_shipped')
            AND (soi.quantity > COALESCE(shipped.total_shipped, 0)) -- เงื่อนไขนี้จะทำงานเหมือน HAVING quantity_outstanding > 0
        ORDER BY so.id, soi.id
    `;
    
    db.all(sql, [customerId], (err, rows) => {
        if (err) {
            console.error("Error fetching outstanding items:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// POST /api/entities - สร้าง Entity ใหม่
router.post('/', (req, res) => {
    // ... โค้ดส่วนนี้เหมือนเดิม ...
    const { role_name, name, tax_id, address, branch_code, branch_name, contact_person, email, phone } = req.body;
    db.serialize(() => {
        const findSql = `SELECT id FROM entities WHERE tax_id = ? AND tax_id != ''`;
        db.get(findSql, [tax_id], (err, row) => {
            if (err) return res.status(500).json({ "error": err.message });
            if (row) {
                const entityId = row.id;
                const addRoleSql = `INSERT INTO entity_roles (entity_id, role_name) VALUES (?, ?)`;
                db.run(addRoleSql, [entityId, role_name], function(err) {
                    if (err) return res.status(400).json({ "error": "This entity already has this role." });
                    res.json({ "message": "role_added", "id": entityId });
                });
            } else {
                const createEntitySql = `INSERT INTO entities (name, tax_id, address, branch_code, branch_name, contact_person, email, phone) VALUES (?,?,?,?,?,?,?,?)`;
                const paramsEntity = [name, tax_id, address, branch_code, branch_name, contact_person, email, phone];
                db.run(createEntitySql, paramsEntity, function (err) {
                    if (err) return res.status(400).json({ "error": err.message });
                    const entityId = this.lastID;
                    const addRoleSql = `INSERT INTO entity_roles (entity_id, role_name) VALUES (?, ?)`;
                    db.run(addRoleSql, [entityId, role_name], (err) => {
                        if (err) return res.status(400).json({ "error": err.message });
                        res.json({ "message": "success", "id": entityId });
                    });
                });
            }
        });
    });
});

// PUT /api/entities/:id - อัปเดต Entity
router.put('/:id', (req, res) => {
    // ... โค้ดส่วนนี้เหมือนเดิม ...
    const { name, tax_id, address, branch_code, branch_name, contact_person, email, phone } = req.body;
    const sql = `UPDATE entities SET name = ?, tax_id = ?, address = ?, branch_code = ?, branch_name = ?, contact_person = ?, email = ?, phone = ? WHERE id = ?`;
    const params = [name, tax_id, address, branch_code, branch_name, contact_person, email, phone, req.params.id];
    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", changes: this.changes });
    });
});

// DELETE /api/entities/:id - ลบ Entity
router.delete('/:id', (req, res) => {
    // ... โค้ดส่วนนี้เหมือนเดิม ...
    const sql = 'DELETE FROM entities WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// GET /api/taxinfo/:taxId - API Mockup (อาจไม่จำเป็นต้องแก้ไข)
router.get('/taxinfo/:taxId', (req, res) => {
    // ... โค้ดส่วนนี้เหมือนเดิม ...
    const taxId = req.params.taxId;
    const mockTaxData = {
        '0105564099999': { name: "บริษัท ตัวอย่าง เทคโนโลยี จำกัด (มหาชน)", address: "99/9 อาคารตัวอย่างทาวเวอร์ ชั้น 9 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110", branch_code: "00000", branch_name: "สำนักงานใหญ่" },
        '0135555011210': { name: "บริษัท สมาร์ท แฟคทอรี่ (ประเทศไทย) จำกัด", address: "123/45 นิคมอุตสาหกรรมโรจนะ ต.คานหาม อ.อุทัย จ.พระนครศรีอยุธยา 13210", branch_code: "00000", branch_name: "สำนักงานใหญ่" },
        '0205558001111': { name: "บริษัท ซัพพลายเออร์พาร์ท จำกัด", address: "88 หมู่ 8 ต.บางปลา อ.บางพลี จ.สมุทรปราการ 10540", branch_code: "00001", branch_name: "สาขาสมุทรปราการ" }
    };
    const foundData = mockTaxData[taxId];
    if (foundData) res.json(foundData);
    else res.status(404).json({ error: "ไม่พบข้อมูล" });
});
// **API ใหม่**: ดึงรายการ PO ที่มีของค้างออก Invoice ของลูกค้ารายเดียว
router.get('/customers/:id/outstanding-pos', (req, res) => {
    const customerId = req.params.id;
    // ค้นหา PO ทั้งหมดที่มี DO status เป็น 'shipped'
    const sql = `
        SELECT DISTINCT so.customer_po_number
        FROM delivery_orders do
        JOIN delivery_order_items doi ON do.id = doi.do_id
        JOIN sales_order_items soi ON doi.so_item_id = soi.id
        JOIN sales_orders so ON soi.so_id = so.id
        WHERE do.customer_id = ? AND do.status = 'shipped' AND so.customer_po_number IS NOT NULL
        ORDER BY so.customer_po_number
    `;
    db.all(sql, [customerId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

module.exports = router;

const db = require('../database.js');

/**
 * สร้างรายการเคลื่อนไหวสต็อก (Inventory Transaction)
 * **หมายเหตุ:** ฟังก์ชันนี้คาดว่าจะถูกเรียกใช้ภายใน Transaction ที่มีอยู่แล้ว
 * @param {string} item_code รหัสสินค้า
 * @param {string} transaction_type ประเภทรายการ
 * @param {number} quantity จำนวนที่เปลี่ยนแปลง (ค่าบวกสำหรับของเข้า, ค่าลบสำหรับของออก)
 * @param {string} reference_type ประเภทเอกสารอ้างอิง (เช่น 'MO', 'PO')
 * @param {number} reference_id ID ของเอกสารอ้างอิง
 * @param {string} notes หมายเหตุเพิ่มเติม
 * @param {object} client Optional: PostgreSQL client for transaction context
 */
async function createTransaction(item_code, transaction_type, quantity, reference_type, reference_id, notes = '', client = null) {
    // DEBUG: แสดงข้อมูลที่ได้รับทั้งหมด
    console.log(`[InvSvc] Attempting transaction: ${transaction_type} for item ${item_code}, Qty: ${quantity}, Ref: ${reference_type} #${reference_id}`);

    try {
        // 1. ดึงสต็อกปัจจุบัน
        const getStockSql = "SELECT stock_quantity FROM items WHERE item_code = $1";
        let item;

        if (client) {
            const res = await client.query(getStockSql, [item_code]);
            item = res.rows[0];
        } else {
            item = await db.getAsync(getStockSql, [item_code]);
        }

        if (!item) {
            throw new Error(`Item not found: ${item_code}`);
        }

        const current_quantity = item.stock_quantity;
        const new_quantity = current_quantity + quantity;

        console.log(`[InvSvc] Item: ${item_code} | Current Stock: ${current_quantity} | Change: ${quantity} | New Stock: ${new_quantity}`);

        // 2. บันทึก Transaction
        const insertSql = `
            INSERT INTO inventory_transactions 
            (item_code, transaction_type, quantity_change, new_quantity, reference_type, reference_id, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const insertParams = [item_code, transaction_type, quantity, new_quantity, reference_type, reference_id, notes];

        let transactionId;
        if (client) {
            const res = await client.query(insertSql, insertParams);
            transactionId = res.rows[0].id;
        } else {
            const res = await db.query(insertSql, insertParams);
            transactionId = res.rows[0].id;
        }

        // 3. อัปเดตสต็อกในตาราง items
        const updateSql = "UPDATE items SET stock_quantity = $1 WHERE item_code = $2";
        if (client) {
            await client.query(updateSql, [new_quantity, item_code]);
        } else {
            await db.runAsync(updateSql, [new_quantity, item_code]);
        }

        console.log(`[InvSvc] SUCCESS: Transaction #${transactionId} for item ${item_code} completed.`);
        return { message: 'Transaction created successfully', new_quantity };

    } catch (err) {
        console.error(`[InvSvc] ERROR for ${item_code}:`, err.message);
        throw err;
    }
}

module.exports = { createTransaction };
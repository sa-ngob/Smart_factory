const db = require('../database.js');

/**
 * สร้างรายการเคลื่อนไหวสต็อก (Inventory Transaction)
 * @param {string} item_code รหัสสินค้า
 * @param {string} transaction_type ประเภทรายการ
 * @param {number} quantity จำนวนที่เปลี่ยนแปลง (ค่าบวกสำหรับของเข้า, ค่าลบสำหรับของออก)
 * @param {string} reference_type ประเภทเอกสารอ้างอิง (เช่น 'MO', 'PO')
 * @param {number} reference_id ID ของเอกสารอ้างอิง
 * @param {string} notes หมายเหตุเพิ่มเติม
 */
function createTransaction(item_code, transaction_type, quantity, reference_type, reference_id, notes = '') {
    // <-- DEBUG: แสดงข้อมูลที่ได้รับทั้งหมด
    console.log(`[InvSvc] Attempting transaction: ${transaction_type} for item ${item_code}, Qty: ${quantity}, Ref: ${reference_type} #${reference_id}`);
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            // 1. ดึงสต็อกปัจจุบัน
            const getStockSql = "SELECT stock_quantity FROM items WHERE item_code = ?";
            db.get(getStockSql, [item_code], (err, item) => {
                if (err) {
                    db.run("ROLLBACK;");
                    return reject(new Error(`DB Error on get stock: ${err.message}`));
                }
                if (!item) {
                    db.run("ROLLBACK;");
                    return reject(new Error(`Item not found: ${item_code}`));
                }

                const current_quantity = item.stock_quantity;
                const new_quantity = current_quantity + quantity;

                // <-- DEBUG: แสดงการคำนวณสต็อก
                console.log(`[InvSvc] Item: ${item_code} | Current Stock: ${current_quantity} | Change: ${quantity} | New Stock: ${new_quantity}`);


                // 2. บันทึก Transaction
                const insertSql = `
                    INSERT INTO inventory_transactions 
                    (item_code, transaction_type, quantity_change, new_quantity, reference_type, reference_id, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;
                const insertParams = [item_code, transaction_type, quantity, new_quantity, reference_type, reference_id, notes];
                
                db.run(insertSql, insertParams, function(err) {
                    if (err) {
                        db.run("ROLLBACK;");
                        // <-- DEBUG: แสดง Error ตอนบันทึก Transaction
                        console.error(`[InvSvc] ERROR inserting transaction for ${item_code}:`, err.message);
                        return reject(new Error(`DB Error on insert transaction: ${err.message}`));
                    }
                    const transactionId = this.lastID;

                    // 3. อัปเดตสต็อกในตาราง items
                    const updateSql = "UPDATE items SET stock_quantity = ? WHERE item_code = ?";
                    db.run(updateSql, [new_quantity, item_code], function(err) {
                        if (err) {
                            db.run("ROLLBACK;");
                            // <-- DEBUG: แสดง Error ตอนอัปเดตสต็อก
                            console.error(`[InvSvc] ERROR updating stock for ${item_code}:`, err.message);
                            return reject(new Error(`DB Error on update stock: ${err.message}`));
                        }

                        db.run("COMMIT;");
                        // <-- DEBUG: ยืนยันความสำเร็จ
                        console.log(`[InvSvc] SUCCESS: Transaction #${transactionId} for item ${item_code} completed.`);
                        resolve({ message: 'Transaction created successfully', new_quantity });
                    });
                });
            });
        });
    });
}

module.exports = { createTransaction };
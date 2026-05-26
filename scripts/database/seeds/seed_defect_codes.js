const { pool } = require('./database.js');

async function seedDefectCodes() {
    console.log('🚀 Seeding 20 Plastic Injection Molding Defect Codes...');
    const client = await pool.connect();

    try {
        const defects = [
            { code: 'DEF-001', description: 'Short Shot (ชิ้นงานไม่เต็ม)' },
            { code: 'DEF-002', description: 'Flash (ครีบเกิน)' },
            { code: 'DEF-003', description: 'Sink Marks (รอยยุบ)' },
            { code: 'DEF-004', description: 'Flow Lines (รอยไหลของพลาสติก)' },
            { code: 'DEF-005', description: 'Weld Lines (รอยประสาน)' },
            { code: 'DEF-006', description: 'Burn Marks (รอยไหม้)' },
            { code: 'DEF-007', description: 'Vacuum Voids (โพรงอากาศภายใน)' },
            { code: 'DEF-008', description: 'Jetting (รอยฉีดพุ่ง)' },
            { code: 'DEF-009', description: 'Warpage (การบิดงอ)' },
            { code: 'DEF-010', description: 'Bubbles (ฟองอากาศ)' },
            { code: 'DEF-011', description: 'Ejector Marks (รอยเข็มกระทุ้ง)' },
            { code: 'DEF-012', description: 'Silver Streaks (รอยเงิน/ความชื้น)' },
            { code: 'DEF-013', description: 'Black Specks (จุดดำ/สิ่งปนเปื้อน)' },
            { code: 'DEF-014', description: 'Delamination (การลอกเป็นชั้น)' },
            { code: 'DEF-015', description: 'Scratch Marks (รอยขีดข่วน)' },
            { code: 'DEF-016', description: 'Oil Contamination (คราบน้ำมัน)' },
            { code: 'DEF-017', description: 'Color Streak (สีไม่สม่ำเสมอ)' },
            { code: 'DEF-018', description: 'Dimension Out (ขนาดไม่ได้ตามสเปค)' },
            { code: 'DEF-019', description: 'Gate Residue (ตอเกทสูง)' },
            { code: 'DEF-020', description: 'Drag Marks (รอยลาก/ถลอกขณะปลด)' }
        ];

        await client.query('BEGIN');

        for (const d of defects) {
            await client.query(`
                INSERT INTO defect_codes (code, description) 
                VALUES ($1, $2)
                ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
            `, [d.code, d.description]);
            console.log(`✅ Upserted: ${d.code} - ${d.description}`);
        }

        await client.query('COMMIT');
        console.log('🎉 Successfully seeded 20 defect codes.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding defect codes:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedDefectCodes();

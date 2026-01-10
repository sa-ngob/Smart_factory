-- 1. สร้างและเพิ่มข้อมูลประเภทของเสีย (Defect Types) - 30 รายการ
CREATE TABLE IF NOT EXISTS defect_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) -- Visual, Dimensional, Function, Material
);

INSERT INTO defect_types (code, name, category, description) VALUES
('DF-001', 'Short Shot', 'Visual', 'ฉีดไม่เต็มชิ้นงาน เนื้อพลาสติกขาด'),
('DF-002', 'Flash/Burrs', 'Visual', 'ครีบส่วนเกินตามขอบชิ้นงาน'),
('DF-003', 'Sink Mark', 'Visual', 'รอยยุบหรือบุ๋มบนผิวชิ้นงาน'),
('DF-004', 'Flow Mark', 'Visual', 'รอยไหลของพลาสติกเป็นคลื่น'),
('DF-005', 'Weld Line', 'Visual', 'เส้นรอยประสานของเนื้อพลาสติก'),
('DF-006', 'Burn Mark', 'Visual', 'รอยไหม้ดำ จากอากาศที่ระบายไม่ทัน'),
('DF-007', 'Silver Streak', 'Visual', 'รอยเงิน หรือรอยลายน้ำ (ความชื้น)'),
('DF-008', 'Jetting', 'Visual', 'รอยฉีดพุ่งเป็นเส้นงู'),
('DF-009', 'Warpage', 'Dimensional', 'ชิ้นงานบิดงอ เสียรูปทรง'),
('DF-010', 'Bubbles/Voids', 'Visual', 'ฟองอากาศภายในเนื้อชิ้นงาน'),
('DF-011', 'Ejector Mark', 'Visual', 'รอยดันของเข็มกระทุ้งทะลุหรือนูน'),
('DF-012', 'Scratch', 'Visual', 'รอยขีดข่วนบนผิวชิ้นงาน'),
('DF-013', 'Black Dot', 'Material', 'จุดดำหรือสิ่งปนเปื้อนในเนื้อ'),
('DF-014', 'Oil Stain', 'Visual', 'คราบน้ำมันเปื้อนชิ้นงาน'),
('DF-015', 'Color Mismatch', 'Visual', 'สีเพี้ยน ไม่ตรงตามมาตรฐาน'),
('DF-016', 'Dimension NG', 'Dimensional', 'ขนาดกว้าง/ยาว/สูง ไม่ได้ตามสเปค'),
('DF-017', 'Brittleness', 'Property', 'ชิ้นงานเปราะ แตกหักง่าย'),
('DF-018', 'Gate Vestige High', 'Visual', 'รอยตัดเกทสูงเกินกำหนด'),
('DF-019', 'Drag Mark', 'Visual', 'รอยลาก ถลอกจากการถอดแบบ'),
('DF-020', 'Delamination', 'Visual', 'ผิวชิ้นงานลอกเป็นชั้นๆ'),
('DF-021', 'Cracking', 'Visual', 'รอยแตกร้าวบนชิ้นงาน'),
('DF-022', 'Haze/Cloudy', 'Visual', 'ชิ้นงานใสมีฝ้าขุ่น'),
('DF-023', 'Unmelted Granules', 'Material', 'เม็ดพลาสติกละลายไม่หมด (Fish Eye)'),
('DF-024', 'Stuck in Mold', 'Process', 'ชิ้นงานติดแม่พิมพ์ (ต้องงัดออก)'),
('DF-025', 'Shortage Count', 'Process', 'จำนวนชิ้นงานไม่ครบ (กรณี Multi-cavity)'),
('DF-026', 'Over Weight', 'Dimensional', 'น้ำหนักชิ้นงานเกินมาตรฐาน'),
('DF-027', 'Under Weight', 'Dimensional', 'น้ำหนักชิ้นงานต่ำกว่ามาตรฐาน'),
('DF-028', 'Insert Fail', 'Process', 'ชิ้นส่วน Insert หลุดหรือวางไม่ตรงตำแหน่ง'),
('DF-029', 'Gloss Mismatch', 'Visual', 'ความเงา/ด้าน ไม่สม่ำเสมอ'),
('DF-030', 'Dirty/Contamination', 'Visual', 'สิ่งสกปรกปนเปื้อนภายนอก')
ON CONFLICT (code) DO NOTHING;

-- 2. สร้างและเพิ่มข้อมูลรหัสการหยุดเครื่อง (Downtime Reasons) - 30 รายการ
CREATE TABLE IF NOT EXISTS downtime_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) -- Machine, Mold, Process/Material
);

-- หมวดที่ 1: Machine Breakdown (เครื่องจักร)
INSERT INTO downtime_codes (code, name, category) VALUES
('DT-M01', 'Heater Band Failure', 'Machine'),
('DT-M02', 'Hydraulic Pump Leak', 'Machine'),
('DT-M03', 'Screw/Barrel Issue', 'Machine'),
('DT-M04', 'Robot Arm Alarm', 'Machine'),
('DT-M05', 'Cooling System Fail', 'Machine'),
('DT-M06', 'Safety Door Sensor', 'Machine'),
('DT-M07', 'Injection Unit Leak', 'Machine'),
('DT-M08', 'Ejector System Jammed', 'Machine'),
('DT-M09', 'Controller/PLC Error', 'Machine'),
('DT-M10', 'Nozzle Clogged', 'Machine');

-- หมวดที่ 2: Mold Issue (แม่พิมพ์)
INSERT INTO downtime_codes (code, name, category) VALUES
('DT-T01', 'Mold Cleaning', 'Mold'),
('DT-T02', 'Ejector Pin Broken', 'Mold'),
('DT-T03', 'Water Leak in Mold', 'Mold'),
('DT-T04', 'Runner Stuck in Mold', 'Mold'),
('DT-T05', 'Part Stuck in Cavity', 'Mold'),
('DT-T06', 'Core Slide Failure', 'Mold'),
('DT-T07', 'Hot Runner Problem', 'Mold'),
('DT-T08', 'Mold Surface Damage', 'Mold'),
('DT-T09', 'Guide Pin/Bush Wear', 'Mold'),
('DT-T10', 'Spring Return Fail', 'Mold');

-- หมวดที่ 3: Process & Material (กระบวนการและวัตถุดิบ)
INSERT INTO downtime_codes (code, name, category) VALUES
('DT-P01', 'Mold Setup/Change', 'Process'),
('DT-P02', 'Color Change', 'Process'),
('DT-P03', 'Material Change', 'Process'),
('DT-P04', 'Start-up Parameter Adj', 'Process'),
('DT-P05', 'Material Drying', 'Process'),
('DT-P06', 'Hopper Empty/No Mat', 'Process'),
('DT-P07', 'Purging Material', 'Process'),
('DT-P08', 'Waiting for QC', 'Process'),
('DT-P09', 'Manpower Shortage', 'Process'),
('DT-P10', 'Machine Warm-up', 'Process')
ON CONFLICT (code) DO NOTHING;

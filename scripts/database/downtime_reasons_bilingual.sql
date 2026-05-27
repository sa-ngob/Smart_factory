-- Downtime Reasons - Bilingual (English + Thai)
-- สาเหตุการหยุดเครื่อง - ภาษาอังกฤษ + ไทย
-- Total: 130 reasons across 10 categories

-- 1. Equipment/Machine Failures (ความเสียหายของเครื่องจักร) - 20 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('EQ-001', 'Hydraulic pump failure | ความเสียหายของปั้มไฮดรอลิก', 'Equipment Failure'),
('EQ-002', 'Motor breakdown | มอเตอร์เสีย', 'Equipment Failure'),
('EQ-003', 'Heater element malfunction | องค์ประกอบเครื่องทำความร้อนเสีย', 'Equipment Failure'),
('EQ-004', 'Temperature sensor error | เซ็นเซอร์อุณหภูมิเสีย', 'Equipment Failure'),
('EQ-005', 'Pressure gauge failure | มาตรวัดความดันเสีย', 'Equipment Failure'),
('EQ-006', 'Injection unit jam | หน่วยฉีดติดขัด', 'Equipment Failure'),
('EQ-007', 'Screw rotation problem | ปัญหาการหมุนของสกรู', 'Equipment Failure'),
('EQ-008', 'Clamp mechanism failure | กลไกยึดเสีย', 'Equipment Failure'),
('EQ-009', 'Ejection system malfunction | ระบบการดีดออกเสีย', 'Equipment Failure'),
('EQ-010', 'Cooling water system failure | ระบบน้ำหล่อเย็นเสีย', 'Equipment Failure'),
('EQ-011', 'Electric switch malfunction | สวิตช์ไฟฟ้าเสีย', 'Equipment Failure'),
('EQ-012', 'Servo valve problem | ปัญหาวาล์วเซอร์โว', 'Equipment Failure'),
('EQ-013', 'Oil circulation system failure | ระบบหมุนเวียนน้ำมันเสีย', 'Equipment Failure'),
('EQ-014', 'Electrical short circuit | ไฟฟ้าลัดวงจร', 'Equipment Failure'),
('EQ-015', 'PLC system error | ระบบ PLC ขัดข้อง', 'Equipment Failure'),
('EQ-016', 'Conveyor belt broken | สายพานลำเลียงหลุด', 'Equipment Failure'),
('EQ-017', 'Hose rupture | สายยางแตก', 'Equipment Failure'),
('EQ-018', 'Seal leakage | การรั่วของซีล', 'Equipment Failure'),
('EQ-019', 'Bearing wear out | ลูกปืนสึกหรอ', 'Equipment Failure'),
('EQ-020', 'Vibration abnormality | ความสั่นสะเทือนผิดปกติ', 'Equipment Failure');

-- 2. Mold Issues (ปัญหาแม่พิมพ์) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MD-001', 'Mold cavity clogged | โพรงแม่พิมพ์อุดตัน', 'Mold Issue'),
('MD-002', 'Mold core misalignment | แกนแม่พิมพ์ไม่อยู่ตำแหน่ง', 'Mold Issue'),
('MD-003', 'Mold wear and tear | แม่พิมพ์สึกหรอ', 'Mold Issue'),
('MD-004', 'Mold cooling channel blocked | ช่องหล่อเย็นแม่พิมพ์อุดตัน', 'Mold Issue'),
('MD-005', 'Gate freeze/blockage | ประตูฉีดติด/อุดตัน', 'Mold Issue'),
('MD-006', 'Mold surface defect | ตำหนิบนพื้นผิวแม่พิมพ์', 'Mold Issue'),
('MD-007', 'Mold insert looseness | แม่พิมพ์แทรกหลวม', 'Mold Issue'),
('MD-008', 'Sprue pin stuck | สตรูปิnหลัก', 'Mold Issue'),
('MD-009', 'Mold corrosion | แม่พิมพ์ลดสภาพ', 'Mold Issue'),
('MD-010', 'Mold precision loss | สูญเสียความแม่นยำของแม่พิมพ์', 'Mold Issue'),
('MD-011', 'Mold venting issue | ปัญหาการระบายอากาศของแม่พิมพ์', 'Mold Issue'),
('MD-012', 'Parting line damage | ความเสียหายของเส้นแยกแม่พิมพ์', 'Mold Issue'),
('MD-013', 'Ejector pin damage | ความเสียหายของสตรูดีด', 'Mold Issue'),
('MD-014', 'Mold temperature uneven | อุณหภูมิแม่พิมพ์ไม่สม่ำเสมอ', 'Mold Issue'),
('MD-015', 'Mold cleaning required | ต้องทำความสะอาดแม่พิมพ์', 'Mold Issue');

-- 3. Material Issues (ปัญหาวัตถุดิบ) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MAT-001', 'Material shortage | วัตถุดิบขาดแคลน', 'Material Issue'),
('MAT-002', 'Material color mismatch | สีวัตถุดิบไม่ตรงกัน', 'Material Issue'),
('MAT-003', 'Material moisture content high | ความชื้นของวัตถุดิบสูง', 'Material Issue'),
('MAT-004', 'Material contamination | วัตถุดิบปนเปื้อน', 'Material Issue'),
('MAT-005', 'Material degradation | วัตถุดิบเสื่อมคุณภาพ', 'Material Issue'),
('MAT-006', 'Material batch defective | ล็อตวัตถุดิบมีข้อบกพร่อง', 'Material Issue'),
('MAT-007', 'Material viscosity issue | ปัญหาความหนืดของวัตถุดิบ', 'Material Issue'),
('MAT-008', 'Hopper empty | ถังเก็บว่าง', 'Material Issue'),
('MAT-009', 'Dryer malfunction | เครื่องอบแห้งเสีย', 'Material Issue'),
('MAT-010', 'Granule blockage in feeder | เม็ดพลาสติกติดในระบายวัตถุดิบ', 'Material Issue'),
('MAT-011', 'Incorrect material loaded | ใส่วัตถุดิบผิดชนิด', 'Material Issue'),
('MAT-012', 'Material mixing ratio wrong | อัตราส่วนการผสมวัตถุดิบผิด', 'Material Issue'),
('MAT-013', 'Recycled material quality poor | คุณภาพของวัตถุดิบรีไซเคิลต่ำ', 'Material Issue'),
('MAT-014', 'Material shelf life expired | วัตถุดิบหมดอายุการใช้งาน', 'Material Issue'),
('MAT-015', 'Additive mixing error | ข้อผิดพลาดในการผสมสารเติมแต่ง', 'Material Issue');

-- 4. Quality/Product Defects (ปัญหาคุณภาพ) - 20 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('QC-001', 'Flash/burrs on product | ส่วนยื่นออกมาบนผลิตภัณฑ์', 'Quality Issue'),
('QC-002', 'Short shot (incomplete fill) | ผลิตภัณฑ์ไม่เต็มแม่พิมพ์', 'Quality Issue'),
('QC-003', 'Product warping | ผลิตภัณฑ์บิดเบี้ยว', 'Quality Issue'),
('QC-004', 'Sink marks on surface | รอยหมอบบนพื้นผิว', 'Quality Issue'),
('QC-005', 'Weld line visible | เส้นเชื่อมมองเห็นได้', 'Quality Issue'),
('QC-006', 'Surface roughness issue | ปัญหาความขรุขระของพื้นผิว', 'Quality Issue'),
('QC-007', 'Color variation in batch | สีไม่สม่ำเสมอในล็อต', 'Quality Issue'),
('QC-008', 'Dimension out of tolerance | ขนาดออกนอกช่วงที่ยอมรับได้', 'Quality Issue'),
('QC-009', 'Internal void/bubble | ฟองอากาศภายในผลิตภัณฑ์', 'Quality Issue'),
('QC-010', 'Crack on product | รอยแตกบนผลิตภัณฑ์', 'Quality Issue'),
('QC-011', 'Surface mark/scratch | รอยตรงหรือรอยขูด', 'Quality Issue'),
('QC-012', 'Injection delay/slow | ความล่าช้าของการฉีด', 'Quality Issue'),
('QC-013', 'Flow line defect | ตำหนิที่เส้นไหลของวัสดุ', 'Quality Issue'),
('QC-014', 'Knit line visible | เส้นการต่อผลิตภัณฑ์มองเห็นได้', 'Quality Issue'),
('QC-015', 'Product brittleness | ผลิตภัณฑ์ดึงหลุด', 'Quality Issue'),
('QC-016', 'Black spec contamination | การปนเปื้อนของจุดดำ', 'Quality Issue'),
('QC-017', 'Product sticking to mold | ผลิตภัณฑ์ติดแม่พิมพ์', 'Quality Issue'),
('QC-018', 'Gloss difference | ความแตกต่างของความเงา', 'Quality Issue'),
('QC-019', 'Weight variance | น้ำหนักแตกต่างกัน', 'Quality Issue'),
('QC-020', 'Incomplete cooling | การหล่อเย็นไม่สมบูรณ์', 'Quality Issue');

-- 5. Setup/Changeover (ตั้งค่า/เปลี่ยนแม่พิมพ์) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('SET-001', 'Mold installation/removal | การติดตั้ง/ถอดแม่พิมพ์', 'Setup/Changeover'),
('SET-002', 'Parameter adjustment | การปรับปรุงพารามิเตอร์', 'Setup/Changeover'),
('SET-003', 'Temperature calibration | การสอบเทียมอุณหภูมิ', 'Setup/Changeover'),
('SET-004', 'Pressure setting adjustment | การปรับความดัน', 'Setup/Changeover'),
('SET-005', 'Cooling time optimization | การปรับเวลาหล่อเย็น', 'Setup/Changeover'),
('SET-006', 'Cycle time adjustment | การปรับเวลาการผลิต', 'Setup/Changeover'),
('SET-007', 'Injection speed tuning | การปรับความเร็วของการฉีด', 'Setup/Changeover'),
('SET-008', 'Material switching procedure | ขั้นตอนการเปลี่ยนวัตถุดิบ', 'Setup/Changeover'),
('SET-009', 'Purging material (color change) | การล้างวัตถุดิบ (เปลี่ยนสี)', 'Setup/Changeover'),
('SET-010', 'Nozzle temperature check | ตรวจสอบอุณหภูมิหัวฉีด', 'Setup/Changeover'),
('SET-011', 'Hopper cleaning | ทำความสะอาดถังเก็บ', 'Setup/Changeover'),
('SET-012', 'Mold orientation adjustment | การปรับทิศทางแม่พิมพ์', 'Setup/Changeover'),
('SET-013', 'Ejection force adjustment | การปรับแรงดีด', 'Setup/Changeover'),
('SET-014', 'Clamp force calibration | การปรับแรงยึด', 'Setup/Changeover'),
('SET-015', 'Production trial run | การทดลองการผลิต', 'Setup/Changeover');

-- 6. Operator/Human Errors (ข้อผิดพลาดของผู้ปฏิบัติงาน) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('OP-001', 'Operator error (wrong setting) | ข้อผิดพลาดของผู้ปฏิบัติงาน (ตั้งค่าผิด)', 'Operator Error'),
('OP-002', 'Part removal delay | ล่าช้าในการนำชิ้นส่วนออก', 'Operator Error'),
('OP-003', 'Misoperation of machine | การใช้เครื่องจักรผิดวิธี', 'Operator Error'),
('OP-004', 'Product stacking error | ข้อผิดพลาดในการเรียงผลิตภัณฑ์', 'Operator Error'),
('OP-005', 'Insufficient attention | ความสนใจไม่เพียงพอ', 'Operator Error'),
('OP-006', 'Operator absent | ผู้ปฏิบัติงานไม่อยู่', 'Operator Error'),
('OP-007', 'Supervisor intervention | การแทรกแซงของผู้บังคับบัญชา', 'Operator Error'),
('OP-008', 'Training required | จำเป็นต้องมีการฝึกอบรม', 'Operator Error'),
('OP-009', 'Manual part removal needed | จำเป็นต้องนำชิ้นส่วนออกด้วยตนเอง', 'Operator Error'),
('OP-010', 'Quality inspection delay | ล่าช้าในการตรวจสอบคุณภาพ', 'Operator Error');

-- 7. Maintenance (ซ่อมบำรุง) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MNT-001', 'Preventive maintenance | การบำรุงรักษาป้องกัน', 'Maintenance'),
('MNT-002', 'Oil change | เปลี่ยนน้ำมัน', 'Maintenance'),
('MNT-003', 'Filter replacement | เปลี่ยนตัวกรอง', 'Maintenance'),
('MNT-004', 'Lubrication | หล่อลื่น', 'Maintenance'),
('MNT-005', 'Component inspection | ตรวจสอบส่วนประกอบ', 'Maintenance'),
('MNT-006', 'Cleaning and purging | ทำความสะอาดและล้าง', 'Maintenance'),
('MNT-007', 'Scheduled equipment check | ตรวจสอบเครื่องจักรตามกำหนด', 'Maintenance'),
('MNT-008', 'Emergency repair | ซ่อมแซมฉุกเฉิน', 'Maintenance'),
('MNT-009', 'Spare part installation | การติดตั้งชิ้นส่วนสำรอง', 'Maintenance'),
('MNT-010', 'System reset/restart | รีเซ็ต/รีสตาร์ทระบบ', 'Maintenance');

-- 8. External/Environmental (ปัจจัยภายนอก) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('EXT-001', 'Power outage/blackout | ไฟฟ้าดับ', 'External Factor'),
('EXT-002', 'Water supply interruption | การขัดขวางการจัดหาน้า', 'External Factor'),
('EXT-003', 'Compressed air supply issue | ปัญหาการจัดหาอากาศอัด', 'External Factor'),
('EXT-004', 'Low ambient temperature | อุณหภูมิแวดล้อมต่ำ', 'External Factor'),
('EXT-005', 'High ambient temperature | อุณหภูมิแวดล้อมสูง', 'External Factor'),
('EXT-006', 'High humidity level | ระดับความชื้นสูง', 'External Factor'),
('EXT-007', 'Utility maintenance | การบำรุงรักษาสาธารณูปโภค', 'External Factor'),
('EXT-008', 'Factory equipment conflict | ความขัดแย้งของอุปกรณ์โรงงาน', 'External Factor'),
('EXT-009', 'Safety shutdown | การปิดเพื่อความปลอดภัย', 'External Factor'),
('EXT-010', 'Emergency evacuation | การอพยพฉุกเฉิน', 'External Factor');

-- 9. Production Planning (แผนการผลิต) - 8 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('PLAN-001', 'Production order delay | ล่าช้าในการสั่งผลิตภัณฑ์', 'Production Planning'),
('PLAN-002', 'Work order hold | การระงับคำสั่งงาน', 'Production Planning'),
('PLAN-003', 'Waiting for approval | รอการอนุมัติ', 'Production Planning'),
('PLAN-004', 'Waiting for customer sample | รอตัวอย่างจากลูกค้า', 'Production Planning'),
('PLAN-005', 'Production rescheduling | การจัดตารางการผลิตใหม่', 'Production Planning'),
('PLAN-006', 'Priority change | การเปลี่ยนลำดับความสำคัญ', 'Production Planning'),
('PLAN-007', 'Batch delay | ล่าช้าของล็อต', 'Production Planning'),
('PLAN-008', 'Waiting for inspection result | รอผลการตรวจสอบ', 'Production Planning');

-- 10. Documentation/Admin (เอกสาร/บริหาร) - 7 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('ADMIN-001', 'Paperwork/documentation | เอกสาร/การจดทะเบียน', 'Documentation/Admin'),
('ADMIN-002', 'Data recording | บันทึกข้อมูล', 'Documentation/Admin'),
('ADMIN-003', 'Report compilation | รวบรวมรายงาน', 'Documentation/Admin'),
('ADMIN-004', 'Meeting/briefing | การประชุม/ชี้แจง', 'Documentation/Admin'),
('ADMIN-005', 'Audit preparation | เตรียมการตรวจสอบ', 'Documentation/Admin'),
('ADMIN-006', 'Worker compensation claim | การเรียกร้องค่าสินไหม', 'Documentation/Admin'),
('ADMIN-007', 'Incident investigation | การสอบสวนเหตุการณ์', 'Documentation/Admin');

-- Total: 130 downtime reasons
-- Verification queries:
-- SELECT COUNT(*) as total_reasons FROM downtime_reasons;
-- SELECT category, COUNT(*) as count FROM downtime_reasons GROUP BY category ORDER BY category;

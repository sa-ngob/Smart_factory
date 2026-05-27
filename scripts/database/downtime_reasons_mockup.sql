-- Downtime Reasons Mockup for Injection Molding Factory
-- 100 reasons categorized by type

-- 1. Equipment/Machine Failures (อุปกรณ์/เครื่องจักร) - 20 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('EQ-001', 'Hydraulic pump failure', 'Equipment Failure'),
('EQ-002', 'Motor breakdown', 'Equipment Failure'),
('EQ-003', 'Heater element malfunction', 'Equipment Failure'),
('EQ-004', 'Temperature sensor error', 'Equipment Failure'),
('EQ-005', 'Pressure gauge failure', 'Equipment Failure'),
('EQ-006', 'Injection unit jam', 'Equipment Failure'),
('EQ-007', 'Screw rotation problem', 'Equipment Failure'),
('EQ-008', 'Clamp mechanism failure', 'Equipment Failure'),
('EQ-009', 'Ejection system malfunction', 'Equipment Failure'),
('EQ-010', 'Cooling water system failure', 'Equipment Failure'),
('EQ-011', 'Electric switch malfunction', 'Equipment Failure'),
('EQ-012', 'Servo valve problem', 'Equipment Failure'),
('EQ-013', 'Oil circulation system failure', 'Equipment Failure'),
('EQ-014', 'Electrical short circuit', 'Equipment Failure'),
('EQ-015', 'PLC system error', 'Equipment Failure'),
('EQ-016', 'Conveyor belt broken', 'Equipment Failure'),
('EQ-017', 'Hose rupture', 'Equipment Failure'),
('EQ-018', 'Seal leakage', 'Equipment Failure'),
('EQ-019', 'Bearing wear out', 'Equipment Failure'),
('EQ-020', 'Vibration abnormality', 'Equipment Failure');

-- 2. Mold Issues (ปัญหาแม่พิมพ์) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MD-001', 'Mold cavity clogged', 'Mold Issue'),
('MD-002', 'Mold core misalignment', 'Mold Issue'),
('MD-003', 'Mold wear and tear', 'Mold Issue'),
('MD-004', 'Mold cooling channel blocked', 'Mold Issue'),
('MD-005', 'Gate freeze/blockage', 'Mold Issue'),
('MD-006', 'Mold surface defect', 'Mold Issue'),
('MD-007', 'Mold insert looseness', 'Mold Issue'),
('MD-008', 'Sprue pin stuck', 'Mold Issue'),
('MD-009', 'Mold corrosion', 'Mold Issue'),
('MD-010', 'Mold precision loss', 'Mold Issue'),
('MD-011', 'Mold venting issue', 'Mold Issue'),
('MD-012', 'Parting line damage', 'Mold Issue'),
('MD-013', 'Ejector pin damage', 'Mold Issue'),
('MD-014', 'Mold temperature uneven', 'Mold Issue'),
('MD-015', 'Mold cleaning required', 'Mold Issue');

-- 3. Material Issues (ปัญหาวัตถุดิบ) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MAT-001', 'Material shortage', 'Material Issue'),
('MAT-002', 'Material color mismatch', 'Material Issue'),
('MAT-003', 'Material moisture content high', 'Material Issue'),
('MAT-004', 'Material contamination', 'Material Issue'),
('MAT-005', 'Material degradation', 'Material Issue'),
('MAT-006', 'Material batch defective', 'Material Issue'),
('MAT-007', 'Material viscosity issue', 'Material Issue'),
('MAT-008', 'Hopper empty', 'Material Issue'),
('MAT-009', 'Dryer malfunction', 'Material Issue'),
('MAT-010', 'Granule blockage in feeder', 'Material Issue'),
('MAT-011', 'Incorrect material loaded', 'Material Issue'),
('MAT-012', 'Material mixing ratio wrong', 'Material Issue'),
('MAT-013', 'Recycled material quality poor', 'Material Issue'),
('MAT-014', 'Material shelf life expired', 'Material Issue'),
('MAT-015', 'Additive mixing error', 'Material Issue');

-- 4. Quality/Product Defects (ปัญหาคุณภาพ) - 20 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('QC-001', 'Flash/burrs on product', 'Quality Issue'),
('QC-002', 'Short shot (incomplete fill)', 'Quality Issue'),
('QC-003', 'Product warping', 'Quality Issue'),
('QC-004', 'Sink marks on surface', 'Quality Issue'),
('QC-005', 'Weld line visible', 'Quality Issue'),
('QC-006', 'Surface roughness issue', 'Quality Issue'),
('QC-007', 'Color variation in batch', 'Quality Issue'),
('QC-008', 'Dimension out of tolerance', 'Quality Issue'),
('QC-009', 'Internal void/bubble', 'Quality Issue'),
('QC-010', 'Crack on product', 'Quality Issue'),
('QC-011', 'Surface mark/scratch', 'Quality Issue'),
('QC-012', 'Injection delay/slow', 'Quality Issue'),
('QC-013', 'Flow line defect', 'Quality Issue'),
('QC-014', 'Knit line visible', 'Quality Issue'),
('QC-015', 'Product brittleness', 'Quality Issue'),
('QC-016', 'Black spec contamination', 'Quality Issue'),
('QC-017', 'Product sticking to mold', 'Quality Issue'),
('QC-018', 'Gloss difference', 'Quality Issue'),
('QC-019', 'Weight variance', 'Quality Issue'),
('QC-020', 'Incomplete cooling', 'Quality Issue');

-- 5. Setup/Changeover (ตั้งค่า/เปลี่ยนแม่พิมพ์) - 15 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('SET-001', 'Mold installation/removal', 'Setup/Changeover'),
('SET-002', 'Parameter adjustment', 'Setup/Changeover'),
('SET-003', 'Temperature calibration', 'Setup/Changeover'),
('SET-004', 'Pressure setting adjustment', 'Setup/Changeover'),
('SET-005', 'Cooling time optimization', 'Setup/Changeover'),
('SET-006', 'Cycle time adjustment', 'Setup/Changeover'),
('SET-007', 'Injection speed tuning', 'Setup/Changeover'),
('SET-008', 'Material switching procedure', 'Setup/Changeover'),
('SET-009', 'Purging material (color change)', 'Setup/Changeover'),
('SET-010', 'Nozzle temperature check', 'Setup/Changeover'),
('SET-011', 'Hopper cleaning', 'Setup/Changeover'),
('SET-012', 'Mold orientation adjustment', 'Setup/Changeover'),
('SET-013', 'Ejection force adjustment', 'Setup/Changeover'),
('SET-014', 'Clamp force calibration', 'Setup/Changeover'),
('SET-015', 'Production trial run', 'Setup/Changeover');

-- 6. Operator/Human Errors (ข้อผิดพลาดของผู้ปฏิบัติงาน) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('OP-001', 'Operator error (wrong setting)', 'Operator Error'),
('OP-002', 'Part removal delay', 'Operator Error'),
('OP-003', 'Misoperation of machine', 'Operator Error'),
('OP-004', 'Product stacking error', 'Operator Error'),
('OP-005', 'Insufficient attention', 'Operator Error'),
('OP-006', 'Operator absent', 'Operator Error'),
('OP-007', 'Supervisor intervention', 'Operator Error'),
('OP-008', 'Training required', 'Operator Error'),
('OP-009', 'Manual part removal needed', 'Operator Error'),
('OP-010', 'Quality inspection delay', 'Operator Error');

-- 7. Maintenance (ซ่อมบำรุง) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('MNT-001', 'Preventive maintenance', 'Maintenance'),
('MNT-002', 'Oil change', 'Maintenance'),
('MNT-003', 'Filter replacement', 'Maintenance'),
('MNT-004', 'Lubrication', 'Maintenance'),
('MNT-005', 'Component inspection', 'Maintenance'),
('MNT-006', 'Cleaning and purging', 'Maintenance'),
('MNT-007', 'Scheduled equipment check', 'Maintenance'),
('MNT-008', 'Emergency repair', 'Maintenance'),
('MNT-009', 'Spare part installation', 'Maintenance'),
('MNT-010', 'System reset/restart', 'Maintenance');

-- 8. External/Environmental (ปัจจัยภายนอก) - 10 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('EXT-001', 'Power outage/blackout', 'External Factor'),
('EXT-002', 'Water supply interruption', 'External Factor'),
('EXT-003', 'Compressed air supply issue', 'External Factor'),
('EXT-004', 'Low ambient temperature', 'External Factor'),
('EXT-005', 'High ambient temperature', 'External Factor'),
('EXT-006', 'High humidity level', 'External Factor'),
('EXT-007', 'Utility maintenance', 'External Factor'),
('EXT-008', 'Factory equipment conflict', 'External Factor'),
('EXT-009', 'Safety shutdown', 'External Factor'),
('EXT-010', 'Emergency evacuation', 'External Factor');

-- 9. Production Planning (แผนการผลิต) - 8 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('PLAN-001', 'Production order delay', 'Production Planning'),
('PLAN-002', 'Work order hold', 'Production Planning'),
('PLAN-003', 'Waiting for approval', 'Production Planning'),
('PLAN-004', 'Waiting for customer sample', 'Production Planning'),
('PLAN-005', 'Production rescheduling', 'Production Planning'),
('PLAN-006', 'Priority change', 'Production Planning'),
('PLAN-007', 'Batch delay', 'Production Planning'),
('PLAN-008', 'Waiting for inspection result', 'Production Planning');

-- 10. Documentation/Admin (เอกสาร/บริหาร) - 7 items
INSERT INTO downtime_reasons (reason_code, description, category) VALUES
('ADMIN-001', 'Paperwork/documentation', 'Documentation/Admin'),
('ADMIN-002', 'Data recording', 'Documentation/Admin'),
('ADMIN-003', 'Report compilation', 'Documentation/Admin'),
('ADMIN-004', 'Meeting/briefing', 'Documentation/Admin'),
('ADMIN-005', 'Audit preparation', 'Documentation/Admin'),
('ADMIN-006', 'Worker compensation claim', 'Documentation/Admin'),
('ADMIN-007', 'Incident investigation', 'Documentation/Admin');

-- Total: 100 downtime reasons
-- Verification query (should show 100 rows):
-- SELECT COUNT(*) as total_reasons FROM downtime_reasons;
-- SELECT category, COUNT(*) as count FROM downtime_reasons GROUP BY category ORDER BY category;

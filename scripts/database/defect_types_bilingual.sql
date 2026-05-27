-- Update defect_types table to bilingual (English | Thai)
-- Truncate and recreate with bilingual descriptions
TRUNCATE TABLE defect_types;

INSERT INTO defect_types (code, name, category, description) VALUES
-- Flash/Burrs (ขอบแหลม)
('DF-001', 'Flash on product | ขอบแหลมบนผลิตภัณฑ์', 'Flash/Burrs', 'Excess material on product edges | วัสดุส่วนเกินบนขอบผลิตภัณฑ์'),
('DF-002', 'Burr marks | รอยแหลม', 'Flash/Burrs', 'Small burrs or sharp edges | แหลมเล็กหรือขอบคม'),
('DF-003', 'Parting line flash | ขอบแหลมตามแนวปลายแม่พิมพ์', 'Flash/Burrs', 'Flash along parting line | ขอบแหลมตามแนวแบ่งแม่พิมพ์'),

-- Voids/Bubbles (โพรงอากาศ)
('DF-004', 'Internal void | โพรงภายใน', 'Voids/Bubbles', 'Air pocket inside product | กระเป๋าอากาศภายในผลิตภัณฑ์'),
('DF-005', 'Surface bubble | ฟองบนพื้นผิว', 'Voids/Bubbles', 'Bubble on product surface | ฟองบนพื้นผิวผลิตภัณฑ์'),
('DF-006', 'Sink mark | รอยจุกแห้ง', 'Voids/Bubbles', 'Depression on surface | การหดตัวบนพื้นผิว'),

-- Color/Surface (สี/พื้นผิว)
('DF-007', 'Color variation | ความแตกต่างของสี', 'Color/Surface', 'Uneven color in product | สีไม่สม่ำเสมอในผลิตภัณฑ์'),
('DF-008', 'Surface scratch | รอยขูด', 'Color/Surface', 'Scratches on surface | รอยขูดบนพื้นผิว'),
('DF-009', 'Gloss difference | ความแตกต่างของความเงา', 'Color/Surface', 'Uneven surface finish | การสิ้นสุดพื้นผิวไม่สม่ำเสมอ'),
('DF-010', 'Black specks | จุดดำ', 'Color/Surface', 'Dark particles in material | อนุภาคสีเข้มในวัสดุ'),

-- Dimension (ขนาด)
('DF-011', 'Oversized | ขนาดใหญ่เกินไป', 'Dimension', 'Product larger than tolerance | ผลิตภัณฑ์ใหญ่เกินความทำรับได้'),
('DF-012', 'Undersized | ขนาดเล็กเกินไป', 'Dimension', 'Product smaller than tolerance | ผลิตภัณฑ์เล็กกว่าความทำรับได้'),
('DF-013', 'Warping | การเบี่ยว', 'Dimension', 'Product bent or warped | ผลิตภัณฑ์โค้งหรือเบี่ยง'),
('DF-014', 'Thickness variation | ความหนาไม่สม่ำเสมอ', 'Dimension', 'Inconsistent wall thickness | ความหนาของผนังไม่สม่ำเสมอ'),

-- Structural (โครงสร้าง)
('DF-015', 'Crack | รอยแตก', 'Structural', 'Product has cracks | ผลิตภัณฑ์มีรอยแตก'),
('DF-016', 'Break | การแตกหัก', 'Structural', 'Product broken or separated | ผลิตภัณฑ์แตกหักหรือแยกออก'),
('DF-017', 'Brittle | ความเปราะ', 'Structural', 'Product easily breaks | ผลิตภัณฑ์แตกเร็วง่าย'),
('DF-018', 'Weld line visible | เส้นเชื่อมเห็นได้', 'Structural', 'Visible weld line on product | เส้นเชื่อมโลหะที่มองเห็นได้บนผลิตภัณฑ์'),

-- Flow (การไหล)
('DF-019', 'Flow line | เส้นการไหล', 'Flow', 'Visible flow line pattern | เส้นการไหลที่มองเห็นได้'),
('DF-020', 'Knit line | เส้นรอยเชื่อม', 'Flow', 'Mark where material flows merge | เครื่องหมายที่วัสดุไหลมารวม'),
('DF-021', 'Short shot | การเติมไม่สมบูรณ์', 'Flow', 'Incomplete fill of mold cavity | การเติมโพรงแม่พิมพ์ไม่สมบูรณ์'),
('DF-022', 'Injection delay | ความล่าช้าของการฉีด', 'Flow', 'Slow material injection | การฉีดวัสดุช้า'),

-- Gate/Runner (ระบบอาหาร)
('DF-023', 'Gate mark | รอยประตูเข้า', 'Gate/Runner', 'Visible mark from gate | รอยที่มองเห็นได้จากประตูเข้า'),
('DF-024', 'Gate freeze | การแข็งที่ประตูเข้า', 'Gate/Runner', 'Material freezes at gate | วัสดุแข็งตัวที่ประตูเข้า'),
('DF-025', 'Runner residue | เศษจากรันเนอร์', 'Gate/Runner', 'Residue from runner system | เศษจากระบบทางส่งวัสดุ'),

-- Sticking (การติด)
('DF-026', 'Sticking to mold | การติดกับแม่พิมพ์', 'Sticking', 'Product stuck in mold | ผลิตภัณฑ์ติดในแม่พิมพ์'),
('DF-027', 'Difficult ejection | การดันออกยาก', 'Sticking', 'Hard to eject from mold | ยากต่อการดันออกจากแม่พิมพ์'),

-- Others (อื่นๆ)
('DF-028', 'Incomplete cooling | การหล่อเย็นไม่สมบูรณ์', 'Others', 'Product not fully cooled | ผลิตภัณฑ์ไม่เย็นสมบูรณ์'),
('DF-029', 'Over-packing | การบรรจุมากเกินไป', 'Others', 'Excessive material in cavity | วัสดุมากเกินไปในโพรงแม่พิมพ์'),
('DF-030', 'Under-packing | การบรรจุน้อยเกินไป', 'Others', 'Insufficient material in cavity | วัสดุไม่เพียงพอในโพรงแม่พิมพ์'),
('DF-031', 'Degradation | การเสื่อมสภาพ', 'Others', 'Material degraded | วัสดุเสื่อมสภาพ'),
('DF-032', 'Contamination | การปนเปื้อน', 'Others', 'Foreign material in product | วัสดุแปลกปลอมในผลิตภัณฑ์'),
('DF-033', 'Mold damage | ความเสียหายของแม่พิมพ์', 'Others', 'Product shows mold damage | ผลิตภัณฑ์แสดงความเสียหายของแม่พิมพ์'),
('DF-034', 'Assembly issue | ปัญหาการประกอบ', 'Others', 'Issue with product assembly | ปัญหาในการประกอบผลิตภัณฑ์'),
('DF-035', 'Dimensional shift | การเปลี่ยนแปลงขนาด', 'Others', 'Dimension shift during production | ขนาดเปลี่ยนแปลงระหว่างการผลิต'),
('DF-036', 'Ejector mark | รอยตัวดันออก', 'Others', 'Mark from ejector pin | รอยจากหมุดตัวดันออก'),
('DF-037', 'Vacuum void | โพรงจากสูญญากาศ', 'Others', 'Void from insufficient vacuum | โพรงจากสูญญากาศไม่เพียงพอ'),
('DF-038', 'Silver streak | เส้นเงิน', 'Others', 'Silver streaks on surface | เส้นสีเงินบนพื้นผิว'),
('DF-039', 'Fiber breakage | การหักของเส้นใยย', 'Others', 'Broken fibers in material | เส้นใยหักในวัสดุ'),
('DF-040', 'Jetting | เส้นพ่วงการฉีด', 'Others', 'Jetting pattern visible | ลวดลายการฉีดมองเห็นได้'),
('DF-041', 'Scalloping | ขอบคลื่น', 'Others', 'Scalloped edge pattern | ลวดลายขอบเหมือนเปลือกหอย'),
('DF-042', 'Waviness | ความคลื่น', 'Others', 'Wavy surface pattern | ลวดลายพื้นผิวคลื่น'),
('DF-043', 'Distortion | การบิดเบี่ยว', 'Others', 'Product shape distortion | การบิดเบี่ยวรูปร่างผลิตภัณฑ์'),
('DF-044', 'Swelling | การพองตัว', 'Others', 'Product swelling | ผลิตภัณฑ์พองตัว'),
('DF-045', 'Splitting | การแยกตัว', 'Others', 'Product splitting or peeling | ผลิตภัณฑ์แยกตัวหรือลอก'),
('DF-046', 'Blistering | การเกิดฟอง', 'Others', 'Blisters on surface | ฟองบนพื้นผิว'),
('DF-047', 'Staining | การติดสี', 'Others', 'Stains on product | คราบสีบนผลิตภัณฑ์'),
('DF-048', 'Odor issue | ปัญหากลิ่น', 'Others', 'Abnormal odor from product | กลิ่นผิดปกติจากผลิตภัณฑ์'),
('DF-049', 'Delamination | การแยกชั้น', 'Others', 'Layers separating | ชั้นแยกออกจากกัน'),
('DF-050', 'Incomplete product | ผลิตภัณฑ์ที่ไม่สมบูรณ์', 'Others', 'Missing part of product | ส่วนที่หายไปของผลิตภัณฑ์');

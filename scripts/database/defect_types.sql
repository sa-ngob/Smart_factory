-- Create defect_types table with 50 defect codes for injection molding
CREATE TABLE IF NOT EXISTS defect_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT
);

-- Insert 50 defect types for plastic injection molding
INSERT INTO defect_types (code, name, category, description) VALUES
-- Flash/Burrs (ขอบแหลม)
('DF-001', 'Flash on product', 'Flash/Burrs', 'Excess material on product edges'),
('DF-002', 'Burr marks', 'Flash/Burrs', 'Small burrs or sharp edges'),
('DF-003', 'Parting line flash', 'Flash/Burrs', 'Flash along parting line'),

-- Voids/Bubbles (โพรงอากาศ)
('DF-004', 'Internal void', 'Voids/Bubbles', 'Air pocket inside product'),
('DF-005', 'Surface bubble', 'Voids/Bubbles', 'Bubble on product surface'),
('DF-006', 'Sink mark', 'Voids/Bubbles', 'Depression on surface'),

-- Color/Surface (สี/พื้นผิว)
('DF-007', 'Color variation', 'Color/Surface', 'Uneven color in product'),
('DF-008', 'Surface scratch', 'Color/Surface', 'Scratches on surface'),
('DF-009', 'Gloss difference', 'Color/Surface', 'Uneven surface finish'),
('DF-010', 'Black specks', 'Color/Surface', 'Dark particles in material'),

-- Dimension (ขนาด)
('DF-011', 'Oversized', 'Dimension', 'Product larger than tolerance'),
('DF-012', 'Undersized', 'Dimension', 'Product smaller than tolerance'),
('DF-013', 'Warping', 'Dimension', 'Product bent or warped'),
('DF-014', 'Thickness variation', 'Dimension', 'Inconsistent wall thickness'),

-- Structural (โครงสร้าง)
('DF-015', 'Crack', 'Structural', 'Product has cracks'),
('DF-016', 'Break', 'Structural', 'Product broken or separated'),
('DF-017', 'Brittle', 'Structural', 'Product easily breaks'),
('DF-018', 'Weld line visible', 'Structural', 'Visible weld line on product'),

-- Flow (การไหล)
('DF-019', 'Flow line', 'Flow', 'Visible flow line pattern'),
('DF-020', 'Knit line', 'Flow', 'Mark where material flows merge'),
('DF-021', 'Short shot', 'Flow', 'Incomplete fill of mold cavity'),
('DF-022', 'Injection delay', 'Flow', 'Slow material injection'),

-- Gate/Runner (ระบบอาหาร)
('DF-023', 'Gate mark', 'Gate/Runner', 'Visible mark from gate'),
('DF-024', 'Gate freeze', 'Gate/Runner', 'Material freezes at gate'),
('DF-025', 'Runner residue', 'Gate/Runner', 'Residue from runner system'),

-- Sticking (การติด)
('DF-026', 'Sticking to mold', 'Sticking', 'Product stuck in mold'),
('DF-027', 'Difficult ejection', 'Sticking', 'Hard to eject from mold'),

-- Others (อื่นๆ)
('DF-028', 'Incomplete cooling', 'Others', 'Product not fully cooled'),
('DF-029', 'Over-packing', 'Others', 'Excessive material in cavity'),
('DF-030', 'Under-packing', 'Others', 'Insufficient material in cavity'),
('DF-031', 'Degradation', 'Others', 'Material degraded'),
('DF-032', 'Contamination', 'Others', 'Foreign material in product'),
('DF-033', 'Mold damage', 'Others', 'Product shows mold damage'),
('DF-034', 'Assembly issue', 'Others', 'Issue with product assembly'),
('DF-035', 'Dimensional shift', 'Others', 'Dimension shift during production'),
('DF-036', 'Ejector mark', 'Others', 'Mark from ejector pin'),
('DF-037', 'Vacuum void', 'Others', 'Void from insufficient vacuum'),
('DF-038', 'Silver streak', 'Others', 'Silver streaks on surface'),
('DF-039', 'Fiber breakage', 'Others', 'Broken fibers in material'),
('DF-040', 'Jetting', 'Others', 'Jetting pattern visible'),
('DF-041', 'Scalloping', 'Others', 'Scalloped edge pattern'),
('DF-042', 'Waviness', 'Others', 'Wavy surface pattern'),
('DF-043', 'Distortion', 'Others', 'Product shape distortion'),
('DF-044', 'Swelling', 'Others', 'Product swelling'),
('DF-045', 'Splitting', 'Others', 'Product splitting or peeling'),
('DF-046', 'Blistering', 'Others', 'Blisters on surface'),
('DF-047', 'Staining', 'Others', 'Stains on product'),
('DF-048', 'Odor issue', 'Others', 'Abnormal odor from product'),
('DF-049', 'Delamination', 'Others', 'Layers separating'),
('DF-050', 'Incomplete product', 'Others', 'Missing part of product')
ON CONFLICT (code) DO NOTHING;

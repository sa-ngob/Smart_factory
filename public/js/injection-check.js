document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadUserInfo();
        if (typeof loadSidebar === 'function') await loadSidebar(); // Load global sidebar
        await loadMachines();
        setupGlobalOCR();
        setupSave();
    } catch (e) {
        console.error("Initialization error:", e);
        // alert("Failed to initialize page: " + e.message);
    }
});

async function loadMachines() {
    try {
        const res = await fetchWithAuth('/api/machines');
        if (!res.ok) throw new Error('Failed to fetch machines');

        const json = await res.json();
        const machines = Array.isArray(json) ? json : (json.data || []);

        const select = document.getElementById('machine-select');
        select.innerHTML = '<option value="">-- Select Machine --</option>';

        machines.forEach(m => {
            // Show machine code + name
            select.innerHTML += `<option value="${m.id}">${m.machine_code} - ${m.machine_name}</option>`;
        });

        select.addEventListener('change', loadRunningMO);
    } catch (e) {
        console.error(e);
        // alert('Failed to load machines: ' + e.message);
    }
}

async function loadRunningMO() {
    const machineId = document.getElementById('machine-select').value;
    const moSelect = document.getElementById('mo-select');

    if (!machineId) {
        moSelect.disabled = true;
        moSelect.innerHTML = '<option value="">-- Select Machine First --</option>';
        return;
    }

    try {
        // Attempt to fetch MOs. 
        // If API fails or backend table missing, handle gracefully.
        const res = await fetchWithAuth(`/api/manufacturing-orders`);

        let activeMos = [];
        if (res.ok) {
            const json = await res.json();
            const allMos = Array.isArray(json) ? json : (json.data || []);
            // Filter: pending/in_progress. 
            // Ideally filter by machine_id if available in MO data.
            activeMos = allMos.filter(mo =>
                (mo.status === 'pending' || mo.status === 'in_progress')
            );
        } else {
            console.warn("Could not load MOs");
        }

        moSelect.innerHTML = '<option value="">-- Select MO (Optional) --</option>';
        moSelect.disabled = false;

        if (activeMos.length > 0) {
            activeMos.forEach(mo => {
                moSelect.innerHTML += `<option value="${mo.mo_number}">${mo.mo_number} (${mo.item_code})</option>`;
            });
        } else {
            moSelect.innerHTML += `<option value="" disabled>No Active MO Found</option>`;
            // Allow manual MO entry? For now just keep it optional logic
            moSelect.innerHTML += `<option value="MANUAL">Manual / No MO</option>`;
        }
    } catch (e) {
        console.error("Error loading MOs:", e);
        moSelect.disabled = false;
        moSelect.innerHTML = '<option value="N/A">Not Available (Network Error)</option>';
    }
}

// ---------------------------------------------------------
// Global OCR Logic with Cropper (ROI)
// ---------------------------------------------------------

let currentCropper = null;
const cropModalEl = document.getElementById('crop-modal');
// Initialize Bootstrap modal if available, safely
let cropModal;
if (window.bootstrap && cropModalEl) {
    cropModal = new bootstrap.Modal(cropModalEl, { keyboard: false });
}

function setupGlobalOCR() {
    const btnd = document.getElementById('btn-scan-global');
    const btnm = document.getElementById('btn-scan-mobile');
    const input = document.getElementById('file-global-ocr');

    const trigger = () => input.click();

    if (btnd) btnd.addEventListener('click', trigger);
    if (btnm) btnm.addEventListener('click', trigger);

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Reset value so same file can be selected again if needed
            e.target.value = '';
            openCropModal(file);
        }
    });

    setupCropperEvents();
}

function openCropModal(file) {
    const reader = new FileReader();
    const image = document.getElementById('crop-image');

    reader.onload = (e) => {
        image.src = e.target.result;

        // Show Modal
        if (!cropModal) cropModal = new bootstrap.Modal(document.getElementById('crop-modal'));
        cropModal.show();

        // Destroy previous cropper if exists
        if (currentCropper) {
            currentCropper.destroy();
        }

        // Initialize Cropper when modal is fully shown
        // We use a small timeout or event listener to ensure image is visible
        const onShown = () => {
            currentCropper = new Cropper(image, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
            cropModalEl.removeEventListener('shown.bs.modal', onShown);
        };
        cropModalEl.addEventListener('shown.bs.modal', onShown);
    };
    reader.readAsDataURL(file);
}

function setupCropperEvents() {
    // Toolbar buttons
    document.getElementById('btn-rotate-left').addEventListener('click', () => {
        if (currentCropper) currentCropper.rotate(-90);
    });
    document.getElementById('btn-rotate-right').addEventListener('click', () => {
        if (currentCropper) currentCropper.rotate(90);
    });

    // Confirm Crop
    document.getElementById('btn-confirm-crop').addEventListener('click', () => {
        if (currentCropper) {
            const canvas = currentCropper.getCroppedCanvas({
                // limit max size to reasonable OCR resolution
                maxWidth: 2048,
                maxHeight: 2048,
                fillColor: '#fff',
            });

            canvas.toBlob(async (blob) => {
                if (blob) {
                    cropModal.hide();
                    await processFullPageOCR(blob);
                }
            }, 'image/jpeg', 0.9);
        }
    });
}

async function processFullPageOCR(fileOrBlob) {
    const overlay = document.getElementById('ocr-overlay');
    const statusText = document.getElementById('ocr-status-text');

    try {
        overlay.style.display = 'flex';
        statusText.innerText = 'Initializing OCR Engine...';

        const worker = await Tesseract.createWorker('eng');

        statusText.innerText = 'Recognizing Text...';
        const { data: { text } } = await worker.recognize(fileOrBlob);

        console.log("OCR Raw Text:\n", text);

        statusText.innerText = 'Parsing Data...';
        parseAndFillData(text);

        await worker.terminate();
        overlay.style.display = 'none';
        alert('Data extracted! Please verify the values.');

    } catch (e) {
        console.error(e);
        overlay.style.display = 'none';
        alert('OCR Failed: ' + e.message);
    }
}

// ---------------------------------------------------------
// Smart AI-Heuristic Data Parser
// ---------------------------------------------------------

function parseAndFillData(text) {
    // Pre-processing: Clean up common OCR artifacts
    // 1. Unify typos
    let cleanText = text
        .replace(/\|/g, '') // Remove vertical bars often read from tables
        .replace(/Pls/gi, 'Prs') // Common typo for Pressure
        .replace(/Pis/gi, 'Prs')
        .replace(/Sinc/gi, 'Suck') // User mentioned Sinc
        .replace(/EndFos/gi, 'EndPos')
        .replace(/M0ld/gi, 'Mold')
        .replace(/Bd/gi, 'Bd'); // Ensure Case

    const lines = cleanText.split(/\r?\n+\s*/).map(l => l.trim()).filter(l => l.length > 0);

    // Schema Definition
    // We define what we expect for each section
    const SECTIONS = {
        MOLD_CLOSE: { keys: ['MOLD', 'CLOSE'], count: 15, rows: 5, cols: 3, prefix: 'mold_close', map: ['prs', 'spd', 'pos'] },
        MOLD_OPEN: { keys: ['OPEN', 'NOT:MOLD'], count: 15, rows: 5, cols: 3, prefix: 'mold_open', map: ['prs', 'spd', 'pos'] },
        INJECT: { keys: ['INJECT'], count: 19, prefix: 'inj', special: true },
        EJECT: { keys: ['EJECT'], count: 16, prefix: 'ej', special: true },
        CHARGE: { keys: ['CHARGE'], count: 15, prefix: 'chg', special: true },
        HOLD: { keys: ['HOLD'], count: 16, prefix: 'hold', special: true },
        TEMP: { keys: ['TEMP', 'SET'], count: 5, prefix: 'temp_set' }
    };

    let currentSection = null;
    let numberBuffer = [];

    // Helper to process the buffer when switching sections
    const flushBuffer = (sectionName) => {
        if (!sectionName || numberBuffer.length === 0) return;
        console.log(`Flushing ${sectionName}: Found ${numberBuffer.length} numbers:`, numberBuffer);
        applyDataToSection(sectionName, numberBuffer, SECTIONS[sectionName]);
        numberBuffer = [];
    };

    // --- Pass 1: Linear Scan to identify sections and accumulate numbers ---

    // Simple heuristic: If we find a strong header keyword, switch section.
    // If we find numbers, add to current section buffer.

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect Section
        let detected = null;

        // Specialized detection logic
        if ((upper.includes('MOLD') && upper.includes('CLOSE')) || (upper.includes('CLOSE') && upper.includes('PRS'))) detected = 'MOLD_CLOSE';
        else if (upper.includes('OPEN') && upper.includes('PRS')) detected = 'MOLD_OPEN';
        else if (upper.includes('INJECT') && !upper.includes('TIME')) detected = 'INJECT';
        else if (upper.includes('HOLD') && !upper.includes('COOL')) detected = 'HOLD';
        else if (upper.includes('EJECT')) detected = 'EJECT';
        else if (upper.includes('CHARGE')) detected = 'CHARGE';
        else if (upper.includes('TEMP SET') || (upper.includes('TEMP') && numberBuffer.length === 0 && getNums(line).some(n => n > 150))) detected = 'TEMP';

        if (detected) {
            if (currentSection !== detected) {
                flushBuffer(currentSection);
                currentSection = detected;
                console.log(`>>> Detected Section: ${detected} (Line: ${line})`);
            }
            const nums = getNums(line);
            if (nums.length > 0) {
                if (detected === 'TEMP') {
                    nums.forEach(n => numberBuffer.push(n));
                }
            }
            continue;
        }

        // If we are in a section, extract numbers
        if (currentSection) {
            const nums = getNums(line);
            nums.forEach(n => numberBuffer.push(n));
        }
    }

    // Flush last section
    flushBuffer(currentSection);
}

function applyDataToSection(type, nums, config) {
    if (!config) return;

    // --- MOLD CLOSE ---
    // 5 Rows (1..3, Low, High) x 3 Cols (Prs, Spd, Pos)
    if (type === 'MOLD_CLOSE') {
        fillGrid(nums, 5, 3, ['1', '2', '3', 'low', 'high'], ['prs', 'spd', 'pos'], 'mold_close');
    }

    // --- MOLD OPEN ---
    // 5 Rows (1..5) x 3 Cols (Prs, Spd, Pos)
    else if (type === 'MOLD_OPEN') {
        fillGrid(nums, 5, 3, ['1', '2', '3', '4', '5'], ['prs', 'spd', 'pos'], 'mold_open');
    }

    // --- INJECT ---
    // 6 Rows (1..6) x 3 Cols (Prs, Spd, Pos) + Inject Time
    else if (type === 'INJECT') {
        // We usually expect 19 numbers. The last one is likely Inject Time.
        // Grid: 6x3 = 18.
        const gridNums = nums.slice(0, 18);
        fillGrid(gridNums, 6, 3, ['1', '2', '3', '4', '5', '6'], ['prs', 'spd', 'pos'], 'inj');

        // Remaining?
        if (nums.length > 18) {
            setVal('inj_time', nums[nums.length - 1]); // Assume last found is time
        }
    }

    // --- HOLD ---
    // 5 Rows (1..5) x 3 Cols (Prs, Spd, Time) + Cool Time
    else if (type === 'HOLD') {
        const gridNums = nums.slice(0, 15);
        fillGrid(gridNums, 5, 3, ['1', '2', '3', '4', '5'], ['prs', 'spd', 'time'], 'hold');
        if (nums.length > 15) {
            setVal('mold_cool_time', nums[nums.length - 1]);
        }
    }

    // --- EJECT ---
    // 4 Rows (Adv1, Adv2, Ret1, Ret2) x 4 Cols (Prs, Spd, Time, Pos)
    else if (type === 'EJECT') {
        const rows = ['adv_1', 'adv_2', 'ret_1', 'ret_2'];
        // Note: Sometimes Time is missing in UI (disabled). 
        // If we have significantly fewer numbers, we might need a smarter fill.
        // Assuming full 16 numbers for now.
        fillGrid(nums, 4, 4, rows, ['prs', 'spd', 'time', 'pos'], 'ej');
    }

    // --- CHARGE ---
    // 3 Rows (1..3) x 4 Cols (Prs, Spd, Back, Pos)
    // + Suck Row (Prs, Spd, Dist) -> 3 cols? image said Prs Spd Time/Dist. 
    else if (type === 'CHARGE') {
        // First 12 numbers -> Charge 1-3
        const chargeNums = nums.slice(0, 12);
        fillGrid(chargeNums, 3, 4, ['1', '2', '3'], ['prs', 'spd', 'back', 'pos'], 'chg');

        // Remaining -> Suck
        const remaining = nums.slice(12);
        if (remaining.length > 0) setVal('suck_prs', remaining[0]);
        if (remaining.length > 1) setVal('suck_spd', remaining[1]);
        if (remaining.length > 2) setVal('suck_dist', remaining[2]);
    }

    // --- TEMP ---
    else if (type === 'TEMP') {
        // Just fill sequential
        nums.slice(0, 5).forEach((n, i) => {
            setVal(`temp_set_${i + 1}`, n);
        });
    }
}

// Targeted Grid Filler
function fillGrid(numbers, rowCount, colCount, rowSuffixes, colSuffixes, prefix) {
    let idx = 0;
    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
            if (idx >= numbers.length) return;

            const val = numbers[idx];
            const name = `${prefix}_${rowSuffixes[r]}_${colSuffixes[c]}`;

            // Try setting. Note: Some fields might not exist (e.g. Adv2 Time might be disabled/hidden)
            // setVal checks existence.
            setVal(name, val);

            idx++;
        }
    }
}

function getNums(str) {
    // Robust number extraction:
    // Matches: 123, 12.34, -12.34, .5
    // Ignores tokens that are mixed alpha-numeric like "V1" unless separated
    const matches = str.match(/(?<!\w)-?\d+(\.\d+)?(?!\w)/g);
    // Simplified regex if lookbehind not supported in all browsers (safari old):
    // const matches = str.match(/-?\d+(\.\d+)?/g);
    return matches ? matches.map(Number) : [];
}

function setVal(name, val) {
    const inp = document.querySelector(`input[name="${name}"]`);
    if (inp && !inp.disabled && !inp.readOnly) {
        inp.value = val;
        // Visual feedback
        inp.style.backgroundColor = '#064e3b'; // Dark green flash
        setTimeout(() => inp.style.backgroundColor = '', 1000);
    }
}

// ---------------------------------------------------------
// Save Logic
// ---------------------------------------------------------

function setupSave() {
    const handleSave = async () => {
        const machine_id = document.getElementById('machine-select').value;
        const mo_number = document.getElementById('mo-select').value;
        const notes = document.getElementById('check-notes').value;

        if (!machine_id) {
            alert('Please select a machine first.');
            document.getElementById('machine-select').focus();
            return;
        }

        // Collect all inputs
        const data = {};
        let count = 0;
        document.querySelectorAll('input').forEach(inp => {
            if (inp.name) {
                data[inp.name] = inp.value;
                if (inp.value) count++;
            }
        });

        if (count === 0 && !notes) {
            if (!confirm("Warning: No parameters filled. Save anyway?")) return;
        }

        const payload = {
            machine_id,
            mo_number: mo_number || 'N/A',
            data,
            images: [],
            notes
        };

        console.log("Saving payload:", payload);

        try {
            const res = await fetchWithAuth('/api/injection-parameters/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                alert('Success: Data saved successfully!');
            } else {
                alert('Error saving data: ' + JSON.stringify(json.error));
            }
        } catch (e) {
            alert('Network error: ' + e.message);
            console.error(e);
        }
    };

    const btnDesktop = document.getElementById('btn-save-all-desktop');
    const btnMobile = document.getElementById('btn-save-all-mobile');

    if (btnDesktop) btnDesktop.addEventListener('click', handleSave);
    if (btnMobile) btnMobile.addEventListener('click', handleSave);
}

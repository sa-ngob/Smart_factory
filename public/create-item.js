document.addEventListener('DOMContentLoaded', function() {
    // --- อ้างอิงถึง Element ที่จำเป็นบนหน้าเว็บ ---
    const form = document.getElementById('item-form');
    if (!form) {
        console.error('Error: ไม่พบฟอร์ม <form id="item-form">');
        return;
    }

    const itemTypeSelect = form.elements['item_type'];
    const itemCodeInput = form.elements['item_code'];
    const companyLabel = document.getElementById('company-label');
    const companySelect = form.elements['customer_id']; // Dropdown นี้จะถูกใช้ซ้ำ
    
    // กลุ่มฟิลด์ที่จะซ่อน/แสดง
    const modelGroup = document.getElementById('model-group');
    const techSpecsGroup = document.getElementById('tech-specs-group');

    // --- ฟังก์ชันสำหรับโหลดข้อมูลบริษัท (ลูกค้า หรือ ผู้ขาย) ---
    async function loadCompanies(type) {
        // ซ่อน Dropdown และเปลี่ยน Label ชั่วคราวจนกว่าจะโหลดเสร็จ
        companyLabel.parentElement.style.display = 'none';
        companyLabel.textContent = 'กำลังโหลด...';

        try {
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth(`/api/entities?type=${type}`);
            if (!response.ok) throw new Error(`Failed to load ${type}`);
            const result = await response.json();
            
            companySelect.innerHTML = `<option value="">-- ไม่มี --</option>`; // ล้างข้อมูลเก่า
            result.data.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.name;
                companySelect.appendChild(option);
            });

            // แสดง Dropdown และตั้งชื่อ Label ให้ถูกต้อง
            companyLabel.textContent = type === 'customer' ? 'ลูกค้า' : 'ผู้ขาย';
            companyLabel.parentElement.style.display = 'block';

        } catch (error) {
            console.error(error);
        }
    }

    // --- ฟังก์ชันสำหรับปรับเปลี่ยนฟอร์มตามประเภทสินค้า ---
    function updateFormVisibility(selectedType) {
        // 1. ซ่อนทุกกลุ่มฟิลด์ที่ไม่จำเป็นก่อน
        modelGroup.style.display = 'none';
        techSpecsGroup.style.display = 'none';
        companyLabel.parentElement.style.display = 'none';

        // 2. แสดงกลุ่มฟิลด์ตามประเภทที่เลือก
        switch (selectedType) {
            case 'finished_good':
            case 'semi_good':
                modelGroup.style.display = 'block';
                techSpecsGroup.style.display = 'block';
                loadCompanies('customer'); // สินค้าสำเร็จรูปจะผูกกับ "ลูกค้า"
                break;
            case 'raw_material':
                // วัตถุดิบจะไม่มี Model, น้ำหนัก, Cycle Time
                loadCompanies('vendor'); // วัตถุดิบจะผูกกับ "ผู้ขาย"
                break;
            case 'consumable':
                // วัสดุสิ้นเปลืองอาจจะไม่ต้องผูกกับใคร
                break;
        }
    }

    // --- ฟังก์ชันสร้างรหัสสินค้าอัตโนมัติ ---
    async function generateItemCode() {
        const selectedType = itemTypeSelect.value;
        if (!selectedType) {
            itemCodeInput.value = '';
            itemCodeInput.placeholder = 'เลือกประเภทก่อน';
            return;
        }
        try {
            itemCodeInput.placeholder = 'กำลังสร้างรหัส...';
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth(`/api/items/next-code?type=${selectedType}`);
            if (!response.ok) throw new Error('Failed to generate code');
            const result = await response.json();
            itemCodeInput.value = result.item_code;
        } catch (error) {
            console.error('Error generating item code:', error);
            itemCodeInput.value = 'Error!';
        }
    }

    // --- Event Listener หลัก: เมื่อมีการเปลี่ยนประเภทสินค้า ---
    itemTypeSelect.addEventListener('change', () => {
        const selectedValue = itemTypeSelect.value;
        generateItemCode();
        updateFormVisibility(selectedValue);
    });

    // --- จัดการการ Submit ฟอร์ม ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth('/api/items', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save data');
            }
            alert('บันทึกข้อมูลสินค้าสำเร็จ!');
            window.location.href = '/items.html';
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- เริ่มต้นการทำงาน: ซ่อนฟิลด์ที่ไม่จำเป็นทั้งหมดในตอนแรก ---
    updateFormVisibility('');
});

document.addEventListener('DOMContentLoaded', function() {
    // === เพิ่มโค้ดส่วนนี้เข้าไป ===
        fetch('/sidebar.html')
            .then(res => res.text())
            .then(data => {
                document.getElementById('sidebar').innerHTML = data;
                
                // --- จุดสำคัญ: กำหนดให้เมนูของหน้านี้เป็น Active ---
                // ค้นหาลิงก์ที่ตรงกับหน้านี้ (เช่น /items.html)
                const currentLink = document.querySelector('a.nav-link[href="/items.html"]');
                if (currentLink) {
                    // เพิ่ม class 'active' ให้กับ li ที่เป็น parent ของลิงก์นั้น
                    currentLink.parentElement.classList.add('active');
                }
            });
        // === สิ้นสุดส่วนที่เพิ่ม ===
    const form = document.getElementById('customer-form');
    const tableBody = document.getElementById('customer-table-body');
    const entityIdInput = document.getElementById('entity-id');
    const btnClear = document.getElementById('btn-clear');
    const taxIdInput = document.getElementById('tax-id');

    const ENTITY_TYPE = 'customer';

    async function loadEntities() {
        if (!tableBody) {
            console.error('Error: Could not find the table body element (customer-table-body).');
            return;
        }
        try {
            const response = await fetch(`/api/entities?type=${ENTITY_TYPE}`);
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }
            const result = await response.json();
            tableBody.innerHTML = '';

            result.data.forEach(entity => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entity.name}</td>
                    <td>${entity.contact_person || ''}</td>
                    <td>${entity.phone || ''}</td>
                    <td class="text-end">
                        <div class="btn-list flex-nowrap">
                            <a href="#" class="btn btn-sm btn-edit" data-id="${entity.id}">แก้ไข</a>
                            <a href="#" class="btn btn-sm btn-danger btn-delete" data-id="${entity.id}">ลบ</a>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
                row.querySelector('.btn-edit').dataset.entity = JSON.stringify(entity);
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.role_name = ENTITY_TYPE;
            const entityId = entityIdInput.value;

            const url = entityId ? `/api/entities/${entityId}` : '/api/entities';
            const method = entityId ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('บันทึกข้อมูลสำเร็จ!');
                    form.reset();
                    if(entityIdInput) entityIdInput.value = '';
                    
                    // === จุดสำคัญที่แก้ไข: เรียกใช้ฟังก์ชันนี้เพื่อโหลดข้อมูลใหม่ ===
                    loadEntities();
                    // =======================================================

                } else {
                    const errorResult = await response.json();
                    const errorMessage = errorResult.error.includes('UNIQUE constraint failed') 
                        ? 'เลขประจำตัวผู้เสียภาษีนี้มีในระบบแล้ว' 
                        : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Failed to save data:', error);
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        });
    }

    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-edit')) {
                e.preventDefault();
                const entityData = JSON.parse(e.target.dataset.entity);
                Object.keys(entityData).forEach(key => {
                    const input = form.elements[key];
                    if (input) input.value = entityData[key];
                });
                if(entityIdInput) entityIdInput.value = entityData.id;
                window.scrollTo(0, 0);
            }

            if (e.target.classList.contains('btn-delete')) {
                e.preventDefault();
                if (confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
                    const entityId = e.target.dataset.id;
                    fetch(`/api/entities/${entityId}`, { method: 'DELETE' })
                        .then(response => {
                            if (response.ok) loadEntities();
                            else alert('เกิดข้อผิดพลาดในการลบ');
                        });
                }
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if(form) form.reset();
            if(entityIdInput) entityIdInput.value = '';
        });
    }

    if (taxIdInput) {
        taxIdInput.addEventListener('blur', async function() {
            const taxId = this.value.trim();
            if (taxId.length >= 13) {
                try {
                    const response = await fetch(`/api/entities/taxinfo/${taxId}`);
                    if (!response.ok) {
                        throw new Error('ไม่พบข้อมูลเลขผู้เสียภาษี');
                    }
                    const data = await response.json();
                    document.getElementById('name').value = data.name;
                    document.getElementById('address').value = data.address;
                    document.getElementById('branch-code').value = data.branch_code;
                    document.getElementById('branch-name').value = data.branch_name;
                } catch (error) {
                    console.warn(error.message);
                }
            }
        });
    }

    loadEntities();
});

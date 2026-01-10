document.addEventListener('DOMContentLoaded', function() {
    // โหลด Sidebar เข้ามาในหน้า
    fetch('/sidebar.html')
        .then(res => res.text())
        .then(data => {
            const sidebarContainer = document.getElementById('sidebar');
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;

                // --- จุดสำคัญ: กำหนดให้เมนูของหน้านี้เป็น Active (แก้ไขให้ตรงกับหน้าปัจจุบัน) ---
                const currentLink = document.querySelector('a.nav-link[href="/vendors.html"]');
                if (currentLink) {
                    currentLink.parentElement.classList.add('active');
                }
            }
        });

    const form = document.getElementById('vendor-form');
    const tableBody = document.getElementById('vendor-table-body');
    const entityIdInput = document.getElementById('entity-id');
    const btnClear = document.getElementById('btn-clear');
    const taxIdInput = document.getElementById('tax-id'); // ประกาศไว้แต่ยังไม่ได้ใช้ สามารถเพิ่ม event listener ที่นี่ได้ในอนาคต

    const ENTITY_TYPE = 'vendor';

    // ฟังก์ชันสำหรับโหลดข้อมูลผู้ขายทั้งหมด
    async function loadEntities() {
        if (!tableBody) {
            console.error('Error: Could not find the table body element (vendor-table-body).');
            return;
        }
        try {
            const response = await fetch(`/api/entities?type=${ENTITY_TYPE}`);
            if (!response.ok) {
                // หาก session หมดอายุหรือไม่มีสิทธิ์ ให้ไปหน้า login
                window.location.href = '/login.html';
                return;
            }
            const result = await response.json();
            tableBody.innerHTML = ''; // เคลียร์ข้อมูลเก่าในตาราง

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
                // เก็บข้อมูลทั้งหมดของ entity ไว้ใน dataset เพื่อใช้ตอนแก้ไข
                row.querySelector('.btn-edit').dataset.entity = JSON.stringify(entity);
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    // Event listener สำหรับการ submit ฟอร์ม (เพิ่ม/แก้ไข)
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
                    loadEntities(); // โหลดข้อมูลใหม่
                } else {
                    const errorResult = await response.json();
                    const errorMessage = errorResult.error && errorResult.error.includes('UNIQUE constraint failed')
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

    // Event listener สำหรับปุ่ม แก้ไข และ ลบ ในตาราง
    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            // คลิกปุ่ม "แก้ไข"
            if (e.target.classList.contains('btn-edit')) {
                e.preventDefault();
                const entityData = JSON.parse(e.target.dataset.entity);
                Object.keys(entityData).forEach(key => {
                    const input = form.elements[key];
                    if (input) input.value = entityData[key];
                });
                if(entityIdInput) entityIdInput.value = entityData.id; // กำหนด id สำหรับการ PUT
                window.scrollTo(0, 0); // เลื่อนหน้าจอขึ้นไปบนสุด
            }

            // คลิกปุ่ม "ลบ"
            if (e.target.classList.contains('btn-delete')) {
                e.preventDefault();
                if (confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
                    const entityId = e.target.dataset.id;
                    fetch(`/api/entities/${entityId}`, { method: 'DELETE' })
                        .then(response => {
                            if (response.ok) {
                                loadEntities(); // โหลดข้อมูลใหม่
                            } else {
                                alert('เกิดข้อผิดพลาดในการลบ');
                            }
                        });
                }
            }
        });
    }

    // Event listener สำหรับปุ่ม "ล้างฟอร์ม"
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if(form) form.reset();
            if(entityIdInput) entityIdInput.value = '';
        });
    }

    // เริ่มโหลดข้อมูลทั้งหมดเมื่อหน้าเว็บพร้อมใช้งาน
    loadEntities();

}); // <-- *** แก้ไข: เพิ่มวงเล็บปิดที่ขาดหายไปตรงนี้ ***

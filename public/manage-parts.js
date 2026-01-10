document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const moldId = urlParams.get('moldId');

    // --- Element References ---
    const pageTitle = document.getElementById('page-title');
    const backToDetailsBtn = document.getElementById('back-to-details-btn');
    const partListBody = document.getElementById('part-list-body');
    const partForm = document.getElementById('part-form');
    const partFormTitle = document.getElementById('part-form-title');
    const partIdInput = document.getElementById('part-id');
    const btnClearPartForm = document.getElementById('btn-clear-part-form');

    if (!moldId) {
        document.body.innerHTML = '<div class="container-xl"><div class="alert alert-danger">ไม่พบ ID ของแม่พิมพ์</div></div>';
        return;
    }
    
    // ตั้งค่าลิงก์ปุ่มกลับ
    backToDetailsBtn.href = `/mold-details.html?id=${moldId}`;

    // --- ฟังก์ชันโหลดข้อมูลแม่พิมพ์ (เพื่อแสดงชื่อ) ---
    async function loadMoldInfo() {
        try {
            const response = await fetch(`/api/molds/${moldId}`);
            if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลแม่พิมพ์ได้');
            const result = await response.json();
            pageTitle.textContent = `จัดการ Part List สำหรับแม่พิมพ์: ${result.data.mold_code}`;
        } catch (error) {
            console.error(error);
            pageTitle.textContent = 'จัดการ Part List (เกิดข้อผิดพลาด)';
        }
    }

    // --- ฟังก์ชันโหลด Part List ---
    async function loadPartList() {
        try {
            const response = await fetch(`/api/molds/${moldId}/parts`);
            if (!response.ok) throw new Error('Failed to load part list');
            const result = await response.json();
            
            partListBody.innerHTML = '';
            if (result.data.length === 0) {
                partListBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">ยังไม่มีข้อมูล Part List</td></tr>';
                return;
            }

            result.data.forEach(part => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${part.part_number}</td>
                    <td>${part.part_name}</td>
                    <td class="text-center">${part.quantity}</td>
                    <td>${part.material || '-'}</td>
                    <td class="text-end">
                        <div class="btn-list flex-nowrap">
                            <button class="btn btn-sm btn-edit-part">แก้ไข</button>
                            <button class="btn btn-sm btn-danger btn-delete-part">ลบ</button>
                        </div>
                    </td>
                `;
                row.dataset.part = JSON.stringify(part);
                partListBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            partListBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        }
    }

    // --- จัดการการ Submit ฟอร์ม Part ---
    partForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(partForm);
        const data = Object.fromEntries(formData.entries());
        data.mold_id = moldId;
        
        const partId = partIdInput.value;
        const url = partId ? `/api/molds/parts/${partId}` : '/api/molds/parts';
        const method = partId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to save part');
            
            partForm.reset();
            partIdInput.value = '';
            partFormTitle.textContent = 'เพิ่ม Part ใหม่';
            loadPartList();
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- จัดการปุ่มในตาราง Part List ---
    partListBody.addEventListener('click', (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.part) return;
        const partData = JSON.parse(row.dataset.part);

        if (target.classList.contains('btn-edit-part')) {
            partFormTitle.textContent = `แก้ไข Part: ${partData.part_number}`;
            partIdInput.value = partData.id;
            partForm.elements.part_number.value = partData.part_number;
            partForm.elements.part_name.value = partData.part_name;
            partForm.elements.quantity.value = partData.quantity;
            partForm.elements.material.value = partData.material;
            partForm.elements.notes.value = partData.notes;
        }

        if (target.classList.contains('btn-delete-part')) {
            if (confirm(`คุณต้องการลบ Part "${partData.part_name}" ใช่หรือไม่?`)) {
                fetch(`/api/molds/parts/${partData.id}`, { method: 'DELETE' })
                    .then(response => {
                        if (response.ok) loadPartList();
                        else alert('เกิดข้อผิดพลาดในการลบ');
                    });
            }
        }
    });

    // --- ปุ่มล้างฟอร์ม Part ---
    btnClearPartForm.addEventListener('click', () => {
        partForm.reset();
        partIdInput.value = '';
        partFormTitle.textContent = 'เพิ่ม Part ใหม่';
    });

    // --- เริ่มต้นการทำงาน ---
    loadMoldInfo();
    loadPartList();
});

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
    const tableBody = document.getElementById('boms-table-body');

    async function loadBoms() {
        if (!tableBody) {
            console.error('Error: Could not find table body element (boms-table-body)');
            return;
        }

        try {
            const response = await fetch('/api/boms');
            const contentType = response.headers.get("content-type");

            if (response.status === 401 || !contentType || !contentType.includes("application/json")) {
                window.location.href = '/login.html';
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch BOMs data');
            }

            const result = await response.json();
            tableBody.innerHTML = ''; // ล้างข้อมูลเก่า

            if (result.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ยังไม่มีข้อมูล BOM</td></tr>';
                return;
            }

            result.data.forEach(bom => {
                const row = document.createElement('tr');
                const isActive = bom.is_active === 1;
                
                let statusBadge = isActive 
                    ? '<span class="badge bg-green-lt">Active</span>' 
                    : '<span class="badge bg-red-lt">Inactive</span>';

                row.innerHTML = `
                    <td>${bom.product_part_number}</td>
                    <td>${bom.product_name || '-'}</td>
                    <td>${bom.mold_code || '-'}</td>
                    <td class="text-center">${bom.version}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <div class="btn-list flex-nowrap">
                            <a href="/bom-details.html?id=${bom.id}" class="btn btn-sm">
                                ดูรายละเอียด
                            </a>
                            <a href="/edit-bom.html?id=${bom.id}" class="btn btn-sm btn-outline-primary">
                                แก้ไข
                            </a>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load BOMs:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }

    // เริ่มโหลดข้อมูลเมื่อหน้าเว็บพร้อมใช้งาน
    loadBoms();
});

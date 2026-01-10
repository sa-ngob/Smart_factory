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
    const tableBody = document.getElementById('molds-table-body');

    async function loadMolds() {
        if (!tableBody) {
            console.error('Error: Could not find table body element (molds-table-body)');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/molds'); // แก้ไข URL
            const contentType = response.headers.get("content-type");

            if (response.status === 401 || !contentType || !contentType.includes("application/json")) {
                window.location.href = '/login.html';
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch molds data');
            }

            const result = await response.json();
            tableBody.innerHTML = ''; // ล้างข้อมูลเก่า

            if (result.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ยังไม่มีข้อมูลแม่พิมพ์</td></tr>';
                return;
            }

            result.data.forEach(mold => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="/mold-details.html?id=${mold.id}" class="text-reset">${mold.mold_code}</a></td>
                    <td>${mold.mold_name}</td>
                    <td>${mold.customer_name || '-'}</td>
                    <td><span class="badge bg-secondary-lt">${mold.status}</span></td>
                    <td>${(mold.shot_counter || 0).toLocaleString()}</td>
                    <td class="text-end">
                        <div class="btn-list flex-nowrap">
                            <a href="/mold-details.html?id=${mold.id}" class="btn btn-sm">
                                ดูรายละเอียด
                            </a>
                            <a href="/edit-mold.html?id=${mold.id}" class="btn btn-sm btn-outline-primary">
                                แก้ไข
                            </a>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load molds:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }

    // เริ่มโหลดข้อมูลเมื่อหน้าเว็บพร้อมใช้งาน
    loadMolds();
});

// public/js/molds.js
document.addEventListener('DOMContentLoaded', function() {
    // --- อ้างอิงถึง Element ที่จำเป็น ---
    const tableBody = document.getElementById('molds-table-body');

    // --- ตรวจสอบว่า Element หลักมีอยู่ครบหรือไม่ ---
    if (!tableBody) {
        console.error('Error: Could not find table body element (molds-table-body)');
        return;
    }

    // --- โหลดข้อมูลแม่พิมพ์ ---
    async function loadMolds() {
        try {
            // ใช้ fetchWithAuth จาก auth-client.js เพื่อจัดการเรื่อง session และ error handling
            const response = await fetchWithAuth('/api/molds');
            if (!response.ok) throw new Error('Failed to fetch molds data');
            const result = await response.json();

            tableBody.innerHTML = ''; // ล้างข้อมูลเก่า

            if (!result.data || result.data.length === 0) {
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
            // fetchWithAuth จะจัดการเรื่อง redirect ถ้าเป็น 401
            console.error('Failed to load molds:', error);
            // ไม่แสดง alert ถ้าเป็น error จากการ redirect
            if (error.message.includes('Unauthorized')) return;
            
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
        }
    }

    // --- เริ่มต้นการทำงาน ---
    // โหลด Sidebar และข้อมูลผู้ใช้ก่อน แล้วค่อยโหลดข้อมูลหลักของหน้า
    loadSidebar();
    loadUserInfo();
    loadMolds();
});
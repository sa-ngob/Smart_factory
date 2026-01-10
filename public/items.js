document.addEventListener('DOMContentLoaded', function() {
    // --- อ้างอิงถึง Element ที่จำเป็นบนหน้าเว็บ ---
    const tableBody = document.getElementById('items-table-body');
    const typeFilter = document.getElementById('type-filter');
    const searchInput = document.getElementById('search-input');

    // --- ตรวจสอบว่า Element หลักมีอยู่ครบหรือไม่ ---
    if (!tableBody || !typeFilter || !searchInput) {
        console.error('Essential page elements are missing for the item list page.');
        return; // หยุดการทำงานถ้า Element ไม่ครบ
    }
    
    // --- โหลดข้อมูลสินค้า (รองรับการกรองและค้นหา) ---
    async function loadItems() {
        const typeValue = typeFilter.value;
        const searchTerm = searchInput.value;
        
        const url = new URL('/api/items', window.location.origin);
        if (typeValue) url.searchParams.append('item_type', typeValue);
        if (searchTerm) url.searchParams.append('search', searchTerm);

        try {
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth(url);
            if (!response.ok) throw new Error('Failed to load items');
            const result = await response.json();
            renderTable(result.data);
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }
    
    // --- แสดงผลข้อมูลในตาราง ---
    function renderTable(items) {
        tableBody.innerHTML = '';
        if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่พบข้อมูล</td></tr>';
            return;
        }
        items.forEach(item => {
            const row = document.createElement('tr');
            const isInactive = item.status === 'inactive';
            
            let statusBadge = isInactive 
                ? '<span class="badge bg-red-lt">ยกเลิก</span>' 
                : '<span class="badge bg-green-lt">ใช้งาน</span>';

            row.innerHTML = `
                <td><a href="/item-details.html?id=${item.id}" class="text-reset">${item.item_code}</a></td>
                <td class="${isInactive ? 'text-muted' : ''}">${item.item_name}</td>
                <td class="${isInactive ? 'text-muted' : ''}">${item.customer_name || '-'}</td>
                <td class="${isInactive ? 'text-muted' : ''}">${item.item_type}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <div class="btn-list flex-nowrap">
                        <a href="/item-details.html?id=${item.id}" class="btn btn-sm">ดูรายละเอียด</a>
                        <a href="/edit-item.html?id=${item.id}" class="btn btn-sm btn-outline-primary" ${isInactive ? 'disabled' : ''}>แก้ไข</a>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${item.id}" ${isInactive ? 'disabled' : ''}>ยกเลิก</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // --- Event Listeners สำหรับกรองและค้นหา ---
    typeFilter.addEventListener('change', loadItems);
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadItems, 500); // หน่วงเวลา 0.5 วินาที
    });

    // --- จัดการปุ่มยกเลิก ---
    tableBody.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('btn-delete')) {
            const itemId = target.dataset.id;
            const row = target.closest('tr');
            const itemName = row.cells[1].textContent;
            if (confirm(`คุณต้องการ "ยกเลิกการใช้งาน" สินค้า "${itemName}" ใช่หรือไม่?`)) {
                // ✅ แก้ไข: ใช้ fetchWithAuth
                fetchWithAuth(`/api/items/${itemId}`, { method: 'DELETE' })
                    .then(res => {
                        if (res.ok) {
                            alert('ยกเลิกการใช้งานสำเร็จ');
                            loadItems();
                        } else {
                            alert('ยกเลิกไม่สำเร็จ');
                        }
                    });
            }
        }
    });

    // --- เริ่มต้นการทำงาน ---
    loadItems();
});

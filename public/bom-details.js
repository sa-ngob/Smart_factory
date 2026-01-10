document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bomId = urlParams.get('id');

    const bomTitleElement = document.getElementById('bom-title');

    if (bomId) {
        fetchBomDetails(bomId);
    } else {
        console.error('ไม่พบ BOM ID ใน URL');
        if (bomTitleElement) {
            bomTitleElement.textContent = 'ข้อผิดพลาด: ไม่พบ BOM ID ใน URL';
        }
    }
});

async function fetchBomDetails(id) {
    const bomTitleElement = document.getElementById('bom-title');
    try {
        const response = await fetch(`/api/boms/${id}`);

        if (!response.ok) {
            throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderBomDetails(data);

    } catch (error) {
        console.error('ไม่สามารถดึงข้อมูล BOM ได้:', error);
        if (bomTitleElement) {
            bomTitleElement.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        }
        const mainDetailsContainer = document.getElementById('main-bom-details');
        if(mainDetailsContainer) {
            mainDetailsContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        }
    }
}

function renderBomDetails(data) {
    const { bom, items, history } = data;

    const bomTitleElement = document.getElementById('bom-title');
    const editBomBtn = document.getElementById('edit-bom-btn');

    if (bomTitleElement) {
        bomTitleElement.textContent = `รายละเอียด BOM: ${bom.product_name} (Rev. ${bom.version})`;
    }
    if (editBomBtn) {
        // ปุ่มแก้ไขจะทำงานได้ก็ต่อเมื่อ BOM เป็นเวอร์ชันที่ Active เท่านั้น
        if (bom.is_active) {
            editBomBtn.href = `/edit-bom.html?id=${bom.id}`;
            editBomBtn.classList.remove('disabled');
        } else {
            editBomBtn.href = '#';
            editBomBtn.classList.add('disabled');
            editBomBtn.setAttribute('title', 'ไม่สามารถแก้ไขเวอร์ชันเก่าได้');
        }
    }

    const mainDetailsContainer = document.getElementById('main-bom-details');
    if (mainDetailsContainer) {
        mainDetailsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>รหัสสินค้า (Part Number):</strong> ${bom.product_part_number || '-'}</p>
                    <p><strong>ชื่อสินค้า (Part Name):</strong> ${bom.product_name || '-'}</p>
                    <p><strong>เวอร์ชัน:</strong> ${bom.version || '-'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>รหัสแม่พิมพ์ (Mold Code):</strong> ${bom.mold_code || 'ไม่ได้ผูกกับแม่พิมพ์'}</p>
                    <p><strong>สถานะ:</strong> ${bom.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Archived</span>'}</p>
                    <p><strong>วันที่สร้าง:</strong> ${new Date(bom.creation_date).toLocaleDateString('th-TH')}</p>
                </div>
            </div>
        `;
    }

    const bomItemsBody = document.getElementById('bom-items-body');
    if (bomItemsBody) {
        bomItemsBody.innerHTML = '';

        if (items && items.length > 0) {
            items.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.material_code}</td>
                    <td>${item.material_name}</td>
                    <td class="text-end">${item.mixing_ratio.toFixed(2)}</td>
                    <td>${item.unit}</td>
                `;
                bomItemsBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="text-center">ไม่มีรายการวัตถุดิบใน BOM นี้</td>`;
            bomItemsBody.appendChild(row);
        }
    }

    renderBomHistory(history);
}

function renderBomHistory(history) {
    const historyCard = document.getElementById('bom-history-card');
    const historyBody = document.getElementById('bom-history-body');

    if (!history || history.length <= 1) {
        historyCard.style.display = 'none';
        return;
    }

    historyBody.innerHTML = '';
    history.forEach(rev => {
        const row = document.createElement('tr');
        const statusBadge = rev.is_active
            ? '<span class="badge bg-success me-1"></span> Active'
            : '<span class="badge bg-secondary me-1"></span> Archived';

        row.innerHTML = `
            <td>${rev.version}</td>
            <td>${new Date(rev.creation_date).toLocaleString('th-TH')}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
                <a href="/bom-details.html?id=${rev.id}" class="btn btn-sm">ดูรายละเอียด</a>
            </td>
        `;
        historyBody.appendChild(row);
    });

    historyCard.style.display = 'block';
}
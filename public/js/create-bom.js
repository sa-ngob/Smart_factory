document.addEventListener('DOMContentLoaded', function () {
    // --- Element References ---
    const bomForm = document.getElementById('bom-form');
    const productSelect = document.getElementById('product-select');
    const productNameInput = document.getElementById('product_name');
    const moldSelect = document.getElementById('mold-select');
    const itemsTableBody = document.getElementById('bom-items-body');
    const addItemBtn = document.getElementById('add-item-btn');
    const totalRatioEl = document.getElementById('total-ratio');

    let rawMaterials = []; // เก็บข้อมูลวัตถุดิบทั้งหมด

    // --- โหลดข้อมูลเริ่มต้น (สินค้า, แม่พิมพ์, วัตถุดิบ) ---
    // --- โหลดข้อมูลเริ่มต้น (สินค้า, แม่พิมพ์, วัตถุดิบ) ---
    async function loadInitialData() {
        try {
            const [fgRes, moldRes, rmRes] = await Promise.all([
                fetchWithAuth('/api/items?item_type=finished_good'),
                fetchWithAuth('/api/molds'),
                fetchWithAuth('/api/items?item_type=raw_material')
            ]);

            if (!fgRes.ok || !moldRes.ok || !rmRes.ok) {
                console.error("Fetch failed:", fgRes.status, moldRes.status, rmRes.status);
                throw new Error('Failed to load initial data');
            }

            // ... (rest of parsing logic is same, assuming response format matches)
            const fgResult = await fgRes.json();
            productSelect.innerHTML = '<option value="">-- กรุณาเลือกสินค้า --</option>';
            if (fgResult.data) {
                fgResult.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.item_code;
                    option.textContent = `[${item.item_code}] ${item.item_name}`;
                    option.dataset.itemName = item.item_name;
                    productSelect.appendChild(option);
                });
            }

            const moldResult = await moldRes.json();
            moldSelect.innerHTML = '<option value="">-- กรุณาเลือกแม่พิมพ์ --</option>';
            if (moldResult.data) {
                moldResult.data.forEach(mold => {
                    const option = document.createElement('option');
                    option.value = mold.id;
                    option.textContent = `[${mold.mold_code}] ${mold.mold_name}`;
                    moldSelect.appendChild(option);
                });
            }

            const rmResult = await rmRes.json();
            if (rmResult.data) {
                rawMaterials = rmResult.data;
            }

            if (itemsTableBody.rows.length === 0) {
                createItemRow();
            }

        } catch (error) {
            console.error('Failed to load initial data:', error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น: ' + error.message);
        }
    }

    productSelect.addEventListener('change', function () {
        const selectedOption = this.options[this.selectedIndex];
        productNameInput.value = selectedOption.dataset.itemName || '';
    });

    function updateTotalRatio() {
        let total = 0;
        const ratioInputs = itemsTableBody.querySelectorAll('.item-ratio');
        ratioInputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        totalRatioEl.textContent = `${total.toFixed(2)} %`;
        totalRatioEl.classList.toggle('text-danger', Math.abs(total - 100) > 0.01);
    }

    function createItemRow() {
        const row = document.createElement('tr');
        let materialOptions = '<option value="">-- เลือกวัตถุดิบ --</option>';
        rawMaterials.forEach(rm => {
            materialOptions += `<option value="${rm.item_code}" data-item-name="${rm.item_name}">${rm.item_code} - ${rm.item_name}</option>`;
        });
        row.innerHTML = `
            <td><select class="form-select item-material-code" required>${materialOptions}</select></td>
            <td><input type="text" class="form-control item-material-name" readonly></td>
            <td><input type="number" class="form-control item-ratio" value="0" step="0.01" min="0" required></td>
            <td><input type="text" class="form-control item-unit" value="%" readonly></td>
            <td><button type="button" class="btn btn-danger btn-sm btn-remove-item">ลบ</button></td>
        `;
        itemsTableBody.appendChild(row);
    }

    addItemBtn.addEventListener('click', createItemRow);

    itemsTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('item-ratio')) {
            updateTotalRatio();
        }
    });

    itemsTableBody.addEventListener('change', e => {
        if (e.target.classList.contains('item-material-code')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            e.target.closest('tr').querySelector('.item-material-name').value = selectedOption.dataset.itemName || '';
        }
    });

    itemsTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-item')) {
            e.target.closest('tr').remove();
            updateTotalRatio();
        }
    });

    bomForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        let totalRatio = 0;
        itemsTableBody.querySelectorAll('.item-ratio').forEach(input => totalRatio += parseFloat(input.value) || 0);
        if (Math.abs(totalRatio - 100) > 0.01) {
            alert('Total Mixing Ratio ต้องเท่ากับ 100%');
            return;
        }

        if (!productSelect.value) {
            alert('กรุณาเลือกสินค้า');
            return;
        }

        const bomData = {
            product_part_number: productSelect.value,
            version: this.elements.version.value || '1.0',
            items: []
        };
        const itemRows = itemsTableBody.querySelectorAll('tr');
        itemRows.forEach(row => {
            bomData.items.push({
                material_code: row.querySelector('.item-material-code').value,
                material_name: row.querySelector('.item-material-name').value,
                mixing_ratio: parseFloat(row.querySelector('.item-ratio').value),
                unit: row.querySelector('.item-unit').value
            });
        });

        try {
            const response = await fetchWithAuth('/api/boms', {
                method: 'POST',
                // headers: { 'Content-Type': 'application/json' }, // fetchWithAuth handles this? No, we might need to verify auth-client.js. 
                // However, standard fetchWithAuth usually forwards headers.
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bomData)
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save BOM');
            }
            alert('สร้าง BOM สำเร็จ!');
            window.location.href = '/boms.html';
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    loadInitialData();
});

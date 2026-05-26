document.addEventListener('DOMContentLoaded', function() {
    // --- Element References ---
    const bomForm = document.getElementById('bom-form');
    const productSelect = document.getElementById('product-select');
    const productNameInput = document.getElementById('product_name');
    const moldSelect = document.getElementById('mold-select');
    const versionInput = document.getElementById('version');
    const activeSwitch = document.getElementById('is_active');
    const itemsTableBody = document.getElementById('bom-items-body');
    const addItemBtn = document.getElementById('add-item-btn');
    const totalRatioEl = document.getElementById('total-ratio');
    const pageTitle = document.getElementById('page-title');
    const loadingIndicator = document.getElementById('loading-indicator');

    let rawMaterials = [];
    let bomId = null;

    const urlParams = new URLSearchParams(window.location.search);
    bomId = urlParams.get('id');

    if (!bomId) {
        alert('ไม่พบ BOM ID ใน URL');
        pageTitle.textContent = "ข้อผิดพลาด: ไม่พบ BOM";
        return;
    }

    async function loadAndPopulateForm() {
        loadingIndicator.style.display = 'block';
        try {
            const [bomRes, fgRes, moldRes, rmRes] = await Promise.all([
                fetch(`/api/boms/${bomId}`),
                fetch('/api/items?item_type=finished_good'),
                fetch('/api/molds'),
                fetch('/api/items?item_type=raw_material')
            ]);

            if (!bomRes.ok || !fgRes.ok || !moldRes.ok || !rmRes.ok) {
                const errorText = await bomRes.text();
                throw new Error(`Failed to load initial data. Status: ${bomRes.status}, Message: ${errorText}`);
            }

            const fgResult = await fgRes.json();
            productSelect.innerHTML = '<option value="">-- กรุณาเลือกสินค้า --</option>';
            fgResult.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item_code;
                option.textContent = `[${item.item_code}] ${item.item_name}`;
                option.dataset.itemName = item.item_name;
                productSelect.appendChild(option);
            });

            const moldResult = await moldRes.json();
            moldSelect.innerHTML = '<option value="">-- กรุณาเลือกแม่พิมพ์ --</option>';
            moldResult.data.forEach(mold => {
                const option = document.createElement('option');
                option.value = mold.id;
                option.textContent = `[${mold.mold_code}] ${mold.mold_name}`;
                moldSelect.appendChild(option);
            });

            const rmResult = await rmRes.json();
            rawMaterials = rmResult.data;

            const bomDataResult = await bomRes.json();
            if(bomDataResult.error){
                throw new Error(bomDataResult.error);
            }
            const { bom, items } = bomDataResult;

            pageTitle.textContent = `แก้ไข BOM: ${bom.product_part_number} (Rev. ${bom.version})`;
            productSelect.value = bom.product_part_number;
            productNameInput.value = bom.product_part_number;

            versionInput.value = bom.version;
            versionInput.readOnly = true;

            activeSwitch.closest('.col-md-2').style.display = 'none';

            itemsTableBody.innerHTML = '';
            items.forEach(item => createItemRow(item));
            updateTotalRatio();

            bomForm.style.display = 'block';

        } catch (error) {
            console.error('Failed to load BOM data:', error);
            alert(`เกิดข้อผิดพลาดในการโหลดข้อมูล BOM: ${error.message}`);
            pageTitle.textContent = "เกิดข้อผิดพลาด";
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    productSelect.addEventListener('change', function() {
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

    function createItemRow(initialData = null) {
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

        if (initialData) {
            row.querySelector('.item-material-code').value = initialData.material_code;
            row.querySelector('.item-material-name').value = initialData.material_name;
            row.querySelector('.item-ratio').value = initialData.mixing_ratio;
            row.querySelector('.item-unit').value = initialData.unit;
        }

        itemsTableBody.appendChild(row);
    }

    addItemBtn.addEventListener('click', () => createItemRow());

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
            if (itemsTableBody.rows.length > 1) {
                e.target.closest('tr').remove();
                updateTotalRatio();
            } else {
                alert('ต้องมีวัตถุดิบอย่างน้อย 1 รายการ');
            }
        }
    });

    bomForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        let totalRatio = 0;
        itemsTableBody.querySelectorAll('.item-ratio').forEach(input => totalRatio += parseFloat(input.value) || 0);
        if (Math.abs(totalRatio - 100) > 0.01) {
            alert('Total Mixing Ratio ต้องเท่ากับ 100%');
            return;
        }

        const bomData = {
            version: versionInput.value,
            items: []
        };
        const itemRows = itemsTableBody.querySelectorAll('tr');
        let hasInvalidItem = false;
        itemRows.forEach(row => {
            const materialCode = row.querySelector('.item-material-code').value;
            if (!materialCode) {
                hasInvalidItem = true;
            }
            bomData.items.push({
                material_code: materialCode,
                material_name: row.querySelector('.item-material-name').value,
                mixing_ratio: parseFloat(row.querySelector('.item-ratio').value),
                unit: row.querySelector('.item-unit').value
            });
        });

        if (hasInvalidItem) {
            alert('กรุณาเลือกวัตถุดิบให้ครบทุกรายการ');
            return;
        }

        try {
            const response = await fetch(`/api/boms/${bomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bomData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save BOM');
            }
            alert(`สร้าง BOM Revision ${bomData.version} สำเร็จ!`);
            window.location.href = `/bom-details.html?id=${result.id}`;
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    loadAndPopulateForm();
});
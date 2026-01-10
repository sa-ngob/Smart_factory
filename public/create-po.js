document.addEventListener('DOMContentLoaded', function() {
    const vendorSelect = document.getElementById('vendor-select');
    const itemsTableBody = document.getElementById('po-items-body');
    const addItemBtn = document.getElementById('add-item-btn');
    const poForm = document.getElementById('po-form');
    const poNumberInput = document.getElementById('po_number');

    // --- ฟังก์ชันดึงเลขที่ PO จากเซิร์ฟเวอร์ ---
    async function generatePoNumber() {
        try {
            // === จุดที่แก้ไข: เปลี่ยน URL ให้ถูกต้อง ===
            const response = await fetch('/api/purchase-orders/next-po-number');
            // =======================================
            if (!response.ok) throw new Error('Failed to get PO number');
            const result = await response.json();
            poNumberInput.value = result.po_number;
        } catch (error) {
            console.error('Error generating PO number:', error);
            poNumberInput.value = 'Error generating number';
            poNumberInput.classList.add('is-invalid');
        }
    }

    // --- 1. โหลดรายชื่อผู้ขาย (Vendors) ---
    async function loadVendors() {
        try {
            const response = await fetch('/api/entities?type=vendor');
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }
            const result = await response.json();
            result.data.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.id;
                option.textContent = vendor.name;
                vendorSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load vendors:', error);
        }
    }

    // --- 2. จัดการรายการสินค้า ---
    function createItemRow() {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="form-control item-name" required></td>
            <td><input type="text" class="form-control item-description"></td>
            <td><input type="number" class="form-control item-quantity" value="1" min="1" required></td>
            <td><input type="number" class="form-control item-unit-price" value="0.00" step="0.01" min="0" required></td>
            <td><input type="text" class="form-control item-total-price" value="0.00" readonly></td>
            <td><button type="button" class="btn btn-danger btn-sm btn-remove-item">ลบ</button></td>
        `;
        itemsTableBody.appendChild(row);
    }

    function calculateRowTotal(row) {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const unitPrice = parseFloat(row.querySelector('.item-unit-price').value) || 0;
        const totalPriceInput = row.querySelector('.item-total-price');
        totalPriceInput.value = (quantity * unitPrice).toFixed(2);
    }

    if(addItemBtn) {
        addItemBtn.addEventListener('click', createItemRow);
    }

    if(itemsTableBody) {
        itemsTableBody.addEventListener('input', function(e) {
            if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-unit-price')) {
                const row = e.target.closest('tr');
                calculateRowTotal(row);
            }
        });

        itemsTableBody.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-remove-item')) {
                e.target.closest('tr').remove();
            }
        });
    }

    // --- 3. จัดการการ Submit ฟอร์ม ---
    if(poForm) {
        poForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const poData = {
                po_number: poNumberInput.value,
                vendor_id: vendorSelect.value,
                order_date: document.getElementById('order_date').value,
                expected_date: document.getElementById('expected_date').value,
                items: []
            };

            const itemRows = itemsTableBody.querySelectorAll('tr');
            if (itemRows.length === 0) {
                alert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
                return;
            }

            itemRows.forEach(row => {
                poData.items.push({
                    item_name: row.querySelector('.item-name').value,
                    description: row.querySelector('.item-description').value,
                    quantity: parseFloat(row.querySelector('.item-quantity').value),
                    unit_price: parseFloat(row.querySelector('.item-unit-price').value)
                });
            });

            try {
                const response = await fetch('/api/purchase-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(poData)
                });

                if (response.ok) {
                    alert('สร้างใบสั่งซื้อสำเร็จ!');
                    window.location.href = '/purchase-orders.html';
                } else {
                    const errorResult = await response.json();
                    alert('เกิดข้อผิดพลาด: ' + errorResult.error);
                }
            } catch (error) {
                console.error('Failed to submit PO:', error);
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
            }
        });
    }

    // --- เริ่มต้นการทำงาน ---
    generatePoNumber();
    loadVendors();
    createItemRow();
});

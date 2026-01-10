document.addEventListener("DOMContentLoaded", function () {
    // --- Element References ---
    const itemsSection = document.getElementById('items-section');
    const poItemsContainer = document.getElementById('po-items-container');
    const poNumberInput = document.getElementById('po_number');
    const orderDateInput = document.getElementById('order_date');
    const submitButton = document.querySelector('#create-po-form button[type="submit"]');
    const quotationRefInput = document.getElementById('quotation_ref');

    let itemsData = [];
    let itemCounter = 0;

    // --- Sidebar ---
    // --- Sidebar ---
    // Sidebar is loaded by create-po.html using fetchWithAuth


    // --- Vendor Select Initialization ---
    const vendorSelect = new TomSelect("#vendor-select", { valueField: 'id', labelField: 'name', searchField: 'name', create: false });

    // --- Data Loading ---
    async function loadInitialData() {
        try {
            const [vendorRes, poNumRes] = await Promise.all([
                fetch('/api/entities?type=vendor'),
                fetch('/api/purchase-orders/next-po-number')
            ]);
            const vendorData = await vendorRes.json();
            if (vendorData.data) vendorSelect.addOptions(vendorData.data);

            const poNumData = await poNumRes.json();
            if (poNumData.success) poNumberInput.value = poNumData.po_number;

            orderDateInput.value = new Date().toISOString().split('T')[0];
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Failed to load initial page data.");
        }
    }

    // --- Event Handlers ---
    vendorSelect.on('change', async function (vendorId) {
        poItemsContainer.innerHTML = '';
        itemsData = [];
        itemCounter = 0;
        updateGrandTotal();
        if (vendorId) {
            itemsSection.style.display = 'block';
            try {
                const itemsRes = await fetch(`/api/items/by-vendor/${vendorId}`);
                const itemsResult = await itemsRes.json();
                itemsData = itemsResult.data || [];
                addItemRow();
            } catch (error) { console.error("Error fetching vendor items:", error); }
        } else {
            itemsSection.style.display = 'none';
        }
    });

    document.getElementById('add-item-btn').addEventListener('click', addItemRow);
    poItemsContainer.addEventListener('click', e => { if (e.target.closest('.remove-item-btn')) { e.target.closest('.po-item-row').remove(); updateGrandTotal(); } });
    poItemsContainer.addEventListener('input', e => { if (e.target.classList.contains('quantity') || e.target.classList.contains('unit-price')) { updateGrandTotal(); } });

    document.getElementById('create-po-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const poData = {
            po_number: poNumberInput.value,
            vendor_id: vendorSelect.getValue(),
            order_date: orderDateInput.value,
            quotation_ref: quotationRefInput.value,
            items: [],
            total_amount: parseFloat(document.getElementById('grand-total').textContent.replace(/[฿,]/g, ''))
        };
        poItemsContainer.querySelectorAll('.po-item-row').forEach(row => {
            const itemSelect = row.querySelector('.item-select').tomselect;
            const itemValue = itemSelect.getValue();
            if (itemValue) {
                const itemOption = itemSelect.options[itemValue];
                poData.items.push({
                    item_code: itemOption ? itemValue : null,
                    item_name: itemOption ? itemOption.item_name : itemValue,
                    is_new: !itemOption,
                    quantity: parseFloat(row.querySelector('.quantity').value),
                    unit_price: parseFloat(row.querySelector('.unit-price').value),
                    total_price: (parseFloat(row.querySelector('.quantity').value) || 0) * (parseFloat(row.querySelector('.unit-price').value) || 0)
                });
            }
        });
        if (!poData.vendor_id) { alert('Please select a vendor.'); return; }
        if (poData.items.length === 0) { alert('Please add at least one item.'); return; }
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(poData)
            });
            const result = await response.json();
            if (result.success) {
                alert('Purchase Order created successfully!');
                window.location.href = '/purchase-orders.html';
            } else { throw new Error(result.error || 'Failed to save data.'); }
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.disabled = false;
        }
    });

    // --- Core Functions ---
    function addItemRow() {
        itemCounter++;
        const itemHtml = `<div class="row g-3 mb-3 po-item-row align-items-center"><div class="col-md-5"><select class="item-select" data-id="${itemCounter}" placeholder="เลือกสินค้า หรือ พิมพ์เพื่อสร้างใหม่..."></select></div><div class="col-md-2"><input type="number" class="form-control quantity" min="1" value="1"></div><div class="col-md-2"><input type="number" class="form-control unit-price" step="0.01" min="0" value="0.00"></div><div class="col-md-2"><input type="text" class="form-control total-price" value="฿0.00" readonly></div><div class="col-md-1 d-flex"><button type="button" class="btn btn-danger btn-icon remove-item-btn" title="Remove">&times;</button></div></div>`;
        poItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        const newSelectEl = poItemsContainer.querySelector(`.item-select[data-id="${itemCounter}"]`);
        new TomSelect(newSelectEl, {
            valueField: 'item_code', labelField: 'item_name', searchField: ['item_name', 'item_code'],
            options: itemsData,
            create: true,
            render: {
                option: (data, escape) => `<div><strong class="d-block">${escape(data.item_name)}</strong><span class="text-muted small">${escape(data.item_code || 'New Item')}</span></div>`,
                item: (data, escape) => `<div>${escape(data.item_name)}</div>`
            }
        });
    }

    function updateGrandTotal() {
        let grandTotal = 0;
        poItemsContainer.querySelectorAll('.po-item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
            const unitPrice = parseFloat(row.querySelector('.unit-price').value) || 0;
            const subtotal = quantity * unitPrice;
            row.querySelector('.total-price').value = `฿${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
            grandTotal += subtotal;
        });
        document.getElementById('grand-total').textContent = `฿${grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        submitButton.disabled = grandTotal <= 0 || !vendorSelect.getValue();
    }

    // ✨ --- FIX: Moved this call inside the DOMContentLoaded listener --- ✨
    // Initial Page Load
    loadInitialData();
});
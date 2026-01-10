document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const poId = urlParams.get('id');

    if (!poId) {
        document.body.innerHTML = '<h1>ข้อผิดพลาด: ไม่พบ ID ของใบสั่งซื้อใน URL</h1>';
        return;
    }

    // --- อ้างอิงถึง Element ต่างๆ บนหน้าเว็บ ---
    const poTitle = document.getElementById('po-title');
    const vendorDetails = document.getElementById('vendor-details');
    const poNumberEl = document.getElementById('po-number');
    const orderDateEl = document.getElementById('order-date');
    const expectedDateEl = document.getElementById('expected-date');
    const itemsList = document.getElementById('po-items-list');
    const subTotalEl = document.getElementById('sub-total');
    const vatAmountEl = document.getElementById('vat-amount');
    const grandTotalEl = document.getElementById('grand-total');
    const grandTotalThaiEl = document.getElementById('grand-total-thai');
    const currentStatusEl = document.getElementById('current-status');
    const statusSelect = document.getElementById('status-select');
    const updateStatusBtn = document.getElementById('update-status-btn');
    const remarkExpectedDateEl = document.getElementById('remark-expected-date');

    // --- ฟังก์ชันสำหรับแปลงตัวเลขเป็นข้อความภาษาไทย ---
    function numberToThaiText(num) {
        // ... โค้ดส่วนนี้เหมือนเดิม ...
        const bahtText = { '0': '', '1': 'หนึ่ง', '2': 'สอง', '3': 'สาม', '4': 'สี่', '5': 'ห้า', '6': 'หก', '7': 'เจ็ด', '8': 'แปด', '9': 'เก้า', '10': 'สิบ' }; const unit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']; function convert(n) { let result = ''; const s = String(n); for (let i = 0; i < s.length; i++) { const d = s[i]; if (d != '0') { if (i == s.length - 1 && d == '1' && s.length > 1) { result += 'เอ็ด'; } else if (i == s.length - 2 && d == '2') { result += 'ยี่'; } else if (i == s.length - 2 && d == '1') { result += ''; } else { result += bahtText[d]; } result += unit[s.length - i - 1]; } } return result; } const number = Math.floor(num); const stang = Math.round((num - number) * 100); let result = convert(number) + 'บาท'; if (stang > 0) { result += convert(stang) + 'สตางค์'; } else { result += 'ถ้วน'; } return `(${result})`;
    }

    // --- ฟังก์ชันหลักสำหรับโหลดข้อมูลใบสั่งซื้อ ---
    async function loadPoDetails() {
        try {
            const response = await fetch(`/api/purchase-orders/${poId}`);
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
            }
            const data = await response.json();

            // --- แสดงผลข้อมูลบนหน้าเว็บ ---
            poTitle.textContent = `รายละเอียดใบสั่งซื้อ #${data.po.po_number}`;
            poNumberEl.textContent = data.po.po_number;
            orderDateEl.textContent = new Date(data.po.order_date).toLocaleDateString('th-TH');

            const formattedExpectedDate = data.po.expected_date ? new Date(data.po.expected_date).toLocaleDateString('th-TH') : '-';
            expectedDateEl.textContent = formattedExpectedDate;
            remarkExpectedDateEl.textContent = formattedExpectedDate;

            vendorDetails.innerHTML = `
                <strong>${data.po.vendor_name}</strong><br>
                ${data.po.vendor_address.replace(/\n/g, '<br>')}<br>
                Tax ID: ${data.po.vendor_tax_id || '-'}<br>
                โทร: ${data.po.vendor_phone || '-'}<br>
                ผู้ติดต่อ: ${data.po.vendor_contact || '-'}
            `;

            currentStatusEl.textContent = data.po.status;
            statusSelect.value = data.po.status;

            // --- จุดที่แก้ไข: สร้างตารางรายการสินค้าและเพิ่มแถวว่าง ---
            itemsList.innerHTML = '';
            let itemIndex = 1;
            let subTotal = 0;
            const totalRows = 10; // กำหนดจำนวนแถวทั้งหมดที่ต้องการ (เพิ่มเป็น 10 ตาม request)

            // 1. เพิ่มรายการสินค้าที่มีอยู่จริง
            data.items.forEach(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const totalPrice = parseFloat(item.total_price) || 0;

                const row = document.createElement('tr');
                row.className = 'item-row'; // เพิ่มคลาสสำหรับกำหนดความสูง
                row.innerHTML = `
                    <td class="text-center">${itemIndex++}</td>
                    <td>
                        <p class="strong mb-1">${item.item_name}</p>
                        <div class="text-muted">${item.description || ''}</div>
                    </td>
                    <td class="text-center">${quantity}</td>
                    <td class="text-end">${unitPrice.toFixed(2)}</td>
                    <td class="text-end">${totalPrice.toFixed(2)}</td>
                `;
                itemsList.appendChild(row);
                subTotal += totalPrice;
            });

            // 2. เพิ่มแถวว่างจนครบจำนวนที่กำหนด
            for (let i = data.items.length; i < totalRows; i++) {
                const emptyRow = document.createElement('tr');
                emptyRow.className = 'item-row';
                emptyRow.innerHTML = `
                    <td class="text-center">${i + 1}</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td class="text-end">&nbsp;</td>
                    <td class="text-end">&nbsp;</td>
                `;
                itemsList.appendChild(emptyRow);
            }
            // =======================================================

            // คำนวณและแสดงยอดรวม
            const vat = subTotal * 0.07;
            const grandTotal = subTotal + vat;
            subTotalEl.textContent = subTotal.toFixed(2);
            vatAmountEl.textContent = vat.toFixed(2);
            grandTotalEl.textContent = grandTotal.toFixed(2);
            grandTotalThaiEl.textContent = numberToThaiText(grandTotal);

        } catch (error) {
            console.error(error);
            document.querySelector('.page-body').innerHTML = `<div class="container-xl text-center"><h1>เกิดข้อผิดพลาด</h1><p>${error.message}</p></div>`;
        }
    }

    // --- เพิ่ม Event Listener ให้กับปุ่มอัปเดตสถานะ ---
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', async () => {
            const newStatus = statusSelect.value;
            if (!newStatus) return;

            try {
                const response = await fetch(`/api/purchase-orders/${poId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    alert('อัปเดตสถานะสำเร็จ!');
                    loadPoDetails(); // โหลดข้อมูลใหม่เพื่อแสดงสถานะล่าสุด
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'ไม่สามารถอัปเดตสถานะได้');
                }
            } catch (error) {
                console.error(error);
                alert(`เกิดข้อผิดพลาด: ${error.message}`);
            }
        });
    }

    // --- เริ่มการทำงานของสคริปต์ ---
    loadPoDetails();
});

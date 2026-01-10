document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('po-list-body');

    async function loadPurchaseOrders() {
        if (!tableBody) {
            console.error('Error: Could not find table body element (po-list-body)');
            return;
        }

        try {
            const response = await fetch('/api/purchase-orders');
            if (!response.ok) {
                // ถ้า session หมดอายุ ให้กลับไปหน้า login
                if (response.status === 401) {
                    window.location.href = '/login.html';
                }
                throw new Error('Failed to fetch purchase orders');
            }
            const result = await response.json();
            tableBody.innerHTML = ''; // ล้างข้อมูลเก่า

            if (result.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">ยังไม่มีใบสั่งซื้อ</td></tr>';
                return;
            }

            result.data.forEach(po => {
                const row = document.createElement('tr');
                
                // สร้าง Badge แสดงสถานะ
                let statusBadge = '';
                switch (po.status) {
                    case 'draft':
                        statusBadge = '<span class="badge bg-yellow-lt">ฉบับร่าง</span>';
                        break;
                    case 'sent':
                        statusBadge = '<span class="badge bg-blue-lt">ส่งแล้ว</span>';
                        break;
                    case 'completed':
                        statusBadge = '<span class="badge bg-green-lt">เสร็จสมบูรณ์</span>';
                        break;
                    case 'cancelled':
                        statusBadge = '<span class="badge bg-red-lt">ยกเลิก</span>';
                        break;
                    default:
                        statusBadge = `<span class="badge bg-secondary-lt">${po.status}</span>`;
                }

                row.innerHTML = `
                    <td>${po.po_number}</td>
                    <td>${po.vendor_name}</td>
                    <td>${new Date(po.order_date).toLocaleDateString('th-TH')}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <a href="/po-details.html?id=${po.id}" class="btn btn-sm">
                            ดูรายละเอียด
                        </a>
                    </td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Failed to load purchase orders:', error);
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }

    loadPurchaseOrders();
});

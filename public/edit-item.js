document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('item-form');
    if (!form) {
        console.error('Item form not found!');
        return;
    }
    const customerSelect = form.elements['customer_id'];
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        document.body.innerHTML = '<h1>Error: ไม่พบ ID ของสินค้า</h1>';
        return;
    }

    // --- โหลดรายชื่อลูกค้า ---
    async function loadCustomers() {
        try {
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth('/api/entities?type=customer');
            if (!response.ok) throw new Error('Failed to load customers');
            const result = await response.json();
            customerSelect.innerHTML = '<option value="">-- ไม่มี --</option>';
            result.data.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                customerSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // --- โหลดข้อมูลสินค้าเดิมมาใส่ฟอร์ม ---
    async function loadItemForEditing() {
        try {
            await loadCustomers(); // รอโหลดลูกค้าให้เสร็จก่อน
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth(`/api/items/${itemId}`);
            if (!response.ok) throw new Error('Failed to load item data');
            
            const result = await response.json();
            const itemData = result.data;

            // เติมข้อมูลลงในฟอร์ม
            Object.keys(itemData).forEach(key => {
                const input = form.elements[key];
                if (input && input.type !== 'file') {
                    input.value = itemData[key] === null ? '' : itemData[key];
                }
            });
            // ป้องกันการแก้ไขรหัสและประเภท
            form.elements['item_code'].readOnly = true;
            form.elements['item_type'].disabled = true;

        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า');
        }
    }

    // --- จัดการการ Submit ฟอร์ม (ใช้ PUT) ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        // เปิดใช้งาน item_type ก่อนส่งข้อมูลเพื่อให้ค่าถูกรวมไปด้วย
        form.elements['item_type'].disabled = false;
        
        try {
            // ✅ แก้ไข: ใช้ fetchWithAuth
            const response = await fetchWithAuth(`/api/items/${itemId}`, {
                method: 'PUT',
                body: new FormData(form) // สร้าง FormData ใหม่หลังจากเปิดใช้งาน
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save data');
            }
            alert('บันทึกการเปลี่ยนแปลงสำเร็จ!');
            window.location.href = `/items.html`;
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            // ปิดการใช้งานอีกครั้งหลังส่งข้อมูลเสร็จ
            form.elements['item_type'].disabled = true;
        }
    });

    // --- เริ่มต้นการทำงาน ---
    loadItemForEditing();
});

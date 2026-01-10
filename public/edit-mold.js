document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mold-form');
    if (!form) {
        console.error('Mold form not found!');
        return;
    }
    const customerSelect = form.elements['customer_id'];
    const urlParams = new URLSearchParams(window.location.search);
    const moldId = urlParams.get('id');

    if (!moldId) {
        document.body.innerHTML = '<h1>Error: ไม่พบ ID ของแม่พิมพ์</h1>';
        return;
    }

    // --- โหลดรายชื่อลูกค้า ---
    async function loadCustomers() {
        try {
            const response = await fetch('/api/entities?type=customer');
            const contentType = response.headers.get("content-type");
            if (response.status === 401 || !contentType || !contentType.includes("application/json")) {
                window.location.href = '/login.html';
                return;
            }
            const result = await response.json();
            customerSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>';
            result.data.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                customerSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    // --- โหลดข้อมูลแม่พิมพ์เดิมมาใส่ฟอร์ม ---
    async function loadMoldForEditing() {
        try {
            await loadCustomers(); // รอโหลดลูกค้าให้เสร็จก่อน
            const response = await fetch(`/api/molds/${moldId}`);
            if (!response.ok) throw new Error('Failed to load mold data');
            
            const result = await response.json();
            const moldData = result.data;

            // เติมข้อมูลลงในฟอร์ม
            Object.keys(moldData).forEach(key => {
                const input = form.elements[key];
                if (input) {
                    if (input.type === 'date' && moldData[key]) {
                        input.value = new Date(moldData[key]).toISOString().split('T')[0];
                    } else if (input.type !== 'file') {
                        input.value = moldData[key];
                    }
                }
            });

        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลแม่พิมพ์');
        }
    }

    // --- จัดการการ Submit ฟอร์ม (ใช้ PUT) ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch(`/api/molds/${moldId}`, {
                method: 'PUT',
                body: formData
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save data');
            }
            alert('บันทึกการเปลี่ยนแปลงสำเร็จ!');
            window.location.href = `/molds.html`;
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- เริ่มต้นการทำงาน ---
    loadMoldForEditing();
});



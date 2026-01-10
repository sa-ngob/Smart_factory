document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mold-form');
    if (!form) {
        console.error('Mold form not found!');
        return;
    }
    const customerSelect = form.elements['customer_id'];

    // --- ฟังก์ชันสร้างรหัสแม่พิมพ์อัตโนมัติ ---
    async function generateMoldCode() {
        try {
            const response = await fetch('/api/molds/next-code');
            if (!response.ok) throw new Error('Failed to generate code');
            const result = await response.json();
            form.elements['mold_code'].value = result.mold_code;
        } catch (error) {
            console.error('Error generating mold code:', error);
        }
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
        } catch (error)
        {
            console.error(error);
        }
    }

    // --- จัดการการ Submit ฟอร์ม ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/molds', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save data');
            }
            alert('บันทึกข้อมูลแม่พิมพ์สำเร็จ!');
            window.location.href = '/molds.html'; // กลับไปหน้ารายการ
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- เริ่มต้นการทำงาน ---
    generateMoldCode();
    loadCustomers();
});

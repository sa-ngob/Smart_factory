document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('project-form');
    if (!form) {
        console.error('Project form not found!');
        return;
    }
    const customerSelect = form.elements['customerId'];

    // --- โหลดรายชื่อลูกค้า ---
    async function loadCustomers() {
        try {
            const response = await fetch('/api/entities?type=customer');
            if (!response.ok) throw new Error('Failed to load customers');
            const result = await response.json();
            
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

    // --- จัดการการ Submit ฟอร์ม ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to save project');
            }
            alert('บันทึกโปรเจกต์ใหม่สำเร็จ!');
            window.location.href = '/projects.html'; // กลับไปหน้ารายการ
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- เริ่มต้นการทำงาน ---
    loadCustomers();
});

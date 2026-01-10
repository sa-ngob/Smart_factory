// public/js/add-user.js
document.addEventListener('DOMContentLoaded', () => {
    // ใช้ฟังก์ชันจาก auth-client.js เพื่อโหลด Sidebar และตรวจสอบสิทธิ์
    // ฟังก์ชันนี้จะจัดการเรื่อง redirect หาก session หมดอายุด้วย
    loadSidebar().then(() => {
        // ทำให้เมนู 'จัดการผู้ใช้' active
        const userManagementMenu = document.querySelector('a.nav-link[href="/users.html"]');
        if (userManagementMenu) {
            userManagementMenu.classList.add('active');
        }
    });

    const form = document.getElementById('add-user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // ใช้ fetchWithAuth เพื่อให้แน่ใจว่า request มี token ที่ถูกต้อง
            const response = await fetchWithAuth('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert('เพิ่มผู้ใช้สำเร็จแล้ว');
                window.location.href = '/users.html';
            } else {
                // แสดงข้อความ Error ที่ได้จาก Server โดยตรง
                throw new Error(result.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
            }
        } catch (error) {
            console.error('Failed to add user:', error);
            alert(`เกิดข้อผิดพลาดในการเพิ่มผู้ใช้: ${error.message}`);
        }
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mold-form');
    if (!form) { console.error('Mold form not found!'); return; }
    const customerSelect = form.elements['customer_id'];

    // --- 1. ระบบค้นหา Token (เหมือน edit-mold.js) ---
    function findAuthToken() {
        // This function robustly finds the auth token from various possible localStorage keys.
        let token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('user_token');
        if (!token) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (typeof value === 'string' && value.startsWith('eyJ') && value.length > 20) {
                    token = value;
                    break;
                }
                if (value && (value.includes('token') || value.includes('accessToken'))) {
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.token) { token = parsed.token; break; }
                        if (parsed.access_token) { token = parsed.access_token; break; }
                    } catch (e) {}
                }
            }
        }
        return token;
    }

    async function generateMoldCode() {
        try {
            // GET request for next-code does not require authentication.
            const response = await fetch('/api/molds/next-code');
            if (!response.ok) throw new Error('Failed to generate code');
            const result = await response.json();
            if(form.elements['mold_code']) form.elements['mold_code'].value = result.mold_code;
        } catch (error) { console.error(error); }
    }

    async function loadCustomers() {
        try {
            // Use manual fetch with token for consistency
            const token = findAuthToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            // เพิ่ม timestamp ป้องกัน cache เหมือน edit-mold.js
            const response = await fetch(`/api/entities?type=customer&t=${Date.now()}`, { headers });

            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            if (!response.ok) throw new Error('ไม่สามารถโหลดรายชื่อลูกค้าได้');

            const result = await response.json();
            customerSelect.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
            if (result.data) {
                result.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name || `Customer #${c.id}`;
                    customerSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error(error);
            customerSelect.innerHTML = '<option value="">-- โหลดล้มเหลว --</option>';
        }
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const token = findAuthToken();
        if (!token) {
            alert('Session หมดอายุ กรุณา Login ใหม่');
            window.location.href = '/login.html';
            return;
        }

        const formData = new FormData(form);

        try {
            // Use manual fetch with Authorization header for FormData
            const response = await fetch('/api/molds', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // NOTE: Do NOT set 'Content-Type' for FormData, the browser does it automatically with the correct boundary.
                },
                body: formData
            });

            if (!response.ok) {
                const text = await response.text();
                let errMsg = 'ไม่สามารถบันทึกข้อมูลได้';
                try { errMsg = JSON.parse(text).error || errMsg; } catch(e) { errMsg = text; }
                throw new Error(errMsg);
            }

            alert('บันทึกข้อมูลแม่พิมพ์สำเร็จ!');
            window.location.href = '/molds.html';

        } catch (error) {
            console.error('Submit Error:', error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    generateMoldCode();
    loadCustomers();
});
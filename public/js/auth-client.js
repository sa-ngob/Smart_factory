/**
 * public/js/auth-client.js
 * จัดการการเชื่อมต่อ API แบบ Session-based (Cookie)
 */
(function () {
    async function fetchWithAuth(url, options = {}) {
        const opts = Object.assign({}, options);

        // 1. สำคัญที่สุด: บังคับส่ง Cookie ไปกับ Request (Server ใช้ Session)
        opts.credentials = 'include';

        opts.headers = Object.assign({}, opts.headers || {});

        // 2. จัดการ Content-Type
        // - ถ้าเป็น FormData (อัปโหลดไฟล์) -> ห้ามตั้ง Content-Type (Browser จะตั้งให้เอง)
        // - ถ้าเป็น JSON และยังไม่ได้ตั้ง -> ตั้งเป็น application/json
        if (opts.body && !(opts.body instanceof FormData) && !opts.headers['Content-Type']) {
            opts.headers['Content-Type'] = 'application/json';
        }

        // 3. ส่ง Request
        const response = await fetch(url, opts);

        // 4. ถ้า Server ตอบกลับมาว่า 401 (Unauthorized) หรือ 403 (Forbidden)
        // แปลว่า Session หลุดแล้ว -> ให้พาไปหน้า Login
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login.html';
            // โยน Error ที่มีความหมายชัดเจน เพื่อให้ส่วน catch สามารถจัดการได้
            throw new Error('Unauthorized: Session has expired or is invalid.');
        }

        return response;
    }

    // โหลดข้อมูลผู้ใช้ (User Info)
    async function loadUserInfo(targetId = 'display-username') {
        try {
            const res = await fetchWithAuth('/api/user-info');
            if (!res.ok) return null;

            const data = await res.json();
            const el = document.getElementById(targetId);
            if (el && data && data.success && data.displayName) {
                el.textContent = data.displayName;
            }
            return data;
        } catch (err) {
            console.warn('Could not load user info:', err);
            return null;
        }
    }

    // ฟังก์ชันสำหรับ Highlight เมนู
    function setActiveMenuItem() {
        const currentPath = window.location.pathname;
        const menuItems = document.querySelectorAll('.nav-link');

        menuItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && (href === currentPath || (currentPath === '/' && href === '/index.html') || (href !== '/' && currentPath.startsWith(href)))) {
                item.closest('.nav-item').classList.add('active');

                // Handle dropdown parent
                const dropdown = item.closest('.dropdown-menu');
                if (dropdown) {
                    const parentToggle = dropdown.closest('.nav-item').querySelector('.dropdown-toggle');
                    if (parentToggle) parentToggle.classList.add('active');
                    dropdown.classList.add('show');
                }
            }
        });
    }

    // โหลด Sidebar
    async function loadSidebar(sidebarId = 'sidebar') {
        const sidebarContainer = document.getElementById(sidebarId);
        if (!sidebarContainer) return;
        try {
            const response = await fetchWithAuth('/api/sidebar');
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const sidebarHtml = await response.text();
            sidebarContainer.innerHTML = sidebarHtml;
            setActiveMenuItem(); // Call it after loading
        } catch (error) {
            console.error("Sidebar error:", error);
            sidebarContainer.innerHTML = '<div class="p-2 text-danger">Error loading menu</div>';
        }
    }

    // Expose Functions
    window.fetchWithAuth = fetchWithAuth;
    window.loadUserInfo = loadUserInfo;
    window.loadSidebar = loadSidebar;
    window.setActiveMenuItem = setActiveMenuItem;

    // Auto-load on ready
    document.addEventListener('DOMContentLoaded', async () => {
        // --- Security: Client-side Session Check ---
        // Verify session immediately on page load
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
            try {
                const res = await fetchWithAuth('/api/user-info');
                // If the user is on a protected page but check failed, generic 401 response inside fetchWithAuth will handle redirect.
            } catch (e) { }

            // Periodic check (Heartbeat) - check every 1 minute
            setInterval(async () => {
                try {
                    await fetchWithAuth('/api/user-info');
                } catch (e) { }
            }, 60000);
        }

        if (document.getElementById('display-username')) loadUserInfo();
    });
})();
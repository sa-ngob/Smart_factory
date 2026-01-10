document.addEventListener('DOMContentLoaded', function() {
    // --- อ้างอิงถึง Element ที่จำเป็นบนหน้าเว็บ ---
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    const projectTitleEl = document.getElementById('project-title');
    const editProjectBtn = document.getElementById('edit-project-btn');
    const headerContainer = document.getElementById('report-header-container');
    const infoContainer = document.getElementById('project-info-container');
    const ganttContainer = document.getElementById('gantt-chart-container');
    
    // Modal Elements
    const taskModalEl = document.getElementById('task-update-modal');
    let taskModal = null; // 1. ประกาศตัวแปรไว้ก่อน แต่ยังไม่สร้าง instance
    const taskUpdateForm = document.getElementById('task-update-form');

    let projectTasks = []; 

    // --- ฟังก์ชันสำหรับสร้าง Modal instance เมื่อต้องการใช้งาน ---
    function getTaskModalInstance() {
        if (!taskModal) {
            if (typeof bootstrap !== 'undefined') {
                taskModal = new bootstrap.Modal(taskModalEl);
            } else {
                console.error("Bootstrap is not available to create a modal.");
                return null;
            }
        }
        return taskModal;
    }

    if (!projectId) {
        document.body.innerHTML = '<div class="alert alert-danger">ไม่พบ ID ของโปรเจกต์</div>';
        return;
    }
    
    editProjectBtn.href = `/edit-project.html?id=${projectId}`;

    // --- Helper Functions ---
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('th-TH') : '-';
    const getProjectType = (type) => ({ 'new_mold': 'New Mold', 'repair_mold': 'Repair Mold', 'part_making': 'Part Making' }[type] || type);

    // --- Main Load Function ---
    async function loadProjectDetails() {
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            const contentType = response.headers.get("content-type");
            if (response.status === 401 || !contentType || !contentType.includes("application/json")) {
                window.location.href = '/login.html';
                return;
            }
            if (!response.ok) throw new Error('Failed to load project details');
            
            const data = await response.json();
            const { project, tasks } = data;

            projectTasks = tasks; 
            projectTitleEl.textContent = `รายละเอียดโปรเจกต์: ${project.project_name}`;
            renderHeader(project);
            renderInfo(project);
            renderGanttChart(project, tasks);

        } catch (error) {
            console.error(error);
            infoContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }

    function renderHeader(project) { /* ... โค้ดเดิม ... */ }
    function renderInfo(project) { /* ... โค้ดเดิม ... */ }

    // --- ฟังก์ชัน Gantt Chart (ฉบับยกเครื่องใหม่) ---
    function renderGanttChart(project, tasks) {
        if (!tasks || !project.start_date || !project.target_date) {
            ganttContainer.innerHTML = '<h3 class="card-title">Gantt Chart</h3><p class="text-muted">ไม่มีข้อมูล Task หรือยังไม่ได้กำหนดวันเริ่มต้น/สิ้นสุดของโปรเจกต์</p>';
            return;
        }

        const startDate = new Date(project.start_date);
        const endDate = new Date(project.target_date);
        endDate.setDate(endDate.getDate() + 1);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

        // --- Generate Timeline Header ---
        let yearHeader = '<div class="d-flex">';
        let monthHeader = '<div class="d-flex">';
        let years = {};
        let months = {};

        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const year = d.getFullYear();
            const monthYear = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            years[year] = (years[year] || 0) + 1;
            months[monthYear] = (months[monthYear] || 0) + 1;
        }

        Object.keys(years).forEach(year => {
            const yearWidthPercent = (years[year] / totalDays) * 100;
            yearHeader += `<div class="text-center border-end fw-bold" style="width: ${yearWidthPercent}%">${year}</div>`;
        });
        yearHeader += '</div>';

        Object.keys(months).forEach(monthYear => {
            const monthWidthPercent = (months[monthYear] / totalDays) * 100;
            monthHeader += `<div class="text-center border-end small text-muted" style="width: ${monthWidthPercent}%">${monthYear.split(' ')[0]}</div>`;
        });
        monthHeader += '</div>';

        const timelineHeader = `
            <div class="gantt-header mb-2">
                <div class="d-flex">
                    <div style="width: 25%;" class="pe-3"><strong>Task</strong></div>
                    <div style="width: 75%;" class="border-start">
                        ${yearHeader}
                        ${monthHeader}
                    </div>
                </div>
            </div>`;

        // --- Generate Task Bars ---
        let tasksHtml = '';
        tasks.forEach(task => {
            const taskStart = new Date(task.start_date || project.start_date);
            const taskEnd = new Date(task.end_date || project.target_date);
            
            const clampedTaskStart = new Date(Math.max(startDate, taskStart));
            const clampedTaskEnd = new Date(Math.min(endDate, taskEnd));
            clampedTaskEnd.setDate(clampedTaskEnd.getDate() + 1);

            const taskDuration = Math.max(1, Math.ceil((clampedTaskEnd - clampedTaskStart) / (1000 * 60 * 60 * 24)));
            const startOffset = Math.max(0, Math.ceil((clampedTaskStart - startDate) / (1000 * 60 * 60 * 24)));
            
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (taskDuration / totalDays) * 100;

            const statusColors = { 'completed': 'bg-green', 'in_progress': 'bg-blue', 'pending': 'bg-secondary' };
            const statusColor = statusColors[task.status] || statusColors['pending'];
            
            tasksHtml += `
                <div class="row g-0 align-items-center mb-2">
                    <div class="col-3 text-truncate pe-3" title="${task.task_name}">
                        <small>${task.task_name}</small>
                    </div>
                    <div class="col-9">
                        <div class="progress-track position-relative rounded" style="height: 28px; cursor: pointer;" data-task-id="${task.id}">
                            <div class="gantt-bar ${statusColor} position-absolute rounded" role="progressbar" 
                                 style="left: ${leftPercent}%; width: ${widthPercent}%;"
                                 title="${task.task_name}">
                                <div class="gantt-progress rounded" style="width: ${task.progress}%;"></div>
                                <span class="position-absolute w-100 text-center text-white small" style="line-height: 28px; top: 0; left: 0;">${task.progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        ganttContainer.innerHTML = `
            <h3 class="card-title">Gantt Chart - Project Timeline</h3>
            <div class="gantt-wrapper border rounded p-3">
                ${timelineHeader}
                <div class="gantt-body mt-2">${tasksHtml}</div>
            </div>
        `;
    }

    // --- Task Update Modal Logic ---
    ganttContainer.addEventListener('click', (e) => {
        const progressBar = e.target.closest('.progress-track');
        if (progressBar) {
            const taskId = progressBar.dataset.taskId;
            openTaskModal(taskId);
        }
    });

    function openTaskModal(taskId) {
        const task = projectTasks.find(t => t.id == taskId);
        if (task) {
            taskUpdateForm.elements['task-id'].value = task.id;
            taskUpdateForm.elements['task-name'].value = task.task_name;
            taskUpdateForm.elements['task-status'].value = task.status;
            taskUpdateForm.elements['task-progress'].value = task.progress;
            document.getElementById('progress-value').textContent = task.progress;
            taskUpdateForm.elements['task-start-date'].value = task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '';
            taskUpdateForm.elements['task-end-date'].value = task.end_date ? new Date(task.end_date).toISOString().split('T')[0] : '';
            
            const modal = getTaskModalInstance();
            if (modal) modal.show();
        }
    }
    
    taskUpdateForm.elements['task-progress'].addEventListener('input', (e) => {
        document.getElementById('progress-value').textContent = e.target.value;
    });

    taskUpdateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = taskUpdateForm.elements['task-id'].value;
        const data = {
            status: taskUpdateForm.elements['task-status'].value,
            progress: parseInt(taskUpdateForm.elements['task-progress'].value),
            start_date: taskUpdateForm.elements['task-start-date'].value,
            end_date: taskUpdateForm.elements['task-end-date'].value
        };

        try {
            const response = await fetch(`/api/projects/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update task');
            
            alert('อัปเดต Task สำเร็จ!');
            const modal = getTaskModalInstance();
            if (modal) modal.hide();
            loadProjectDetails();
        } catch (error) {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    // --- Initial Load ---
    loadProjectDetails();
});

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const moldId = urlParams.get('id');

    // --- Element References ---
    const moldTitle = document.getElementById('mold-title');
    const mainDetailsContainer = document.getElementById('main-details-container');
    const editMoldBtn = document.getElementById('edit-mold-btn');
    const managePartsBtn = document.getElementById('manage-parts-btn');
    const partListBody = document.getElementById('part-list-body');

    if (!moldId) {
        document.body.innerHTML = '<div class="container-xl"><div class="alert alert-danger">ไม่พบ ID ของแม่พิมพ์</div></div>';
        return;
    }
    
    // ตั้งค่าลิงก์ปุ่มต่างๆ
    editMoldBtn.href = `/edit-mold.html?id=${moldId}`;
    managePartsBtn.href = `/manage-parts.html?moldId=${moldId}`;

    // --- ฟังก์ชันสร้าง QR Code ---
    function generateQRCode(url) {
        try {
            const typeNumber = 4;
            const errorCorrectionLevel = 'L';
            const qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData(url);
            qr.make();
            const qrcodeContainer = document.querySelector('#qrcode-container');
            if(qrcodeContainer) {
                qrcodeContainer.innerHTML = qr.createImgTag(6, 8);
            }
        } catch (error) {
            console.error("Could not generate QR Code", error);
        }
    }

    // --- ฟังก์ชันโหลดข้อมูลแม่พิมพ์ ---
    async function loadMoldDetails() {
        try {
            const response = await fetch(`/api/molds/${moldId}`);
            if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลแม่พิมพ์ได้');
            
            const result = await response.json();
            const mold = result.data;

            moldTitle.textContent = `รายละเอียดแม่พิมพ์: ${mold.mold_code}`;

            mainDetailsContainer.innerHTML = `
                <div class="row g-4">
                    <div class="col-md-7">
                        <fieldset class="form-fieldset">
                            <legend>ข้อมูลทั่วไป</legend>
                            <dl class="row">
                                <dt class="col-5">รหัสแม่พิมพ์:</dt><dd class="col-7">${mold.mold_code}</dd>
                                <dt class="col-5">ชื่อแม่พิมพ์:</dt><dd class="col-7">${mold.mold_name}</dd>
                                <dt class="col-5">ลูกค้า:</dt><dd class="col-7">${mold.customer_name || '-'}</dd>
                                <dt class="col-5">วันที่รับเข้า:</dt><dd class="col-7">${mold.received_date ? new Date(mold.received_date).toLocaleDateString('th-TH') : '-'}</dd>
                                <dt class="col-5">ตำแหน่งจัดเก็บ:</dt><dd class="col-7">${mold.storage_location || '-'}</dd>
                                <dt class="col-5">สถานะ:</dt><dd class="col-7"><span class="badge bg-secondary-lt">${mold.status}</span></dd>
                            </dl>
                        </fieldset>
                        <fieldset class="form-fieldset mt-4">
                            <legend>รายละเอียดทางเทคนิค</legend>
                            <dl class="row">
                                <dt class="col-5">ประเภทแม่พิมพ์:</dt><dd class="col-7">${mold.mold_type || '-'}</dd>
                                <dt class="col-5">ระบบ Runner:</dt><dd class="col-7">${mold.runner_system || '-'}</dd>
                                <dt class="col-5">ประเภท Gate:</dt><dd class="col-7">${mold.gate_type || '-'}</dd>
                                <dt class="col-5">ขนาด (กxยxส):</dt><dd class="col-7">${mold.size_w || '-'} x ${mold.size_l || '-'} x ${mold.size_h || '-'} mm.</dd>
                                <dt class="col-5">น้ำหนัก:</dt><dd class="col-7">${mold.weight || '-'} Kg.</dd>
                                <dt class="col-5">จำนวน Cavity:</dt><dd class="col-7">${mold.cavity || '-'}</dd>
                                <dt class="col-5">Shot Counter:</dt><dd class="col-7">${(mold.shot_counter || 0).toLocaleString()}</dd>
                            </dl>
                        </fieldset>
                    </div>
                    <div class="col-md-5">
                        <fieldset class="form-fieldset">
                            <legend>รูปภาพ</legend>
                            <div class="row g-3">
                                <div class="col-6 text-center"><label class="form-label">รูปด้าน Core</label><img src="${mold.core_image_path || 'https://placehold.co/400x300?text=No+Image'}" class="img-preview"></div>
                                <div class="col-6 text-center"><label class="form-label">รูปด้าน Cavity</label><img src="${mold.cavity_image_path || 'https://placehold.co/400x300?text=No+Image'}" class="img-preview"></div>
                                <div class="col-12 text-center mt-3"><label class="form-label">รูปชิ้นงาน</label><img src="${mold.part_image_path || 'https://placehold.co/600x400?text=No+Image'}" class="img-preview" style="max-height: 250px;"></div>
                            </div>
                        </fieldset>
                        <fieldset class="form-fieldset mt-4">
                            <legend>QR Code</legend>
                            <div class="text-center" id="qrcode-container"></div>
                        </fieldset>
                    </div>
                </div>
            `;
            generateQRCode(window.location.href);
        } catch (error) {
            console.error(error);
            mainDetailsContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }

    // --- ฟังก์ชันโหลด Part List ---
    async function loadPartList() {
        try {
            const response = await fetch(`/api/molds/${moldId}/parts`);
            if (!response.ok) throw new Error('Failed to load part list');
            const result = await response.json();
            
            partListBody.innerHTML = '';
            if (result.data.length === 0) {
                partListBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีข้อมูล Part List</td></tr>';
                return;
            }

            result.data.forEach(part => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${part.part_number}</td>
                    <td>${part.part_name}</td>
                    <td class="text-center">${part.quantity}</td>
                    <td>${part.material || '-'}</td>
                `;
                partListBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            partListBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">เกิดข้อผิดพลาด</td></tr>';
        }
    }

    // --- เริ่มต้นการทำงาน ---
    loadMoldDetails();
    loadPartList();
});

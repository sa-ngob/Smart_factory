document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    const itemTitle = document.getElementById('item-title');
    const detailsContainer = document.getElementById('item-details-container');
    const editItemBtn = document.getElementById('edit-item-btn');

    if (!itemId) {
        document.body.innerHTML = '<div class="alert alert-danger">ไม่พบ ID ของสินค้า</div>';
        return;
    }
    
    editItemBtn.href = `/edit-item.html?id=${itemId}`;

    async function loadItemDetails() {
        try {
            const response = await fetch(`/api/items/${itemId}`);
            if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');
            
            const result = await response.json();
            const item = result.data;

            itemTitle.textContent = `รายละเอียดสินค้า: ${item.item_code}`;

            detailsContainer.innerHTML = `
                <div class="row g-4">
                    <div class="col-md-8">
                        <fieldset class="form-fieldset">
                            <legend>ข้อมูลทั่วไป</legend>
                            <dl class="row">
                                <dt class="col-4">รหัสสินค้า:</dt><dd class="col-8">${item.item_code}</dd>
                                <dt class="col-4">ชื่อสินค้า:</dt><dd class="col-8">${item.item_name}</dd>
                                <dt class="col-4">ลูกค้า:</dt><dd class="col-8">${item.customer_name || '-'}</dd>
                                <dt class="col-4">รุ่น:</dt><dd class="col-8">${item.model || '-'}</dd>
                                <dt class="col-4">ประเภท:</dt><dd class="col-8">${item.item_type}</dd>
                                <dt class="col-4">หน่วยนับ:</dt><dd class="col-8">${item.uom || '-'}</dd>
                                <dt class="col-4">สถานะ:</dt><dd class="col-8">${item.status}</dd>
                            </dl>
                        </fieldset>
                        <fieldset class="form-fieldset mt-4">
                            <legend>ข้อมูลทางเทคนิค</legend>
                            <dl class="row">
                                <dt class="col-4">ชื่อวัตถุดิบ:</dt><dd class="col-8">${item.material_name || '-'}</dd>
                                <dt class="col-4">เกรด:</dt><dd class="col-8">${item.grade || '-'}</dd>
                                <dt class="col-4">สี:</dt><dd class="col-8">${item.colour || '-'}</dd>
                                <dt class="col-4">น้ำหนักชิ้นงาน:</dt><dd class="col-8">${item.part_weight_gram || '-'} กรัม</dd>
                                <dt class="col-4">Cycle Time:</dt><dd class="col-8">${item.cycle_time_sec || '-'} วินาที</dd>
                            </dl>
                        </fieldset>
                    </div>
                    <div class="col-md-4">
                        <fieldset class="form-fieldset">
                            <legend>รูปภาพ</legend>
                            <img src="${item.image_path || 'https://placehold.co/600x400?text=No+Image'}" class="img-fluid rounded">
                        </fieldset>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error(error);
            detailsContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }

    loadItemDetails();
});

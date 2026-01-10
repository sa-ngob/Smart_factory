
let fileCounter = 0;
for (const cat of categories) {
    // 1. กำหนดให้ imagePath เป็น path ของรูปเดิมก่อน
    let imagePath = cat.existing_image_path; 

    // 2. หาว่ามีไฟล์ใหม่สำหรับ category นี้แนบมาหรือไม่
    const newFile = req.files.find(f => f.fieldname === `drawing_cat_${fileCounter}`);

    // 3. ถ้ามีไฟล์ใหม่ ให้ใช้ path ของไฟล์ใหม่แทน
    if (newFile) {
        imagePath = newFile.path.replace(/\\/g, "/").replace('public/', '');
        fileCounter++;
    }

    // 4. ถ้าสุดท้ายแล้วยังไม่มี path ใดๆ เลย ให้โยน Error
    if (!imagePath) {
        throw new Error(`Image is missing for category "${cat.category_name}"`);
    }

    // ... โค้ดส่วนที่เหลือของ Loop ...
}
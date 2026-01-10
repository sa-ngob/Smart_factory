document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('mold-form');
    if (!form) {
        console.error('Mold form not found!');
        return;
    }

    // ===== Helpers =====
    const urlParams = new URLSearchParams(location.search);
    const moldId = urlParams.get('id');

    function toNumOrNull(v) {
        if (v === '' || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function normalizePayload(f) {
        return {
            mold_code: f['mold_code'].value.trim(),
            mold_name: f['mold_name'].value.trim(),
            customer_id: f['customer_id'].value ? Number(f['customer_id'].value) : null,
            received_date: f['received_date'].value || null,
            storage_location: f['storage_location'].value || null,
            mold_type: f['mold_type'].value || null,
            runner_system: f['runner_system'].value || null,
            gate_type: f['gate_type'].value || null,
            size_w: toNumOrNull(f['size_w'].value),
            size_l: toNumOrNull(f['size_l'].value),
            size_h: toNumOrNull(f['size_h'].value),
            weight: toNumOrNull(f['weight'].value),
            cavity: toNumOrNull(f['cavity'].value),
            part_weight_gram: toNumOrNull(f['part_weight_gram'].value),
            runner_weight_gram: toNumOrNull(f['runner_weight_gram'].value),
            cycle_time_sec: toNumOrNull(f['cycle_time_sec'].value),
            shot_counter: toNumOrNull(f['shot_counter'].value)
        };
    }

    // ===== Loaders =====
    async function loadCustomers() {
        try {
            const r = await fetchWithAuth('/api/entities?type=customer');
            const result = await r.json();
            const items = result?.data || [];
            const sel = form.elements['customer_id'];
            sel.innerHTML = '<option value="">-- ไม่ระบุ --</option>';
            for (const c of items) {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name ?? c.customer_name ?? `Customer #${c.id}`;
                sel.appendChild(opt);
            }
        } catch (e) {
            console.error(e);
            alert('โหลดรายชื่อลูกค้าไม่สำเร็จ');
        }
    }

    function fillForm(obj) {
        if (!obj) return;
        const f = form.elements;
        const set = (name, val) => { if (f[name]) f[name].value = (val ?? ''); };

        set('mold_code', obj.mold_code);
        set('mold_name', obj.mold_name);
        set('customer_id', obj.customer_id);
        set('received_date', obj.received_date ? new Date(obj.received_date).toISOString().split('T')[0] : '');
        set('storage_location', obj.storage_location);
        set('mold_type', obj.mold_type);
        set('runner_system', obj.runner_system);
        set('gate_type', obj.gate_type);
        set('size_w', obj.size_w);
        set('size_l', obj.size_l);
        set('size_h', obj.size_h);
        set('weight', obj.weight);
        set('cavity', obj.cavity);
        set('part_weight_gram', obj.part_weight_gram);
        set('runner_weight_gram', obj.runner_weight_gram);
        set('cycle_time_sec', obj.cycle_time_sec);
        set('shot_counter', obj.shot_counter);
    }

    async function loadMold() {
        if (!moldId) {
            alert('ไม่พบรหัสแม่พิมพ์ใน URL');
            return;
        }
        try {
            await loadCustomers();
            const r = await fetchWithAuth(`/api/molds/${moldId}`);
            const result = await r.json();
            const mold = result?.data;
            fillForm(mold);
        } catch (e) {
            console.error(e);
            alert('โหลดข้อมูลแม่พิมพ์ไม่สำเร็จ: ' + e.message);
        }
    }

    // ===== Save =====
    async function saveMold(e) {
        e.preventDefault();
        if (!moldId) {
            alert('ไม่พบรหัสแม่พิมพ์');
            return;
        }

        const payload = normalizePayload(form.elements);

        try {
            const res = await fetchWithAuth(`/api/molds/${moldId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // fetchWithAuth จะ throw error ถ้า !res.ok
            // ดังนั้นเราสามารถมั่นใจได้ว่าโค้ดส่วนนี้จะทำงานเมื่อสำเร็จเท่านั้น
            alert('บันทึกสำเร็จ');
            window.location.href = `/mold-details.html?id=${moldId}`;
        } catch (err) {
            // fetchWithAuth จะจัดการเรื่อง redirect ถ้าเป็น 401
            // ส่วน error อื่นๆ จะถูก alert ที่นี่
            console.error('Save Error:', err);
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
        }
    }

    // ===== Init =====
    form.addEventListener('submit', saveMold);
    loadMold();
});

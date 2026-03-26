document.addEventListener('DOMContentLoaded', async function () {
    // โหลดข้อมูลเมื่อเปิดหน้า
    await loadReturnStats();
    await loadReturnList();
    initSearch();
});

// ── 📊 1. โหลดสถิติตัวเลขด้านบน (Stat Cards) ────────────────
async function loadReturnStats() {
    try {
        const response = await fetch('/api/bookings/stats', { // ใช้ตัวเดียวกับหน้าจองหรือสร้างใหม่ก็ได้
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (result.success) {
            // อัปเดตตัวเลขตาม ID ที่เราตั้งไว้ใน HTML
            document.getElementById('statRetTotal').textContent = result.data.total || 0;
            document.getElementById('statRetPending').textContent = result.data.waiting || 0;
            document.getElementById('statRetPass').textContent = result.data.received || 0;
        }
    } catch (err) { console.error("Load Stats Error:", err); }
}

// ── 📋 2. โหลดรายการที่ต้องคืนลงตาราง ──────────────────────
async function loadReturnList(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`/api/returns?${query}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        const tbody = document.getElementById('returnTableBody');
        if (!tbody) return;

        if (!result.success || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px">ไม่มีรายการรอคืนสินค้า</td></tr>';
            return;
        }

        tbody.innerHTML = result.data.map(b => {
            const isLate = new Date() > new Date(b.rental_end);
            return `
            <tr>
                <td><span class="OrderId">#ORD-${String(b.id).padStart(4, '0')}</span></td>
                <td>
                    <div class="CustCell">
                        <span class="CustName">${b.full_name}</span>
                        <span class="CustPhone">${b.phone || '-'}</span>
                    </div>
                </td>
                <td>
                    <div class="ProdCell">
                        <img class="ProdThumb" src="${b.image_url}" onerror="this.src='images/default.png'">
                        <div><div class="ProdName">${b.product_name}</div><div class="ProdSize">ไซส์ ${b.size || '-'}</div></div>
                    </div>
                </td>
                <td>
                    <div class="DateBadge ${isLate ? 'DateBadge--late' : ''}">
                        ${isLate ? '⚠️ ' : ''}${formatDate(b.rental_end)}
                    </div>
                </td>
                <td><span class="ReturnBadge ReturnBadge--pending"><span class="ReturnBadge-dot"></span>รอตรวจสอบ</span></td>
                <td><strong>${b.deposit_amount.toLocaleString()} ฿</strong></td>
                <td><span class="DepositBadge DepositBadge--pending">รอดำเนินการ</span></td>
                <td>
                    <div class="ActionGroup">
                        <button class="BtnAction BtnAction--inspect" title="ตรวจรับคืน" onclick="openReturnModal(${b.id})">🔍</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        document.getElementById('tableCount').textContent = `แสดง ${result.data.length} รายการ`;
    } catch (err) { console.error("Load Returns Error:", err); }
}

// ── 👁️ 3. เปิด Modal ตรวจสภาพ (QC) ──────────────────────
window.openReturnModal = async function(id) {
    const response = await fetch(`/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (result.success) {
        const b = result.data;
        
        // คำนวณวันเลท (ส่งเลทปรับวันละ 100)
        const today = new Date();
        const deadline = new Date(b.rental_end);
        const lateDays = Math.max(0, Math.floor((today - deadline) / (1000 * 60 * 60 * 24)));
        const lateFine = lateDays * 100;

        document.getElementById('modalTitle').textContent = `ตรวจรับคืนสินค้า – #ORD-${String(b.id).padStart(4, '0')}`;
        document.getElementById('modalReturnContent').innerHTML = `
            <div class="ReturnBanner">
                <img src="${b.image_url}" class="ReturnBanner-img">
                <div class="ReturnBanner-info">
                    <strong>${b.product_name}</strong><br>
                    <small>ลูกค้า: ${b.full_name}</small><br>
                    <span style="color:var(--color-primary)">มัดจำที่ต้องคืน: <span id="finalRefund">${b.deposit_amount - lateFine}</span> ฿</span>
                    ${lateDays > 0 ? `<div style="color:red; font-size:12px;">หักค่าปรับส่งเลท ${lateDays} วัน: -${lateFine} ฿</div>` : ''}
                </div>
            </div>
            <div class="Section" style="margin-top:20px">
                <label>เช็กลิสต์ตรวจสภาพ</label>
                <div class="QcGrid">
                    <label class="QcItem"><input type="checkbox" checked> สภาพผ้าปกติ</label>
                    <label class="QcItem"><input type="checkbox" checked> ซิป/กระดุมครบ</label>
                    <label class="QcItem"><input type="checkbox" checked> อุปกรณ์เสริมครบ</label>
                </div>
                <label style="margin-top:15px">ค่าปรับความเสียหาย (ถ้ามี)</label>
                <input type="number" id="defectFine" class="FormControl" value="0" oninput="updateRefund(${b.deposit_amount - lateFine})">
                <label style="margin-top:10px">หมายเหตุ</label>
                <textarea id="returnNote" class="NotesInput" placeholder="ระบุสภาพสินค้าเพิ่มเติม..."></textarea>
            </div>
        `;

        document.getElementById('btnConfirmAction').onclick = () => processReturn(id);
        document.getElementById('returnModal').classList.add('open');
    }
}

function updateRefund(base) {
    const fine = document.getElementById('defectFine').value || 0;
    document.getElementById('finalRefund').textContent = (base - fine).toLocaleString();
}

// ── ✅ 4. ยืนยันการคืนชุด (คืนสต็อกจริง) ──────────────────
async function processReturn(id) {
    const fine = document.getElementById('defectFine').value || 0;
    const note = document.getElementById('returnNote').value;

    const result = await Swal.fire({
        title: 'ยืนยันการรับคืน?',
        text: "ระบบจะทำการคืนสต็อกสินค้าและปิดออเดอร์นี้",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        const response = await fetch(`/api/returns/${id}/confirm`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ fine_amount: fine, note: note })
        });

        const res = await response.json();
        if (res.success) {
            Swal.fire('สำเร็จ!', 'รับคืนชุดและคืนสต็อกเรียบร้อย', 'success');
            document.getElementById('returnModal').classList.remove('open');
            loadReturnList();
            loadReturnStats();
        }
    }
}

// ── 🔍 5. ค้นหา ──────────────────────────────────────────
function initSearch() {
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        loadReturnList({ search: e.target.value });
    });
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
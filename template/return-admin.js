/**
 * 🔄 Return & QC Management (Admin) - Enhanced Version
 * Features: QC status filter, Return status filter, Status badges
 */

let currentReturnId = null;
let currentFilters = { status: '', returnStatus: '' };

document.addEventListener('DOMContentLoaded', async function () {
    await loadReturnStats();
    await loadReturnList();
    initSearch();

    // ── Filter: QC Status ──
    document.getElementById('filterQC')?.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        loadReturnList(currentFilters);
    });

    // ── Filter: Return Status (คืนแล้ว / รอรับคืน) ──
    document.getElementById('filterReturn')?.addEventListener('change', (e) => {
        currentFilters.returnStatus = e.target.value;
        loadReturnList(currentFilters);
    });

    // ── Stat Card click-to-filter ──
    document.querySelectorAll('.StatCard[data-filter]').forEach(card => {
        card.addEventListener('click', () => {
            const filterVal = card.dataset.filter;
            // toggle off if already active
            if (currentFilters.status === filterVal) {
                currentFilters.status = '';
                document.getElementById('filterQC').value = '';
            } else {
                currentFilters.status = filterVal;
                document.getElementById('filterQC').value = filterVal;
            }
            // highlight active card
            document.querySelectorAll('.StatCard[data-filter]').forEach(c => c.classList.remove('StatCard--active'));
            if (currentFilters.status) card.classList.add('StatCard--active');
            loadReturnList(currentFilters);
        });
    });
});

// ── 📊 Stat Cards ────────────────────────────────────────────
async function loadReturnStats() {
    try {
        const response = await fetch('/api/bookings/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (result.success) {
            const s = result.data;
            
            // 🔢 แยก Logic การนับใหม่
            const waitingReturn = s.shipped || 0;     // 🕒 รอรับคืน (ของยังไม่ถึงมือ)
            const received = s.received || 0;        // ✅ ผ่านการตรวจ
            const rejected = s.rejected || 0;        // ❌ พบตำหนิ
            const totalReturned = received + rejected; // 📦 คืนแล้วทั้งหมด (ของถึงมือแล้ว)

            // 🎯 อัปเดตตัวเลขบนหน้าจอ
            // 1. รอรับคืนทั้งหมด (ควรนับเฉพาะที่ยังไม่คืน)
            if(document.getElementById('statRetTotal')) 
                document.getElementById('statRetTotal').textContent = waitingReturn;
            
            // 2. คืนแล้ว (นับรวมพวกที่ตรวจเสร็จแล้ว)
            if(document.getElementById('statRetReturned')) 
                document.getElementById('statRetReturned').textContent = totalReturned;

            // 3. รอตรวจสอบ (ก็คือรอรับคืนนั่นแหละ)
            if(document.getElementById('statRetPending')) 
                document.getElementById('statRetPending').textContent = waitingReturn;

            // 4. ผ่านการตรวจ
            if(document.getElementById('statRetPass')) 
                document.getElementById('statRetPass').textContent = received;

            // 5. พบตำหนิ
            if(document.getElementById('statRetDefect')) 
                document.getElementById('statRetDefect').textContent = rejected;
        }
    } catch (err) { console.error("Load Stats Error:", err); }
}
// ── 📋 Return Table ──────────────────────────────────────────
async function loadReturnList(params = {}) {
    const token = localStorage.getItem('token');

    // Build query — only send status to API (returnStatus is client-side)
    const apiParams = {};
    if (params.status) apiParams.status = params.status;
    const query = new URLSearchParams(apiParams).toString();

    try {
        const response = await fetch(`/api/bookings?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const tbody = document.getElementById('returnTableBody');
        if (!tbody) return;

        let returnData = (result.data || []).filter(b =>
            ['shipped', 'received', 'rejected'].includes(b.status)
        );

        // ── Client-side: filter by returnStatus ──
        if (params.returnStatus === 'returned') {
            returnData = returnData.filter(b => b.status !== 'shipped');
        } else if (params.returnStatus === 'waiting') {
            returnData = returnData.filter(b => b.status === 'shipped');
        }

        // ── Client-side: filter by search ──
        const searchVal = document.getElementById('searchInput')?.value?.toLowerCase() || '';
        if (searchVal) {
            returnData = returnData.filter(b =>
                b.full_name?.toLowerCase().includes(searchVal) ||
                String(b.id).includes(searchVal)
            );
        }

        if (!result.success || returnData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px; color:#999;">
                        <div style="font-size:32px; margin-bottom:8px;">📭</div>
                        ไม่มีรายการที่ตรงกับเงื่อนไข
                    </td>
                </tr>`;
            return;
        }

        // ── Badge maps ──
        const qcBadge = {
            shipped:  `<span class="Badge Badge--pending">⏳ รอตรวจสอบ</span>`,
            received: `<span class="Badge Badge--pass">✅ ผ่านการตรวจ</span>`,
            rejected: `<span class="Badge Badge--defect">❌ พบตำหนิ</span>`
        };

        const returnBadge = (status) => status === 'shipped'
            ? `<span class="Badge Badge--waiting">🕐 รอรับคืน</span>`
            : `<span class="Badge Badge--returned">📦 คืนแล้ว</span>`;

        tbody.innerHTML = returnData.map(b => {
            const isLate = new Date() > new Date(b.rental_end) && b.status === 'shipped';
            const deposit = b.deposit_amount || 0;

            return `
            <tr class="TableRow">
                <td><span class="OrderId">#ORD-${String(b.id).padStart(4, '0')}</span></td>
                <td><span class="CustName">${b.full_name}</span></td>
                <td><div class="ProdName">${b.product_name}</div></td>
                <td>
                    <div class="${isLate ? 'DateBadge--late' : 'DateBadge'}">
                        ${isLate ? '⚠️ ' : ''}${formatDate(b.rental_end)}
                    </div>
                </td>
                <td>${qcBadge[b.status] || b.status}</td>
                <td>${returnBadge(b.status)}</td>
                <td><strong class="DepositAmt">${Number(deposit).toLocaleString()} ฿</strong></td>
                <td>
                    <div class="ActionGroup">
                        <button class="BtnAction BtnAction--inspect" onclick="openReturnModal(${b.id})" title="ตรวจสอบ">
                            🔍
                        </button>
                        ${b.status === 'shipped' ? `
                        <button class="BtnAction BtnAction--quick" onclick="quickMarkReturned(${b.id})" title="รับคืนด่วน">
                            📥
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');

    } catch (err) { console.error("Load List Error:", err); }
}

// ── ⚡ Quick Mark as Returned ────────────────────────────────
window.quickMarkReturned = async function(id) {
    const result = await Swal.fire({
        title: 'รับคืนสินค้าด่วน?',
        text: 'บันทึกว่าลูกค้าคืนสินค้าแล้ว (ไม่มีตำหนิ)',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#114E72',
        confirmButtonText: '✅ ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`/api/bookings/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'received', tracking_number: 'Quick return - no defects' })
        });
        const data = await res.json();
        if (data.success) {
            await Swal.fire('สำเร็จ!', 'อัปเดตสถานะเรียบร้อยแล้ว', 'success');
            await loadReturnStats();
            await loadReturnList(currentFilters);
        } else {
            Swal.fire('ผิดพลาด', data.message, 'error');
        }
    } catch (e) {
        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
};

// ── 👁️ Open QC Modal ─────────────────────────────────────────
window.openReturnModal = async function(id) {
    const response = await fetch(`/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (!result.success) return;

    const b = result.data;
    const deposit  = Number(b.deposit_amount || 0);
    const today    = new Date();
    const deadline = new Date(b.rental_end);
    const lateDays = Math.max(0, Math.floor((today - deadline) / (1000 * 60 * 60 * 24)));
    const lateFine = b.status === 'shipped' ? lateDays * 100 : 0;

    document.getElementById('modalTitle').textContent =
        `ตรวจรับคืนสินค้า – #ORD-${String(b.id).padStart(4, '0')}`;

    document.getElementById('modalReturnContent').innerHTML = `
        <!-- Product Info -->
        <div class="Modal-product">
            <img src="${b.image_url}" class="Modal-product-img" alt="${b.product_name}">
            <div class="Modal-product-info">
                <strong class="Modal-product-name">${b.product_name}</strong>
                <div class="Modal-product-meta">👤 ${b.full_name}</div>
                <div class="Modal-product-meta">📅 คืนวันที่: ${formatDate(b.rental_end)}</div>
                ${lateDays > 0 ? `<div class="Modal-late-warning">⚠️ เกินกำหนด ${lateDays} วัน (ค่าปรับ ${lateFine.toLocaleString()} ฿)</div>` : ''}
            </div>
        </div>

        <!-- QC Status Selector -->
        <div class="QC-StatusSelect">
            <label class="QC-StatusSelect-label">📋 ผลการตรวจสอบ QC</label>
            <div class="QC-StatusSelect-options" id="qcStatusOptions">
                <button type="button" class="QC-Option QC-Option--pending ${b.status === 'shipped' ? 'active' : ''}" 
                        onclick="setQCStatus('shipped', ${deposit - lateFine})">
                    <span class="QC-Option-icon">⏳</span>
                    <span class="QC-Option-label">รอตรวจสอบ</span>
                </button>
                <button type="button" class="QC-Option QC-Option--pass ${b.status === 'received' ? 'active' : ''}" 
                        onclick="setQCStatus('received', ${deposit - lateFine})">
                    <span class="QC-Option-icon">✅</span>
                    <span class="QC-Option-label">ผ่านการตรวจ</span>
                </button>
                <button type="button" class="QC-Option QC-Option--defect ${b.status === 'rejected' ? 'active' : ''}" 
                        onclick="setQCStatus('rejected', ${deposit - lateFine})">
                    <span class="QC-Option-icon">❌</span>
                    <span class="QC-Option-label">พบตำหนิ</span>
                </button>
            </div>
            <input type="hidden" id="selectedQCStatus" value="${b.status}">
        </div>

        <!-- Return Status Toggle -->
        <div class="ReturnToggle">
            <label class="ReturnToggle-label">📦 สถานะการรับคืน</label>
            <div class="ReturnToggle-options">
                <label class="ToggleOption ${b.status === 'shipped' ? 'ToggleOption--waiting active' : 'ToggleOption--waiting'}">
                    <input type="radio" name="returnStatus" value="waiting" 
                           ${b.status === 'shipped' ? 'checked' : ''} 
                           onchange="handleReturnStatusChange(this.value)">
                    <span>🕐 รอรับคืน</span>
                </label>
                <label class="ToggleOption ${b.status !== 'shipped' ? 'ToggleOption--returned active' : 'ToggleOption--returned'}">
                    <input type="radio" name="returnStatus" value="returned" 
                           ${b.status !== 'shipped' ? 'checked' : ''} 
                           onchange="handleReturnStatusChange(this.value)">
                    <span>📦 คืนแล้ว</span>
                </label>
            </div>
        </div>

        <!-- Refund Summary -->
        <div class="Refund-Summary">
            <div class="Refund-row">
                <span>มัดจำตั้งต้น</span>
                <span>${deposit.toLocaleString()} ฿</span>
            </div>
            ${lateFine > 0 ? `
            <div class="Refund-row Refund-row--deduct">
                <span>หักส่งช้า (${lateDays} วัน × 100 ฿)</span>
                <span>−${lateFine.toLocaleString()} ฿</span>
            </div>` : ''}
            <div class="Refund-row">
                <span>ค่าปรับความเสียหาย</span>
                <span>
                    <input type="number" id="defectFine" value="0" min="0" step="50"
                           style="width:90px; padding:4px 8px; border:1px solid #ddd; border-radius:6px; text-align:right;"
                           oninput="updateRefund(${deposit - lateFine})">
                     ฿
                </span>
            </div>
            <div class="Refund-row Refund-row--total">
                <span>💰 ยอดคืนมัดจำสุทธิ</span>
                <span id="finalRefund" class="Refund-final">${(deposit - lateFine).toLocaleString()} ฿</span>
            </div>
        </div>

        <!-- Note -->
        <div style="margin-top:12px;">
            <label style="font-weight:600; font-size:13px; display:block; margin-bottom:6px; color:#444;">
                📝 หมายเหตุการรับคืน
            </label>
            <textarea id="returnNote" 
                      style="width:100%; height:70px; padding:10px; border:1px solid #ddd; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical;"
                      placeholder="ระบุสภาพสินค้าเพิ่มเติม..."></textarea>
        </div>
    `;

    document.getElementById('btnConfirmAction').onclick = () => processReturn(id);
    document.getElementById('returnModal').classList.add('open');
};

// ── QC Status Selector ───────────────────────────────────────
window.setQCStatus = function(status, base) {
    document.getElementById('selectedQCStatus').value = status;
    document.querySelectorAll('.QC-Option').forEach(btn => btn.classList.remove('active'));
    const map = { shipped: 'pending', received: 'pass', rejected: 'defect' };
    document.querySelector(`.QC-Option--${map[status]}`)?.classList.add('active');

    // If defect, enable fine input hint
    const fineInput = document.getElementById('defectFine');
    if (status === 'rejected' && fineInput && parseInt(fineInput.value) === 0) {
        fineInput.focus();
    }
    updateRefund(base);
};

// ── Return Status Toggle ─────────────────────────────────────
window.handleReturnStatusChange = function(value) {
    document.querySelectorAll('.ToggleOption').forEach(el => el.classList.remove('active'));
    const activeLabel = document.querySelector(`input[name="returnStatus"][value="${value}"]`)?.closest('.ToggleOption');
    if (activeLabel) activeLabel.classList.add('active');
};

window.updateRefund = function(base) {
    const fine = parseInt(document.getElementById('defectFine')?.value) || 0;
    const final = Math.max(0, base - fine);
    const el = document.getElementById('finalRefund');
    if (el) el.textContent = final.toLocaleString() + ' ฿';
};

// ── Process Return ───────────────────────────────────────────
async function processReturn(id) {
    const qcStatus     = document.getElementById('selectedQCStatus')?.value || 'received';
    const returnStatus = document.querySelector('input[name="returnStatus"]:checked')?.value || 'returned';
    const fine         = parseInt(document.getElementById('defectFine')?.value) || 0;
    const note         = document.getElementById('returnNote')?.value || '';

    // Determine final API status
    let finalStatus;
    if (returnStatus === 'waiting') {
        finalStatus = 'shipped'; // still waiting
    } else {
        // Returned — use QC result
        finalStatus = qcStatus === 'rejected' ? 'rejected' : 'received';
    }

    const statusLabel = {
        shipped:  '🕐 อัปเดตเป็น "รอรับคืน"',
        received: '✅ รับคืนสำเร็จ (ไม่มีตำหนิ)',
        rejected: `❌ พบตำหนิ หักค่าปรับ ${fine.toLocaleString()} ฿`
    };

    const result = await Swal.fire({
        title: 'ยืนยันการดำเนินการ?',
        text: statusLabel[finalStatus] || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#114E72',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`/api/bookings/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: finalStatus,
                tracking_number: `Fine: ${fine} | QC: ${qcStatus} | Note: ${note}`
            })
        });
        const data = await res.json();
        if (data.success) {
            await Swal.fire('สำเร็จ!', 'บันทึกเรียบร้อยแล้ว', 'success');
            document.getElementById('returnModal').classList.remove('open');
            await loadReturnStats();
            await loadReturnList(currentFilters);
        } else {
            Swal.fire('ผิดพลาด', data.message, 'error');
        }
    } catch (e) {
        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

// ── Search ───────────────────────────────────────────────────
function initSearch() {
    document.getElementById('searchInput')?.addEventListener('input', () => {
        loadReturnList(currentFilters);
    });
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
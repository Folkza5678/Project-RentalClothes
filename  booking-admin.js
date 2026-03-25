document.addEventListener('DOMContentLoaded', async function () {
  requireAdmin();
  await loadStats();
  await loadBookings();
  initSearch();
});

// ── Stat cards ────────────────────────────────────────────
async function loadStats() {
  const data = await api.get('/dashboard');
  if (!data) return;
  const d = data.data;
  const statusMap = Object.fromEntries(d.status_breakdown.map(s => [s.status, s.count]));
  setStatCard(0, d.monthly_orders);
  setStatCard(1, statusMap['waiting']  || 0);
  setStatCard(2, statusMap['shipped']  || 0);
  setStatCard(3, statusMap['received'] || 0);
  setStatCard(4, statusMap['cancelled']|| 0);
}

function setStatCard(idx, val) {
  const cards = document.querySelectorAll('.StatCard-value');
  if (cards[idx]) cards[idx].textContent = val;
}

// ── Order list ────────────────────────────────────────────
let currentPage = 1;

async function loadBookings(params = {}) {
  const query = new URLSearchParams({ page: currentPage, limit: 10, ...params }).toString();
  const data  = await api.get(`/bookings?${query}`);
  if (!data) return;

  const tbody = document.getElementById('orderTableBody');
  if (!tbody) return;

  if (!data.data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px">ไม่พบรายการ</td></tr>';
    return;
  }

  tbody.innerHTML = data.data.map(b => {
    const statusClass = { waiting:'waiting', packing:'packing', shipped:'shipped', received:'received', cancelled:'cancelled' };
    const statusTH    = { waiting:'รอแพ็ก', packing:'กำลังแพ็ก', shipped:'จัดส่งแล้ว', received:'รับสินค้าแล้ว', cancelled:'ยกเลิก' };
    const payIcon     = b.payment_status === 'paid' ? '✅ มีหลักฐาน' : '📎 รอหลักฐาน';
    const payClass    = b.payment_status === 'paid' ? 'PayProof--ok' : 'PayProof--none';
    return `
      <tr data-status="${b.status}">
        <td><span class="OrderId">#ORD-${String(b.id).padStart(4,'0')}</span></td>
        <td>
          <div class="CustCell">
            <span class="CustName">${b.full_name}</span>
            <span class="CustPhone">${b.phone || '-'}</span>
          </div>
        </td>
        <td>
          <div class="ProdCell">
            <div>
              <div class="ProdName">${b.product_name}</div>
              <div class="ProdSize">ไซส์ ${b.size || '-'}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="DateRange">
            <div class="DateRow"><span class="DateIcon">▶</span><span class="DateLabel">เริ่ม</span>${formatDate(b.rental_start)}</div>
            <div class="DateRow"><span class="DateIcon">◀</span><span class="DateLabel">คืน</span>${formatDate(b.rental_end)}</div>
          </div>
        </td>
        <td><span class="PayProof ${payClass}">${payIcon}</span></td>
        <td><span class="ShipBadge ShipBadge--${statusClass[b.status] || 'waiting'}">
          <span class="ShipBadge-dot"></span>${statusTH[b.status] || b.status}
        </span></td>
        <td>${b.tracking_number ? <span class="TrackNum">${b.tracking_number}</span> : '—'}</td>
        <td>
          <div class="ActionGroup">
            <button class="BtnAction BtnAction--view" onclick="openOrderModal(${b.id})">👁</button>
            <button class="BtnAction BtnAction--ship" onclick="openOrderModal(${b.id})">📦</button>
            <button class="BtnAction BtnAction--cancel" onclick="cancelOrder(${b.id})">✕</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const countEl = document.getElementById('orderCount');
  if (countEl) countEl.textContent = `แสดง ${data.data.length} รายการ (ทั้งหมด ${data.total})`;
}

// ── Open order detail modal ───────────────────────────────
async function openOrderModal(id) {
  const data = await api.get(`/bookings/${id}`);
  if (!data) return;
  const b = data.data;

  const titleEl = document.getElementById('modalOrderId');
  if (titleEl) titleEl.textContent = `รายละเอียดออเดอร์ #ORD-${String(b.id).padStart(4,'0')}`;

  const modal = document.getElementById('orderModal');
  if (modal) modal.classList.add('open');

  // ผูกปุ่ม save shipping
  window.saveShipping = async function () {
    const status  = document.getElementById('shipStatusSelect')?.value;
    const tracking= document.getElementById('trackingInput')?.value;
    const carrier = document.querySelector('.ShipForm-select:last-of-type')?.value;

    const result = await api.patch(`/bookings/${id}/status`, {
      status, tracking_number: tracking, shipping_carrier: carrier,
    });
    if (result) {
      showToast('success', 'อัปเดตสถานะสำเร็จ');
      modal.classList.remove('open');
      await loadBookings();
    }
  };
}

// ── Cancel order ──────────────────────────────────────────
async function cancelOrder(id) {
  if (!confirm('ยืนยันการยกเลิกออเดอร์นี้?')) return;
  const result = await api.patch(`/bookings/${id}/status`, { status: 'cancelled' });
  if (result) {
    showToast('success', 'ยกเลิกออเดอร์แล้ว');
    await loadBookings();
  }
}

// ── Search & filter ───────────────────────────────────────
function initSearch() {
  const searchInput  = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterMonth  = document.getElementById('filterMonth');

  async function doFilter() {
    const params = {};
    if (searchInput?.value)  params.search = searchInput.value;
    if (filterStatus?.value) params.status = filterStatus.value;
    if (filterMonth?.value)  params.month  = filterMonth.value;
    currentPage = 1;
    await loadBookings(params);
  }

  searchInput?.addEventListener('input',  doFilter);
  filterStatus?.addEventListener('change', doFilter);
  filterMonth?.addEventListener('change',  doFilter);
}

// ── Util ──────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
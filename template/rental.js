document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // ตัวดักจับการพิมพ์ในช่อง Search (Toolbar)
    const searchInput = document.querySelector('.Toolbar-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }

    // ตัวดักจับการติ๊ก Checkbox ใน Sidebar (หมวดหมู่)
    const checkboxes = document.querySelectorAll('.Filter-item input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => loadProducts());
    });
});

let allProducts = []; // เก็บข้อมูลสินค้าทั้งหมดไว้กรองภายหลัง

async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">กำลังโหลดชุดสวยๆ ให้คุณ...</p>';

    try {
        // ✨ ดึงข้อมูลจาก API (Admin เพิ่มที่ไหน User เห็นที่นั่น)
        const response = await fetch('/api/products');
        const result = await response.json();

        if (result.success) {
            allProducts = result.data.filter(p => p.status === 'available'); // เอาเฉพาะชุดที่ว่าง
            
            // ตรวจสอบ Filter จาก Sidebar (เลือกแสดงตามประเภท)
            const selectedCategories = getSelectedCategories();
            let displayProducts = allProducts;

            if (selectedCategories.length > 0) {
                displayProducts = allProducts.filter(p => 
                    selectedCategories.includes(p.category.toLowerCase())
                );
            }

            renderGrid(displayProducts);
        }
    } catch (err) {
        console.error("Load Products Error:", err);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>';
    }
}

function renderGrid(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">ขออภัย ไม่พบชุดที่คุณกำลังค้นหา</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        // ✨ เปลี่ยนมาดึงจาก price_per_day และเช็คค่า NaN
        const rawPrice = p.price_per_day || p.price; // กันเหนียวถ้าบางตัวยังใช้ชื่อฟิลด์เดิม
        const safePrice = (rawPrice && !isNaN(rawPrice)) 
            ? Number(rawPrice).toLocaleString('th-TH') 
            : '0';

        return `
            <div class="ProductCard" 
                 style="cursor: pointer;"
                 onclick="goToProductDetail(${p.id})">
                <div class="ProductCard-img">
                    <img src="${p.image_url}" alt="${p.name}" onerror="this.src='images/default.png'">
                </div>
                <div class="ProductCard-info">
                    <h4 class="ProductCard-title">${p.name}</h4>
                    <p class="ProductCard-category">${p.category}</p>
                    <div class="ProductCard-footer">
                        <span class="ProductCard-price">฿${safePrice}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ฟังก์ชันกรองจากช่อง Search
function filterProducts(searchTerm) {
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderGrid(filtered);
}

// ดึงรายการหมวดหมู่ที่ User ติ๊กเลือกใน Sidebar
function getSelectedCategories() {
    const checked = [];
    // แมพ ID ของ checkbox กับชื่อหมวดหมู่ใน Database ของโฟล์ค
    if(document.getElementById('type-shirt')?.checked) checked.push('shirt');
    if(document.getElementById('type-wedding')?.checked) checked.push('wedding dress'); 
    if(document.getElementById('type-cosplay')?.checked) checked.push('cosplay costume');
    if(document.getElementById('type-sweater')?.checked) checked.push('sweater');
    if(document.getElementById('type-academic')?.checked) checked.push('academic gown');
    if(document.getElementById('type-thai')?.checked) checked.push('thai costume');
    
    return checked.map(c => c.toLowerCase());
}

// ✨ ฟังก์ชันใหม่: คลิกแล้ววาร์ปไปหน้า product.html พร้อมส่ง ID
function goToProductDetail(productId) {
    window.location.href = `product.html?id=${productId}`;
}
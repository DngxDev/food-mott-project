// Khai báo biến toàn cục
let menuData = []; 
const menuContainer = document.getElementById("menu-container");
let cart = [];

// 1. Kéo dữ liệu từ Backend Python
async function loadMenuFromDatabase() {
    try {
        const response = await fetch('http://localhost:5000/api/foods');
        menuData = await response.json(); 
        renderMenu(menuData); // In ra màn hình sau khi lấy được dữ liệu
    } catch (error) {
        console.error("Lỗi:", error);
        menuContainer.innerHTML = `<p style="text-align:center; color:#E53935; font-weight:bold; width: 100%;">Không thể tải thực đơn. Hãy chắc chắn Backend Python đang chạy!</p>`;
    }
}

// 2. Hàm in thực đơn ra màn hình (ĐÃ SỬA ĐỂ CÓ ẢNH)
function renderMenu(foods) {
    menuContainer.innerHTML = "";
    if (!foods || foods.length === 0) {
        menuContainer.innerHTML = `<p style="text-align:center; width:100%; font-weight:bold;">Không tìm thấy món ăn nào!</p>`;
        return;
    }
    foods.forEach(food => {
        const card = document.createElement("div");
        card.className = "food-card";
        
        // --- PHẦN MỚI: Xử lý đường dẫn ảnh ---
        // Nếu database có ảnh thì nối thêm link localhost:5000, nếu không thì dùng ảnh mặc định
        const imageUrl = food.image_url ? `http://localhost:5000/${food.image_url}` : 'logo.png';
        
        // Ưu tiên dùng mô tả từ Database (nếu có), nếu không có mới dùng câu mặc định
        let shortDesc = food.desc || "Đậm vị, thơm ngon";
        if (!food.desc) {
            if (food.category === 'banhmi') shortDesc = "Bánh mì nóng giòn";
            if (food.category === 'xoi') shortDesc = "Xôi dẻo nóng hổi";
            if (food.category === 'douong') shortDesc = "Thức uống giải khát";
        }

        // --- PHẦN MỚI: Cấu trúc lại HTML để chứa thẻ <img> ---
        card.innerHTML = `
            <div class="food-image">
                <img src="${imageUrl}" alt="${food.name}">
            </div>
            <div class="food-info" style="padding: 15px; text-align: center;">
                <h3 class="food-name" style="margin-top: 0; color: #144E5A; font-size: 18px;">${food.name}</h3>
                <p class="food-desc" style="font-size: 13px; color: #666; margin: 5px 0 15px 0;">${shortDesc}</p>
                <p class="food-price" style="color: #E53935; font-weight: bold; font-size: 20px; margin: 0 0 15px 0;">${food.price.toLocaleString('vi-VN')}đ</p>
                <button class="btn-add" onclick="addToCart(${food.id})" style="width: 100%; padding: 10px; background: #f39c12; color: white; font-weight: bold; border: none; border-radius: 20px; cursor: pointer; transition: 0.2s;">Thêm vào giỏ</button>
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

// 3. Hàm Thêm vào giỏ hàng
function addToCart(foodId) {
    const food = menuData.find(item => item.id === foodId);
    const existingItem = cart.find(item => item.id === foodId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...food, quantity: 1 });
    }
    
    updateCartUI(); 
    showToast(`Đã thêm ${food.name} vào giỏ hàng! 😋`);
}

// 4. Cập nhật giao diện Giỏ hàng
function updateCartUI() {
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsEl = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.innerText = totalItems;

    cartItemsEl.innerHTML = '';
    let totalPrice = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        
        cartItemsEl.innerHTML += `
            <div class="cart-item">
                <div style="flex: 1;">
                    <div style="color: #144E5A; font-weight:bold;">${item.name}</div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">Xóa</button>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span style="font-weight: 900; color:#E53935; width: 20px; text-align: center;">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
                <div style="width: 85px; text-align: right; font-weight:bold;">${itemTotal.toLocaleString('vi-VN')}đ</div>
            </div>
        `;
    });
    totalPriceEl.innerText = totalPrice.toLocaleString('vi-VN') + 'đ';
}

function changeQuantity(foodId, delta) {
    const item = cart.find(item => item.id === foodId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(foodId);
        } else {
            updateCartUI();
        }
    }
}

function removeFromCart(foodId) {
    cart = cart.filter(item => item.id !== foodId);
    updateCartUI(); 
}

// 5. Hàm thông báo nổi (Toast)
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(function() {
        toast.classList.remove("show");
    }, 2500);
}

// 6. Logic Bật/Tắt các Bảng hiển thị
const cartIcon = document.getElementById('cart-icon');
const cartModal = document.getElementById('cart-modal');
const overlay = document.getElementById('overlay');
const closeCartBtn = document.getElementById('close-cart');
const btnCheckout = document.getElementById('btn-checkout');
const checkoutModal = document.getElementById('checkout-modal');
const backToCartBtn = document.getElementById('back-to-cart');
const checkoutForm = document.getElementById('checkout-form');

cartIcon.addEventListener('click', () => {
    cartModal.classList.add('active');
    overlay.classList.add('active');
});
closeCartBtn.addEventListener('click', () => {
    cartModal.classList.remove('active');
    overlay.classList.remove('active');
});
overlay.addEventListener('click', () => {
    cartModal.classList.remove('active');
    checkoutModal.classList.remove('active');
    overlay.classList.remove('active');
});
btnCheckout.addEventListener('click', () => {
    if (cart.length === 0) {
        showToast("Giỏ hàng đang trống! Bạn chọn món đã nhé. 😅");
        return; 
    }
    cartModal.classList.remove('active');
    checkoutModal.classList.add('active');
});
backToCartBtn.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
    cartModal.classList.add('active');
});

// 7. Logic Gửi đơn hàng lên Backend
checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        totalAmount: totalAmount,
        cart: cart 
    };

    try {
        submitBtn.innerText = "⏳ Đang xử lý...";
        submitBtn.disabled = true;

        const response = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            showToast(`Cảm ơn ${customerName}! Đơn hàng đang được chuẩn bị. 🎉`);
            cart = [];
            updateCartUI();
            checkoutModal.classList.remove('active');
            overlay.classList.remove('active');
            checkoutForm.reset(); 
        } else {
            showToast("Có lỗi xảy ra phía máy chủ!");
        }
    } catch (error) {
        console.error(error);
        showToast("Lỗi kết nối! Hãy chắc chắn Backend Python đang chạy.");
    } finally {
        submitBtn.innerText = "🚀 Xác Nhận Đặt Hàng";
        submitBtn.disabled = false;
    }
});

// 8. Logic Lọc danh mục
function filterCategory(categoryName) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + categoryName).classList.add('active');

    if (categoryName === 'all') {
        renderMenu(menuData);
    } else {
        const filteredFoods = menuData.filter(food => food.category === categoryName);
        renderMenu(filteredFoods);
    }
}
// 10. Logic cho Slider tự động chạy
function startHeroSlider() {
    const slides = document.querySelectorAll('.slide');
    if(slides.length === 0) return; 

    let currentSlide = 0;
    
    // Tạo vòng lặp cứ 3 giây chạy 1 lần
    setInterval(() => {
        // Tắt ảnh hiện tại
        slides[currentSlide].classList.remove('active');
        
        // Tăng chỉ mục lên 1. Nếu đến ảnh cuối thì quay về 0
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Bật ảnh tiếp theo
        slides[currentSlide].classList.add('active');
    }, 3000); // 3000ms = 3 giây. Thích chậm hơn thì đổi thành 4000 hoặc 5000 nhé!
}
// 9. Logic Tìm kiếm
const searchInput = document.querySelector(".search-box input");
searchInput.addEventListener("input", function(event) {
    const textSearch = event.target.value.toLowerCase(); 
    const filteredFoods = menuData.filter(food => 
        food.name.toLowerCase().includes(textSearch)
    );
    renderMenu(filteredFoods);
});

// CHẠY HÀM KÉO DỮ LIỆU NGAY KHI VỪA MỞ WEB
window.onload = function() {
    loadMenuFromDatabase();
    startHeroSlider();
};
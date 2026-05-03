// Khai báo biến toàn cục
let menuData = []; 
const menuContainer = document.getElementById("menu-container");
let cart = [];

// 1. Kéo dữ liệu từ Backend Python
async function loadMenuFromDatabase() {
    try {
        const response = await fetch('https://food-mott-project.onrender.com/api/foods');
        const result = await response.json(); 

        let finalData = [];

        // Nếu result vốn dĩ đã là mảng
        if (Array.isArray(result)) {
            finalData = result;
        } 
        // Nếu Backend bọc mảng trong một thuộc tính tên là 'foods' hoặc 'data'
        else if (result.foods && Array.isArray(result.foods)) {
            finalData = result.foods;
        }
        else if (result.data && Array.isArray(result.data)) {
            finalData = result.data;
        }

        if (finalData.length > 0) {
            menuData = finalData;
            renderMenu(finalData);
        } else {
            console.error("Dữ liệu nhận về không chứa danh sách món ăn hợp lệ:", result);
            menuContainer.innerHTML = `<p style="text-align:center; width:100%;">Thực đơn hiện đang trống hoặc có lỗi cấu trúc dữ liệu.</p>`;
        }

    } catch (error) {
        console.error("Lỗi kết nối:", error);
        menuContainer.innerHTML = `<p style="text-align:center; color:red; width:100%;">Không thể kết nối đến máy chủ!</p>`;
    }
}

// 2. Hàm in thực đơn ra màn hình (ĐÃ FIX LỖI HIỂN THỊ NÚT)
function renderMenu(foods) {
    menuContainer.innerHTML = "";
    if (!foods || foods.length === 0) {
        menuContainer.innerHTML = `<p style="text-align:center; width:100%; font-weight:bold;">Không tìm thấy món ăn nào!</p>`;
        return;
    }

    foods.forEach(food => {
        console.log("Dữ liệu món ăn:", food);
        const card = document.createElement("div");
        card.className = "food-card";
        
        // --- Xử lý đường dẫn ảnh ---
        const imageUrl = food.image_url ? `http://food-mott-project.onrender.com/${food.image_url}` : 'logo.png';
        
        // Xử lý mô tả
        let shortDesc = food.desc || "Đậm vị, thơm ngon";
        if (!food.desc) {
            if (food.category === 'banhmi') shortDesc = "Bánh mì nóng giòn";
            if (food.category === 'xoi') shortDesc = "Xôi dẻo nóng hổi";
            if (food.category === 'douong') shortDesc = "Thức uống giải khát";
        }

        // --- FIX LỖI TẠI ĐÂY: Tạo logic cho nút bấm ---
        let btnHtml = '';
        if (food.is_available === false) {
            btnHtml = `<button class="btn" style="background-color: #ccc; color: #666; cursor: not-allowed; width: 100%; border: none; padding: 10px; border-radius: 5px; font-weight: bold;" disabled>Hết Hàng</button>`;
        } else {
            btnHtml = `<button class="btn-add" onclick="addToCart(${food.id})" style="width: 100%; padding: 10px; background: #f39c12; color: white; border: none; border-radius: 5px; font-weight: bold;">Thêm vào giỏ</button>`;
        }

        // --- Đưa biến btnHtml vào trong innerHTML ---
        // --- BẮT ĐẦU FIX LỖI ẢNH ---
    let finalImageUrl = "";
    // Lấy dữ liệu từ DB (dùng || để đề phòng API trả về chữ i thường hoặc hoa)
    let imgFromDB = food.image_url; 
    if (imgFromDB && imgFromDB.startsWith("http")) {
        finalImageUrl = imgFromDB; // Nếu là link Cloudinary -> Xài luôn
    } else {
        finalImageUrl = `https://food-mott-project.onrender.com/${imgFromDB}`; // Nếu link cũ -> Mới ghép
    }
    // --- KẾT THÚC FIX LỖI ẢNH ---
        card.innerHTML = `
            <div class="food-image">
                <img src="${finalImageUrl}" alt="${food.name}">
            </div>
            <div class="food-info" style="padding: 15px; text-align: center;">
                <h3 class="food-name" style="margin-top: 0; color: #144E5A; font-size: 18px;">${food.name}</h3>
                <p class="food-desc" style="font-size: 13px; color: #666; margin: 5px 0 15px 0;">${shortDesc}</p>
                <p class="food-price" style="color: #E53935; font-weight: bold; font-size: 20px; margin: 0 0 15px 0;">${food.price.toLocaleString('vi-VN')}đ</p>
                ${btnHtml}
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

// 3. Hàm Thêm vào giỏ hàng
function addToCart(foodId) {
    const food = menuData.find(item => item.id === foodId);
    if (!food) return;

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

    if(!cartCountEl || !cartItemsEl || !totalPriceEl) return;

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
    if(!toast) return;
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

if (cartIcon) {
    cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
        overlay.classList.add('active');
    });
}
if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
        cartModal.classList.remove('active');
        overlay.classList.remove('active');
    });
}
if (overlay) {
    overlay.addEventListener('click', () => {
        cartModal.classList.remove('active');
        checkoutModal.classList.remove('active');
        overlay.classList.remove('active');
    });
}
if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
        if (cart.length === 0) {
            showToast("Giỏ hàng đang trống! Bạn chọn món đã nhé. 😅");
            return; 
        }
        cartModal.classList.remove('active');
        checkoutModal.classList.add('active');
    });
}
if (backToCartBtn) {
    backToCartBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
        cartModal.classList.add('active');
    });
}

// 7. Logic Gửi đơn hàng lên Backend
if (checkoutForm) {
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

            const response = await fetch('https://food-mott-project.onrender.com/api/orders', {
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
}

// 8. Logic Lọc danh mục
function filterCategory(categoryName) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById('btn-' + categoryName);
    if(activeBtn) activeBtn.classList.add('active');

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
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 3000);
}

// 9. Logic Tìm kiếm
const searchInput = document.querySelector(".search-box input");
if (searchInput) {
    searchInput.addEventListener("input", function(event) {
        const textSearch = event.target.value.toLowerCase(); 
        const filteredFoods = menuData.filter(food => 
            food.name.toLowerCase().includes(textSearch)
        );
        renderMenu(filteredFoods);
    });
}

// CHẠY HÀM KÉO DỮ LIỆU NGAY KHI VỪA MỞ WEB
window.onload = function() {
    loadMenuFromDatabase();
    startHeroSlider();
};
from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc
import os
from werkzeug.utils import secure_filename
import platform # Thêm thư viện này để nhận diện hệ điều hành

app = Flask(__name__)
CORS(app)

# Tự động nhận diện máy chủ để chọn đúng Driver
if platform.system() == 'Windows':
    sql_driver = '{SQL Server}'
else:
    sql_driver = '{ODBC Driver 18 for SQL Server}'

# Cấu hình chuỗi kết nối SQL Server (Đã tự động đổi Driver khi lên Linux)
conn_str = (
    f"Driver={sql_driver};"
    "Server=foodmottdb.mssql.somee.com;"
    "Database=foodmottdb;"
    "uid=DuongxNguyen_SQLLogin_1;"
    "pwd=fezkgnc7pf;"
    "TrustServerCertificate=yes;"
)
# Cấu hình thư mục lưu ảnh (sẽ nằm trong thư mục backend/static/uploads)
UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# 1. API lấy danh sách món ăn (Dành cho giao diện lúc nãy)
@app.route('/api/foods', methods=['GET'])
def get_foods():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # SỬA Ở ĐÂY: Thêm Description vào câu SELECT
        cursor.execute("SELECT ProductID, ProductName, Price, Category, ImageURL, Description, IsAvailable FROM Products")
        
        foods = []
        for row in cursor.fetchall():
            foods.append({
                'id': row.ProductID,
                'name': row.ProductName,
                'price': float(row.Price),
                'category': row.Category,
                'image_url': row.ImageURL,
                'desc': row.Description  # SỬA Ở ĐÂY: Đóng gói thêm biến 'desc' gửi cho Frontend
                'is_available': True if row.IsAvailable == 1 else False
            })
            
        return jsonify(foods)
    except Exception as e:
        return jsonify({'error': str(e)})

# 2. API nhận thông tin đặt hàng từ Frontend và lưu vào DB
@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        # Nhận dữ liệu JSON từ Frontend gửi lên
        data = request.json
        customer_name = data.get('customerName')
        customer_phone = data.get('customerPhone')
        customer_address = data.get('customerAddress')
        total_amount = data.get('totalAmount')
        cart_items = data.get('cart')
        # Kết nối SQL Server
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Lưu vào bảng Orders và lấy ra mã Đơn hàng (OrderID) vừa được tạo
        cursor.execute("""
            INSERT INTO Orders (CustomerName, CustomerPhone, CustomerAddress, TotalAmount)
            OUTPUT INSERTED.OrderID
            VALUES (?, ?, ?, ?)
        """, (customer_name, customer_phone, customer_address, total_amount))
        
        order_id = cursor.fetchone()[0]

        # Vòng lặp: Lưu từng món ăn trong giỏ vào bảng OrderDetails
        for item in cart_items:
            cursor.execute("""
                INSERT INTO OrderDetails (OrderID, ProductID, Quantity, Price)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['id'], item['quantity'], item['price']))

        # Xác nhận lưu tất cả xuống database
        conn.commit()
        
        return jsonify({'message': 'Đặt hàng thành công!', 'orderId': order_id}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# 3. API Dành cho Chủ quán (Kéo danh sách hóa đơn)
@app.route('/api/admin/orders', methods=['GET'])
def get_orders():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Lấy các đơn hàng mới nhất xếp lên đầu
        cursor.execute("SELECT OrderID, CustomerName, CustomerPhone, TotalAmount, OrderDate, Status, CustomerAddress FROM Orders ORDER BY OrderDate DESC")
        
        orders = []
        for row in cursor.fetchall():
            orders.append({
                'id': row.OrderID,
                'customerName': row.CustomerName,
                'phone': row.CustomerPhone,
                'address': row.CustomerAddress,
                'total': float(row.TotalAmount),
                # Chuyển đổi định dạng thời gian cho dễ đọc, tránh bị lỗi JSON
                'date': row.OrderDate.strftime("%d/%m/%Y %H:%M") if row.OrderDate else "N/A",
                'status': row.Status
            })
            
        return jsonify(orders)
    except Exception as e:
        return jsonify({'error': str(e)})
        # 4. API Cập nhật trạng thái đơn hàng (Dành cho Admin)
@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        # Lấy trạng thái mới mà giao diện Admin gửi xuống
        data = request.json
        new_status = data.get('status')
        
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Cập nhật trạng thái mới vào CSDL dựa theo mã Đơn hàng
        cursor.execute("UPDATE Orders SET Status = ? WHERE OrderID = ?", (new_status, order_id))
        conn.commit()
        
        return jsonify({'message': 'Cập nhật trạng thái thành công!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 6. API Xóa món ăn (Dành cho Admin)
@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Kiểm tra xem món này có trong đơn hàng nào không để tránh lỗi ràng buộc
        cursor.execute("DELETE FROM Products WHERE ProductID = ?", (product_id,))
        conn.commit()
        
        return jsonify({'message': 'Đã xóa món ăn thành công!'})
    except Exception as e:
        # Nếu món ăn đã có trong đơn hàng, SQL sẽ báo lỗi khóa ngoại
        return jsonify({'error': 'Không thể xóa món này vì đã có khách từng đặt món này!'}), 400
        # 7. API Thống kê doanh thu (Dành cho Admin)
@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Đếm tổng số đơn hàng và cộng tổng tiền từ bảng Orders
        cursor.execute("SELECT COUNT(OrderID), SUM(TotalAmount) FROM Orders")
        row = cursor.fetchone()
        
        return jsonify({
            'totalOrders': row[0] if row[0] else 0,
            'totalRevenue': float(row[1]) if row[1] else 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 8. API Đăng nhập
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Kiểm tra tài khoản trong Database
        cursor.execute("SELECT Username FROM Users WHERE Username = ? AND Password = ?", (username, password))
        user = cursor.fetchone()

        if user:
            # Nếu đúng, trả về một "token" giả định để lưu ở trình duyệt
            return jsonify({'message': 'Đăng nhập thành công', 'token': 'access_granted_admin'}), 200
        else:
            return jsonify({'message': 'Sai tài khoản hoặc mật khẩu!'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 9. API Lấy chi tiết một đơn hàng cụ thể (Dành cho Admin)
@app.route('/api/admin/orders/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Lấy thông tin các món trong đơn hàng bằng cách JOIN với bảng Products
        query = """
            SELECT p.ProductName, od.Quantity, od.Price
            FROM OrderDetails od
            JOIN Products p ON od.ProductID = p.ProductID
            WHERE od.OrderID = ?
        """
        cursor.execute(query, (order_id,))
        
        items = []
        for row in cursor.fetchall():
            items.append({
                'name': row.ProductName,
                'quantity': row.Quantity,
                'price': float(row.Price)
            })
            
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 10. API Cập nhật thông tin món ăn (Dành cho Admin)
@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        # Lấy dữ liệu từ request.form thay vì request.json
        name = request.form.get('name')
        price = request.form.get('price')
        desc = request.form.get('desc')
        category = request.form.get('category')
        
        file = request.files.get('image')
        
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        if file:
            # Nếu có upload ảnh mới
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_url = f"static/uploads/{filename}"
            
            cursor.execute("""
                UPDATE Products 
                SET ProductName = ?, Price = ?, Description = ?, Category = ?, ImageURL = ?
                WHERE ProductID = ?
            """, (name, price, desc, category, image_url, product_id))
        else:
            # Nếu không upload ảnh mới, giữ nguyên ImageURL cũ
            cursor.execute("""
                UPDATE Products 
                SET ProductName = ?, Price = ?, Description = ?, Category = ?
                WHERE ProductID = ?
            """, (name, price, desc, category, product_id))
            
        conn.commit()
        return jsonify({'message': 'Cập nhật thành công!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 5. API Thêm món ăn mới kèm Upload ảnh
@app.route('/api/admin/products', methods=['POST'])
def add_product():
    try:
        # Lấy thông tin từ Form-data (không dùng request.json vì có đính kèm file)
        name = request.form.get('name')
        price = request.form.get('price')
        desc = request.form.get('desc')
        category = request.form.get('category')
        
        # Xử lý tệp ảnh
        file = request.files.get('image')
        image_url = ""
        if file:
            filename = secure_filename(file.filename)
            # Lưu file vào thư mục static/uploads
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # Đường dẫn để hiển thị trên web
            image_url = f"static/uploads/{filename}"

        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Products (ProductName, Price, Description, Category, ImageURL)
            VALUES (?, ?, ?, ?, ?)
        """, (name, price, desc, category, image_url))
        conn.commit()
        return jsonify({'message': 'Thêm món thành công!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # --- API mới này sẽ nằm trong file app.py của bạn ---

# API Tra cứu đơn hàng theo số điện thoại
@app.route('/api/orders/track/<phone>', methods=['GET'])
def track_order(phone):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Tìm đơn hàng dựa trên số điện thoại, sắp xếp đơn mới nhất lên đầu
        cursor.execute("""
            SELECT OrderID, CustomerName, TotalAmount, 
                   CONVERT(VARCHAR(16), OrderDate, 120) as OrderDate, 
                   Status 
            FROM Orders 
            WHERE CustomerPhone = ? 
            ORDER BY OrderID DESC
        """, (phone,))
        
        orders = []
        for row in cursor.fetchall():
            orders.append({
                'id': row.OrderID,
                'name': row.CustomerName,
                'total': float(row.TotalAmount),
                'date': row.OrderDate,
                'status': row.Status if row.Status else "Đang chờ xử lý"
            })
            
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        # 11. API Khóa/Mở khóa món ăn (Dành cho Admin)
@app.route('/api/admin/products/<int:product_id>/toggle', methods=['PUT'])
def toggle_product(product_id):
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Xem món này đang khóa hay mở
        cursor.execute("SELECT IsAvailable FROM Products WHERE ProductID = ?", (product_id,))
        current_status = cursor.fetchone()[0]
        
        # Đảo ngược trạng thái: Đang 1 (Còn) thì biến thành 0 (Hết), và ngược lại
        new_status = 0 if current_status == 1 else 1
        
        cursor.execute("UPDATE Products SET IsAvailable = ? WHERE ProductID = ?", (new_status, product_id))
        conn.commit()
        
        return jsonify({'message': 'Cập nhật trạng thái thành công!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)
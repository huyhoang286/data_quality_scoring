import pandas as pd
from faker import Faker
import random
import numpy as np

fake = Faker('vi_VN')

# BỘ TỪ ĐIỂN ĐỊA CHỈ CHUẨN VIỆT NAM
TINH_THANH_VN = {
    "Hà Nội": ["Quận Cầu Giấy", "Quận Đống Đa", "Quận Hoàn Kiếm", "Quận Hai Bà Trưng", "Quận Thanh Xuân", "Quận Ba Đình", "Quận Tây Hồ"],
    "TP. Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận 10", "Quận Tân Bình", "Quận Bình Thạnh", "TP. Thủ Đức", "Quận Gò Vấp", "Quận Phú Nhuận"],
    "Đà Nẵng": ["Quận Hải Châu", "Quận Thanh Khê", "Quận Sơn Trà", "Quận Ngũ Hành Sơn", "Quận Liên Chiểu"],
    "Hải Phòng": ["Quận Hồng Bàng", "Quận Ngô Quyền", "Quận Lê Chân", "Quận Hải An"],
    "Cần Thơ": ["Quận Ninh Kiều", "Quận Bình Thủy", "Quận Cái Răng"]
}

def get_real_vn_address():
    city = random.choice(list(TINH_THANH_VN.keys()))
    district = random.choice(TINH_THANH_VN[city])
    street_prefix = random.choice(["Đường", "Phố", "Ngõ"])
    street_name = fake.street_name()
    number = random.randint(1, 999)
    return f"Số {number}, {street_prefix} {street_name}, {district}, {city}"

def generate_logical_dirty_data(num_rows=10000):
    data = []
    print(f"⏳ Đang sinh {num_rows} dòng dữ liệu (Sai logic, Đúng kiểu dữ liệu)...")
    
    for i in range(num_rows):
        # 1. Dữ liệu gốc (Clean)
        customer_id = f"KH{i+1:06d}"
        name = fake.name()
        age = random.randint(18, 80)
        
        phone_prefix = random.choice(['098', '097', '096', '086', '091', '094', '088', '090', '093', '089'])
        phone = phone_prefix + str(random.randint(1000000, 9999999))
        
        email = fake.ascii_free_email()
        cccd = str(random.randint(100000000000, 999999999999))
        address = get_real_vn_address()

        # ---------------------------------------------------------
        # 2. TIÊM LỖI LOGIC (KHÔNG tiêm sai kiểu dữ liệu)
        # ---------------------------------------------------------
        
        # Lỗi Age (15%): Vẫn là SỐ, nhưng nằm ngoài khoảng hợp lệ (18-100) hoặc rỗng
        if random.random() < 0.15:
            age = random.choice([-10, 5, 120, 150, None])
            
        # Lỗi Phone (20%): Vẫn là CHUỖI SỐ, nhưng thiếu/thừa độ dài, sai đầu số hoặc rỗng
        if random.random() < 0.20:
            phone = random.choice([
                None, 
                phone[:7],               # Thiếu số (quá ngắn)
                phone + '123',           # Thừa số (quá dài)
                '0123456789'             # Đầu số 012 cũ không còn tồn tại
            ])
            
        # Lỗi Email (20%): Vẫn là CHUỖI, nhưng sai quy tắc cấu tạo email hoặc rỗng
        if random.random() < 0.20:
            email = random.choice([
                None, 
                email.replace('@', ''),      # Không có còng (@)
                email.split('@')[0],         # Chỉ có tên, mất tên miền
                '@gmail.com'                 # Chỉ có tên miền, mất tên
            ])
            
        # Lỗi CCCD (15%): Vẫn là CHUỖI SỐ, nhưng sai độ dài chuẩn hoặc rỗng
        if random.random() < 0.15:
            cccd = random.choice([
                None, 
                cccd[:9],                    # Chỉ có 9 số (CMND cũ, có thể tính là sai nếu bắt buộc CCCD 12 số)
                cccd[:10],                   # Bị thiếu (10 số)
                cccd + '12'                  # Bị thừa (14 số)
            ])
            
        # Lỗi Name (10%): Rỗng
        if random.random() < 0.10:
            name = None

        # Lỗi Address (5%): Rỗng
        if random.random() < 0.05:
            address = None

        data.append([customer_id, name, age, phone, email, cccd, address])

    # 3. Tạo DataFrame
    df = pd.DataFrame(data, columns=['id', 'name', 'age', 'phone_number', 'email', 'cccd', 'address'])
    
    # Ép kiểu rõ ràng cho cột age (nếu có None, Pandas sẽ tự đổi thành float64 -> Đây là hành vi đúng chuẩn của Pandas)
    df['age'] = pd.to_numeric(df['age'], errors='coerce')

    # 4. Lỗi Uniqueness (Trùng lặp ID): Ép 150 dòng cuối cùng bị trùng lặp với 150 dòng đầu tiên
    for i in range(1, 151):
        df.iloc[-i, 0] = df.iloc[i, 0] 

    file_name = "customer_data_10k_logical_dirty.csv"
    df.to_csv(file_name, index=False, encoding='utf-8')
    
    print(f"✅ Đã tạo thành công file: {file_name}")
    print("\n📊 THỐNG KÊ SỐ LƯỢNG Ô TRỐNG (Null Values):")
    print(df.isnull().sum())

if __name__ == "__main__":
    generate_logical_dirty_data(10000)
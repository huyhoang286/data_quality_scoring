# Data Quality Scoring System (Hệ thống Chấm điểm Chất lượng Dữ liệu)

Một hệ thống Full-stack mạnh mẽ cung cấp giải pháp toàn diện để đánh giá "sức khỏe" của các tập dữ liệu (CSV, Excel). 

Người dùng có thể dễ dàng tải tệp dữ liệu lên qua giao diện Web, thiết lập các bộ luật kiểm tra (Rules) bằng thao tác chọn trực quan, và nhận về báo cáo điểm số chi tiết cho từng tiêu chí của dữ liệu.

## Tính năng nổi bật

* **Trực quan và Dễ sử dụng:** Giao diện Web thân thiện, tự động đọc tên cột và kiểu dữ liệu từ file upload ngay lập tức.
* **Bộ luật (Rule Library) đa dạng:** Hỗ trợ kiểm tra theo 3 tiêu chí cốt lõi chuẩn ngành dữ liệu:
  * **Tính đầy đủ (Completeness):** Kiểm tra dữ liệu rỗng (Null/Missing values).
  * **Tính chính xác (Accuracy):** Ràng buộc khoảng giá trị (Min-Max), định dạng chuỗi (Email, Số điện thoại, Regex tùy chỉnh).
  * **Tính nhất quán (Consistency):** Ràng buộc logic chéo giữa các cột (VD: `ngày giao hàng >= ngày đặt hàng`).
* **Kiến trúc linh hoạt:** Thuật toán lõi Python xử lý qua các tệp cấu hình YAML động, hoàn toàn tách biệt với giao diện xử lý của Node.js.

---

## Yêu cầu hệ thống (Prerequisites)

Để chạy được dự án này trơn tru, máy tính của bạn cần cài đặt sẵn:
1. **Node.js** (Phiên bản v14.x trở lên) - Môi trường chạy Web Server.
2. **Python** (Phiên bản 3.8 trở lên) - Môi trường chạy thuật toán xử lý dữ liệu lõi.
3. **Git** - Để clone mã nguồn về máy.

---

## Hướng dẫn cài đặt
**Bước 1: Clone mã nguồn về máy**
```bash
git clone <đường-dẫn-repo-của-bạn>
cd data_quality_scoring

**Bước 2: Cài đặt các thư viện lõi thuật toán (Python)**

pip install -r requirements.txt
# Hoặc cài đặt thủ công: pip install pandas openpyxl PyYAML

**Bước 3: Cài đặt các thư viện Web Server (Node.js)**
npm install

## Hướng dẫn sử dụng
**Bước 1: Khởi động Web Server**
# Tại thư mục gốc: 
npm run dev
# Hoặc chạy lệnh thuần: node web/server.js

**Bước 2: Trải nghiệm hệ thống**
Mở trình duyệt và truy cập vào địa chỉ: http://localhost:3000
Kéo thả một tệp dữ liệu mẫu (ví dụ: sample_data.csv) vào ô upload.
Ở bảng Rule Builder, chọn các luật tương ứng cho từng cột mà bạn muốn kiểm tra.
Bấm nút "Lưu cấu hình & Chấm điểm".
Đợi hệ thống xử lý và xem Báo cáo Sức khỏe Dữ liệu (Điểm tổng hợp & Điểm thành phần) hiện ra ngay bên dưới.

## Cấu trúc thư mục (Project Structure)
data_quality_scoring/
│
├── configs/                  # Nơi quản lý "logic" của hệ thống
│   ├── rule_library.json     # Thư viện luật chuẩn (Danh sách menu hiển thị trên Web)
│   ├── default_rules.yaml    # File luật tĩnh dùng để test thuật toán độc lập (CLI)
│   └── dynamic_rules.yaml    # File luật tự động sinh ra khi người dùng thao tác trên Web
│
├── core/                     # Lõi thuật toán xử lý dữ liệu (Python)
│   ├── ingestion.py          # Đọc file dữ liệu và parse cấu hình luật YAML
│   ├── rule_engine.py        # Động cơ quét dữ liệu, áp dụng các regex/logic
│   ├── scorer.py             # Tính toán trọng số và ra điểm tổng hợp cuối cùng
│   └── profiler.py           # Phân tích hồ sơ dữ liệu sơ bộ
│
├── web/                      # Giao diện và Trạm trung chuyển (Node.js)
│   ├── public/               # File tĩnh giao diện (CSS, JS)
│   ├── views/                # Template Engine (Pug)
│   ├── upload/               # Thư mục tạm chứa file người dùng tải lên
│   └── server.js             # File điều phối API, giao tiếp với lõi Python
│
├── get_columns.py            # Script trích xuất nhanh Metadata (tên cột, kiểu dữ liệu)
├── run_scoring_api.py        # Script chính nhận lệnh chấm điểm từ Web
├── package.json              # Quản lý thư viện Node.js
└── requirements.txt          # Quản lý thư viện Python
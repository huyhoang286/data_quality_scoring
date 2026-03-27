require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const yaml = require('js-yaml');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, '../data/upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Router vẽ giao diện dashboard
app.get('/', (req, res) => {
    res.render('dashboard');
});

// API Nhận file Upload từ người dùng
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Không tìm thấy file tải lên' });
    }
    
    const filePath = req.file.path;
    console.log(`[SYSTEM] Đã nhận file: ${req.file.filename}`);
    console.log(`[SYSTEM] Đang gọi Python để đọc metadata...`);

    const pythonCommand = `python get_columns.py "${filePath}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`[LỖI PYTHON]: ${error.message}`);
            return res.status(500).json({ error: 'Lỗi khi phân tích file dữ liệu' });
        }

        try {
            const columns = JSON.parse(stdout);

            if (columns.error) {
                return res.status(400).json({ error: columns.error });
            }

            res.json({
                message: 'Upload và phân tích thành công!',
                filename: req.file.filename,
                filepath: filePath, 
                columns: columns
            });

        } catch (parseError) {
            console.error(`[LỖI JSON]: Không thể đọc kết quả từ Python. Chi tiết: ${stdout}`);
            res.status(500).json({ error: 'Lỗi định dạng dữ liệu trả về' });
        }
    });
});

// Route: Tạo file YAML và gọi Python chấm điểm
app.post('/api/run-scoring', (req, res) => {
    const { filepath, rules } = req.body;

    if (!filepath) {
        return res.status(400).json({ error: 'Thiếu file dữ liệu.' });
    }

    const yamlConfig = { rules: rules };
    const configPath = path.join(__dirname, '../configs/dynamic_rules.yaml');
    
    fs.writeFileSync(configPath, yaml.dump(yamlConfig), 'utf8');
    console.log(`[SYSTEM] Đã tạo file luật tại: ${configPath}`);
    console.log(`[SYSTEM] Đang kích hoạt lõi Python chấm điểm...`);

    // 2. Kích hoạt Python (Ở đây tôi sẽ trả về Mock JSON để bạn test luồng giao diện trước)
    // Sau khi test giao diện chạy mượt, chúng ta sẽ mở khóa đoạn lệnh exec() gọi main.py thật.
    
    setTimeout(() => {
        res.json({
            final_score: 85.5,
            health_status: "Khá",
            dimension_scores: {
                completeness: 90.0,
                accuracy: 81.0,
                consistency: 100.0
            }
        });
    }, 1500); 
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Web Server đang chạy tại: http://localhost:${PORT}`);
});
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
    // Chuyển đổi đường dẫn file về dạng chuẩn để tránh lỗi dấu gạch chéo trên Windows
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    console.log(`[DEBUG] Đang xử lý file: ${normalizedPath}`);

    const pythonCommand = `python get_columns.py "${normalizedPath}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`[EXEC ERROR]: ${error.message}`);
            return res.status(500).json({ error: "Không thể thực thi lệnh Python. Hãy kiểm tra cài đặt Python." });
        }

        if (stderr) {
            console.error(`[PYTHON STDERR]: ${stderr}`);
        }

        try {
            console.log(`[DEBUG] Python Output: ${stdout}`);
            const columns = JSON.parse(stdout);

            if (columns.error) {
                console.error(`[LOGIC ERROR]: ${columns.error}`);
                return res.status(400).json({ error: columns.error });
            }

            res.json({
                message: 'Phân tích thành công!',
                filename: req.file.filename,
                filepath: normalizedPath,
                columns: columns
            });

        } catch (parseError) {
            console.error(`[JSON PARSE ERROR]: Không thể đọc JSON từ: ${stdout}`);
            res.status(500).json({ error: "Lỗi định dạng dữ liệu trả về từ Python" });
        }
    });
});

// Route: Tạo file YAML và gọi Python chấm điểm
app.post('/api/run-scoring', (req, res) => {
    const { filepath, rules } = req.body;

    if (!filepath) {
        return res.status(400).json({ error: 'Thiếu file dữ liệu.' });
    }

    // Sinh ra file cấu hình YAML mới dựa trên những gì UI gửi xuống
    const yamlConfig = { rules: rules };
    const configPath = path.join(__dirname, '../configs/dynamic_rules.yaml');
    
    fs.writeFileSync(configPath, yaml.dump(yamlConfig), 'utf8');
    console.log(`[SYSTEM] Đã tạo file luật tại: ${configPath}`);
    console.log(`[SYSTEM] Đang kích hoạt lõi Python chấm điểm thật...`);

    //Gọi script Python qua Child Process
    const pythonCommand = `python run_scoring_api.py --data "${filepath}" --config "${configPath}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (stderr) console.error(`[PYTHON STDERR]: ${stderr}`); // In lỗi từ Python nếu có

        if (error) {
            console.error(`[EXEC ERROR]: ${error.message}`);
            return res.status(500).json({ error: 'Lỗi thực thi chấm điểm' });
        }

        try {
            console.log(`[DEBUG] Kết quả Python: ${stdout}`);
            
            const jsonStartIndex = stdout.indexOf('{');
            const jsonEndIndex = stdout.lastIndexOf('}');
            const cleanJsonString = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
            const result = JSON.parse(cleanJsonString);

            res.json({
                final_score: result.final_score,
                health_status: (result.final_score >= 80) ? "Tốt" : (result.final_score >= 60 ? "Khá" : "Kém"),
                dimension_scores: result.dimension_scores
            });
        } catch (e) {
            console.error(`[PARSE ERROR]: ${e.message}. Raw output: ${stdout}`);
            res.status(500).json({ error: 'Lỗi định dạng kết quả' });
        }
    });
});

// Route Trả về thư viện luật cho Frontend 
app.get('/api/rule-library', (req, res) => {
    const libraryPath = path.join(__dirname, '../configs/rule_library.json');
    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
    res.json(library);
});


// Khởi động Server
app.listen(PORT, () => {
    console.log(`Web Server đang chạy tại: http://localhost:${PORT}`);
});
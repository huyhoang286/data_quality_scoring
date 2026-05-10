require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

// API Gợi ý luật bằng AI
app.post('/api/ai-suggest', async (req, res) => {
    try {
        const { columns } = req.body;
        
        // Đọc thư viện luật hiện tại
        const libraryPath = path.join(__dirname, '../configs/rule_library.json');
        const ruleLibrary = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

        // Xây dựng Prompt cho AI
        const prompt = `
        Bạn là một chuyên gia Data Engineer. 
        Tôi có một tập dữ liệu với các cột sau (kèm kiểu dữ liệu và giá trị mẫu):
        ${JSON.stringify(columns, null, 2)}

        Và đây là danh sách các luật kiểm tra dữ liệu tôi đang có:
        ${JSON.stringify(ruleLibrary, null, 2)}

        NHIỆM VỤ: Hãy tự động ánh xạ (map) mỗi cột với MỘT luật phù hợp nhất trong thư viện luật. 
        Nếu cột đó không cần kiểm tra (ví dụ tên người, địa chỉ thông thường), hãy bỏ qua nó.

        ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC):
        Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ, không có markdown, không giải thích. 
        Cấu trúc JSON: { "tên_cột": "nhóm_luật:tên_luật" }
        Ví dụ: { "email": "accuracy:email", "age": "accuracy:valid_age", "start_date": "completeness:required" }
        `;

        console.log("[AI] Đang gọi Gemini suy luận...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let aiText = result.response.text();
        
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const mapping = JSON.parse(aiText);
        console.log("[AI] Gợi ý thành công:", mapping);
        
        res.json(mapping);

    } catch (error) {
        console.error("[AI LỖI]:", error);
        res.status(500).json({ error: "AI không thể gợi ý lúc này." });
    }
});

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Web Server đang chạy tại: http://localhost:${PORT}`);
});
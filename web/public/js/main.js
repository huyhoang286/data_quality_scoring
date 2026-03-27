// Xử lý thao tác Kéo-Thả của người dùng
// Đóng gói file gửi lên đường dẫn /api/upload
// Nhận cấu trúc cột trả về để tự động vẽ ra bảng chọn Luật.

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusMessage = document.getElementById('upload-status');
    const ruleBuilderSection = document.getElementById('rule-builder-section');
    const ruleTbody = document.getElementById('rule-tbody');
    const btnRunScoring = document.getElementById('btn-run-scoring');
    const reportSection = document.getElementById('report-section');

    // XỬ LÝ SỰ KIỆN KÉO THẢ 
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // HÀM GỬI FILE LÊN SERVER 
    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        dropZone.innerHTML = `<span> Đang tải lên: ${file.name}...</span>`;
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            statusMessage.textContent = `Đã nhận file: ${file.name}. Sẵn sàng cấu hình luật!`;
            statusMessage.classList.remove('hidden');
            dropZone.innerHTML = `<span>Kéo thả file CSV/Excel vào đây hoặc Click để duyệt file</span>`;
            
            // Lưu lại đường dẫn để chấm điểm
            window.currentFilePath = data.filepath; 
            
            // Vẽ Bảng cấu hình
            renderRuleTable(data.columns);
            
            // Hiển thị phần Bảng
            ruleBuilderSection.classList.remove('hidden');

        } catch (error) {
            console.error("Lỗi upload:", error);
            statusMessage.textContent = `Lỗi: ${error.message || 'Kết nối Server thất bại!'}`;
            statusMessage.classList.remove('hidden');
            dropZone.innerHTML = `<span>Kéo thả file CSV/Excel vào đây hoặc Click để duyệt file</span>`;
        }
    }

    // HÀM VẼ BẢNG LUẬT 
    function renderRuleTable(columns) {
        ruleTbody.innerHTML = ''; // Xóa dữ liệu cũ
        
        columns.forEach(col => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${col.name}</strong></td>
                <td><span style="background:#e5e7eb; padding:2px 6px; border-radius:4px; font-size:0.85em;">${col.type}</span></td>
                <td>
                    <select class="rule-select" style="padding: 6px; width: 100%; border-radius: 4px; margin-bottom: 5px;">
                        <option value="">-- Không kiểm tra --</option>
                        <option value="completeness">Cần đầy đủ dữ liệu (Không chứa Null)</option>
                        <option value="accuracy_email">Đúng định dạng Email</option>
                        <option value="accuracy_range">Nằm trong khoảng Min - Max</option>
                        <option value="accuracy_regex">Tùy chỉnh Regex</option>
                    </select>
                    <!-- Khu vực chứa ô nhập liệu động (ẩn/hiện theo select) -->
                    <div class="rule-params"></div>
                </td>
                <td><button style="background:none; border:none; cursor:pointer;" title="Xóa cột này">❌</button></td>
            `;
            
            // Lắng nghe sự kiện thay đổi trên Dropdown để mở Input
            const selectEl = tr.querySelector('.rule-select');
            const paramsDiv = tr.querySelector('.rule-params');
            
            selectEl.addEventListener('change', (e) => {
                const ruleType = e.target.value;
                if (ruleType === 'accuracy_range') {
                    paramsDiv.innerHTML = `
                        <div style="display: flex; gap: 8px; margin-top: 4px;">
                            <input type="number" class="param-min" placeholder="Giá trị Min" style="width: 50%; padding: 4px;">
                            <input type="number" class="param-max" placeholder="Giá trị Max" style="width: 50%; padding: 4px;">
                        </div>
                    `;
                } else if (ruleType === 'accuracy_regex') {
                    paramsDiv.innerHTML = `
                        <input type="text" class="param-regex" placeholder="VD: ^[0-9]{10}$" style="width: 100%; padding: 4px; margin-top: 4px;">
                    `;
                } else {
                    paramsDiv.innerHTML = ''; 
                }
            });

            ruleTbody.appendChild(tr);
        });
    }

    // XỬ LÝ NÚT CHẤM ĐIỂM 
    btnRunScoring.addEventListener('click', async () => {
        btnRunScoring.textContent = "Đang xử lý tính toán...";
        btnRunScoring.disabled = true;

        // Gom dữ liệu từ bảng
        const rules = { completeness: [], accuracy: [] };
        const rows = document.querySelectorAll('#rule-tbody tr');

        rows.forEach(row => {
            const colName = row.querySelector('td strong').innerText;
            const selectedRule = row.querySelector('.rule-select').value;
            const paramsDiv = row.querySelector('.rule-params');

            if (selectedRule === 'completeness') {
                rules.completeness.push({ column: colName });
            } else if (selectedRule === 'accuracy_email') {
                rules.accuracy.push({ column: colName, type: 'email' });
            } else if (selectedRule === 'accuracy_range') {
                const minVal = paramsDiv.querySelector('.param-min').value;
                const maxVal = paramsDiv.querySelector('.param-max').value;
                if (minVal !== "" && maxVal !== "") {
                    rules.accuracy.push({
                        column: colName,
                        type: 'range',
                        min: parseFloat(minVal),
                        max: parseFloat(maxVal)
                    });
                }
            } else if (selectedRule === 'accuracy_regex') {
                const regexVal = paramsDiv.querySelector('.param-regex').value;
                if (regexVal) {
                    rules.accuracy.push({
                        column: colName,
                        type: 'regex',
                        pattern: regexVal
                    });
                }
            }
        });

        // Gửi lệnh xuống Backend
        try {
            const response = await fetch('/api/run-scoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filepath: window.currentFilePath, rules: rules })
            });

            const result = await response.json();

            // Đổ dữ liệu ra Báo cáo
            document.getElementById('final-score').innerText = result.final_score;
            document.getElementById('score-comp').innerText = result.dimension_scores.completeness;
            document.getElementById('score-acc').innerText = result.dimension_scores.accuracy;
            document.getElementById('health-status-text').innerText = `Trạng thái: ${result.health_status}`;

            reportSection.classList.remove('hidden');
            reportSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error("Lỗi:", error);
            alert("Có lỗi xảy ra khi chấm điểm! Hãy xem Console.");
        } finally {
            btnRunScoring.textContent = "Lưu cấu hình & Chấm điểm";
            btnRunScoring.disabled = false;
        }
    });
});
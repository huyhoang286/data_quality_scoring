let ruleLibrary = null; // Khởi tạo là null để kiểm tra

document.addEventListener('DOMContentLoaded', async () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusMessage = document.getElementById('upload-status');
    const ruleBuilderSection = document.getElementById('rule-builder-section');
    const ruleTbody = document.getElementById('rule-tbody');
    const btnRunScoring = document.getElementById('btn-run-scoring');
    const reportSection = document.getElementById('report-section');

    // Tải thư viện luật ngay khi mở trang
    try {
        const libRes = await fetch('/api/rule-library');
        ruleLibrary = await libRes.json();
        console.log("Đã tải thư viện luật:", ruleLibrary);
    } catch (err) {
        console.error("Không thể tải thư viện luật:", err);
    }

    // XỬ LÝ UPLOAD FILE 
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => e.target.files.length && handleFileUpload(e.target.files[0]));
    

    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);
        dropZone.innerHTML = `<span> Đang phân tích file...</span>`;
        
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            window.currentFilePath = data.filepath;
            
            if (!ruleLibrary) {
                alert("Lỗi: Thư viện luật chưa được tải. Vui lòng F5 trang.");
                return;
            }

            renderRuleTable(data.columns);
            ruleBuilderSection.classList.remove('hidden');
            statusMessage.textContent = `Đã nhận file: ${file.name}`;
            statusMessage.classList.remove('hidden');
            dropZone.innerHTML = `<span>Kéo thả file vào đây để thay đổi</span>`;

        } catch (error) {
            alert("Lỗi: " + error.message);
            dropZone.innerHTML = `<span>Lỗi! Click để thử lại</span>`;
        }
    }

    // HÀM VẼ BẢNG ĐỘNG TỪ THƯ VIỆN 
    function renderRuleTable(columns) {
        ruleTbody.innerHTML = '';
        columns.forEach(col => {
            const tr = document.createElement('tr');
            
            let optionsHtml = `<option value="">-- Không kiểm tra --</option>`;
            
            // Vẽ nhóm Completeness
            if (ruleLibrary.completeness) {
                optionsHtml += `<optgroup label="1. Tính đầy đủ (Completeness)">`;
                for (let key in ruleLibrary.completeness) {
                    optionsHtml += `<option value="comp:${key}">${ruleLibrary.completeness[key].label}</option>`;
                }
                optionsHtml += `</optgroup>`;
            }

            // Vẽ nhóm Accuracy
            if (ruleLibrary.accuracy) {
                optionsHtml += `<optgroup label="2. Tính chính xác (Accuracy)">`;
                for (let key in ruleLibrary.accuracy) {
                    optionsHtml += `<option value="acc:${key}">${ruleLibrary.accuracy[key].label}</option>`;
                }
                optionsHtml += `</optgroup>`;
            }

            // Vẽ nhóm Consistency
            if (ruleLibrary.consistency) {
                optionsHtml += `<optgroup label="3. Tính nhất quán (Consistency)">`;
                for (let key in ruleLibrary.consistency) {
                    optionsHtml += `<option value="cons:${key}">${ruleLibrary.consistency[key].label}</option>`;
                }
                optionsHtml += `</optgroup>`;
            }

            tr.innerHTML = `
                <td><strong>${col.name}</strong></td>
                <td><span class="badge">${col.type}</span></td>
                <td><select class="rule-select" style="width:100%">${optionsHtml}</select></td>
            `;
            ruleTbody.appendChild(tr);
        });
    }

    //  XỬ LÝ NÚT CHẤM ĐIỂM 
    btnRunScoring.addEventListener('click', async () => {
        btnRunScoring.textContent = "Đang tính toán...";
        btnRunScoring.disabled = true;

        const rules = { 
            completeness: { check_missing_values: [] }, 
            accuracy: { check_format: [], check_range: [], check_allowed_values: [] },
            consistency: { check_logic: [] }
        };

        document.querySelectorAll('#rule-tbody tr').forEach(row => {
            const colName = row.querySelector('td strong').innerText;
            const selectedValue = row.querySelector('.rule-select').value;
            
            if (!selectedValue) return;
            const [type, ruleKey] = selectedValue.split(':');

            if (type === 'comp') {
                const rule = ruleLibrary.completeness[ruleKey];
                rules.completeness.check_missing_values.push({ 
                    column: colName, 
                    allowed_null_percentage: rule.allowed_null_percentage 
                });
            } else if (type === 'acc') {
                const rule = ruleLibrary.accuracy[ruleKey];
                if (rule.type === 'regex') {
                    rules.accuracy.check_format.push({ column: colName, regex: rule.value });
                } else if (rule.type === 'range') {
                    rules.accuracy.check_range.push({ column: colName, min: rule.min, max: rule.max });
                }
            } else if (type === 'cons') {
                const rule = ruleLibrary.consistency[ruleKey];
                rules.consistency.check_logic.push({ 
                    rule_name: `check_${colName}_${ruleKey}`, 
                    condition: rule.value 
                });
            }
        });

        try {
            const res = await fetch('/api/run-scoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filepath: window.currentFilePath, rules: rules })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            
            document.getElementById('final-score').innerText = result.final_score;
            document.getElementById('health-status-text').innerText = `Trạng thái: ${result.health_status}`;
            document.getElementById('score-comp').innerText = result.dimension_scores.completeness || 0;
            document.getElementById('score-acc').innerText = result.dimension_scores.accuracy || 0;
            if(document.getElementById('score-cons')) {
                document.getElementById('score-cons').innerText = result.dimension_scores.consistency || 0;
            }
            reportSection.classList.remove('hidden');
            reportSection.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            alert(err.message);
        } finally {
            btnRunScoring.textContent = "Lưu cấu hình & Chấm điểm";
            btnRunScoring.disabled = false;
        }
    });
});
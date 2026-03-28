import pandas as pd

class RuleEngine:
    # Khởi tạo RuleEngine với bộ luật đọc từ YAML.
    def __init__(self, rules: dict):
        if 'rules' in rules:
            self.rules = rules['rules']
        else:
            self.rules = rules
            
        # Nơi lưu trữ kết quả quét lỗi
        self.results = {
            "completeness": {},
            "accuracy": {},
            "consistency": {}
        }

    # Thực thi toàn bộ các luật kiểm tra trên DataFrame.
    def run(self, df: pd.DataFrame) -> dict:
        self.df = df.copy() 
        self._check_completeness()
        self._check_accuracy()
        self._check_consistency()
        
        print("Đã quét xong toàn bộ dữ liệu!")
        return self.results

    # Kiểm tra tính đầy đủ (Missing values)
    def _check_completeness(self):
        rules = self.rules.get('completeness', {}).get('check_missing_values', [])
        for rule in rules:
            col = rule['column']
            allowed_pct = rule['allowed_null_percentage'] #Tỉ lệ cho phép thiếu
            
            if col in self.df.columns:
                missing_count = self.df[col].isna().sum()
                total_count = len(self.df)
                missing_pct = (missing_count / total_count) * 100
                
                passed = missing_pct <= allowed_pct
                self.results["completeness"][col] = {
                    "missing_count": int(missing_count),
                    "missing_percentage": float(missing_pct),
                    "passed": bool(passed)
                }

    # Kiểm tra tính chính xác (Format Regex và Range).
    def _check_accuracy(self):
        # 1. Kiểm tra định dạng (Regex)
        format_rules = self.rules.get('accuracy', {}).get('check_format', [])
        for rule in format_rules:
            col = rule['column']
            regex = rule['regex']
            if col in self.df.columns:
                # Tìm những dòng KHÔNG khớp regex và KHÔNG phải là NaN
                invalid_mask = ~self.df[col].astype(str).str.match(regex, na=False)
                invalid_mask = invalid_mask & self.df[col].notna() 
                invalid_count = invalid_mask.sum()
                
                self.results["accuracy"][f"{col}_format"] = {
                    "invalid_count": int(invalid_count),
                    "passed": bool(invalid_count == 0)
                }
                
        # 2. Kiểm tra khoảng giá trị (Min/Max)
        range_rules = self.rules.get('accuracy', {}).get('check_range', [])
        for rule in range_rules:
            col = rule['column']
            min_val = rule.get('min')
            max_val = rule.get('max')
            if col in self.df.columns:
                invalid_mask = pd.Series(False, index=self.df.index)
                if min_val is not None:
                    invalid_mask = invalid_mask | (self.df[col] < min_val)
                if max_val is not None:
                    invalid_mask = invalid_mask | (self.df[col] > max_val)
                    
                invalid_count = invalid_mask.sum()
                self.results["accuracy"][f"{col}_range"] = {
                    "invalid_count": int(invalid_count),
                    "passed": bool(invalid_count == 0)
                }

    #Kiểm tra tính nhất quán (Logic chéo giữa các cột).
    def _check_consistency(self):
        logic_rules = self.rules.get('consistency', {}).get('check_logic', [])
        for rule in logic_rules:
            rule_name = rule['rule_name']
            condition = rule['condition'] 
            
            try:
                for col in self.df.columns:
                    if 'date' in col.lower():
                        self.df[col] = pd.to_datetime(self.df[col], errors='coerce')

                # Sử dụng hàm eval của Pandas để tự động dịch chuỗi điều kiện thành code
                valid_mask = self.df.eval(condition)
                
                # Đếm số dòng bị False (vi phạm logic)
                invalid_count = (~valid_mask).sum() 
                
                self.results["consistency"][rule_name] = {
                    "invalid_count": int(invalid_count),
                    "passed": bool(invalid_count == 0)
                }
            except Exception as e:
                print(f"[WARNING] Lỗi khi đánh giá rule {rule_name}: {e}")
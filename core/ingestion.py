# Xây dựng luồng đọc và chuẩn hóa dữ liệu đầu vào
import pandas as pd
import yaml
import os
from pathlib import Path

class DataIngestor:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.rules = self._load_rules() #Nạp quy tắc chấm điểm

    # Đọc và parse file cấu hình YAML thành Dictionary
    def _load_rules(self) -> dict:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Không tìm thấy file cấu hình tại: {self.config_path}")
            
        with open(self.config_path, 'r', encoding='utf-8') as file:
            try:
                rules = yaml.safe_load(file) 
                print(f"[SYSTEM] Đã nạp cấu hình luật thành công từ {self.config_path}")
                return rules
            except yaml.YAMLError as exc:
                print(f"[ERROR] Lỗi cú pháp trong file YAML: {exc}")
                return {}

    # Đọc dữ liệu đầu vào và chuyển thành Pandas DataFrame.
    def load_data(self, data_path: str) -> pd.DataFrame:
        path = Path(data_path)
        if not path.exists():
            raise FileNotFoundError(f"Không tìm thấy file dữ liệu tại: {data_path}")

        print(f"[SYSTEM] Đang đọc dữ liệu từ: {data_path}...")
        
        try:
            if path.suffix.lower() == '.csv':
                df = pd.read_csv(data_path)
            elif path.suffix.lower() in ['.xls', '.xlsx']:
                df = pd.read_excel(data_path)
            else:
                raise ValueError(f"Định dạng file '{path.suffix}' hiện chưa được hỗ trợ.")
            
            print(f"[SUCCESS] Đã nạp xong tập dữ liệu. Kích thước: {df.shape[0]} dòng, {df.shape[1]} cột.")
            return df
            
        except Exception as e:
            print(f"[ERROR] Quá trình đọc dữ liệu thất bại: {e}")
            return pd.DataFrame() # Trả về DataFrame rỗng nếu lỗi
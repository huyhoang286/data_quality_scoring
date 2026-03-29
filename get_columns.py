import pandas as pd
import json
import sys
import io
import os

# UTF-8 cho Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def get_columns(file_path):
    try:
        if not os.path.exists(file_path):
            return {"error": f"Không tìm thấy file tại: {file_path}"}

        # Đọc metadata
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, nrows=100)
        else:
            df = pd.read_excel(file_path, nrows=100)
        
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_datetime(df[col], format='mixed', errors='raise')
                except (ValueError, TypeError):
                    pass 

        columns = []
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if 'datetime' in dtype_str:
                clean_type = 'datetime'
            elif 'int' in dtype_str:
                clean_type = 'integer'
            elif 'float' in dtype_str:
                clean_type = 'float'
            else:
                clean_type = 'string' 

            columns.append({
                "name": str(col),
                "type": clean_type
            })
            
        return columns

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            file_path = sys.argv[1]
            result = get_columns(file_path)
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(json.dumps({"error": "Thiếu đường dẫn file"}))
    except Exception as e:
        print(json.dumps({"error": f"Lỗi hệ thống Python: {str(e)}"}))
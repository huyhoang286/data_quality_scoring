import pandas as pd
import sys
import json

def get_columns(file_path):
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith('.xlsx'):
            df = pd.read_excel(file_path)
        else:
            return {"error": "Định dạng file không được hỗ trợ"}

        # Trích xuất tên cột và kiểu dữ liệu
        columns = [{"name": str(col), "type": str(df[col].dtype)} for col in df.columns]
        return columns

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn file"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = get_columns(file_path)
    
    print(json.dumps(result))
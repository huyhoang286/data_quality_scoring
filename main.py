from core.ingestion import DataIngestor
from core.rule_engine import RuleEngine
import json

def main():
    # 1. Khai báo đường dẫn
    config_file = "configs/default_rules.yaml"
    data_file = "sample_data.csv"

    # 2. Nạp dữ liệu và cấu hình
    ingestor = DataIngestor(config_path=config_file)
    df = ingestor.load_data(data_path=data_file)

    if not df.empty:
        # 3. Chạy Trình thực thi luật
        engine = RuleEngine(rules=ingestor.rules)
        validation_results = engine.run(df=df)
        
        # 4. In kết quả tổng hợp ra Terminal (định dạng JSON cho dễ nhìn)
        print("\n================ BÁO CÁO KIỂM TRA LỖI ================")
        print(json.dumps(validation_results, indent=4, ensure_ascii=False))
        print("======================================================")

if __name__ == "__main__":
    main()
from core.ingestion import DataIngestor
from core.rule_engine import RuleEngine
from core.scorer import Scorer
import json

def main():
    config_file = "configs/default_rules.yaml"
    data_file = "sample_data.csv"

    # 1. Nạp liệu
    ingestor = DataIngestor(config_path=config_file)
    df = ingestor.load_data(data_path=data_file)

    if not df.empty:
        # 2. Quét lỗi
        engine = RuleEngine(rules=ingestor.rules)
        validation_results = engine.run(df=df)
        
        # 3. Chấm điểm
        scorer = Scorer(validation_results=validation_results, total_rows=len(df))
        health_report = scorer.calculate_score()
        
        # 4. In Báo cáo Sức khỏe (Dành cho người quản lý)
        print("\n================ BÁO CÁO SỨC KHỎE DỮ LIỆU ================")
        print(json.dumps(health_report, indent=4, ensure_ascii=False))
        print("==========================================================")

if __name__ == "__main__":
    main()
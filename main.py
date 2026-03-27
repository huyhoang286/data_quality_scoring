from core.ingestion import DataIngestor
from core.profiler import Profiler
from core.rule_engine import RuleEngine
from core.scorer import Scorer
import json

def main():
    config_file = "configs/default_rules.yaml"
    data_file = "sample_data.csv"

    print(f"\n[SYSTEM] Khởi động công cụ Data Quality Scorer...")
    print(f"[SYSTEM] Dữ liệu đầu vào: {data_file}")
    
    # Nạp liệu
    ingestor = DataIngestor(config_path=config_file)
    df = ingestor.load_data(data_path=data_file)

    if not df.empty:
        # DATA PROFILING 
        profiler = Profiler(df=df)
        profile_report = profiler.run_profiling()
        
        print("\n--- THỐNG KÊ TỔNG QUAN ---")
        print(json.dumps(profile_report["overall_stats"], indent=4, ensure_ascii=False))

        print("\n--- THỐNG KÊ CHI TIẾT TỪNG CỘT ---")
        print(json.dumps(profile_report["column_profiles"], indent=4, ensure_ascii=False))

        # RULE-BASED ENGINE
        engine = RuleEngine(rules=ingestor.rules)
        validation_results = engine.run(df=df)
        
        print("\n--- KẾT QUẢ QUÉT LỖI CHI TIẾT ---")
        print(json.dumps(validation_results, indent=4, ensure_ascii=False))
        
        #SCORING 
        scorer = Scorer(validation_results=validation_results, total_rows=len(df))
        health_report = scorer.calculate_score()
        
        # In Báo cáo Sức khỏe cuối cùng
        print("\n================ BÁO CÁO SỨC KHỎE DỮ LIỆU ================")
        print(json.dumps(health_report, indent=4, ensure_ascii=False))
        print("==========================================================")

if __name__ == "__main__":
    main()
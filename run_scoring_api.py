import sys
import io
import json
import argparse
import warnings
from core.ingestion import DataIngestor
from core.rule_engine import RuleEngine
from core.scorer import Scorer

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

warnings.filterwarnings('ignore')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--config", required=True)
    args = parser.parse_args()

    try:
        # Nạp dữ liệu và Luật
        ingestor = DataIngestor(config_path=args.config)
        df = ingestor.load_data(data_path=args.data)

        if df.empty:
            print(json.dumps({"error": "Dữ liệu trống hoặc không hợp lệ"}, ensure_ascii=False))
            return

        # Quét lỗi
        engine = RuleEngine(rules=ingestor.rules)
        validation_results = engine.run(df=df)

        # Chấm điểm
        scorer = Scorer(validation_results=validation_results, total_rows=len(df))
        health_report = scorer.calculate_score()

        print(json.dumps(health_report, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
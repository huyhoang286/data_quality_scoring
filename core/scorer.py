class Scorer:
    def __init__(self, validation_results: dict, total_rows: int):

        self.results = validation_results #kết quả từ RuleEngine.
        self.total_rows = total_rows #Tổng số dòng của tập dữ liệu
        
        self.weights = {
            "completeness": 0.3,
            "accuracy": 0.4,
            "consistency": 0.3
        }

    def calculate_score(self) -> dict:
        dimension_scores = {}
        final_score = 0.0

        for dimension, rules in self.results.items():
            if not rules:
                dimension_scores[dimension] = 100.0
                final_score += 100.0 * self.weights.get(dimension, 0)
                continue

            dimension_total_score = 0
            
            # Tính điểm cho từng luật trong tiêu chí
            for rule_name, rule_data in rules.items():
                if "missing_count" in rule_data:
                    invalid = rule_data["missing_count"]
                else:
                    invalid = rule_data.get("invalid_count", 0)

                rule_score = max(0, 100 - (invalid / self.total_rows * 100))
                dimension_total_score += rule_score

            dim_score = round(dimension_total_score / len(rules), 2)
            dimension_scores[dimension] = dim_score
            
            # Cộng dồn vào điểm tổng (nhân với trọng số)
            final_score += dim_score * self.weights.get(dimension, 0)

        final_score = round(final_score, 2)

        # Phân loại Sức khỏe dữ liệu
        health_status = "Tốt" if final_score >= 80 else ("Khá" if final_score >= 50 else "Kém")

        return {
            "dimension_scores": dimension_scores,
            "final_score": final_score,
            "health_status": health_status
        }
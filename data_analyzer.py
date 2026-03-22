import pandas as pd
import re

class DataQualityAnalyzer:
    def __init__(self, file_path):
        self.df = pd.read_csv(file_path)
        self.report = {}

    # 1. COMPLETENESS
    def check_completeness(self):
        total_cells = self.df.size
        missing_cells = self.df.isnull().sum().sum()

        completeness = (total_cells - missing_cells) / total_cells
        self.report['completeness'] = round(completeness * 100, 2)

        return self.report['completeness']

    # 2. ACCURACY
    def is_valid_email(self, email):
        if pd.isnull(email):
            return False
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return re.match(pattern, str(email)) is not None

    def is_valid_phone(self, phone):
        if pd.isnull(phone):
            return False
        return any(char.isdigit() for char in str(phone))

    def check_accuracy(self):
        valid = 0
        total = 0

        for _, row in self.df.iterrows():

            total += 1
            if 18 <= row['age'] <= 100:
                valid += 1

            total += 1
            if self.is_valid_email(row['email']):
                valid += 1

            total += 1
            if self.is_valid_phone(row['phone_number']):
                valid += 1

            total += 1
            try:
                if pd.to_datetime(row['start_date']) < pd.to_datetime(row['end_date']):
                    valid += 1
            except:
                pass

        accuracy = valid / total
        self.report['accuracy'] = round(accuracy * 100, 2)

        return self.report['accuracy']

    # 3. CONSISTENCY
    def check_consistency(self):
        consistency_score = 0
        checks = 0

        checks += 1
        if self.df['id'].is_unique:
            consistency_score += 1

        checks += 1
        emails = self.df['email'].dropna()
        if len(emails) == len(emails.unique()):
            consistency_score += 1

        checks += 1
        phones = self.df['phone_number'].dropna()
        if len(phones) == len(phones.unique()):
            consistency_score += 1

        consistency = consistency_score / checks
        self.report['consistency'] = round(consistency * 100, 2)

        return self.report['consistency']

    # OVERALL SCORE
    def calculate_score(self):
        weights = {
            'completeness': 0.3,
            'accuracy': 0.4,
            'consistency': 0.3
        }

        score = 0
        for k, w in weights.items():
            score += self.report.get(k, 0) * w

        self.report['overall_score'] = round(score, 2)
        return self.report['overall_score']

    # 5. RUN ALL
    def analyze(self):
        print("Analyzing data quality...\n")

        self.check_completeness()
        self.check_accuracy()
        self.check_consistency()
        self.calculate_score()

        return self.report

if __name__ == "__main__":
    analyzer = DataQualityAnalyzer("sample_data.csv")
    result = analyzer.analyze()

    print("=== DATA QUALITY REPORT ===")
    for k, v in result.items():
        print(f"{k}: {v}")
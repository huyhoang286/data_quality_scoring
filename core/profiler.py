import pandas as pd

class Profiler:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def run_profiling(self) -> dict:
        return {
            "overall_stats": self._get_overall_stats(),
            "column_profiles": self._get_column_profiles()
        }

    def _get_overall_stats(self) -> dict:
        return {
            "total_rows": int(len(self.df)),
            "total_columns": int(len(self.df.columns)),
            "memory_usage_mb": float(round(self.df.memory_usage(deep=True).sum() / (1024**2), 2)),
            "duplicate_rows": int(self.df.duplicated().sum())
        }

    def _get_column_profiles(self) -> dict:
        profiles = {}
        for col in self.df.columns:
            series = self.df[col]
            
            # Thông tin nền tảng cột nào cũng có
            stats = {
                "dtype": str(series.dtype),
                "missing_count": int(series.isna().sum()),
                "missing_percentage": float(round((series.isna().sum() / len(self.df)) * 100, 2)),
                "unique_count": int(series.nunique())
            }

            # Nếu là dữ liệu Số (Numeric)
            if pd.api.types.is_numeric_dtype(series):
                clean_series = series.dropna()
                if not clean_series.empty:
                    stats.update({
                        "min": float(clean_series.min()),
                        "max": float(clean_series.max()),
                        "mean": float(round(clean_series.mean(), 2)),
                        "median": float(round(clean_series.median(), 2)),
                        "std_dev": float(round(clean_series.std(), 2)) if len(clean_series) > 1 else 0.0
                    })
                else:
                    # Nếu cả cột đều là NaN
                    stats.update({"min": None, "max": None, "mean": None, "median": None, "std_dev": None})
            
            # Nếu là dữ liệu Chuỗi / Phân loại 
            else:
                top_vals = series.value_counts().head(3)
                # Chuyển đổi an toàn sang dictionary với key là chuỗi, value là số nguyên
                stats.update({
                    "top_values": {str(k): int(v) for k, v in top_vals.items()}
                })

            profiles[col] = stats
            
        return profiles
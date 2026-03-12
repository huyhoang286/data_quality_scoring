import pandas as pd
import random
from faker import Faker
from datetime import timedelta

fake = Faker('vi_VN')

num_rows = 10000
data = []

print("Bắt đầu sinh dữ liệu, vui lòng đợi...")

for i in range(1, num_rows + 1):
    name = fake.name()
    email = fake.ascii_email()
    phone = fake.phone_number()
    age = random.randint(18, 100)
    
    start_date = fake.date_between(start_date='-2y', end_date='today')
    end_date = start_date + timedelta(days=random.randint(30, 365)) 
    
    if random.random() < 0.02: 
        email = None
        
    if random.random() < 0.15: 
        phone = None

    if email is not None and random.random() < 0.03: 
        email = email.replace('@', '') 
        
    if random.random() < 0.05:
        age = random.choice([random.randint(1, 17), random.randint(101, 120)])

    if random.random() < 0.04:
        end_date = start_date - timedelta(days=random.randint(1, 30))
        
    data.append([i, name, email, phone, age, start_date, end_date])

columns = ['id', 'name', 'email', 'phone_number', 'age', 'start_date', 'end_date']
df = pd.DataFrame(data, columns=columns)

df.to_csv('sample_data.csv', index=False)

print(f"Hoàn tất! Đã lưu file 'sample_data.csv' với {len(df)} dòng dữ liệu.")
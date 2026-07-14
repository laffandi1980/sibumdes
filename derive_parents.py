import csv

file_path = 'assets/coa.csv'
rows = []

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        if row.get('Kode Akun'):
            rows.append(row)

# Keep track of the last seen code for each level
last_code_at_level = {}
results = []

for row in rows:
    current_code = row['Kode Akun'].strip()
    try:
        current_level = int(row['Level'].strip())
    except (ValueError, TypeError):
        results.append((current_code, row['Nama Akun'], current_level, None))
        continue
    
    parent_code = last_code_at_level.get(current_level - 1)
    results.append((current_code, row['Nama Akun'], current_level, parent_code))
    
    # Update current level and clear deeper levels since we moved to a new branch or sibling
    last_code_at_level[current_level] = current_code
    for l in list(last_code_at_level.keys()):
        if l > current_level:
            del last_code_at_level[l]

print(f"Total rows processed: {len(results)}")
print(f"{'Kode Akun':<15} | {'Level':<5} | {'Parent Code':<15} | {'Nama Akun'}")
print("-" * 60)

# Sample 10 items across different parts
indices = [0, 1, 5, 10, 20, 50, 100, 150, len(results)//2, len(results)-1]
for i in sorted(list(set(indices))):
    if i < len(results):
        r = results[i]
        print(f"{r[0]:<15} | {r[2]:<5} | {str(r[3]):<15} | {r[1]}")


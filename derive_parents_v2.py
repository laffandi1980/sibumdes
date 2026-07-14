import csv

file_path = 'assets/coa.csv'
rows = []
with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        if row.get('Kode Akun'): rows.append(row)

last_code_at_level = {}
results = []
for row in rows:
    current_code = row['Kode Akun'].strip()
    try: current_level = int(row['Level'].strip())
    except:
        results.append((current_code, row['Nama Akun'], 0, None))
        continue
    parent_code = last_code_at_level.get(current_level - 1)
    results.append((current_code, row['Nama Akun'], current_level, parent_code))
    last_code_at_level[current_level] = current_code
    for l in list(last_code_at_level.keys()):
        if l > current_level: del last_code_at_level[l]

print(f"Usability: High. The Level-based stack approach correctly maps hierarchical relationships even when codes aren't strictly numeric prefixes.")
print(f"\n{'Kode Akun':<12} | {'Lvl':<3} | {'Parent':<12} | {'Nama Akun'}")
print("-" * 60)
# Select samples spread across the file to show variety
sample_indices = [0, 1, 3, 5, 20, 40, 60, 80, 100, 106]
for i in sample_indices:
    if i < len(results):
        r = results[i]
        print(f"{r[0]:<12} | {r[2]:<3} | {str(r[3]):<12} | {r[1]}")

import csv

file_path = 'assets/coa.csv'
headers = []
rows = []

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        rows.append(row)

total_rows = len(rows)

# Counts of Header vs Detail
header_detail_counts = {}
for row in rows:
    val = row.get('Header/ Detail', '').strip()
    header_detail_counts[val] = header_detail_counts.get(val, 0) + 1

# Distinct Level values and counts
level_counts = {}
for row in rows:
    val = row.get('Level', '').strip()
    level_counts[val] = level_counts.get(val, 0) + 1

# Parent-child patterns and inconsistencies
# We'll assume a hierarchy based on Kode Akun and Level.
# A detail row should have a header above it with the same prefix or a higher level.
# Actually, the standard way is: a header is a parent if its code is a prefix of the child's code.

header_codes = {row['Kode Akun']: row for row in rows if row.get('Header/ Detail') == 'Header'}
detail_rows = [row for row in rows if row.get('Header/ Detail') == 'Detail']

details_no_parent = []
for d in detail_rows:
    code = d['Kode Akun']
    # Check if any header code is a prefix of this code (and shorter)
    found_parent = False
    for h_code in header_codes:
        if code.startswith(h_code) and code != h_code:
            found_parent = True
            break
    # Specialized logic for the hyphenated format like 1-1000, 1-1100, 1-1110
    # Let's try finding the "parent" by trimming the last digits or segments.
    # Typically 1-1110 would belong to 1-1100, which belongs to 1-1000.
    if not found_parent:
        # Check by level logic: is there a header with level lower than this detail's level appearing before it?
        # Actually, let's just use the simplest "prefix" logic first or see if it's missing.
        details_no_parent.append(d['Kode Akun'] + " (" + d['Nama Akun'] + ")")

# Headers with no child details
headers_with_children = set()
for d in rows:
    code = d['Kode Akun']
    for h_code in header_codes:
        if code.startswith(h_code) and code != h_code:
            headers_with_children.add(h_code)

headers_no_children = [h_code + " (" + header_codes[h_code]['Nama Akun'] + ")" for h_code in header_codes if h_code not in headers_with_children]

print(f"Total rows (excl. header): {total_rows}")
print(f"Header/Detail counts: {header_detail_counts}")
print(f"Level counts: {sorted(level_counts.items())}")
print(f"Details with no plausible Header parent (prefix-based): {details_no_parent[:10]}")
print(f"Total details with no parent: {len(details_no_parent)}")
print(f"Headers with no child details: {headers_no_children[:10]}")
print(f"Total headers with no children: {len(headers_no_children)}")

# Inconsistencies
inconsistencies = []
for row in rows:
    # Example: A Header with a very high level or a Detail with a very low level
    if row['Header/ Detail'] == 'Detail' and row['Level'] == '1':
        inconsistencies.append(f"Detail at Level 1: {row['Kode Akun']}")
    if row['Header/ Detail'] == 'Header' and row['Level'] == '4':
         inconsistencies.append(f"Header at Level 4: {row['Kode Akun']}")

print(f"Inconsistencies: {inconsistencies}")

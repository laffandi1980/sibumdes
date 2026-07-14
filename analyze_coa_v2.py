import csv

file_path = 'assets/coa.csv'
rows = []

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        # Only keep rows that have actual data (Kode Akun is not empty)
        if row.get('Kode Akun'):
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

# Parent-child patterns
# Kode Akun example: 1-1000 (Header), 1-1100 (Header), 1-1110 (Detail)
# We consider a parent-child relationship if:
# 1. Parent is Header
# 2. Parent's code prefix matches (e.g., 1-1 matches 1-1XXX)
# 3. Level of parent < Level of child

header_rows = [row for row in rows if row.get('Header/ Detail') == 'Header']
detail_rows = [row for row in rows if row.get('Header/ Detail') == 'Detail']

def is_parent(h, c):
    h_code = h['Kode Akun']
    c_code = c['Kode Akun']
    # If h_code is 1-1000, it might be parent of 1-1100 and 1-1110
    # Let's check shared prefix based on the structure.
    # Usually: 1-0000 -> 1-1000 -> 1-1100 -> 1-1110
    # A simple check: does c_code start with the significant part of h_code?
    # e.g. h=1-1000 -> prefix "1-1", h=1-1100 -> prefix "1-11"
    h_base = h_code.rstrip('0').rstrip('-')
    if c_code.startswith(h_base) and h_code != c_code:
        if int(h['Level']) < int(c['Level']):
            return True
    return False

details_no_parent = []
for d in detail_rows:
    found = any(is_parent(h, d) for h in header_rows)
    if not found:
        details_no_parent.append(f"{d['Kode Akun']} ({d['Nama Akun']})")

headers_no_children = []
for h in header_rows:
    found = any(is_parent(h, c) for c in rows if h != c)
    if not found:
        headers_no_children.append(f"{h['Kode Akun']} ({h['Nama Akun']})")

print(f"Total entries: {total_rows}")
print(f"Header/Detail counts: {header_detail_counts}")
print(f"Level counts: {sorted(level_counts.items())}")
print(f"Details with no parent (prefix+level match): {len(details_no_parent)}")
if details_no_parent:
    print(f"Examples: {details_no_parent[:5]}")
print(f"Headers with no children (prefix+level match): {len(headers_no_children)}")
if headers_no_children:
    print(f"Examples: {headers_no_children[:5]}")

# Consistency checks
inconsistencies = []
for row in rows:
    hd = row['Header/ Detail']
    lvl = row.get('Level')
    if hd == 'Header' and not lvl:
        inconsistencies.append(f"Header missing Level: {row['Kode Akun']}")
    if hd == 'Detail' and not lvl:
        inconsistencies.append(f"Detail missing Level: {row['Kode Akun']}")
    # Check if a multi-digit code follows a certain pattern
    # Just a sanity check:
    if hd not in ['Header', 'Detail']:
        inconsistencies.append(f"Invalid Header/Detail value '{hd}': {row['Kode Akun']}")

print(f"Inconsistencies found: {len(inconsistencies)}")
for inc in inconsistencies[:5]:
    print(f"- {inc}")

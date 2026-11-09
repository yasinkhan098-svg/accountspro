import os
import json

db_dir = r"C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb"
files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith('.ldb') or f.endswith('.log')]

found_items = []
found_companies = []

for fpath in files:
    with open(fpath, 'rb') as f:
        data = f.read()

    # Try searching utf-8
    for target in [b'allStockItems', b'a\x00l\x00l\x00S\x00t\x00o\x00c\x00k\x00I\x00t\x00e\x00m\x00s\x00']:
        pos = 0
        while True:
            idx = data.find(target, pos)
            if idx == -1:
                break
            pos = idx + len(target)
            print(f"Found {target} in {os.path.basename(fpath)} at {idx}")
            snippet = data[idx:idx+1500]
            # Try decoding utf-16le or utf-8
            for enc in ['utf-8', 'utf-16le']:
                try:
                    s = snippet.decode(enc, errors='ignore')
                    b_idx = s.find('[')
                    if b_idx != -1:
                        print(f"  [{enc}] snippet starts with: {s[b_idx:b_idx+150]}")
                except Exception as e:
                    pass

    for target in [b'companies', b'c\x00o\x00m\x00p\x00a\x00n\x00i\x00e\x00s\x00']:
        pos = 0
        while True:
            idx = data.find(target, pos)
            if idx == -1:
                break
            pos = idx + len(target)
            print(f"Found {target} in {os.path.basename(fpath)} at {idx}")
            snippet = data[idx:idx+1000]
            for enc in ['utf-8', 'utf-16le']:
                try:
                    s = snippet.decode(enc, errors='ignore')
                    b_idx = s.find('[')
                    if b_idx != -1:
                        print(f"  [{enc}] snippet starts with: {s[b_idx:b_idx+150]}")
                except:
                    pass

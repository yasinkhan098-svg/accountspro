import os
import re
import json

path = r"C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb\000615.ldb"
with open(path, 'rb') as f:
    data = f.read()

# Let's find each item JSON object
# An item object has "name", "id", "unit", "companyId" etc.
pattern = re.compile(rb'\{[^{}]*?"name"\s*:\s*"([^"]+)"[^{}]*?"companyId"\s*:\s*([0-9]+)[^{}]*?\}')
matches = pattern.findall(data)
print(f"Matched {len(matches)} simple item objects")
for m in matches[:10]:
    print(m)

# Let's also do a broader scan for any JSON object that looks like a stock item
item_pattern = re.compile(rb'\{"id":[0-9]+,"name":"[^"]+".*?"companyId":([0-9]+).*?\}')
broad_matches = item_pattern.findall(data)
print(f"Broad matches: {len(broad_matches)}")


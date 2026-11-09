with open(r'C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb\000615.ldb', 'rb') as f:
    data = f.read()

# Let's search for "Mather Board" or "Ram"
items = ["ALUMINUIM SACTION", "CEMENT", "Cabinet", "Cpu", "Dvd Writer", "Hdd", "I3 Pc", "M Fan", "Mather Board", "Ram", "Smps", "TMT BAR", "LOCAL ITEM", "Item 4"]

for it in items:
    idx = data.find(it.encode('utf-8'))
    print(f"Item: {it} -> index {idx}")
    if idx != -1:
        # print 80 bytes before and 150 bytes after
        snippet = data[max(0, idx-60):idx+150]
        print("  raw:", repr(snippet))


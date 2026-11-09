with open(r'C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb\000615.ldb', 'rb') as f:
    data = f.read()

idx = data.find(b'ALUMINUIM SACTION')
print("ALUMINUIM SACTION at:", idx)
start = max(0, idx - 200)
end = min(len(data), idx + 800)
print(repr(data[start:end]))


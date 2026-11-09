with open(r'C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb\000615.ldb', 'rb') as f:
    data = f.read()

start = 580499
print("Total data len:", len(data))
# print around 580499
chunk = data[start:start+10000]
print(repr(chunk[:300]))


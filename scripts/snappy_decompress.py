import struct

def decompress_snappy(data):
    pos = 0
    # 1. Read varint uncompressed length
    length = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        length |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7

    out = bytearray()
    while pos < len(data):
        tag = data[pos]
        pos += 1
        elem_type = tag & 0x03

        if elem_type == 0:
            # Literal
            lit_len = tag >> 2
            if lit_len < 60:
                lit_len += 1
            elif lit_len == 60:
                lit_len = data[pos] + 1
                pos += 1
            elif lit_len == 61:
                lit_len = struct.unpack('<H', data[pos:pos+2])[0] + 1
                pos += 2
            elif lit_len == 62:
                lit_len = struct.unpack('<I', data[pos:pos+3] + b'\x00')[0] + 1
                pos += 3
            elif lit_len == 63:
                lit_len = struct.unpack('<I', data[pos:pos+4])[0] + 1
                pos += 4
            out.extend(data[pos:pos+lit_len])
            pos += lit_len

        elif elem_type == 1:
            # Copy 1-byte offset
            copy_len = ((tag >> 2) & 0x07) + 4
            offset = ((tag >> 5) << 8) | data[pos]
            pos += 1
            for _ in range(copy_len):
                out.append(out[-offset])

        elif elem_type == 2:
            # Copy 2-byte offset
            copy_len = (tag >> 2) + 1
            offset = struct.unpack('<H', data[pos:pos+2])[0]
            pos += 2
            for _ in range(copy_len):
                out.append(out[-offset])

        elif elem_type == 3:
            # Copy 4-byte offset
            copy_len = (tag >> 2) + 1
            offset = struct.unpack('<I', data[pos:pos+4])[0]
            pos += 4
            for _ in range(copy_len):
                out.append(out[-offset])

    return bytes(out)

with open(r'C:\Users\yasin\AppData\Local\LedgerX\Profile\Default\Local Storage\leveldb\000615.ldb', 'rb') as f:
    raw = f.read()

# In LevelDB table files, blocks are compressed with Snappy.
# Each block ends with 1-byte compression type (0x01 = Snappy, 0x00 = None) + 4-byte CRC32.
# Let's search for blocks around allStockItems
idx = raw.find(b'allStockItems')
print("allStockItems at:", idx)

# Let's try decompressing from idx + len('allStockItems') + 9
snappy_data = raw[idx + len(b'allStockItems') + 8:]
try:
    decomp = decompress_snappy(snappy_data)
    print("Decompressed len:", len(decomp))
    text = decomp.decode('utf-8', errors='ignore')
    print("Snippet:", text[:500])
    # check if valid json
    b_start = text.find('[')
    b_end = text.rfind(']')
    if b_start != -1 and b_end != -1:
        import json
        items = json.loads(text[b_start:b_end+1])
        print("SUCCESSFULLY PARSED JSON ITEMS! Count:", len(items))
        with open(r'C:\Users\yasin\AppData\Local\LedgerX\extracted_stock_items.json', 'w', encoding='utf-8') as out_f:
            json.dump(items, out_f, indent=2)
        print("Saved to extracted_stock_items.json")
except Exception as e:
    print("Decompress error:", e)


/**
 * zip — minimal STORE-mode ZIP writer (M13; relocated to lib in M15, no dependencies).
 *
 * The comic proof stores pages uncompressed on purpose: the harness can verify
 * dialogue text in the raw bytes of the entries (see the zip-entries oracle).
 * UTF-8 filenames; standard local headers + central directory + EOCD.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day };
}

function writeChunk(target: number[], bytes: Uint8Array | DataView): void {
  const view = bytes instanceof DataView ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : bytes;
  for (const byte of view) target.push(byte);
}

/**
 * Build a store-mode ZIP archive. Fixed timestamp (2026-01-01) keeps the
 * output deterministic for golden/evidence comparisons.
 */
export function buildZip(entries: ZipEntry[], now: Date = new Date(2026, 0, 1, 0, 0, 0)): Uint8Array {
  const { time, date } = dosDateTime(now);
  const out: number[] = [];
  const central: number[] = [];
  const offsets: number[] = [];

  const encoder = new TextEncoder();
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = out.length;
    offsets.push(offset);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names flag
    local.setUint16(8, 0, true); // method: store
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);

    writeChunk(out, local);
    writeChunk(out, nameBytes);
    writeChunk(out, entry.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, entry.data.length, true);
    cd.setUint32(24, entry.data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint16(30, 0, true);
    cd.setUint16(32, 0, true);
    cd.setUint16(34, 0, true);
    cd.setUint16(36, 0, true);
    cd.setUint32(38, 0, true);
    cd.setUint32(42, offset, true);
    writeChunk(central, cd);
    writeChunk(central, nameBytes);
  }

  const centralOffset = out.length;
  writeChunk(out, new Uint8Array(central));
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, central.length, true);
  eocd.setUint32(16, centralOffset, true);
  writeChunk(out, eocd);

  return new Uint8Array(out);
}

/** Minimal reader for store-mode archives (harness/tests). */
export function readZipEntries(bytes: Uint8Array): Array<{ name: string; data: Uint8Array }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  // find EOCD
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip archive (EOCD missing)');
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const entries: Array<{ name: string; data: Uint8Array }> = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('corrupt central directory');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    if (method !== 0) throw new Error(`entry ${name} is not stored (method ${method})`);
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    entries.push({ name, data: bytes.subarray(dataStart, dataStart + compressedSize) });
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

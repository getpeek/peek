export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCodePoint(bytes[i]);
  }
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.codePointAt(i) ?? 0;
  }
  return out;
}

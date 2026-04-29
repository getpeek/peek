function hashName(name: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function colorFromName(name: string): string {
  const hue = hashName(name) % 360;
  return `hsl(${hue} 65% 60%)`;
}

export function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0].toUpperCase();
}

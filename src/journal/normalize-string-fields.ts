export function normalizeStringFields<T extends object>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      result[key] = normalizeStringFields(obj[key]);
    } else if (typeof obj[key] === 'string' || obj[key] === null) {
      result[key] = obj[key] ?? '';
    } else {
      result[key] = obj[key];
    }
  }
  return result;
} 
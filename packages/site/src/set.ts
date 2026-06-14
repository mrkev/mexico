export function any<T>(set: Set<T>, ...strs: T[]) {
  for (const str of strs) {
    if (set.has(str)) {
      return true;
    }
  }
  return false;
}

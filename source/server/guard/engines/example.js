// The smallest possible engine — a template for new ones. An engine is a PURE function:
// plain JSON in → plain JSON out, no DOM, no window, no app state, only relative imports of other pure files.
export function hello({ a = 0, b = 0 } = {}) {
  return { sum: (+a || 0) + (+b || 0), at: "server" };
}

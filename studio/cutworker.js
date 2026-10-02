// Runs the cut optimizer off the main thread so the iPad UI stays smooth.
import { optimize } from "./engine/cut/cutOptimizer.js";

self.onmessage = (e) => {
  const { id, groups, opts } = e.data;
  const out = groups.map((g) => {
    const res = optimize(g.parts, { ...opts, timeCap: 6 });
    return { key: g.key, result: res };
  });
  self.postMessage({ id, out });
};

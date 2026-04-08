export function sanitizeAndParse(raw) {
  let s = raw.trim();
  s = s.replace(/[\n\r\t]/g, " ").replace(/\s{2,}/g, " ");

  try {
    const first = JSON.parse(s);
    if (Array.isArray(first.nodes)) return first;
    if (typeof first.nodes === "string") first.nodes = JSON.parse(first.nodes);
    if (typeof first.edges === "string") first.edges = JSON.parse(first.edges);
    return first;
  } catch (_) {}

  s = s.replace(/"(nodes|edges)"\s*:\s*"(\[[\s\S]*?\])"/g, (_, key, val) => {
    const cleaned = val.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return `"${key}":${cleaned}`;
  });

  const parsed = JSON.parse(s);
  if (typeof parsed.nodes === "string") parsed.nodes = JSON.parse(parsed.nodes);
  if (typeof parsed.edges === "string") parsed.edges = JSON.parse(parsed.edges);
  return parsed;
}

export function loadFromUrl() {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes("data=")) return null;
    const b64 = hash.split("data=")[1];
    if (!b64) return null;
    const decoded = atob(decodeURIComponent(b64));
    return sanitizeAndParse(decoded);
  } catch (e) {
    console.error("URL decode error:", e);
    return null;
  }
}

export function generateShareLink(graphData) {
  if (!graphData) return "";
  try {
    const json = JSON.stringify(graphData);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}${window.location.pathname}#data=${encodeURIComponent(b64)}`;
  } catch {
    return "";
  }
}

export function mergeGraphs(graphs) {
  const nodeMap = new Map();
  const edgeMap = new Map();

  for (const g of graphs) {
    if (!g.nodes || !g.edges) continue;
    for (const n of g.nodes) {
      const k = n.id.toLowerCase().trim();
      if (nodeMap.has(k)) {
        const ex = nodeMap.get(k);
        ex.weight = Math.max(ex.weight, n.weight);
      } else {
        nodeMap.set(k, { ...n });
      }
    }
    for (const e of g.edges) {
      const k = `${e.source}|${e.target}|${e.relationship}`;
      if (edgeMap.has(k)) {
        edgeMap.get(k).weight = Math.max(edgeMap.get(k).weight, e.weight);
      } else {
        edgeMap.set(k, { ...e });
      }
    }
  }

  const ids = new Set(nodeMap.keys());
  for (const [k, e] of edgeMap) {
    if (!ids.has(e.source) || !ids.has(e.target)) edgeMap.delete(k);
  }

  const nodes = [...nodeMap.values()];
  const edges = [...edgeMap.values()];
  return {
    meta: {
      title: "Merged Graph",
      extractedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      mergedFrom: graphs.length,
    },
    nodes,
    edges,
  };
}

import { useState, useEffect, useCallback } from "react";
import ForceGraph from "./ForceGraph";
import { TYPE_COLORS } from "./constants";
import { sanitizeAndParse, loadFromUrl, generateShareLink, mergeGraphs } from "./utils";

function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", padding: "8px 0" }}>
      {Object.entries(TYPE_COLORS).map(([t, c]) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#aaa" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} />
          <span style={{ textTransform: "capitalize" }}>{t.replace("_", " ")}</span>
        </div>
      ))}
    </div>
  );
}

function StatsBar({ data }) {
  if (!data?.nodes?.length) return null;
  const typeCounts = {};
  data.nodes.forEach((n) => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const avg = (data.nodes.reduce((s, n) => s + (n.weight || 0), 0) / data.nodes.length).toFixed(1);
  const strong = data.edges.filter((e) => e.weight >= 4).length;
  return (
    <div style={{ display: "flex", gap: 24, padding: "10px 20px", borderBottom: "1px solid #1a2a3a", fontSize: 12, color: "#888" }}>
      <div><span style={{ color: "#00d4ff", fontWeight: 700, fontSize: 18, marginRight: 4 }}>{data.nodes.length}</span>nodes</div>
      <div><span style={{ color: "#ff7043", fontWeight: 700, fontSize: 18, marginRight: 4 }}>{data.edges.length}</span>edges</div>
      <div><span style={{ color: "#ffd54f", fontWeight: 700, fontSize: 18, marginRight: 4 }}>{strong}</span>strong links</div>
      <div>avg weight <span style={{ color: "#66bb6a", fontWeight: 600 }}>{avg}</span></div>
      {topType && <div>most common: <span style={{ color: TYPE_COLORS[topType[0]], fontWeight: 600 }}>{topType[0]} ({topType[1]})</span></div>}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("graph");
  const [graphData, setGraphData] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [mergeInputs, setMergeInputs] = useState("");
  const [error, setError] = useState(null);
  const [loadSource, setLoadSource] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dims, setDims] = useState({ w: window.innerWidth - 40, h: window.innerHeight - 200 });

  useEffect(() => {
    const handleResize = () => {
      setDims({ w: window.innerWidth - 40, h: window.innerHeight - 200 });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const urlData = loadFromUrl();
    if (urlData?.nodes?.length) {
      setGraphData(urlData);
      setLoadSource("url");
      setTab("graph");
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const urlData = loadFromUrl();
      if (urlData?.nodes?.length) {
        setGraphData(urlData);
        setLoadSource("url");
        setTab("graph");
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const loadJson = useCallback(() => {
    try {
      setError(null);
      const parsed = sanitizeAndParse(jsonInput);
      if (!parsed.nodes || !parsed.edges) throw new Error("JSON must have 'nodes' and 'edges'");
      setGraphData(parsed);
      setLoadSource("manual");
      setTab("graph");
    } catch (e) { setError(e.message); }
  }, [jsonInput]);

  const runMerge = useCallback(() => {
    try {
      setError(null);
      const arr = JSON.parse(mergeInputs);
      if (!Array.isArray(arr)) throw new Error("Must be a JSON array");
      const merged = mergeGraphs(arr);
      setGraphData(merged);
      setLoadSource("merge");
      setTab("graph");
    } catch (e) { setError(e.message); }
  }, [mergeInputs]);

  const shareLink = graphData ? generateShareLink(graphData) : "";
  const noGraph = !graphData?.nodes?.length;

  const tabStyle = (t) => ({
    padding: "8px 18px", fontSize: 13, fontWeight: tab === t ? 700 : 400,
    cursor: "pointer", background: tab === t ? "#1a2a3a" : "transparent",
    color: tab === t ? "#00d4ff" : "#888", border: "none",
    borderBottom: tab === t ? "2px solid #00d4ff" : "2px solid transparent",
  });

  const btnStyle = (color) => ({
    padding: "10px 20px", background: "#1a2a3a", color,
    border: `1px solid ${color}40`, borderRadius: 6,
    fontWeight: 600, cursor: "pointer",
  });

  return (
    <div style={{ background: "#0a0f18", color: "#e0e0e0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid #1a2a3a" }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#00d4ff", letterSpacing: 1 }}>Knowledge Graph</span>
        {graphData?.meta?.title && graphData.meta.title !== "Knowledge Graph" && (
          <span style={{ color: "#666", fontSize: 13 }}>— {graphData.meta.title}</span>
        )}
        <div style={{ flex: 1 }} />
        <button style={tabStyle("graph")} onClick={() => setTab("graph")}>Graph</button>
        <button style={tabStyle("import")} onClick={() => setTab("import")}>Import</button>
        <button style={tabStyle("merge")} onClick={() => setTab("merge")}>Merge</button>
        <button style={tabStyle("share")} onClick={() => setTab("share")}>Share</button>
      </div>

      {!noGraph && tab === "graph" && <StatsBar data={graphData} />}
      {!noGraph && tab === "graph" && (
        <div style={{ padding: "4px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Legend />
          {loadSource === "url" && (
            <span style={{ fontSize: 11, color: "#66bb6a", background: "#66bb6a15", padding: "3px 10px", borderRadius: 20 }}>
              Loaded from link
            </span>
          )}
        </div>
      )}

      <div style={{ padding: "10px 20px 20px", minHeight: 500 }}>
        {error && (
          <div style={{ background: "#2a1520", border: "1px solid #ef535060", padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#ef9a9a" }}>
            {error}
          </div>
        )}

        {tab === "graph" && noGraph && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 16, color: "#555" }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>🔗</div>
            <div style={{ fontSize: 16 }}>No graph loaded</div>
            <div style={{ fontSize: 13, color: "#444", textAlign: "center", maxWidth: 400 }}>
              Open a shared link, or go to Import to paste graph JSON.
            </div>
            <button onClick={() => setTab("import")}
              style={{ marginTop: 8, padding: "10px 24px", background: "#00d4ff20", color: "#00d4ff", border: "1px solid #00d4ff40", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
              Import JSON
            </button>
          </div>
        )}

        {tab === "graph" && !noGraph && (
          <ForceGraph data={graphData} width={dims.w} height={dims.h} />
        )}

        {tab === "import" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ color: "#999", fontSize: 13 }}>
              Paste the JSON output from your Logic App.
            </div>
            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"meta":{...}, "nodes":[...], "edges":[...]}'
              style={{ flex: 1, background: "#111827", color: "#e0e0e0", border: "1px solid #1f2937", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 12, resize: "none" }}
            />
            <button onClick={loadJson}
              style={{ padding: "10px 24px", background: "#00d4ff", color: "#000", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
              Load Graph
            </button>
          </div>
        )}

        {tab === "merge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ color: "#999", fontSize: 13 }}>
              Paste a JSON array of chunked graphs to merge.
            </div>
            <textarea value={mergeInputs} onChange={(e) => setMergeInputs(e.target.value)}
              placeholder="[{...graph1}, {...graph2}]"
              style={{ flex: 1, background: "#111827", color: "#e0e0e0", border: "1px solid #1f2937", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 12, resize: "none" }}
            />
            <button onClick={runMerge}
              style={{ padding: "10px 24px", background: "#ab47bc", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
              Merge & Visualize
            </button>
          </div>
        )}

        {tab === "share" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
            <div style={{ color: "#999", fontSize: 13 }}>
              Share link with graph data encoded in the URL. No server needed.
            </div>
            {noGraph ? (
              <div style={{ color: "#666", padding: 20, textAlign: "center" }}>
                Load a graph first.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#888" }}>Shareable Link:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={shareLink}
                    style={{ flex: 1, background: "#111827", color: "#00d4ff", border: "1px solid #1f2937", borderRadius: 6, padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}
                  />
                  <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ ...btnStyle("#00d4ff"), whiteSpace: "nowrap" }}>
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <div style={{ color: "#666", fontSize: 11 }}>
                  URL length: {shareLink.length.toLocaleString()} chars
                  {shareLink.length > 8000
                    ? <span style={{ color: "#ef5350" }}> — may exceed browser limits</span>
                    : <span style={{ color: "#66bb6a" }}> — safe for all browsers</span>}
                </div>

                <div style={{ borderTop: "1px solid #1a2a3a", paddingTop: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                    Logic App Expression (Compose_Link):
                  </div>
                  <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#ffd54f", wordBreak: "break-all" }}>
                    {"https://orange-hill-0dac85010.7.azurestaticapps.net/#data=@{base64(string(outputs('Compose_Final_Graph')))}"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, borderTop: "1px solid #1a2a3a", paddingTop: 16 }}>
                  <button onClick={() => {
                    const b = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
                    const u = URL.createObjectURL(b);
                    const a = document.createElement("a"); a.href = u; a.download = "knowledge-graph.json"; a.click();
                    URL.revokeObjectURL(u);
                  }} style={btnStyle("#00d4ff")}>Download JSON</button>
                  <button onClick={() => {
                    const cy = [
                      "// Neo4j Cypher",
                      ...graphData.nodes.map((n) => `CREATE (${n.id}:${n.type} {id:"${n.id}",label:"${n.label.replace(/"/g, '\\"')}",weight:${n.weight}});`),
                      ...graphData.edges.map((e) => `MATCH (a {id:"${e.source}"}),(b {id:"${e.target}"}) CREATE (a)-[:${e.relationship.toUpperCase()} {weight:${e.weight}}]->(b);`),
                    ].join("\n");
                    const b = new Blob([cy], { type: "text/plain" });
                    const u = URL.createObjectURL(b);
                    const a = document.createElement("a"); a.href = u; a.download = "graph.cypher"; a.click();
                    URL.revokeObjectURL(u);
                  }} style={btnStyle("#ffd54f")}>Download Cypher</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

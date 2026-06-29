// Client-side bridge to the WASM Monte Carlo engine. The .wasm binary is served
// statically from /public/wasm so the bundler never has to resolve it as a
// module (robust under Turbopack); the generated glue is imported normally.

export interface TreeNode {
  code: string; // result path from NOW, e.g. "W", "WD", "WDL"
  level: number; // = code.length
  n: number; // sims through this node
  pct: number; // advancement % conditional on this path
}

export interface Tree {
  focus: string;
  group: string;
  now_pct: number;
  depth: number; // number of upcoming focus games (0..3)
  nodes: TreeNode[];
  sims: number;
}

export interface ScenarioReq {
  focus: string;
  results: { updated: string; matches: { home: string; away: string; score: [number, number] }[] };
  sims?: number;
  seed?: number;
}

let ready: Promise<typeof import("@/wasm/wcsim_wasm")> | null = null;

async function load() {
  if (!ready) {
    ready = (async () => {
      const mod = await import("@/wasm/wcsim_wasm");
      await mod.default({ module_or_path: "/wasm/wcsim_wasm_bg.wasm" });
      return mod;
    })();
  }
  return ready;
}

export async function runScenario(req: ScenarioReq): Promise<Tree> {
  const mod = await load();
  return JSON.parse(mod.scenario_tree(JSON.stringify(req))) as Tree;
}

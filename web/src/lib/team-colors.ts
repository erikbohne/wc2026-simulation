// National colors for chart series, tuned for legibility on the light canvas.
// Picked so the strong contenders stay distinct; flags disambiguate the rest.
const TEAM_COLORS: Record<string, string> = {
  // Group A
  MEX: "#00843d",
  RSA: "#d4a017",
  KOR: "#c8102e",
  CZE: "#11457e",
  // Group B
  CAN: "#d80621",
  BIH: "#002f6c",
  QAT: "#8a1538",
  SUI: "#d8232a",
  // Group C
  HAI: "#00209f",
  SCO: "#1a3a6b",
  BRA: "#009739",
  MAR: "#b71c2b",
  // Group D
  USA: "#bf0a30",
  PAR: "#d52b1e",
  AUS: "#f1b300",
  TUR: "#e30a17",
  // Group E
  CIV: "#ff8c00",
  ECU: "#e0a400",
  GER: "#343a40",
  CUW: "#002b7f",
  // Group F
  NED: "#ec5800",
  JPN: "#1e3a8c",
  SWE: "#2f6fb0",
  TUN: "#e70013",
  // Group G
  IRN: "#239f40",
  NZL: "#1a1a1a",
  BEL: "#cf0a2c",
  EGY: "#c8102e",
  // Group H
  KSA: "#1a7a3c",
  URU: "#2a7fc0",
  ESP: "#e63946",
  CPV: "#1a6fc0",
  // Group I
  FRA: "#1d4ed8",
  SEN: "#1a8a4a",
  IRQ: "#007a3d",
  NOR: "#ba1b2d",
  // Group J
  ARG: "#74acdf",
  ALG: "#0a7a3c",
  AUT: "#d52b1e",
  JOR: "#b01030",
  // Group K
  POR: "#9a1b2e",
  COD: "#2b6cb0",
  UZB: "#1aa3d6",
  COL: "#f4c20d",
  // Group L
  GHA: "#ce1126",
  PAN: "#d21034",
  ENG: "#1f2a5a",
  CRO: "#c81e1e",
};

const FALLBACK = [
  "#6b7280",
  "#9333ea",
  "#0891b2",
  "#65a30d",
  "#db2777",
  "#ca8a04",
];

export function teamColor(code: string): string {
  const c = TEAM_COLORS[code];
  if (c) return c;
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}

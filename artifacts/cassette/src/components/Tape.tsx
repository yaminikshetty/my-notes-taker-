import { motion } from "framer-motion";
import { formatDuration } from "@/lib/format";

interface TapeProps {
  title?: string;
  duration?: number;
  date?: string;
  isPlaying?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LABEL_PALETTES = [
  { bg: "#C85820", top: "#8C3A0C", text: "#FFF3E0", rule: "#D97545", brand: "FERRO  TYPE I",  minutes: "C-60" },
  { bg: "#297A6A", top: "#1B5244", text: "#E0F4EF", rule: "#3DA090", brand: "CHROME TYPE II", minutes: "C-90" },
  { bg: "#B88610", top: "#7A5A08", text: "#FFFDE0", rule: "#D4A020", brand: "METAL  TYPE IV", minutes: "C-60" },
  { bg: "#AC2030", top: "#741018", text: "#FFECEF", rule: "#CC4050", brand: "DYNAMIC TYPE I", minutes: "C-90" },
  { bg: "#1658A2", top: "#0C3870", text: "#E3F2FD", rule: "#2878C8", brand: "SUPER  TYPE II", minutes: "C-60" },
  { bg: "#5C1A92", top: "#3C0A68", text: "#F0E8FF", rule: "#7A38B8", brand: "PRO CHROME  IV", minutes: "C-90" },
];

function pickPalette(seed: string) {
  let h = 0;
  for (const c of seed) h = (((h << 5) - h) + c.charCodeAt(0)) >>> 0;
  return LABEL_PALETTES[h % LABEL_PALETTES.length];
}

const SVG_W = 320;
const SVG_H = 204;

const LABEL_X = 30;
const LABEL_Y = 12;
const LABEL_W = 260;
const LABEL_H = 102;

const LEFT_REEL  = { cx: 90,  cy: 158 };
const RIGHT_REEL = { cx: 230, cy: 158 };
const REEL_R = 36;

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5.5} fill="#111009" />
      <circle cx={x} cy={y} r={4}   fill="#282420" />
      <line x1={x - 2.5} y1={y} x2={x + 2.5} y2={y} stroke="#0A0808" strokeWidth={1.2} />
      <line x1={x} y1={y - 2.5} x2={x} y2={y + 2.5} stroke="#0A0808" strokeWidth={1.2} />
    </g>
  );
}

function ReelSVG({ cx, cy, r, isPlaying }: { cx: number; cy: number; r: number; isPlaying: boolean }) {
  const tapeOuterR = r * 0.88;
  const tapeInnerR = r * 0.48;
  const hubR       = r * 0.30;
  const SPOKES     = 5;

  const spokeAngles = Array.from({ length: SPOKES }, (_, i) => (i * 360) / SPOKES);

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 1} fill="#1A1612" />
      <circle cx={cx} cy={cy} r={r}     fill="#0D0A08" />
      <circle cx={cx} cy={cy} r={r}     fill="none" stroke="#3A3028" strokeWidth={1} />

      <circle cx={cx} cy={cy} r={tapeOuterR} fill="#3A1E10" />
      <circle cx={cx} cy={cy} r={tapeOuterR} fill="none"   stroke="#2A1408" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={tapeInnerR} fill="#0D0A08" />

      <motion.g
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? { repeat: Infinity, duration: 3.2, ease: "linear" } : { duration: 0.4 }}
      >
        {spokeAngles.map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * (hubR * 0.5)}
              y1={cy + Math.sin(a) * (hubR * 0.5)}
              x2={cx + Math.cos(a) * (tapeInnerR * 0.95)}
              y2={cy + Math.sin(a) * (tapeInnerR * 0.95)}
              stroke="#2C2820"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={hubR}        fill="#242018" />
        <circle cx={cx} cy={cy} r={hubR}        fill="none"   stroke="#302C24" strokeWidth={1} />
        {spokeAngles.map((deg, i) => {
          const a = ((deg + 360 / SPOKES / 2) * Math.PI) / 180;
          return (
            <line
              key={`d${i}`}
              x1={cx + Math.cos(a) * (hubR * 0.2)}
              y1={cy + Math.sin(a) * (hubR * 0.2)}
              x2={cx + Math.cos(a) * (hubR * 0.88)}
              y2={cy + Math.sin(a) * (hubR * 0.88)}
              stroke="#181410"
              strokeWidth={2}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={hubR * 0.28} fill="#0D0A08" />
      </motion.g>
    </g>
  );
}

export function Tape({
  title = "UNTITLED",
  duration = 0,
  date = "",
  isPlaying = false,
  className = "",
  size = "md",
}: TapeProps) {
  const palette = pickPalette(title);

  const svgWidth = size === "sm" ? 220 : size === "lg" ? 400 : 310;

  const ruledLineY = [
    LABEL_Y + 42,
    LABEL_Y + 60,
  ];

  const labelBottom = LABEL_Y + LABEL_H;
  const bottomBarH = 28;
  const bottomBarY = labelBottom - bottomBarH;

  const ribs = Array.from({ length: Math.ceil(SVG_H / 5) }, (_, i) => i * 5);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width={svgWidth}
      height={(svgWidth / SVG_W) * SVG_H}
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id="body-clip">
          <rect x={0} y={0} width={SVG_W} height={SVG_H} rx={10} />
        </clipPath>
        <filter id="tape-shadow">
          <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Body */}
      <rect x={0} y={0} width={SVG_W} height={SVG_H} rx={10} fill="#212018" />

      {/* Side ribbing panels */}
      <rect x={0}          y={0} width={32} height={SVG_H} rx={10} fill="#1C1A16" clipPath="url(#body-clip)" />
      <rect x={SVG_W - 32} y={0} width={32} height={SVG_H} rx={10} fill="#1C1A16" clipPath="url(#body-clip)" />

      {/* Horizontal ribs on left panel */}
      {ribs.map((y) => (
        <line key={`lr${y}`} x1={1} y1={y} x2={30} y2={y} stroke="#2A2820" strokeWidth={0.8} />
      ))}
      {/* Horizontal ribs on right panel */}
      {ribs.map((y) => (
        <line key={`rr${y}`} x1={SVG_W - 30} y1={y} x2={SVG_W - 1} y2={y} stroke="#2A2820" strokeWidth={0.8} />
      ))}

      {/* Body outline */}
      <rect x={0} y={0} width={SVG_W} height={SVG_H} rx={10} fill="none" stroke="#2E2A22" strokeWidth={1.5} />

      {/* ---- LABEL ---- */}
      <rect x={LABEL_X} y={LABEL_Y} width={LABEL_W} height={LABEL_H} rx={4} fill={palette.bg} />

      {/* Label top stripe */}
      <rect x={LABEL_X}    y={LABEL_Y}    width={LABEL_W} height={14} rx={4}   fill={palette.top} />
      <rect x={LABEL_X}    y={LABEL_Y+8}  width={LABEL_W} height={6}  rx={0}   fill={palette.top} />

      {/* Ruled lines */}
      {ruledLineY.map((y) => (
        <line key={y} x1={LABEL_X + 10} y1={y} x2={LABEL_X + LABEL_W - 10} y2={y}
          stroke={palette.rule} strokeWidth={0.8} strokeOpacity={0.5} />
      ))}

      {/* Minutes indicator box, top right */}
      <rect x={LABEL_X + LABEL_W - 42} y={LABEL_Y + 16} width={36} height={16} rx={2} fill={palette.top} />
      <text
        x={LABEL_X + LABEL_W - 24} y={LABEL_Y + 28}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Space Mono', monospace" fontSize={8} fontWeight="bold"
        fill={palette.text} letterSpacing={0.5}
      >
        {palette.minutes}
      </text>

      {/* Title — on the ruled lines, slightly tilted */}
      <text
        x={LABEL_X + 14}
        y={ruledLineY[0] - 3}
        fontFamily="'Special Elite', monospace"
        fontSize={22}
        fill={palette.text}
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))" }}
        transform={`rotate(-1.5, ${LABEL_X + 14}, ${ruledLineY[0] - 3})`}
      >
        {title.length > 18 ? title.slice(0, 17) + "…" : title}
      </text>

      {/* Date / duration small row */}
      <text
        x={LABEL_X + 14} y={ruledLineY[1] + 12}
        fontFamily="'Space Mono', monospace" fontSize={8}
        fill={palette.text} fillOpacity={0.7} letterSpacing={0.3}
      >{date}</text>
      <text
        x={LABEL_X + LABEL_W - 14} y={ruledLineY[1] + 12}
        textAnchor="end"
        fontFamily="'Space Mono', monospace" fontSize={8}
        fill={palette.text} fillOpacity={0.7}
      >{formatDuration(duration)}</text>

      {/* Bottom brand bar */}
      <rect x={LABEL_X}   y={bottomBarY}      width={LABEL_W} height={bottomBarH} rx={0}  fill={palette.top} />
      <rect x={LABEL_X}   y={bottomBarY}      width={LABEL_W} height={2}          rx={0}  fill="rgba(0,0,0,0.2)" />
      <rect x={LABEL_X}   y={labelBottom - 4} width={LABEL_W} height={4}          rx={4}  fill={palette.top} />

      <text
        x={LABEL_X + 14} y={bottomBarY + bottomBarH / 2 + 1}
        dominantBaseline="middle"
        fontFamily="'Space Mono', monospace" fontSize={9} fontWeight="bold"
        fill={palette.text} letterSpacing={2}
      >
        {palette.brand}
      </text>

      {/* Label border */}
      <rect x={LABEL_X} y={LABEL_Y} width={LABEL_W} height={LABEL_H} rx={4}
        fill="none" stroke={palette.top} strokeWidth={1} strokeOpacity={0.6} />

      {/* ---- REELS ---- */}
      <ReelSVG cx={LEFT_REEL.cx}  cy={LEFT_REEL.cy}  r={REEL_R} isPlaying={isPlaying} />
      <ReelSVG cx={RIGHT_REEL.cx} cy={RIGHT_REEL.cy} r={REEL_R} isPlaying={isPlaying} />

      {/* Center pin between reels */}
      <circle cx={SVG_W / 2} cy={158} r={4.5} fill="#181410" />
      <circle cx={SVG_W / 2} cy={158} r={2}   fill="#0A0808" />

      {/* Tape reader slot at bottom center */}
      <rect x={122} y={182} width={76} height={14} rx={3} fill="#0D0A08" />
      <rect x={122} y={182} width={76} height={14} rx={3} fill="none" stroke="#2E2A22" strokeWidth={1} />
      {/* Capstan rollers */}
      <circle cx={134} cy={189} r={4} fill="#1E1A16" stroke="#2E2A22" strokeWidth={0.8} />
      <circle cx={186} cy={189} r={4} fill="#1E1A16" stroke="#2E2A22" strokeWidth={0.8} />
      {/* Playback head */}
      <rect x={154} y={184} width={12} height={10} rx={1} fill="#252018" stroke="#353024" strokeWidth={0.8} />

      {/* Guide posts at bottom */}
      <rect x={32} y={183} width={8}  height={12} rx={2} fill="#1C1A16" stroke="#2A2820" strokeWidth={0.8} />
      <rect x={SVG_W - 40} y={183} width={8} height={12} rx={2} fill="#1C1A16" stroke="#2A2820" strokeWidth={0.8} />

      {/* Screws */}
      <Screw x={18}        y={18} />
      <Screw x={SVG_W-18} y={18} />
      <Screw x={18}        y={SVG_H - 14} />
      <Screw x={SVG_W-18} y={SVG_H - 14} />
      <Screw x={SVG_W/2}  y={SVG_H - 10} />

      {/* Subtle body highlight at top */}
      <rect x={10} y={1} width={SVG_W - 20} height={3} rx={2} fill="rgba(255,255,255,0.04)" />
    </svg>
  );
}

/**
 * KUY'S Tapsihan brand mark — reworked as clean vector SVG instead of a
 * raster PNG. Same DNA as the original badge (crossed utensils, arched
 * "EST. 2021", KUY'S wordmark, TAPSIHAN pill, jeepney glyph, curved
 * tagline) but redrawn so it stays crisp at any size, has no white
 * background box, and can recolor for light or dark surfaces.
 *
 * MAROON = #8B0000, GOLD = #FFD700
 */

const MAROON = "#8B0000";
const GOLD = "#FFD700";

function Utensils({
  cx,
  cy,
  scale = 1,
  color = MAROON,
  forkRotate = -28,
  knifeRotate = 6,
  spoonRotate = 30,
}: {
  cx: number;
  cy: number;
  scale?: number;
  color?: string;
  forkRotate?: number;
  knifeRotate?: number;
  spoonRotate?: number;
}) {
  // Each utensil is drawn in local coordinates with the crossing point at
  // (0,0), tip pointing up (negative y), handle running down (positive y).
  // They're fanned out with rotation around the shared pivot (cx, cy).
  return (
    <g>
      {/* Fork — leans left */}
      {/* Fork — leans left */}
    <g transform={`translate(${cx} ${cy}) rotate(${forkRotate}) scale(${scale})`}>
      <rect x={-8.5} y={-42} width={2} height={20} rx={1} fill={color} />
      <rect x={-3.5} y={-42} width={2} height={20} rx={1} fill={color} />
      <rect x={1.5} y={-42} width={2} height={20} rx={1} fill={color} />
      <rect x={6.5} y={-42} width={2} height={20} rx={1} fill={color} />
      <path d="M -9.5 -22 L 9.5 -22 L 4.5 -13 L -4.5 -13 Z" fill={color} />
      <rect x={-3.2} y={-14} width={6.4} height={49} rx={3.2} fill={color} />
    </g>

      {/* Knife — near vertical */}
      <g transform={`translate(${cx} ${cy}) rotate(${knifeRotate}) scale(${scale})`}>
        <path
          d="M 0 -44 C 7 -32 8.5 -16 6 -3 L -4 -3 C -6.5 -16 -6 -32 0 -44 Z"
          fill={color}
        />
        <rect x={-4.2} y={-4} width={8.4} height={7} rx={1.5} fill={color} />
        <rect x={-3.2} y={2} width={6.4} height={33} rx={3.2} fill={color} />
      </g>

      {/* Spoon — leans right */}
      {/* Spoon — leans right */}
      <g transform={`translate(${cx} ${cy}) rotate(${spoonRotate}) scale(${scale})`}>
        <ellipse cx={1} cy={-30} rx={10.5} ry={14.5} fill={color} />
        <rect x={-2.8} y={-15} width={5.6} height={50} rx={2.8} fill={color} />
      </g>
    </g>
  );
}

function Jeepney({ cx, cy, color = MAROON }: { cx: number; cy: number; color?: string }) {
  const x = cx - 26;
  const y = cy - 16;
  return (
    <g>
      <rect x={x + 6} y={y} width={28} height={9} rx={3} fill={color} />
      <rect x={x} y={y + 8} width={40} height={17} rx={5} fill={color} />
      <rect x={x + 5} y={y + 1.5} width={9} height={6} rx={1} fill={GOLD} />
      <rect x={x + 26} y={y + 1.5} width={9} height={6} rx={1} fill={GOLD} />
      <circle cx={x + 9} cy={y + 27} r={5.5} fill={color} />
      <circle cx={x + 31} cy={y + 27} r={5.5} fill={color} />
      <circle cx={x + 9} cy={y + 27} r={2} fill={GOLD} />
      <circle cx={x + 31} cy={y + 27} r={2} fill={GOLD} />
    </g>
  );
}

/** Icon-only mark: gold roundel with crossed utensils. Square aspect. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="KUY'S Tapsihan">
      <circle cx={60} cy={60} r={55} fill={GOLD} stroke={MAROON} strokeWidth={3.5} />
      <Utensils cx={60} cy={56} scale={0.62} />
    </svg>
  );
}

/**
 * Stacked lockup: mark on top, "KUY'S" + "TAPSIHAN" pill below.
 * No arch or tagline — compact, for auth cards and dashboard headers.
 */
export function LogoStacked({
  className,
  color = MAROON,
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 240 200" className={className} role="img" aria-label="KUY'S Tapsihan">
      <circle cx={120} cy={62} r={54} fill={GOLD} stroke={color} strokeWidth={3.5} />
      <Utensils cx={120} cy={58} scale={0.62} color={color} />

      <line x1={20} y1={140} x2={40} y2={140} stroke={color} strokeWidth={2} />
      <line x1={200} y1={140} x2={220} y2={140} stroke={color} strokeWidth={2} />
      <circle cx={16} cy={140} r={4.5} fill="#fff" stroke={color} strokeWidth={2} />
      <circle cx={224} cy={140} r={4.5} fill="#fff" stroke={color} strokeWidth={2} />

      <text
        x={120}
        y={150}
        textAnchor="middle"
        fontFamily="var(--font-display, serif)"
        fontWeight={800}
        fontSize={34}
        letterSpacing={1.5}
        fill={color}
      >
        {"KUY'S"}
      </text>

      <rect x={48} y={162} width={144} height={26} rx={13} fill={color} />
      <text
        x={120}
        y={179}
        textAnchor="middle"
        fontFamily="var(--font-sans, sans-serif)"
        fontWeight={700}
        fontSize={12}
        letterSpacing={2}
        fill={GOLD}
      >
        TAPSIHAN
      </text>
      <circle cx={34} cy={175} r={3} fill={GOLD} stroke={color} strokeWidth={1} />
      <circle cx={206} cy={175} r={3} fill={GOLD} stroke={color} strokeWidth={1} />
    </svg>
  );
}

/**
 * Full hero badge: arch + "EST. 2021", utensils, KUY'S, TAPSIHAN pill,
 * jeepney glyph, curved tagline. The complete emblem for the homepage hero.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 330" className={className} role="img" aria-label="KUY'S Tapsihan — Pares, Buto-Buto, Lugaw, atbp.">
      <path
        d="M 16 110 A 114 70 0 0 1 244 110"
        fill="none"
        stroke={MAROON}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <text
        x={58}
        y={110}
        textAnchor="middle"
        fontFamily="var(--font-sans, sans-serif)"
        fontWeight={700}
        fontSize={13}
        letterSpacing={2}
        fill={MAROON}
      >
        EST.
      </text>
      <text
        x={202}
        y={110}
        textAnchor="middle"
        fontFamily="var(--font-sans, sans-serif)"
        fontWeight={700}
        fontSize={13}
        letterSpacing={2}
        fill={MAROON}
      >
        2021
      </text>

      <Utensils cx={130} cy={115} scale={1.0} forkRotate={-22} knifeRotate={4} spoonRotate={24} />

      <line x1={16} y1={190} x2={44} y2={190} stroke={MAROON} strokeWidth={2} />
      <line x1={216} y1={190} x2={244} y2={190} stroke={MAROON} strokeWidth={2} />
      <circle cx={12} cy={190} r={5.5} fill="#fff" stroke={MAROON} strokeWidth={2} />
      <circle cx={248} cy={190} r={5.5} fill="#fff" stroke={MAROON} strokeWidth={2} />

      <text
        x={130}
        y={200}
        textAnchor="middle"
        fontFamily="var(--font-display, serif)"
        fontWeight={800}
        fontSize={46}
        letterSpacing={2}
        fill={MAROON}
      >
        {"KUY'S"}
      </text>

      <rect x={55} y={214} width={150} height={30} rx={15} fill={MAROON} />
      <text
        x={130}
        y={234}
        textAnchor="middle"
        fontFamily="var(--font-sans, sans-serif)"
        fontWeight={700}
        fontSize={14}
        letterSpacing={2.5}
        fill={GOLD}
      >
        TAPSIHAN
      </text>
      <circle cx={40} cy={229} r={3.5} fill={GOLD} stroke={MAROON} strokeWidth={1} />
      <circle cx={220} cy={229} r={3.5} fill={GOLD} stroke={MAROON} strokeWidth={1} />

      <Jeepney cx={130} cy={272} />

      <path id="tagline-arc" d="M 20 288 A 160 92 0 0 0 240 288" fill="none" />
      <text
        fontFamily="var(--font-sans, sans-serif)"
        fontWeight={700}
        fontSize={12.5}
        letterSpacing={.25}
        fill={MAROON}
      >
        <textPath href="#tagline-arc" startOffset="50%" textAnchor="middle">
          PARES · BUTO-BUTO · LUGAW · ATBP
        </textPath>
      </text>
      <circle cx={12} cy={280} r={4.5} fill="#fff" stroke={MAROON} strokeWidth={2} />
      <circle cx={248} cy={280} r={4.5} fill="#fff" stroke={MAROON} strokeWidth={2} />
    </svg>
  );
}

/**
 * Horizontal lockup for nav / header bars: small mark + "KUY'S" / "TAPSIHAN"
 * set side by side as real (selectable, accessible) text.
 */
export function LogoLockup({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const isLight = variant === "light"; // text tuned for a maroon/dark background
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="leading-none">
        <div
          className={`font-display text-lg font-extrabold tracking-wide ${
            isLight ? "text-secondary" : "text-primary"
          }`}
        >
          {"KUY'S"}
        </div>
        <div
          className={`-mt-0.5 text-[10px] font-bold tracking-[0.25em] ${
            isLight ? "text-white/80" : "text-muted-foreground"
          }`}
        >
          TAPSIHAN
        </div>
      </div>
    </div>
  );
}

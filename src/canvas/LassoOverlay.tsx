import { useLassoSelect } from "./hooks/useLassoSelect";

export function LassoOverlay() {
  const { points } = useLassoSelect();
  if (points.length < 2) {
    return null;
  }
  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <polygon
        points={points.map(p => `${p[0]},${p[1]}`).join(" ")}
        fill='var(--pk-accent-bg)'
        stroke='var(--pk-accent)'
        strokeDasharray='4 4'
        strokeWidth={1}
      />
    </svg>
  );
}

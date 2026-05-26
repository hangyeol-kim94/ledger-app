// SVG donut chart using stroke-dasharray technique.
// Circle: r=50, C = 2π × 50 ≈ 314.16, center=(65,65), viewBox="0 0 130 130"
// Each segment is drawn as an arc on a full-circumference circle, rotated -90deg
// so segments start at 12 o'clock and flow clockwise.

export interface DonutSlice {
  color: string
  percentage: number // 0-100
  label: string
  amount: number
}

export interface DonutChartProps {
  slices: DonutSlice[]
  centerLabel: string
  centerAmount: string
}

const CIRCUMFERENCE = 2 * Math.PI * 50 // ≈ 314.159...

export default function DonutChart({ slices, centerLabel, centerAmount }: DonutChartProps) {
  // Build cumulative offsets so segments stack one after another.
  // For each slice: stroke-dasharray = "arc gap"; stroke-dashoffset = C - (offset_so_far)
  let cumulative = 0
  const segments = slices.map((s) => {
    const arc = (s.percentage / 100) * CIRCUMFERENCE
    const dashOffset = CIRCUMFERENCE - (cumulative / 100) * CIRCUMFERENCE
    cumulative += s.percentage
    return { ...s, arc, dashOffset }
  })

  return (
    <div
      style={{
        position: 'relative',
        width: 130,
        height: 130,
        flexShrink: 0,
      }}
    >
      <svg
        width="130"
        height="130"
        viewBox="0 0 130 130"
        style={{ display: 'block' }}
      >
        {/* Background ring */}
        <circle
          cx="65"
          cy="65"
          r="50"
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="22"
        />
        {/* Segments */}
        {segments.map((seg, idx) =>
          seg.percentage > 0 ? (
            <circle
              key={idx}
              cx="65"
              cy="65"
              r="50"
              fill="none"
              stroke={seg.color}
              strokeWidth="22"
              strokeDasharray={`${seg.arc} ${CIRCUMFERENCE}`}
              strokeDashoffset={seg.dashOffset}
              transform="rotate(-90 65 65)"
              strokeLinecap="butt"
            />
          ) : null
        )}
      </svg>
      {/* Center overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#94A3B8',
            fontWeight: 500,
            marginBottom: 2,
          }}
        >
          {centerLabel}
        </span>
        <span
          style={{
            fontSize: 15,
            color: '#1E293B',
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {centerAmount}
        </span>
      </div>
    </div>
  )
}

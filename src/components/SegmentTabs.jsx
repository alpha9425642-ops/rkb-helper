export default function SegmentTabs({ items, value, onChange }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: 8
    }}>
      {items.map(it => {
        const active = it.value === value;
        return (
          <div
            key={it.value}
            className="pill"
            onClick={() => onChange(it.value)}
            style={{
              textAlign: "center",
              cursor: "pointer",
              borderColor: active ? "#2f6fed" : undefined,
              background: active ? "#0e1a33" : undefined,
              fontWeight: active ? 800 : 700
            }}
          >
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

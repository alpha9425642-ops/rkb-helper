import { useEffect, useRef, useState } from "react";

export default function ToastEdgeFlash({ flashKey, myKey, children }) {
  const [on, setOn] = useState(false);
  const lastTsRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const ts = flashKey?.ts || 0;
    const key = flashKey?.key;

    if (key !== myKey) return;
    if (!ts || ts === lastTsRef.current) return;

    lastTsRef.current = ts;

    setOn(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOn(false), 180);
  }, [flashKey, myKey]);

  return (
    <div style={{ position: "relative" }}>
      {children}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: -2,
          borderRadius: 14,
          opacity: on ? 1 : 0,
          transition: "opacity 180ms ease",
          boxShadow: on ? "0 0 0 2px rgba(46, 204, 113, 0.85)" : "none",
        }}
      />
    </div>
  );
}

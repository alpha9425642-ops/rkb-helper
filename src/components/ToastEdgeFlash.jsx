export default function ToastEdgeFlash({ flashKey, myKey, children }) {
  const isFlash = flashKey === myKey;
  return (
    <div className={`edgeFlash ${isFlash ? "flash" : ""}`}>
      {children}
    </div>
  );
}

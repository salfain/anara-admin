export default function AnaraLogo({ height = 32, rounded = 10 }) {
  return (
    <div
      className="inline-flex items-center justify-center shrink-0"
      style={{
        height,
        width: height * 1.6,
        background: '#2563eb',
        borderRadius: rounded,
        padding: height * 0.16,
      }}
    >
      <img src="/anara-logo.svg" alt="Anara" className="w-full h-full object-contain" />
    </div>
  );
}

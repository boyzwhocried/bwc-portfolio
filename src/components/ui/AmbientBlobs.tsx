export default function AmbientBlobs() {
  return (
    <>
      <style>{`
        @keyframes blob1 {
          0%   { transform: translate(0px, 0px) scale(1);    border-radius: 62% 38% 68% 32% / 48% 58% 42% 52%; }
          20%  { transform: translate(18px, -12px) scale(1.03); border-radius: 45% 55% 40% 60% / 62% 38% 60% 40%; }
          40%  { transform: translate(28px, 8px) scale(1.06);  border-radius: 70% 30% 55% 45% / 38% 66% 34% 62%; }
          60%  { transform: translate(10px, 20px) scale(0.97); border-radius: 38% 62% 72% 28% / 56% 44% 56% 44%; }
          80%  { transform: translate(-14px, 6px) scale(1.02); border-radius: 55% 45% 38% 62% / 42% 58% 42% 58%; }
          100% { transform: translate(0px, 0px) scale(1);    border-radius: 62% 38% 68% 32% / 48% 58% 42% 52%; }
        }
        @keyframes blob2 {
          0%   { transform: translate(0px, 0px) scale(1);    border-radius: 42% 58% 52% 48% / 60% 40% 58% 42%; }
          25%  { transform: translate(-18px, 14px) scale(1.04); border-radius: 60% 40% 38% 62% / 42% 60% 40% 60%; }
          50%  { transform: translate(-8px, -16px) scale(0.96); border-radius: 34% 66% 60% 40% / 58% 42% 62% 38%; }
          75%  { transform: translate(14px, -6px) scale(1.02); border-radius: 56% 44% 44% 56% / 38% 62% 38% 62%; }
          100% { transform: translate(0px, 0px) scale(1);    border-radius: 42% 58% 52% 48% / 60% 40% 58% 42%; }
        }
        .blob {
          position: absolute;
          pointer-events: none;
          filter: blur(72px);
          opacity: 0.1;
          will-change: transform, border-radius;
        }
        .blob-1 {
          width: 360px;
          height: 360px;
          background: var(--accent, #f5f5f0);
          top: 8%;
          right: 4%;
          animation: blob1 16s ease-in-out infinite;
        }
        .blob-2 {
          width: 220px;
          height: 220px;
          background: var(--muted, #6b6b6b);
          bottom: 18%;
          left: 2%;
          animation: blob2 22s ease-in-out infinite;
        }
      `}</style>
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
    </>
  )
}

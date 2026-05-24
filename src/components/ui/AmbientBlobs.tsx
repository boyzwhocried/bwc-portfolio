export default function AmbientBlobs() {
  return (
    <>
      <style>{`
        @keyframes blobDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; }
          33% { transform: translate(30px, -20px) scale(1.05); border-radius: 40% 60% 30% 70% / 60% 40% 60% 40%; }
          66% { transform: translate(-20px, 15px) scale(0.97); border-radius: 70% 30% 50% 50% / 40% 70% 30% 60%; }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; }
          50% { transform: translate(-25px, 20px) scale(1.04); border-radius: 60% 40% 40% 60% / 40% 60% 40% 60%; }
        }
        .blob {
          position: absolute;
          pointer-events: none;
          filter: blur(60px);
          opacity: 0.12;
        }
        .blob-1 {
          width: 320px;
          height: 320px;
          background: var(--accent, #f5f5f0);
          top: 10%;
          right: 5%;
          animation: blobDrift1 14s ease-in-out infinite;
        }
        .blob-2 {
          width: 200px;
          height: 200px;
          background: var(--muted, #6b6b6b);
          bottom: 20%;
          left: 3%;
          animation: blobDrift2 18s ease-in-out infinite;
        }
      `}</style>
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
    </>
  )
}

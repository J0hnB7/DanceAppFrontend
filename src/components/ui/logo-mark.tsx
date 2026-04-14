export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="ProPodium"
      width={size}
      height={size}
      style={{ borderRadius: Math.round(size * 0.28), objectFit: "contain", display: "block" }}
    />
  );
}

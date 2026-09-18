import { getGreetingPeriod, formatFullDate } from "@/lib/utils";

const GRADIENTS: Record<string, string> = {
  pagi: "linear-gradient(135deg,#22315C 0%,#F0A857 100%)",
  siang: "linear-gradient(135deg,#1C6FE0 0%,#7FD8FF 100%)",
  sore: "linear-gradient(135deg,#4A2A63 0%,#E4715A 55%,#F4B860 100%)",
  malam: "linear-gradient(135deg,#0A0F2C 0%,#2A1B4E 100%)",
};

export function GreetingCard({ name }: { name: string }) {
  const now = new Date();
  const period = getGreetingPeriod(now.getHours());

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 32,
        padding: "26px 24px",
        marginBottom: 16,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: GRADIENTS[period.key] }} />
      <div style={{ position: "relative", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 10 }}>
        {formatFullDate(now)}
      </div>
      <h1 style={{ position: "relative", fontSize: 28, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>
        {period.label}
      </h1>
      <p style={{ position: "relative", fontSize: 15, color: "rgba(255,255,255,0.72)", fontWeight: 500, margin: 0 }}>
        {name}
      </p>
    </div>
  );
}

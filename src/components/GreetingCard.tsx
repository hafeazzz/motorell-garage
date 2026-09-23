import { getGreetingPeriod, formatFullDateJakarta, jakartaHour } from "@/lib/utils";

const GRADIENTS: Record<string, string> = {
  pagi: "linear-gradient(135deg,#22315C 0%,#F0A857 100%)",
  siang: "linear-gradient(135deg,#1C6FE0 0%,#7FD8FF 100%)",
  sore: "linear-gradient(135deg,#4A2A63 0%,#E4715A 55%,#F4B860 100%)",
  malam: "linear-gradient(135deg,#0A0F2C 0%,#2A1B4E 100%)",
};

export function GreetingCard({ name }: { name: string }) {
  const now = new Date();
  const period = getGreetingPeriod(jakartaHour(now));

  return (
    <div className="relative mb-4 overflow-hidden rounded-[32px] px-6 py-6 md:mb-5 md:px-9 md:py-9">
      <div className="absolute inset-0" style={{ background: GRADIENTS[period.key] }} />
      <div className="relative mb-2.5 text-[13px] text-white/75">{formatFullDateJakarta(now)}</div>
      <h1 className="relative mb-2 text-[28px] leading-[1.15] font-extrabold text-white md:text-[34px]">
        {period.label}
      </h1>
      <p className="relative text-[15px] font-medium text-white/72">{name}</p>
    </div>
  );
}

import Doodles from "@/components/Doodles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Doodles />
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-banner.png"
          alt="PitLog"
          className="mx-auto w-64 max-w-full rounded-3xl shadow-[var(--shadow-card)]"
        />
        <p className="mt-3 text-sm text-ink-dim">Le carnet numérique du pilote motocross</p>
      </div>
      {children}
    </main>
  );
}

import Doodles from "@/components/Doodles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Doodles />
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-accent to-accent-strong shadow-[var(--shadow-btn)]">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M5.5 17l3-7h4l3 7M12.5 10l2-4h3" /><path d="M9 6h4" /></svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Moto<span className="text-accent">Carnet</span>
        </h1>
        <p className="mt-1 text-sm text-ink-dim">Le carnet numérique du pilote motocross</p>
      </div>
      {children}
    </main>
  );
}

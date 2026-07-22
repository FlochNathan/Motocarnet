import { WordmarkStacked } from "@/components/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <WordmarkStacked />
        <p className="mt-5 text-sm font-medium text-ink-dim">L&apos;application premium du pilote motocross</p>
      </div>
      {children}
    </main>
  );
}

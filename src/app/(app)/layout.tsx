import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] pt-2">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

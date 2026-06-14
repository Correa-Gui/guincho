export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ECD08C] via-[#D4A84A] to-[#B89238] text-lg font-extrabold text-background shadow-[0_4px_14px_rgba(212,168,74,0.25)]">
          G
        </div>
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight text-foreground">
            GuinchoFin
          </div>
          <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-gold">
            Gestão · Guincho
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

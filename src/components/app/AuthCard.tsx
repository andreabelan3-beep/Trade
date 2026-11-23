import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo className="text-4xl" />
        </div>
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-card-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

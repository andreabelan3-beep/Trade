import type * as React from "react";
import { useState } from "react";
import { Link, Outlet, getRouteApi, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ETICHETTE_RUOLI, dimenticaSessione } from "@/lib/session";
import { cn } from "@/lib/utils";
import { NAV, MOBILE_MAIN, type NavItem } from "./nav";
import { Logo } from "./Logo";

const route = getRouteApi("/_authenticated");

export function AppShell() {
  const { me, perms } = route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV.filter((i) => !i.visible || i.visible(perms));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const attiva = (i: NavItem) => pathname === i.to || pathname.startsWith(`${i.to}/`);
  const main = items.filter((i) => MOBILE_MAIN.includes(i.to));
  const rest = items.filter((i) => !MOBILE_MAIN.includes(i.to));

  async function esci() {
    await queryClient.cancelQueries();
    queryClient.clear();
    dimenticaSessione();
    await supabase.auth.signOut();
    navigate({ to: "/accesso", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-6">
          <Logo chiaro className="text-2xl" />
          <p className="mt-1 truncate text-xs text-sidebar-foreground/60">{me.aziendaNome}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                attiva(i) && "bg-sidebar-accent font-medium text-sidebar-primary",
              )}
            >
              <i.icon className="h-4 w-4" />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-sm font-medium">
            {me.nome} {me.cognome}
          </p>
          <p className="text-xs text-sidebar-foreground/60">{ETICHETTE_RUOLI[me.ruolo]}</p>
          <button onClick={esci} className="mt-3 flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {main.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
              attiva(i) && "font-medium text-primary",
            )}
          >
            <i.icon className="h-6 w-6" />
            {i.label}
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
          <MoreHorizontal className="h-6 w-6" />
          Altro
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Altro</SheetTitle>
          </SheetHeader>
          <div className="mt-2 grid gap-1">
            {rest.map((i) => (
              <Link key={i.to} to={i.to} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-4 rounded-md px-3 text-base hover:bg-accent">
                <i.icon className="h-5 w-5" />
                {i.label}
              </Link>
            ))}
            <button onClick={esci} className="flex min-h-12 items-center gap-4 rounded-md px-3 text-base text-muted-foreground hover:bg-accent">
              <LogOut className="h-5 w-5" /> Esci ({me.nome} {me.cognome})
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function Pagina({
  titolo,
  azioni,
  percorso,
  children,
  largo,
}: {
  titolo: string;
  azioni?: React.ReactNode;
  percorso?: React.ReactNode;
  children?: React.ReactNode;
  largo?: boolean;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 md:px-8 md:py-8", largo ? "max-w-7xl" : "max-w-6xl")}>
      {percorso}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{titolo}</h1>
        {azioni && <div className="flex flex-wrap gap-2">{azioni}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

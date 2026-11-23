import { Children, isValidElement, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

/**
 * Barra del percorso in cima alle pagine di dettaglio (Andrea, 18/11: "non è molto chiara la
 * posizione dove si è una volta entrati, penso a una barra più in grande tipo percorso").
 * I figli sono le tappe in ordine: link per quelle sopra, testo per la pagina attuale (l'ultima).
 */
export function Percorso({ children }: { children: ReactNode }) {
  const tappe = Children.toArray(children).filter(isValidElement);
  return (
    <nav
      aria-label="Percorso"
      className="mb-4 rounded-lg border bg-card px-3 py-2.5 text-base shadow-sm"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-nowrap">
        <li className="shrink-0">
          <Link
            to="/"
            aria-label="Inizio"
            className="flex items-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {tappe.map((t, i) => {
          const ultima = i === tappe.length - 1;
          return (
            <li
              key={i}
              className={ultima ? "min-w-0 max-w-full" : "min-w-0 max-w-[45%] sm:max-w-none"}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span
                  aria-current={ultima ? "page" : undefined}
                  className={
                    ultima
                      ? "block truncate font-semibold text-foreground"
                      : "block truncate text-primary sm:max-w-[16rem] [&_a:hover]:underline"
                  }
                >
                  {t}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pagina } from "@/components/app/AppShell";
import { Kpi, Stato, Vuoto } from "@/components/comuni/Stato";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, formatNum, oggi, traGiorni } from "@/lib/formato";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cruscotto")({
  head: () => ({ meta: [{ title: "Cruscotto — Trade" }] }),
  component: Cruscotto,
});

type Dati = Record<string, number | null>;

function Cruscotto() {
  const { me, perms } = Route.useRouteContext();
  const k = useQuery({
    queryKey: ["cruscotto"],
    queryFn: async () => ok(await supabase.rpc("cruscotto")) as unknown as Dati,
  });
  const lotti = useQuery({
    queryKey: ["magazzino", "lotti-scadenza"],
    queryFn: async () =>
      ok(
        await supabase
          .from("lotti_giacenza")
          .select("*")
          .gt("qta", 0)
          .not("scadenza", "is", null)
          .lte("scadenza", traGiorni(Number(k.data?.["giorni_avviso"] ?? 30)))
          .order("scadenza")
          .limit(12),
      ),
    enabled: k.isSuccess,
  });
  const ordini = useQuery({
    queryKey: ["ordini", "da-evadere"],
    enabled: perms.gestire_vendite || perms.gestire_magazzino,
    queryFn: async () =>
      ok(
        await supabase
          .from("ordini_elenco")
          .select("id, numero, data, data_consegna, ragione_sociale, evasione, residuo_valore")
          .eq("tipo", "cliente")
          .in("evasione", ["da_evadere", "parziale"])
          .order("data_consegna", { ascending: true, nullsFirst: false })
          .limit(10),
      ),
  });
  const d = k.data ?? {};
  const n = (x: string) => Number(d[x] ?? 0);
  const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${formatNum(Math.round(((a - b) / b) * 1000) / 10)}% sul mese prima` : undefined);

  return (
    <Pagina titolo={`Ciao ${me.nome || ""}`.trim()} largo
      azioni={
        <>
          {(perms.gestire_vendite || perms.gestire_magazzino) && (
            <Button asChild><Link to="/ddt/nuovo" search={{ direzione: "uscita" }}>Nuovo DDT di vendita</Link></Button>
          )}
          {(perms.gestire_acquisti || perms.gestire_magazzino) && (
            <Button asChild variant="outline"><Link to="/ddt/nuovo" search={{ direzione: "entrata" }}>Registra DDT fornitore</Link></Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {"venduto_mese" in d && (
          <Kpi titolo="Venduto nel mese" valore={formatEuro(n("venduto_mese"))} nota={delta(n("venduto_mese"), n("venduto_mese_prec"))} />
        )}
        {"margine_mese" in d && d["margine_mese"] !== null && (
          <Kpi titolo="Margine nel mese" valore={formatEuro(n("margine_mese"))}
            nota={n("venduto_mese") ? `${formatNum(Math.round((n("margine_mese") / n("venduto_mese")) * 1000) / 10)}% sul venduto` : undefined} />
        )}
        {"ordini_da_evadere" in d && (
          <Kpi titolo="Ordini da evadere" valore={String(n("ordini_da_evadere"))}
            nota={`${formatEuro(n("ordini_da_evadere_valore"))}${n("ordini_in_ritardo") ? ` · ${n("ordini_in_ritardo")} in ritardo` : ""}`}
            tono={n("ordini_in_ritardo") ? "allerta" : undefined} />
        )}
        {"ddt_da_fatturare" in d && (
          <Kpi titolo="DDT da fatturare" valore={String(n("ddt_da_fatturare"))} nota={n("ddt_bozza") ? `${n("ddt_bozza")} in bozza` : "nessuna bozza"} />
        )}
        <Kpi titolo="Lotti in scadenza" valore={String(n("lotti_in_scadenza"))} nota={`entro ${n("giorni_avviso")} giorni`}
          tono={n("lotti_in_scadenza") ? "allerta" : "ok"} />
        <Kpi titolo="Lotti scaduti in giacenza" valore={String(n("lotti_scaduti"))} tono={n("lotti_scaduti") ? "allerta" : "ok"} />
        <Kpi titolo="Sotto scorta" valore={String(n("sotto_scorta"))} tono={n("sotto_scorta") ? "allerta" : "ok"} nota="articoli" />
        {"incassi_30" in d && (
          <Kpi titolo="Saldo 30 giorni" valore={formatEuro(n("incassi_30") - n("pagamenti_30"))}
            nota={`+${formatEuro(n("incassi_30"))} / -${formatEuro(n("pagamenti_30"))}${n("incassi_scaduti") ? ` · scaduti ${formatEuro(n("incassi_scaduti"))}` : ""}`}
            tono={n("incassi_30") - n("pagamenti_30") < 0 ? "allerta" : undefined} />
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lotti in scadenza</h2>
            <Link to="/magazzino" search={{ scheda: "lotti" }} className="text-sm text-primary hover:underline">Tutti i lotti</Link>
          </div>
          {lotti.data?.length ? (
            <div className="divide-y rounded-lg border bg-card">
              {lotti.data.map((l) => (
                <div key={`${l.lotto_id}-${l.magazzino_id}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.articolo_descrizione}</p>
                    <p className="text-xs text-muted-foreground">{l.articolo_codice} · lotto {l.codice}</p>
                  </div>
                  <span className="tabular">{formatNum(l.qta)} {l.um}</span>
                  <Stato stato={l.scadenza! < oggi() ? "scaduto" : "in_scadenza"} />
                  <span className="tabular w-20 text-right">{formatData(l.scadenza)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Vuoto>Nessun lotto in scadenza.</Vuoto>
          )}
        </section>
        {(perms.gestire_vendite || perms.gestire_magazzino) && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ordini da evadere</h2>
              <Link to="/ordini" className="text-sm text-primary hover:underline">Tutti gli ordini</Link>
            </div>
            {ordini.data?.length ? (
              <div className="divide-y rounded-lg border bg-card">
                {ordini.data.map((o) => (
                  <Link key={o.id} to="/ordini/$id" params={{ id: o.id! }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.ragione_sociale}</p>
                      <p className="text-xs text-muted-foreground">Ordine {o.numero} del {formatData(o.data)}</p>
                    </div>
                    <Stato stato={o.evasione!} />
                    <span className={`tabular w-24 text-right ${o.data_consegna && o.data_consegna < oggi() ? "font-medium text-destructive" : ""}`}>
                      {o.data_consegna ? formatData(o.data_consegna) : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Vuoto>Nessun ordine da evadere.</Vuoto>
            )}
          </section>
        )}
      </div>
    </Pagina>
  );
}

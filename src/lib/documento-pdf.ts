import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatEuro, formatNum, formatPrezzo, totaliDocumento, type Riga } from "@/lib/formato";

/** PDF di DDT, ordini e offerte, costruito nel browser (A4, caratteri standard). */

export type Intestazione = {
  nome: string;
  righe: string[]; // indirizzo, P.IVA, contatti
};
export type RigaPdf = Riga & {
  codice: string | null;
  descrizione: string;
  um: string;
  dettagli?: string[] | undefined; // es. lotti e scadenze
};
export type DatiPdf = {
  titolo: string;
  sottotitolo?: string | undefined;
  azienda: Intestazione;
  destinatario: { etichetta: string; righe: string[] };
  destinazione?: { etichetta: string; righe: string[] } | null;
  info: [string, string][];
  righe: RigaPdf[];
  conPrezzi: boolean;
  piede?: [string, string][] | undefined;
  note?: string | null | undefined;
  firme?: string[] | undefined;
};

const A4: [number, number] = [595.28, 841.89];
const M = 40;
const BLU = rgb(0.12, 0.43, 0.48);
const GRIGIO = rgb(0.4, 0.42, 0.45);
const CHIARO = rgb(0.93, 0.95, 0.96);

/** Toglie i caratteri che i font standard (WinAnsi) non sanno scrivere. */
const pulito = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ€]/g, "");

function aCapo(testo: string, font: PDFFont, size: number, larghezza: number): string[] {
  const out: string[] = [];
  for (const par of pulito(testo).split(/\n/)) {
    let riga = "";
    for (const parola of par.split(/\s+/)) {
      const prova = riga ? `${riga} ${parola}` : parola;
      if (font.widthOfTextAtSize(prova, size) <= larghezza) riga = prova;
      else {
        if (riga) out.push(riga);
        riga = parola;
        while (font.widthOfTextAtSize(riga, size) > larghezza && riga.length > 1) {
          let k = riga.length - 1;
          while (k > 1 && font.widthOfTextAtSize(riga.slice(0, k), size) > larghezza) k--;
          out.push(riga.slice(0, k));
          riga = riga.slice(k);
        }
      }
    }
    out.push(riga);
  }
  return out;
}

export async function creaPdfDocumento(d: DatiPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(pulito(d.titolo));
  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;
  const W = A4[0] - 2 * M;

  const testo = (s: string, x: number, yy: number, size = 9, font = f, color = rgb(0.1, 0.1, 0.12)) =>
    page.drawText(pulito(s), { x, y: yy, size, font, color });
  const destra = (s: string, xr: number, yy: number, size = 9, font = f) =>
    testo(s, xr - font.widthOfTextAtSize(pulito(s), size), yy, size, font);

  // Intestazione
  testo(d.azienda.nome, M, y - 14, 16, fb, BLU);
  let ya = y - 28;
  for (const r of d.azienda.righe.filter(Boolean)) {
    testo(r, M, ya, 8, f, GRIGIO);
    ya -= 10;
  }
  destra(d.titolo, A4[0] - M, y - 14, 13, fb);
  if (d.sottotitolo) destra(d.sottotitolo, A4[0] - M, y - 28, 9);
  y = Math.min(ya, y - 40) - 10;

  // Destinatario / destinazione
  const box = (x: number, w: number, et: string, righe: string[]) => {
    const h = 16 + righe.length * 11 + 6;
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: rgb(0.8, 0.83, 0.85), borderWidth: 0.7 });
    testo(et.toUpperCase(), x + 8, y - 12, 7, fb, GRIGIO);
    righe.forEach((r, i) => testo(r, x + 8, y - 25 - i * 11, 9, i === 0 ? fb : f));
    return h;
  };
  const half = (W - 10) / 2;
  const h1 = box(M, half, d.destinatario.etichetta, d.destinatario.righe.filter(Boolean));
  const h2 = d.destinazione ? box(M + half + 10, half, d.destinazione.etichetta, d.destinazione.righe.filter(Boolean)) : 0;
  y -= Math.max(h1, h2) + 10;

  // Info (causale, pagamento…)
  if (d.info.length) {
    const col = W / Math.min(4, d.info.length);
    d.info.forEach(([k, v], i) => {
      const x = M + (i % 4) * col;
      const yy = y - Math.floor(i / 4) * 24;
      testo(k.toUpperCase(), x, yy - 8, 7, fb, GRIGIO);
      testo(v || "-", x, yy - 19, 9);
    });
    y -= Math.ceil(d.info.length / 4) * 24 + 8;
  }

  // Tabella righe
  const cols = d.conPrezzi
    ? [
        { t: "Codice", w: 70 },
        { t: "Descrizione", w: W - 70 - 30 - 50 - 60 - 40 - 70 },
        { t: "UM", w: 30 },
        { t: "Qtà", w: 50, r: true },
        { t: "Prezzo", w: 60, r: true },
        { t: "Sc.%", w: 40, r: true },
        { t: "Importo", w: 70, r: true },
      ]
    : [
        { t: "Codice", w: 80 },
        { t: "Descrizione", w: W - 80 - 40 - 70 },
        { t: "UM", w: 40 },
        { t: "Quantità", w: 70, r: true },
      ];
  const intestaTabella = () => {
    page.drawRectangle({ x: M, y: y - 16, width: W, height: 16, color: BLU });
    let x = M;
    for (const c of cols) {
      const tx = c.r ? x + c.w - 4 - fb.widthOfTextAtSize(c.t, 8) : x + 4;
      page.drawText(c.t, { x: tx, y: y - 11.5, size: 8, font: fb, color: rgb(1, 1, 1) });
      x += c.w;
    }
    y -= 20;
  };
  const nuovaPagina = () => {
    page = pdf.addPage(A4);
    y = A4[1] - M;
    testo(`${d.titolo}${d.sottotitolo ? ` - ${d.sottotitolo}` : ""} (segue)`, M, y - 10, 9, fb, GRIGIO);
    y -= 24;
    intestaTabella();
  };
  intestaTabella();
  const descW = cols[1]!.w - 8;
  d.righe.forEach((r, idx) => {
    const desc = aCapo(r.descrizione || "", f, 9, descW);
    const det = (r.dettagli ?? []).flatMap((x) => aCapo(x, f, 7.5, descW));
    const h = desc.length * 11 + det.length * 9.5 + 4;
    if (y - h < M + 120) nuovaPagina();
    if (idx % 2 === 1) page.drawRectangle({ x: M, y: y - h + 6, width: W, height: h, color: CHIARO });
    let x = M;
    testo(r.codice ?? "", x + 4, y - 3, 8);
    x += cols[0]!.w;
    desc.forEach((l, k) => testo(l, x + 4, y - 3 - k * 11, 9));
    det.forEach((l, k) => testo(l, x + 4, y - 3 - desc.length * 11 - k * 9.5, 7.5, f, GRIGIO));
    x += cols[1]!.w;
    testo(r.um, x + 4, y - 3, 8);
    x += cols[2]!.w;
    destra(formatNum(r.qta), x + cols[3]!.w - 4, y - 3, 9);
    x += cols[3]!.w;
    if (d.conPrezzi) {
      destra(formatPrezzo(r.prezzo), x + cols[4]!.w - 4, y - 3, 9);
      x += cols[4]!.w;
      destra(r.sconto ? formatNum(r.sconto) : "", x + cols[5]!.w - 4, y - 3, 9);
      x += cols[5]!.w;
      destra(formatEuro(Math.round(r.qta * r.prezzo * (1 - r.sconto / 100) * 100) / 100), x + cols[6]!.w - 4, y - 3, 9);
    }
    y -= h;
  });
  page.drawLine({ start: { x: M, y: y + 2 }, end: { x: M + W, y: y + 2 }, thickness: 0.7, color: rgb(0.8, 0.83, 0.85) });
  y -= 10;

  if (y < M + 140) {
    page = pdf.addPage(A4);
    y = A4[1] - M;
  }

  // Totali
  if (d.conPrezzi) {
    const t = totaliDocumento(d.righe);
    const xr = A4[0] - M;
    for (const a of t.aliquote) {
      destra(`IVA ${formatNum(a.iva)}% su ${formatEuro(a.imponibile)}:  ${formatEuro(a.imposta)}`, xr, y, 8);
      y -= 11;
    }
    destra(`Imponibile:  ${formatEuro(t.imponibile)}`, xr, y, 9);
    y -= 13;
    destra(`Totale:  ${formatEuro(t.totale)}`, xr, y, 11, fb);
    y -= 18;
  }

  if (d.note) {
    for (const l of aCapo(`Note: ${d.note}`, f, 8.5, W)) {
      testo(l, M, y, 8.5);
      y -= 11;
    }
    y -= 6;
  }

  // Piede (dati del trasporto) e firme
  if (d.piede?.length) {
    const col = W / 4;
    d.piede.forEach(([k, v], i) => {
      const x = M + (i % 4) * col;
      const yy = y - Math.floor(i / 4) * 24;
      testo(k.toUpperCase(), x, yy - 8, 7, fb, GRIGIO);
      testo(v || "-", x, yy - 19, 9);
    });
    y -= Math.ceil(d.piede.length / 4) * 24 + 10;
  }
  if (d.firme?.length) {
    const w = W / d.firme.length;
    d.firme.forEach((fi, i) => {
      const x = M + i * w;
      testo(fi, x, y - 8, 7.5, fb, GRIGIO);
      page.drawLine({ start: { x, y: y - 38 }, end: { x: x + w - 20, y: y - 38 }, thickness: 0.5, color: GRIGIO });
    });
  }

  // Numeri di pagina
  const pagine = pdf.getPages();
  pagine.forEach((p, i) =>
    p.drawText(`Pagina ${i + 1} di ${pagine.length}`, { x: A4[0] - M - 60, y: 20, size: 7, font: f, color: GRIGIO }),
  );
  return pdf.save();
}

export function scaricaFile(dati: Uint8Array | string, nome: string, tipo: string) {
  const blob = new Blob([dati as BlobPart], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Apre il PDF in una nuova scheda (per stamparlo) e, se il browser lo blocca, lo scarica. */
export function apriPdf(dati: Uint8Array, nome: string) {
  const url = URL.createObjectURL(new Blob([dati as BlobPart], { type: "application/pdf" }));
  const w = window.open(url, "_blank");
  if (!w) scaricaFile(dati, nome, "application/pdf");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

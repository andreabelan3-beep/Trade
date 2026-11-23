/**
 * Esportazione dei DDT di vendita verso Danea Easyfatt (formato Easyfatt-Xml, file .DefXml).
 * In Easyfatt: Documenti → Utilità → Importa documenti Easyfatt-Xml. I DDT arrivano come
 * "Documento di trasporto" (DocumentType D) con lotto e scadenza su ogni riga; la fattura
 * differita si crea poi in Easyfatt raggruppando i DDT del cliente.
 * Il cliente si abbina in Easyfatt per partita IVA / codice fiscale. Le aliquote IVA e i nomi dei
 * pagamenti devono esistere in Easyfatt con lo stesso valore.
 */

export type ClienteDanea = {
  codice: string | null;
  nome: string;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  codiceFiscale: string | null;
  partitaIva: string | null;
  codiceSdi: string | null;
  pec: string | null;
  email: string | null;
};

export type RigaDanea = {
  codice: string | null;
  descrizione: string;
  quantita: number;
  um: string | null;
  prezzo: number;
  sconto: number;
  iva: number;
  lotto: string | null;
  scadenza: string | null;
};

export type DdtDanea = {
  id: string;
  numero: number | null;
  data: string;
  cliente: ClienteDanea;
  destinazione: { nome: string; indirizzo: string | null; cap: string | null; citta: string | null; provincia: string | null } | null;
  pagamento: string | null;
  causale: string;
  vettore: string | null;
  aspetto: string | null;
  colli: number | null;
  peso: number | null;
  porto: string | null;
  inizioTrasporto: string | null;
  note: string | null;
  righe: RigaDanea[];
};

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const num = (n: number, dec: number) => {
  const s = n.toFixed(dec);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

const tag = (nome: string, v: string | number | null | undefined, t: string) =>
  v === null || v === undefined || String(v).trim() === "" ? "" : `${t}<${nome}>${esc(String(v).trim())}</${nome}>\n`;

function rigaXml(r: RigaDanea) {
  const t = "          ";
  let x = "        <Row>\n";
  x += tag("Code", r.codice, t);
  x += tag("Description", r.descrizione, t);
  x += `${t}<Qty>${num(r.quantita, 3)}</Qty>\n`;
  x += tag("Um", r.um, t);
  x += `${t}<Price>${num(r.prezzo, 4)}</Price>\n`;
  if (r.sconto) x += `${t}<Discounts>${num(r.sconto, 2)}</Discounts>\n`;
  const p = num(r.iva, 2);
  x +=
    r.iva > 0
      ? `${t}<VatCode Perc="${p}" Class="Imponibile" Description="Aliquota ${p}%">${p}</VatCode>\n`
      : `${t}<VatCode Perc="0">0</VatCode>\n`;
  x += tag("Lot", r.lotto, t);
  x += tag("ExpiryDate", r.scadenza, t);
  return x + "        </Row>\n";
}

const CAUSALI: Record<string, string> = {
  vendita: "Vendita",
  reso_fornitore: "Reso a fornitore",
  conto_visione: "Conto visione",
  omaggio: "Omaggio",
};

export function xmlEasyfatt(ddt: DdtDanea[]): string {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += '<EasyfattDocuments AppVersion="2" Creator="Trade">\n  <Documents>\n';
  const t = "      ";
  for (const d of ddt) {
    const c = d.cliente;
    x += "    <Document>\n";
    x += tag("DocumentType", "D", t);
    x += tag("CustomerCode", c.codice, t);
    x += tag("CustomerName", c.nome, t);
    x += tag("CustomerAddress", c.indirizzo, t);
    x += tag("CustomerPostcode", c.cap, t);
    x += tag("CustomerCity", c.citta, t);
    x += tag("CustomerProvince", c.provincia, t);
    x += tag("CustomerCountry", "Italia", t);
    x += tag("CustomerFiscalCode", c.codiceFiscale, t);
    x += tag("CustomerVatCode", c.partitaIva, t);
    x += tag("CustomerEInvoiceDestCode", c.codiceSdi, t);
    x += tag("CustomerPec", c.pec, t);
    x += tag("CustomerEmail", c.email, t);
    if (d.destinazione) {
      x += tag("DeliveryName", d.destinazione.nome, t);
      x += tag("DeliveryAddress", d.destinazione.indirizzo, t);
      x += tag("DeliveryPostcode", d.destinazione.cap, t);
      x += tag("DeliveryCity", d.destinazione.citta, t);
      x += tag("DeliveryProvince", d.destinazione.provincia, t);
      x += tag("DeliveryCountry", "Italia", t);
    }
    x += tag("Date", d.data, t);
    if (d.numero !== null) x += tag("Number", d.numero, t);
    x += `${t}<PricesIncludeVat>false</PricesIncludeVat>\n`;
    x += tag("PaymentName", d.pagamento, t);
    x += tag("TransportReason", CAUSALI[d.causale] ?? d.causale, t);
    x += tag("Carrier", d.vettore, t);
    x += tag("GoodsAppearance", d.aspetto, t);
    if (d.colli) x += tag("NumOfPieces", d.colli, t);
    if (d.peso) x += tag("TransportedWeight", num(d.peso, 2), t);
    x += tag("ShipmentTerms", d.porto, t);
    if (d.inizioTrasporto) x += tag("TransportDateTime", d.inizioTrasporto.slice(0, 16), t);
    x += tag("Notes", d.note, t);
    x += tag("InternalComment", `Trade DDT ${d.numero ?? ""} [ref:ddt:${d.id}]`, t);
    x += `${t}<Rows>\n`;
    for (const r of d.righe) x += rigaXml(r);
    x += `${t}</Rows>\n`;
    x += "    </Document>\n";
  }
  return `${x}  </Documents>\n</EasyfattDocuments>\n`;
}

const int = new Intl.NumberFormat("pt-BR");
const dec = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : int.format(n));
export const fmtPct = (n: number | null | undefined) => (n == null ? "—" : `${dec.format(n)}%`);
export const fmtBRL = (n: number | null | undefined) => (n == null ? "—" : brl.format(n));
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—";

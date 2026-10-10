/** Minimal CSV download (UTF-8 BOM for spreadsheets); values are quoted when needed. */
export function csvLine(values: readonly (string | number | null)[]): string {
  return values.map((v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}
export function downloadCsv(name: string, header: readonly string[], rows: readonly (readonly (string | number | null)[])[]): void {
  const lines = [csvLine(header), ...rows.map(csvLine)];
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

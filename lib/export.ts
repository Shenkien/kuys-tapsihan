/** Minimal CSV serializer — good enough for admin-report exports (no
 * embedded newlines beyond what we control, values are quoted and any
 * internal quotes escaped per RFC 4180). */
export function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [headerLine, ...lines].join("\r\n");
}

export function csvResponseHeaders(filename: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}

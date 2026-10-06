const FORMULA_PREFIX = /^\s*[=+\-@]/;

function neutralizeSpreadsheetFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? "'" + value : value;
}

export function escapeCsvCell(value: string): string {
  const safeValue = neutralizeSpreadsheetFormula(value);
  if (/[,"\r\n]/.test(safeValue)) return '"' + safeValue.replace(/"/g, '""') + '"';
  return safeValue;
}

export function escapeSpreadsheetHtmlCell(value: string): string {
  return neutralizeSpreadsheetFormula(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Igual que el backend: mayúsculas, sin espacios ni guiones ("abc-123 " → "ABC123"). */
export function normalizarPlaca(placa) {
  return String(placa ?? '').toUpperCase().replace(/[\s-]/g, '')
}

// Normaliza: minúsculas y sin acentos, para que las reglas no dependan de tildes.
export const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const any = (text, regexes) => regexes.some((r) => r.test(text));

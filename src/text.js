// Normaliza: minúsculas y sin acentos, para que las reglas no dependan de tildes.
export const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const any = (text, regexes) => regexes.some((r) => r.test(text));

// Nombre de archivo seguro a partir de un id: sin separadores de ruta, sin "..", sin puntos iniciales.
export const safeFileName = (id) => String(id ?? "sin-id").replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.{2,}/g, "_").replace(/^\.+/, "_").slice(0, 80) || "sin-id";

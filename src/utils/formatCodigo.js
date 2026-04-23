// src/utils/formatCodigo.js
export const formatCodigo = (codigo) => {
  if (!codigo) return "";
  return codigo.toString().padStart(6, "0"); // exemplo: 123 → "000123"
};

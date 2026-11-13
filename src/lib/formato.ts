// Formatos para la pantalla: precios en pesos y el *negrita* que usa ERIK (mismo formato que WhatsApp).

export function pesos(monto: number | null | undefined): string {
  return '$' + Math.round(monto ?? 0).toLocaleString('es-AR').replace(/,/g, '.');
}

export function precioProducto(p: { precio: number; precio_hasta: number | null }): string {
  return p.precio_hasta ? `desde ${pesos(p.precio)}` : pesos(p.precio);
}

export type Tramo = { texto: string; negrita: boolean };

/**
 * "Tenemos *el Genius* a $9.000" → tramos con y sin negrita, con la regla de WhatsApp: el * que abre va al
 * principio o después de un espacio/signo, y el que cierra no puede estar pegado a una letra o número. Así
 * "*Cargador (3.0*1.0mm)*: $21.500" queda entero en negrita y un asterisco suelto queda como texto.
 */
export function tramosConNegrita(texto: string): Tramo[] {
  const tramos: Tramo[] = [];
  const patron = /(^|[^\p{L}\p{N}*])\*([^\s*](?:[^\n]*?[^\s])?)\*(?=$|[^\p{L}\p{N}*])/gu;
  let desde = 0;
  for (const m of texto.matchAll(patron)) {
    const inicio = m.index! + m[1].length;
    if (inicio > desde) tramos.push({ texto: texto.slice(desde, inicio), negrita: false });
    tramos.push({ texto: m[2], negrita: true });
    desde = m.index! + m[0].length;
  }
  if (desde < texto.length) tramos.push({ texto: texto.slice(desde), negrita: false });
  return tramos;
}

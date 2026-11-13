// Cliente de las rutas /api/v1/kiosco de ERIK (erik_api/routers/kiosco.py). Todo lo que la tablet sabe
// del local pasa por acá; ERIK es quien le pide los datos a MAGNETO.

export type Producto = {
  codigo: number | null;
  nombre: string;
  precio: number;
  precio_hasta: number | null;
  hay_stock: boolean;
  imagen_url: string | null;
  link: string | null;
};

export type Ficha = Producto & {
  marca: string | null;
  categoria: string | null;
  descripcion: string | null;
  especificaciones: Record<string, string> | string | null;
};

export type Estado = {
  activo: boolean;
  texto_pausa: string;
  minutos_inactividad: number;
  rubros: string[];
  tunel?: string | null; // dirección vigente del túnel ngrok (la temporal cambia en cada arranque)
  version: string;
};

export type Promo = { id: number; texto: string | null; producto: Producto | null };

export type Mensaje = {
  id: number | null;
  rol: 'cliente' | 'erik' | 'vendedor';
  texto: string;
  productos: Producto[];
  fecha?: string | null;
};

export type RespuestaChat = {
  respuesta: Mensaje | null;
  atiende_persona: boolean;
  mensaje_cliente_id?: number | null;
};

export type PaginaCatalogo = {
  productos: Producto[];
  hay_mas: boolean;
  siguiente_offset: number;
  parecidos: boolean;
};

// Lo que trae el QR de la pestaña «Tablet» de ERIK (erik/canal_kiosco.py → datos_vinculacion)
export type Vinculo = { local: string[]; tunel: string | null; token: string };

export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export const SIN_CONEXION = 'No hay conexión con el local en este momento.';

// El plan gratis de ngrok mete una página de aviso antes de responder; con esta cabecera la saltea.
const CABECERA_NGROK = { 'ngrok-skip-browser-warning': '1' };

function limpiarUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const limpia = url.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(limpia) ? limpia : null;
}

/**
 * Si ERIK informa otra dirección de túnel que la guardada, devuelve el vínculo actualizado (si no, null).
 * Así la tablet se entera sola cuando ngrok cambia la dirección temporal, mientras está en el wifi.
 */
export function vinculoConTunel(vinculo: Vinculo, tunelInformado: string | null | undefined): Vinculo | null {
  if (tunelInformado === undefined) return null; // ERIK viejo: no informa el túnel
  const tunel = limpiarUrl(tunelInformado);
  if (!tunel || tunel === vinculo.tunel) return null; // sin túnel ahora: se conserva el último conocido
  return { ...vinculo, tunel };
}

/** Lee el texto del QR. Devuelve null si no es un QR de ERIK. */
export function leerVinculo(texto: string): Vinculo | null {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== 'object') return null;
  const d = datos as Record<string, unknown>;
  if (d.app !== 'erik-kiosco' || typeof d.token !== 'string' || d.token.length < 20) return null;
  const local = (Array.isArray(d.local) ? d.local : []).map(limpiarUrl).filter((u): u is string => Boolean(u));
  const tunel = limpiarUrl(d.tunel);
  if (!local.length && !tunel) return null;
  return { local, tunel, token: d.token };
}

async function conTiempo(url: string, opciones: RequestInit, ms: number): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: control.signal });
  } finally {
    clearTimeout(reloj);
  }
}

async function leerError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = await respuesta.json();
    if (typeof cuerpo?.detail === 'string') return cuerpo.detail;
  } catch (e) {
    console.warn('[api] Respuesta de error sin JSON', respuesta.status, e);
  }
  return `Error ${respuesta.status}`;
}

function cabeceras(token: string): Record<string, string> {
  return { 'X-Kiosco-Token': token, Accept: 'application/json', ...CABECERA_NGROK };
}

/**
 * Prueba primero las direcciones del wifi del local (rápidas) y después el túnel. Devuelve la primera que
 * responde con el token aceptado, o lanza ErrorApi (401 si el token ya no sirve: hay que volver a vincular).
 */
export async function elegirServidor(vinculo: Vinculo): Promise<string> {
  const candidatos: [string, number][] = [
    ...vinculo.local.map((u): [string, number] => [u, 3000]),
    ...(vinculo.tunel ? [[vinculo.tunel, 8000] as [string, number]] : []),
  ];
  let rechazado = false;
  for (const [base, ms] of candidatos) {
    try {
      const r = await conTiempo(`${base}/api/v1/kiosco/estado`, { headers: cabeceras(vinculo.token) }, ms);
      if (r.ok) return base;
      if (r.status === 401) rechazado = true;
    } catch (e) {
      console.info('[api] Sin respuesta de', base, e);
    }
  }
  if (rechazado) throw new ErrorApi(401, 'ERIK no reconoce esta tablet: volvé a escanear el QR.');
  throw new ErrorApi(0, SIN_CONEXION);
}

export function crearCliente(base: string, token: string) {
  async function pedir<T>(ruta: string, opciones: RequestInit = {}, ms = 15000): Promise<T> {
    let respuesta: Response;
    try {
      respuesta = await conTiempo(
        `${base}/api/v1/kiosco${ruta}`,
        { ...opciones, headers: { ...cabeceras(token), ...(opciones.headers ?? {}) } },
        ms,
      );
    } catch {
      throw new ErrorApi(0, SIN_CONEXION);
    }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, await leerError(respuesta));
    return (await respuesta.json()) as T;
  }

  const post = (cuerpo?: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  return {
    base,
    estado: () => pedir<Estado>('/estado', {}, 6000),
    promos: () => pedir<{ promos: Promo[] }>('/promos'),
    nuevaSesion: () => pedir<{ sesion_id: number }>('/sesiones', post()),
    // ERIK puede tardar (busca en el catálogo y piensa): se le da más margen
    enviar: (sesion: number, texto: string) => pedir<RespuestaChat>(`/sesiones/${sesion}/mensajes`, post({ texto }), 60000),
    mensajes: (sesion: number, desde: number) =>
      pedir<{ mensajes: Mensaje[]; atiende_persona: boolean }>(`/sesiones/${sesion}/mensajes?desde=${desde}`),
    cerrar: (sesion: number) => pedir<{ cerrada: boolean }>(`/sesiones/${sesion}/cerrar`, post()),
    productos: (q: string, offset = 0) =>
      pedir<PaginaCatalogo>(`/productos?${new URLSearchParams({ q, offset: String(offset), limite: '12' })}`),
    ficha: (codigo: number) => pedir<Ficha>(`/productos/${codigo}`),
    codigoBarras: (codigo: string) => pedir<Ficha>(`/codigo-barras/${encodeURIComponent(codigo)}`),
  };
}

export type ClienteApi = ReturnType<typeof crearCliente>;

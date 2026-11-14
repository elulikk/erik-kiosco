// Estado de toda la tablet: a qué ERIK está vinculada, si hay conexión, si está en pausa, la charla en curso
// lo escaneado por el cliente y el reinicio por inactividad (cuando nadie la toca, borra la charla y lo
// escaneado, y vuelve a la pantalla de espera).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { borrar, guardar, leer } from './almacen';
import {
  ErrorApi,
  SIN_CONEXION,
  crearCliente,
  elegirServidor,
  leerVinculo,
  vinculoConTunel,
  type ClienteApi,
  type Estado,
  type Mensaje,
  type Producto,
  type Vinculo,
} from './api';

export type Conexion = 'cargando' | 'sin-vinculo' | 'conectando' | 'conectado' | 'sin-conexion' | 'rechazado';

type MensajeLocal = Mensaje & { clave: string };

/** Un código leído en el escáner. Queda en la lista del costado hasta que se reinicia la tablet. */
export type Escaneado = { codigoBarras: string; producto: Producto; cuando: number };

type ContextoKiosco = {
  conexion: Conexion;
  cliente: ClienteApi | null;
  estado: Estado | null;
  vinculo: Vinculo | null;
  pin: string | null;
  mensajes: MensajeLocal[];
  pensando: boolean;
  atiendePersona: boolean;
  escaneados: Escaneado[];
  vincular: (textoQr: string) => Promise<string | null>;
  desvincular: () => Promise<void>;
  guardarPin: (pin: string) => Promise<void>;
  reconectar: () => void;
  registrarActividad: () => void;
  enviarMensaje: (texto: string) => Promise<void>;
  reiniciar: () => void;
  /** Suma lo escaneado arriba de la lista; si ya estaba, lo sube. */
  agregarEscaneado: (codigoBarras: string, producto: Producto) => void;
  vaciarEscaneados: () => void;
};

const Contexto = createContext<ContextoKiosco | null>(null);

const CLAVE_VINCULO = 'erik_kiosco_vinculo';
const CLAVE_PIN = 'erik_kiosco_pin';
const SEGUNDOS_ESTADO = 15;
const SEGUNDOS_REINTENTO = 10;
const SEGUNDOS_CHARLA = 3;
const MAXIMO_ESCANEADOS = 60;

let contadorClaves = 0;
const claveNueva = () => `local-${Date.now()}-${contadorClaves++}`;

function aviso(texto: string): MensajeLocal {
  return { clave: claveNueva(), id: null, rol: 'erik', texto, productos: [] };
}

export function ProveedorKiosco({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [conexion, setConexion] = useState<Conexion>('cargando');
  const [cliente, setCliente] = useState<ClienteApi | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>([]);
  const [pensando, setPensando] = useState(false);
  const [atiendePersona, setAtiendePersona] = useState(false);
  const [escaneados, setEscaneados] = useState<Escaneado[]>([]);
  const [intento, setIntento] = useState(0);

  const sesion = useRef<number | null>(null);
  const ultimoIdVisto = useRef(0);
  const idsVistos = useRef(new Set<number>());
  const ultimaActividad = useRef(Date.now());

  // ─── Vínculo y conexión ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [guardado, pinGuardado] = await Promise.all([leer(CLAVE_VINCULO), leer(CLAVE_PIN)]);
      setPin(pinGuardado);
      const v = guardado ? leerVinculo(guardado) : null;
      setVinculo(v);
      setConexion(v ? 'conectando' : 'sin-vinculo');
    })().catch((e) => {
      console.warn('[kiosco] No se pudo leer el vínculo guardado', e);
      setConexion('sin-vinculo');
    });
  }, []);

  useEffect(() => {
    if (!vinculo) return;
    let vigente = true;
    setConexion((c) => (c === 'conectado' ? c : 'conectando'));
    elegirServidor(vinculo)
      .then(async (base) => {
        const nuevo = crearCliente(base, vinculo.token);
        const e = await nuevo.estado();
        if (!vigente) return;
        setCliente(nuevo);
        setEstado(e);
        setConexion('conectado');
      })
      .catch((e) => {
        if (!vigente) return;
        setCliente(null);
        setConexion(e instanceof ErrorApi && e.estado === 401 ? 'rechazado' : 'sin-conexion');
      });
    return () => {
      vigente = false;
    };
  }, [vinculo, intento]);

  const reconectar = useCallback(() => setIntento((i) => i + 1), []);

  // La dirección del túnel que informa ERIK reemplaza a la guardada (la temporal de ngrok cambia sola)
  useEffect(() => {
    if (!vinculo || !estado) return;
    const nuevo = vinculoConTunel(vinculo, estado.tunel);
    if (!nuevo) return;
    guardar(CLAVE_VINCULO, JSON.stringify({ app: 'erik-kiosco', ...nuevo }))
      .then(() => setVinculo(nuevo))
      .catch((e) => console.warn('[kiosco] No se pudo guardar la dirección nueva del túnel', e));
  }, [vinculo, estado]);

  // Sin conexión: se reintenta solo cada tantos segundos
  useEffect(() => {
    if (conexion !== 'sin-conexion') return;
    const reloj = setTimeout(reconectar, SEGUNDOS_REINTENTO * 1000);
    return () => clearTimeout(reloj);
  }, [conexion, reconectar]);

  // Con conexión: el estado (pausa, inactividad, rubros) se consulta seguido. Así ERIK ve la tablet «Conectada».
  useEffect(() => {
    if (!cliente) return;
    const reloj = setInterval(() => {
      cliente
        .estado()
        .then(setEstado)
        .catch((e) => {
          if (e instanceof ErrorApi && e.estado === 401) setConexion('rechazado');
          else if (e instanceof ErrorApi && e.estado === 0) reconectar();
        });
    }, SEGUNDOS_ESTADO * 1000);
    return () => clearInterval(reloj);
  }, [cliente, reconectar]);

  const vincular = useCallback(async (textoQr: string) => {
    const v = leerVinculo(textoQr);
    if (!v) return 'Ese no es el QR de la pestaña «Tablet» de ERIK.';
    await guardar(CLAVE_VINCULO, JSON.stringify({ app: 'erik-kiosco', ...v }));
    setVinculo(v);
    setIntento((i) => i + 1);
    return null;
  }, []);

  const desvincular = useCallback(async () => {
    await borrar(CLAVE_VINCULO);
    setVinculo(null);
    setCliente(null);
    setEstado(null);
    setConexion('sin-vinculo');
  }, []);

  const guardarPin = useCallback(async (nuevo: string) => {
    await guardar(CLAVE_PIN, nuevo);
    setPin(nuevo);
  }, []);

  // ─── Charla con ERIK ────────────────────────────────────────────────────────
  const limpiarCharla = useCallback(() => {
    sesion.current = null;
    ultimoIdVisto.current = 0;
    idsVistos.current = new Set();
    setMensajes([]);
    setPensando(false);
    setAtiendePersona(false);
    setEscaneados([]);
  }, []);

  const reiniciar = useCallback(() => {
    const abierta = sesion.current;
    if (abierta && cliente) {
      cliente.cerrar(abierta).catch((e) => console.warn('[kiosco] No se pudo cerrar la charla', abierta, e));
    }
    limpiarCharla();
    ultimaActividad.current = Date.now();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }, [cliente, limpiarCharla, router]);

  const registrarActividad = useCallback(() => {
    ultimaActividad.current = Date.now();
  }, []);

  // ─── Escáner ───────────────────────────────────────────────────────────────
  const agregarEscaneado = useCallback((codigoBarras: string, producto: Producto) => {
    ultimaActividad.current = Date.now(); // escanear sin tocar la pantalla también es usarla
    setEscaneados((previos) => [
      { codigoBarras, producto, cuando: Date.now() },
      ...previos.filter((e) => e.codigoBarras !== codigoBarras),
    ].slice(0, MAXIMO_ESCANEADOS));
  }, []);

  const vaciarEscaneados = useCallback(() => setEscaneados([]), []);

  const sumarDelServidor = useCallback((nuevos: Mensaje[]) => {
    const agregar: MensajeLocal[] = [];
    for (const m of nuevos) {
      if (m.id != null) ultimoIdVisto.current = Math.max(ultimoIdVisto.current, m.id);
      // Lo del cliente ya está en pantalla (se agrega al escribir); de lo demás, lo que no se vio
      if (m.rol === 'cliente' || m.id == null || idsVistos.current.has(m.id)) continue;
      idsVistos.current.add(m.id);
      agregar.push({ ...m, clave: `srv-${m.id}` });
    }
    if (agregar.length) setMensajes((previos) => [...previos, ...agregar]);
  }, []);

  const enviarMensaje = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio || !cliente || pensando) return;
      registrarActividad();
      setMensajes((previos) => [...previos, { clave: claveNueva(), id: null, rol: 'cliente', texto: limpio, productos: [] }]);
      setPensando(true);
      try {
        for (let vuelta = 0; vuelta < 2; vuelta++) {
          if (!sesion.current) sesion.current = (await cliente.nuevaSesion()).sesion_id;
          try {
            const res = await cliente.enviar(sesion.current, limpio);
            setAtiendePersona(res.atiende_persona);
            if (res.respuesta) sumarDelServidor([res.respuesta]);
            break;
          } catch (e) {
            // La charla se cerró del lado de ERIK (inactividad, «Terminar» desde la PC): se abre otra
            if (e instanceof ErrorApi && e.estado === 404 && vuelta === 0) {
              sesion.current = null;
              continue;
            }
            throw e;
          }
        }
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 423) {
          cliente.estado().then(setEstado).catch((err) => console.warn('[kiosco] Estado tras la pausa', err));
        } else if (e instanceof ErrorApi && e.estado === 0) {
          setMensajes((p) => [...p, aviso(`${SIN_CONEXION} Probá de nuevo en un ratito o consultá en el mostrador.`)]);
          reconectar();
        } else {
          setMensajes((p) => [...p, aviso(e instanceof Error ? e.message : 'No pude responder. Consultá en el mostrador.')]);
        }
      } finally {
        setPensando(false);
        registrarActividad();
      }
    },
    [cliente, pensando, reconectar, registrarActividad, sumarDelServidor],
  );

  // Lo que escribe un vendedor desde ERIK llega por acá
  useEffect(() => {
    if (!cliente) return;
    const reloj = setInterval(() => {
      const abierta = sesion.current;
      if (!abierta) return;
      cliente
        .mensajes(abierta, ultimoIdVisto.current)
        .then((r) => {
          if (sesion.current !== abierta) return;
          setAtiendePersona(r.atiende_persona);
          if (r.mensajes.some((m) => m.rol === 'vendedor')) registrarActividad();
          sumarDelServidor(r.mensajes);
        })
        .catch((e) => {
          // La charla la terminaron desde ERIK: se vuelve a empezar
          if (e instanceof ErrorApi && e.estado === 404 && sesion.current === abierta) reiniciar();
        });
    }, SEGUNDOS_CHARLA * 1000);
    return () => clearInterval(reloj);
  }, [cliente, registrarActividad, reiniciar, sumarDelServidor]);

  // ─── Inactividad ───────────────────────────────────────────────────────────
  const minutos = estado?.minutos_inactividad ?? 3;
  useEffect(() => {
    const reloj = setInterval(() => {
      const enUso = ruta !== '/' || sesion.current !== null;
      const quieta = Date.now() - ultimaActividad.current > minutos * 60_000;
      // En ajustes o vinculando no se corta (lo está usando alguien del local)
      if (enUso && quieta && !pensando && !ruta.startsWith('/ajustes') && !ruta.startsWith('/vincular')) reiniciar();
    }, 5000);
    return () => clearInterval(reloj);
  }, [minutos, pensando, reiniciar, ruta]);

  const valor = useMemo<ContextoKiosco>(
    () => ({
      conexion,
      cliente,
      estado,
      vinculo,
      pin,
      mensajes,
      pensando,
      atiendePersona,
      escaneados,
      vincular,
      desvincular,
      guardarPin,
      reconectar,
      registrarActividad,
      enviarMensaje,
      reiniciar,
      agregarEscaneado,
      vaciarEscaneados,
    }),
    [conexion, cliente, estado, vinculo, pin, mensajes, pensando, atiendePersona, escaneados, vincular, desvincular,
      guardarPin, reconectar, registrarActividad, enviarMensaje, reiniciar, agregarEscaneado, vaciarEscaneados],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useKiosco(): ContextoKiosco {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useKiosco fuera de ProveedorKiosco');
  return ctx;
}

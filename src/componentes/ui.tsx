import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Producto } from '@/lib/api';
import { precioProducto, tramosConNegrita } from '@/lib/formato';
import { colores, espacio, letra, radio } from '@/lib/tema';

export const LOGO_MAG = require('../../assets/mag.png');
export const LOGO_ERIK = require('../../assets/erik.png');

type Icono = ComponentProps<typeof Ionicons>['name'];

export function Boton({
  texto,
  icono,
  onPress,
  variante = 'primario',
  grande = false,
  deshabilitado = false,
  estilo,
}: {
  texto: string;
  icono?: Icono;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'fantasma';
  grande?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const fondo = variante === 'primario' ? colores.mag : variante === 'secundario' ? colores.superficieAlta : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.boton,
        grande && estilos.botonGrande,
        { backgroundColor: fondo, opacity: deshabilitado ? 0.4 : pressed ? 0.75 : 1 },
        variante === 'fantasma' && { borderWidth: 2, borderColor: colores.borde },
        estilo,
      ]}
    >
      {icono ? <Ionicons name={icono} size={grande ? 30 : 24} color={colores.texto} /> : null}
      <Text style={[estilos.botonTexto, grande && { fontSize: letra.grande }]}>{texto}</Text>
    </Pressable>
  );
}

export function Chip({ texto, onPress, activo = false }: { texto: string; onPress: () => void; activo?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        estilos.chip,
        activo && { backgroundColor: colores.mag, borderColor: colores.mag },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={estilos.chipTexto}>{texto}</Text>
    </Pressable>
  );
}

export function EtiquetaStock({ hay }: { hay: boolean }) {
  return (
    <View style={[estilos.stock, { backgroundColor: hay ? colores.haySuave : colores.avisoSuave }]}>
      <Text style={[estilos.stockTexto, { color: hay ? colores.hay : colores.aviso }]}>
        {hay ? 'Disponible' : 'Consultá disponibilidad'}
      </Text>
    </View>
  );
}

export function FotoProducto({ url, alto }: { url: string | null; alto: number }) {
  if (!url) {
    return (
      <View style={[estilos.sinFoto, { height: alto }]}>
        <Image source={LOGO_ERIK} style={{ width: alto * 0.45, height: alto * 0.45, opacity: 0.35 }} contentFit="contain" />
      </View>
    );
  }
  return (
    <View style={{ height: alto, backgroundColor: '#ffffff', borderRadius: radio.s, overflow: 'hidden' }}>
      <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="contain" transition={150} />
    </View>
  );
}

/** Tarjeta tocable: abre la ficha del producto. */
export function TarjetaProducto({ producto, ancho, compacta = false }: { producto: Producto; ancho?: number; compacta?: boolean }) {
  const router = useRouter();
  const abrir = () => {
    if (producto.codigo) router.push({ pathname: '/producto/[codigo]', params: { codigo: String(producto.codigo) } });
  };
  return (
    <Pressable
      onPress={abrir}
      disabled={!producto.codigo}
      style={({ pressed }) => [estilos.tarjeta, ancho ? { width: ancho } : { flex: 1 }, pressed && { opacity: 0.8 }]}
    >
      <FotoProducto url={producto.imagen_url} alto={compacta ? 110 : 170} />
      <Text style={[estilos.tarjetaNombre, compacta && { fontSize: letra.chica }]} numberOfLines={compacta ? 2 : 3}>
        {producto.nombre}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={[estilos.precio, compacta && { fontSize: letra.normal }]}>{precioProducto(producto)}</Text>
      {compacta ? null : <EtiquetaStock hay={producto.hay_stock} />}
    </Pressable>
  );
}

/** Texto de ERIK con *negrita* (mismo formato que usa en WhatsApp). */
export function TextoConNegrita({ texto, color = colores.texto }: { texto: string; color?: string }) {
  return (
    <Text style={[estilos.texto, { color }]}>
      {tramosConNegrita(texto).map((t, i) => (
        <Text key={i} style={t.negrita ? { fontWeight: '800' } : undefined}>
          {t.texto}
        </Text>
      ))}
    </Text>
  );
}

/**
 * Barra de arriba: logo de MAG (mantenerlo apretado 3 segundos abre los ajustes, para el personal),
 * título de la pantalla y botones a la derecha.
 */
export function Cabecera({ titulo, derecha }: { titulo?: string; derecha?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={estilos.cabecera}>
      <Pressable onLongPress={() => router.push('/ajustes')} delayLongPress={3000} hitSlop={12}>
        <Image source={LOGO_MAG} style={{ width: 132, height: 43 }} contentFit="contain" />
      </Pressable>
      {titulo ? <Text style={estilos.cabeceraTitulo}>{titulo}</Text> : null}
      <View style={{ flex: 1 }} />
      {derecha}
    </View>
  );
}

export function Cargando({ texto }: { texto?: string }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={colores.magClaro} />
      {texto ? <Text style={[estilos.textoSuave, { marginTop: espacio.m }]}>{texto}</Text> : null}
    </View>
  );
}

export function Aviso({ icono, titulo, detalle, accion }: { icono: Icono; titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <View style={estilos.centro}>
      <Ionicons name={icono} size={64} color={colores.textoSuave} />
      <Text style={[estilos.titulo, { marginTop: espacio.l, textAlign: 'center' }]}>{titulo}</Text>
      {detalle ? <Text style={[estilos.textoSuave, { marginTop: espacio.s, textAlign: 'center', maxWidth: 640 }]}>{detalle}</Text> : null}
      {accion ? <View style={{ marginTop: espacio.xl }}>{accion}</View> : null}
    </View>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, backgroundColor: colores.fondo },
  texto: { color: colores.texto, fontSize: letra.normal, lineHeight: letra.normal * 1.4 },
  textoSuave: { color: colores.textoSuave, fontSize: letra.normal },
  titulo: { color: colores.texto, fontSize: letra.titulo, fontWeight: '800' },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.m,
    borderRadius: radio.m,
    minHeight: 56,
  },
  botonGrande: { paddingHorizontal: espacio.xl, paddingVertical: espacio.l, minHeight: 76, borderRadius: radio.l },
  botonTexto: { color: colores.texto, fontSize: letra.normal, fontWeight: '700' },
  chip: {
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s + 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  chipTexto: { color: colores.texto, fontSize: letra.chica + 1, fontWeight: '600' },
  stock: { alignSelf: 'flex-start', paddingHorizontal: espacio.s, paddingVertical: 3, borderRadius: radio.s, marginTop: espacio.xs },
  stockTexto: { fontSize: 14, fontWeight: '700' },
  sinFoto: { backgroundColor: colores.superficieAlta, borderRadius: radio.s, alignItems: 'center', justifyContent: 'center' },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.m,
    padding: espacio.m,
    gap: espacio.s,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  tarjetaNombre: { color: colores.texto, fontSize: letra.chica + 1, fontWeight: '600', lineHeight: 22 },
  precio: { color: colores.texto, fontSize: letra.grande, fontWeight: '800' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.l,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.m,
    backgroundColor: colores.superficie,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  cabeceraTitulo: { color: colores.texto, fontSize: letra.grande, fontWeight: '700' },
});

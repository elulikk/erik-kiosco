// Ficha de un producto: foto grande, precio, si hay en el local, descripción y «Preguntarle a ERIK».
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorApi, type Ficha } from '@/lib/api';
import { useKiosco } from '@/lib/kiosco';
import { precioProducto } from '@/lib/formato';
import { Aviso, Boton, Cabecera, Cargando, EtiquetaStock, FotoProducto, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const LARGO_MAX_DESCRIPCION = 900;

function especificacionesComoLista(spec: Ficha['especificaciones']): [string, string][] {
  if (!spec) return [];
  if (typeof spec === 'string') return [];
  return Object.entries(spec)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
    .slice(0, 12)
    .map(([k, v]) => [k, String(v)]);
}

export default function Producto() {
  const router = useRouter();
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { cliente } = useKiosco();
  // El resultado queda con el código que se pidió: si cambia el código, lo viejo no se muestra
  const [resultado, setResultado] = useState<{
    codigo: string;
    ficha?: Ficha;
    error?: { estado: number; texto: string };
  } | null>(null);

  useEffect(() => {
    const numero = Number(codigo);
    if (!cliente || !Number.isFinite(numero)) return;
    let vigente = true;
    cliente
      .ficha(numero)
      .then((ficha) => vigente && setResultado({ codigo, ficha }))
      .catch(
        (e) =>
          vigente &&
          setResultado({
            codigo,
            error: { estado: e instanceof ErrorApi ? e.estado : 0, texto: e instanceof Error ? e.message : String(e) },
          }),
      );
    return () => {
      vigente = false;
    };
  }, [cliente, codigo]);

  const actual = resultado?.codigo === codigo ? resultado : null;
  const ficha = actual?.ficha ?? null;
  const error = actual?.error ?? null;

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));
  const cabecera = <Cabecera titulo="Producto" derecha={<Boton texto="Volver" icono="arrow-back" variante="secundario" onPress={volver} />} />;

  if (error) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <Aviso
          icono={error.estado === 404 ? 'help-circle-outline' : 'cloud-offline-outline'}
          titulo={error.estado === 404 ? 'Ese producto no está en el catálogo' : 'No pudimos consultar el producto'}
          detalle={error.estado === 404 ? 'Consultá en el mostrador.' : `${error.texto} Consultá en el mostrador.`}
        />
      </View>
    );
  }
  if (!ficha) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <Cargando />
      </View>
    );
  }

  const descripcion =
    ficha.descripcion && ficha.descripcion.length > LARGO_MAX_DESCRIPCION
      ? `${ficha.descripcion.slice(0, LARGO_MAX_DESCRIPCION).trimEnd()}…`
      : ficha.descripcion;
  const specs = especificacionesComoLista(ficha.especificaciones);

  return (
    <View style={estilos.pantalla}>
      {cabecera}
      <View style={{ flex: 1, flexDirection: 'row', padding: espacio.xl, gap: espacio.xl }}>
        <View style={{ flex: 1 }}>
          <FotoProducto url={ficha.imagen_url} alto={460} />
        </View>
        <ScrollView style={{ flex: 1.1 }} contentContainerStyle={{ gap: espacio.m }}>
          {ficha.marca ? <Text style={estilosFicha.marca}>{ficha.marca}</Text> : null}
          <Text style={estilosFicha.nombre}>{ficha.nombre}</Text>
          <Text style={estilosFicha.precio}>{precioProducto(ficha)}</Text>
          <EtiquetaStock hay={ficha.hay_stock} />
          <View style={{ flexDirection: 'row', gap: espacio.m, marginTop: espacio.m }}>
            <Boton
              texto="Preguntarle a ERIK"
              icono="chatbubble-ellipses-outline"
              grande
              onPress={() => router.push({ pathname: '/chat', params: { pregunta: `Contame más sobre «${ficha.nombre}»` } })}
            />
          </View>
          <Text style={[estilos.textoSuave, { marginTop: espacio.s }]}>
            ¿Lo querés llevar? Acercate al mostrador y te lo preparamos.
          </Text>
          {descripcion ? (
            <View style={estilosFicha.bloque}>
              <Text style={estilosFicha.bloqueTitulo}>Descripción</Text>
              <Text style={[estilos.texto, { fontSize: letra.chica + 1 }]}>{descripcion}</Text>
            </View>
          ) : null}
          {specs.length ? (
            <View style={estilosFicha.bloque}>
              <Text style={estilosFicha.bloqueTitulo}>Características</Text>
              {specs.map(([k, v]) => (
                <Text key={k} style={[estilos.texto, { fontSize: letra.chica + 1 }]}>
                  <Text style={{ color: colores.textoSuave }}>{k}: </Text>
                  {v}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const estilosFicha = StyleSheet.create({
  marca: { color: colores.magClaro, fontSize: letra.normal, fontWeight: '700', textTransform: 'uppercase' },
  nombre: { color: colores.texto, fontSize: letra.titulo, fontWeight: '800', lineHeight: letra.titulo * 1.2 },
  precio: { color: colores.texto, fontSize: letra.enorme, fontWeight: '800' },
  bloque: { backgroundColor: colores.superficie, borderRadius: radio.m, padding: espacio.l, gap: espacio.s, marginTop: espacio.m },
  bloqueTitulo: { color: colores.textoSuave, fontSize: letra.chica, fontWeight: '800', textTransform: 'uppercase' },
});

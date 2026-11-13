// Catálogo: buscador, rubros (se eligen en ERIK) y grilla de productos con foto, precio y si hay.
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorApi, type Producto } from '@/lib/api';
import { useKiosco } from '@/lib/kiosco';
import { Aviso, Boton, Cabecera, Cargando, Chip, TarjetaProducto, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const ANCHO_TARJETA = 250;

export default function Catalogo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { cliente, estado, reiniciar } = useKiosco();
  const { width } = useWindowDimensions();
  const columnas = Math.max(2, Math.floor((width - espacio.xl * 2) / ANCHO_TARJETA));

  const [texto, setTexto] = useState(params.q ?? '');
  const [consulta, setConsulta] = useState(params.q ?? '');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [siguiente, setSiguiente] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [parecidos, setParecidos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Búsqueda que ya respondió («consulta#intento»): mientras no coincida con la actual, está cargando
  const [respondida, setRespondida] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const clave = `${consulta}#${intento}`;
  const buscandoNueva = Boolean(consulta.trim()) && respondida !== clave;
  const cargando = buscandoNueva || cargandoMas;

  // Si ERIK o MAGNETO no responden, se dice eso: nunca que no hay productos
  const mensajeError = (e: unknown) => (e instanceof ErrorApi ? e.message : 'No pudimos consultar el catálogo en este momento.');

  useEffect(() => {
    const q = consulta.trim();
    if (!cliente || !q) return;
    let vigente = true;
    cliente
      .productos(q, 0)
      .then((r) => {
        if (!vigente) return;
        setProductos(r.productos);
        setSiguiente(r.siguiente_offset);
        setHayMas(r.hay_mas);
        setParecidos(r.parecidos);
        setError(null);
      })
      .catch((e) => {
        if (!vigente) return;
        setProductos([]);
        setError(mensajeError(e));
      })
      .finally(() => vigente && setRespondida(`${consulta}#${intento}`));
    return () => {
      vigente = false;
    };
  }, [cliente, consulta, intento]);

  const verMas = async () => {
    if (!cliente || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await cliente.productos(consulta.trim(), siguiente);
      setProductos((previos) => [...previos, ...r.productos]);
      setSiguiente(r.siguiente_offset);
      setHayMas(r.hay_mas);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargandoMas(false);
    }
  };

  const reintentar = () => setIntento((i) => i + 1);

  const buscar = (q: string) => {
    const limpia = q.trim();
    if (!limpia) return;
    setTexto(limpia);
    setConsulta(limpia);
  };

  const preguntarAErik = () =>
    router.push({ pathname: '/chat', params: { pregunta: `¿Tienen ${consulta}?` } });

  const vacio = !cargando && !error && Boolean(consulta) && productos.length === 0;

  return (
    <View style={estilos.pantalla}>
      <Cabecera
        titulo="Productos"
        derecha={
          <View style={{ flexDirection: 'row', gap: espacio.s }}>
            <Boton texto="Escanear" icono="barcode-outline" variante="secundario" onPress={() => router.push('/escaner')} />
            <Boton texto="Preguntar a ERIK" icono="chatbubble-ellipses-outline" variante="secundario" onPress={() => router.push('/chat')} />
            <Boton texto="Terminar" icono="close" variante="fantasma" onPress={reiniciar} />
          </View>
        }
      />
      <View style={{ paddingHorizontal: espacio.xl, paddingTop: espacio.l, gap: espacio.m }}>
        <View style={estilosCatalogo.buscador}>
          <Ionicons name="search" size={28} color={colores.textoSuave} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={() => buscar(texto)}
            placeholder="Buscá por nombre, marca o modelo"
            placeholderTextColor={colores.textoTenue}
            returnKeyType="search"
            style={estilosCatalogo.buscadorTexto}
          />
          <Boton texto="Buscar" onPress={() => buscar(texto)} deshabilitado={!texto.trim()} />
        </View>
        {estado?.rubros?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
            {estado.rubros.map((r) => (
              <Chip key={r} texto={r} activo={r.toLowerCase() === consulta.toLowerCase()} onPress={() => buscar(r)} />
            ))}
          </ScrollView>
        ) : null}
        {parecidos && productos.length ? (
          <Text style={estilos.textoSuave}>No encontramos exactamente «{consulta}». Esto es lo más parecido que tenemos:</Text>
        ) : null}
      </View>

      {!consulta ? (
        <Aviso icono="search-outline" titulo="¿Qué estás buscando?" detalle="Escribilo arriba o tocá un rubro." />
      ) : buscandoNueva ? (
        <Cargando texto="Buscando…" />
      ) : error ? (
        <Aviso
          icono="cloud-offline-outline"
          titulo="No pudimos consultar el catálogo"
          detalle={`${error} Consultá en el mostrador.`}
          accion={<Boton texto="Probar de nuevo" icono="refresh" variante="secundario" onPress={reintentar} />}
        />
      ) : vacio ? (
        <Aviso
          icono="help-circle-outline"
          titulo={`No encontramos «${consulta}»`}
          detalle="Probá con otra palabra o preguntale a ERIK: a veces está con otro nombre."
          accion={<Boton texto="Preguntarle a ERIK" icono="chatbubble-ellipses-outline" onPress={preguntarAErik} />}
        />
      ) : (
        <FlatList
          key={columnas}
          data={productos}
          numColumns={columnas}
          keyExtractor={(p, i) => `${p.codigo ?? 'x'}-${i}`}
          contentContainerStyle={{ padding: espacio.xl, gap: espacio.m }}
          columnWrapperStyle={{ gap: espacio.m }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / columnas }}>
              <TarjetaProducto producto={item} />
            </View>
          )}
          ListFooterComponent={
            hayMas ? (
              <View style={{ alignItems: 'center', paddingTop: espacio.m }}>
                <Boton
                  texto={cargandoMas ? 'Cargando…' : 'Ver más productos'}
                  variante="secundario"
                  deshabilitado={cargandoMas}
                  onPress={verMas}
                />
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const estilosCatalogo = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    backgroundColor: colores.superficie,
    borderRadius: radio.l,
    paddingLeft: espacio.l,
    paddingRight: espacio.s,
    paddingVertical: espacio.xs,
    borderWidth: 2,
    borderColor: colores.borde,
  },
  buscadorTexto: { flex: 1, color: colores.texto, fontSize: letra.normal + 2, paddingVertical: espacio.s },
});

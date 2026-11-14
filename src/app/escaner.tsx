// Escáner: el cliente le muestra a la cámara un producto atrás de otro sin tocar la tablet. Cada uno queda en
// la lista del costado (el último arriba) y tocándolo se abre su ficha; al volver, la lista sigue ahí.
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorApi } from '@/lib/api';
import { useKiosco, type Escaneado } from '@/lib/kiosco';
import { precioProducto } from '@/lib/formato';
import { CamaraLectora } from '@/componentes/camara';
import { Boton, Cabecera, EtiquetaStock, FotoProducto, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const SEGUNDOS_RESULTADO = 3;

type Resultado = { tipo: 'agregado' | 'repetido' | 'aviso'; texto: string };

export default function Escaner() {
  const router = useRouter();
  const { cliente, escaneados, agregarEscaneado, vaciarEscaneados } = useKiosco();
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // En una tablet apoyada en el mostrador muchas veces es más cómodo mostrarle el producto a la cámara de adelante
  const [frontal, setFrontal] = useState(false);

  // El cartel de lo último que se leyó se va solo, para que no confunda con el próximo producto
  useEffect(() => {
    if (!resultado) return;
    const reloj = setTimeout(() => setResultado(null), SEGUNDOS_RESULTADO * 1000);
    return () => clearTimeout(reloj);
  }, [resultado]);

  const leer = async (codigoBarras: string) => {
    if (!cliente || buscando) return;
    // Si ya está en la lista no hace falta preguntarle a ERIK de nuevo: se sube arriba
    const yaEstaba = escaneados.find((e) => e.codigoBarras === codigoBarras);
    if (yaEstaba) {
      agregarEscaneado(codigoBarras, yaEstaba.producto);
      setResultado({ tipo: 'repetido', texto: `${yaEstaba.producto.nombre} ya está en la lista` });
      return;
    }
    setBuscando(true);
    try {
      const ficha = await cliente.codigoBarras(codigoBarras);
      agregarEscaneado(codigoBarras, ficha);
      setResultado({ tipo: 'agregado', texto: ficha.nombre });
    } catch (e) {
      setResultado({
        tipo: 'aviso',
        texto:
          e instanceof ErrorApi && e.estado === 404
            ? 'No encontramos ese código. Probá de nuevo o consultá en el mostrador.'
            : `No pudimos consultar ese código. ${e instanceof Error ? e.message : ''}`.trim(),
      });
    } finally {
      setBuscando(false);
    }
  };

  const abrir = (escaneado: Escaneado) => {
    const codigo = escaneado.producto.codigo;
    if (codigo) router.push({ pathname: '/producto/[codigo]', params: { codigo: String(codigo) } });
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera
        titulo="Escanear productos"
        derecha={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
            <Text style={estilos.textoSuave}>Cámara de adelante</Text>
            <Switch value={frontal} onValueChange={setFrontal} trackColor={{ true: colores.mag }} />
            <Boton
              texto="Volver"
              icono="arrow-back"
              variante="secundario"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
            />
          </View>
        }
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <CamaraLectora
            tipos={['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39']}
            indicacion={buscando ? 'Buscando…' : 'Mostrá los productos uno atrás de otro'}
            onLeido={leer}
            pausada={buscando}
            frontal={frontal}
          />
          {resultado ? <CartelResultado resultado={resultado} /> : null}
        </View>
        <ListaEscaneados escaneados={escaneados} onAbrir={abrir} onVaciar={vaciarEscaneados} />
      </View>
    </View>
  );
}

function CartelResultado({ resultado }: { resultado: Resultado }) {
  const aviso = resultado.tipo === 'aviso';
  return (
    <View
      pointerEvents="none"
      style={[estilosEscaner.cartel, { backgroundColor: aviso ? colores.avisoSuave : colores.haySuave }]}
    >
      <Ionicons
        name={aviso ? 'alert-circle-outline' : resultado.tipo === 'repetido' ? 'arrow-up-circle-outline' : 'checkmark-circle'}
        size={30}
        color={aviso ? colores.aviso : colores.hay}
      />
      <Text style={[estilos.texto, { flex: 1, color: aviso ? colores.aviso : colores.texto, fontWeight: '700' }]} numberOfLines={2}>
        {resultado.texto}
      </Text>
    </View>
  );
}

function ListaEscaneados({
  escaneados,
  onAbrir,
  onVaciar,
}: {
  escaneados: Escaneado[];
  onAbrir: (escaneado: Escaneado) => void;
  onVaciar: () => void;
}) {
  return (
    <View style={estilosEscaner.panel}>
      <View style={estilosEscaner.panelCabecera}>
        <Text style={estilosEscaner.panelTitulo}>
          Escaneados{escaneados.length ? ` (${escaneados.length})` : ''}
        </Text>
        {escaneados.length ? (
          <Pressable onPress={onVaciar} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={estilosEscaner.vaciar}>Vaciar</Text>
          </Pressable>
        ) : null}
      </View>
      {escaneados.length ? (
        <>
          <Text style={[estilos.textoSuave, { fontSize: letra.chica, paddingHorizontal: espacio.m }]}>
            Tocá uno para ver su ficha.
          </Text>
          <FlatList
            data={escaneados}
            keyExtractor={(e) => e.codigoBarras}
            contentContainerStyle={{ padding: espacio.m, gap: espacio.s }}
            renderItem={({ item, index }) => <FilaEscaneado escaneado={item} ultimo={index === 0} onPress={() => onAbrir(item)} />}
          />
        </>
      ) : (
        <View style={[estilos.centro, { backgroundColor: 'transparent' }]}>
          <Ionicons name="barcode-outline" size={56} color={colores.textoTenue} />
          <Text style={[estilos.textoSuave, { textAlign: 'center', marginTop: espacio.m }]}>
            Lo que escanees va a ir quedando acá.
          </Text>
        </View>
      )}
    </View>
  );
}

function FilaEscaneado({ escaneado, ultimo, onPress }: { escaneado: Escaneado; ultimo: boolean; onPress: () => void }) {
  const { producto } = escaneado;
  const tieneFicha = Boolean(producto.codigo);
  return (
    <Pressable
      onPress={onPress}
      disabled={!tieneFicha}
      style={({ pressed }) => [
        estilosEscaner.fila,
        ultimo && { borderColor: colores.magClaro },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={{ width: 76 }}>
        <FotoProducto url={producto.imagen_url} alto={76} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={estilosEscaner.filaNombre} numberOfLines={2}>
          {producto.nombre}
        </Text>
        {tieneFicha ? (
          <>
            <Text style={estilosEscaner.filaPrecio}>{precioProducto(producto)}</Text>
            <EtiquetaStock hay={producto.hay_stock} />
          </>
        ) : (
          <Text style={[estilos.textoSuave, { fontSize: letra.chica }]}>Consultá el precio en el mostrador</Text>
        )}
      </View>
      {tieneFicha ? <Ionicons name="chevron-forward" size={26} color={colores.textoSuave} /> : null}
    </Pressable>
  );
}

const estilosEscaner = StyleSheet.create({
  cartel: {
    position: 'absolute',
    left: espacio.l,
    right: espacio.l,
    bottom: espacio.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.l,
    borderRadius: radio.m,
  },
  panel: {
    width: 400,
    backgroundColor: colores.superficie,
    borderLeftWidth: 1,
    borderLeftColor: colores.borde,
  },
  panelCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.m,
    paddingTop: espacio.m,
    paddingBottom: espacio.xs,
  },
  panelTitulo: { color: colores.texto, fontSize: letra.grande, fontWeight: '800' },
  vaciar: { color: colores.magClaro, fontSize: letra.normal, fontWeight: '700' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.s,
    borderRadius: radio.m,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colores.superficieAlta,
  },
  filaNombre: { color: colores.texto, fontSize: letra.chica + 1, fontWeight: '700' },
  filaPrecio: { color: colores.texto, fontSize: letra.normal, fontWeight: '800' },
});

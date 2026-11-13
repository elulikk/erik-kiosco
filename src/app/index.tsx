// Pantalla de espera: es a donde vuelve la tablet sola cuando nadie la toca. Promos rotando y «Tocá para empezar».
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Promo } from '@/lib/api';
import { useKiosco } from '@/lib/kiosco';
import { precioProducto } from '@/lib/formato';
import { EtiquetaStock, FotoProducto, LOGO_ERIK, LOGO_MAG } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const SEGUNDOS_POR_PROMO = 7;
const MINUTOS_PROMOS = 5;

function TarjetaPromo({ promo }: { promo: Promo }) {
  const router = useRouter();
  const p = promo.producto;
  return (
    <Pressable
      style={estilosEspera.promo}
      onPress={() =>
        p?.codigo
          ? router.push({ pathname: '/producto/[codigo]', params: { codigo: String(p.codigo) } })
          : router.push('/inicio')
      }
    >
      {p ? (
        <View style={{ width: '42%' }}>
          <FotoProducto url={p.imagen_url} alto={240} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: espacio.m, justifyContent: 'center' }}>
        {promo.texto ? <Text style={estilosEspera.promoTexto}>{promo.texto}</Text> : null}
        {p ? (
          <>
            <Text style={estilosEspera.promoNombre} numberOfLines={3}>
              {p.nombre}
            </Text>
            <Text style={estilosEspera.promoPrecio}>{precioProducto(p)}</Text>
            <EtiquetaStock hay={p.hay_stock} />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function Espera() {
  const router = useRouter();
  const { cliente } = useKiosco();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!cliente) return;
    const cargar = () =>
      cliente
        .promos()
        .then((r) => setPromos(r.promos))
        .catch((e) => console.warn('[espera] No se pudieron leer las promos', e));
    cargar();
    const reloj = setInterval(cargar, MINUTOS_PROMOS * 60_000);
    return () => clearInterval(reloj);
  }, [cliente]);

  useEffect(() => {
    if (promos.length < 2) return;
    const reloj = setInterval(() => setIndice((i) => (i + 1) % promos.length), SEGUNDOS_POR_PROMO * 1000);
    return () => clearInterval(reloj);
  }, [promos.length]);

  const promo = promos.length ? promos[indice % promos.length] : null;

  return (
    <Pressable style={estilosEspera.pantalla} onPress={() => router.push('/inicio')}>
      <View style={estilosEspera.izquierda}>
        <Image source={LOGO_MAG} style={{ width: 240, height: 78 }} contentFit="contain" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.l }}>
          <Image source={LOGO_ERIK} style={{ width: 96, height: 96 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={estilosEspera.hola}>Hola, soy ERIK</Text>
            <Text style={estilosEspera.subtitulo}>
              Mientras esperás, buscá productos, mirá precios o preguntame lo que necesites.
            </Text>
          </View>
        </View>
        <View style={estilosEspera.toca}>
          <Ionicons name="hand-left-outline" size={36} color={colores.texto} />
          <Text style={estilosEspera.tocaTexto}>Tocá la pantalla para empezar</Text>
        </View>
      </View>
      {promo ? (
        <View style={estilosEspera.derecha}>
          <TarjetaPromo promo={promo} />
          {promos.length > 1 ? (
            <View style={estilosEspera.puntos}>
              {promos.map((p, i) => (
                <View key={p.id} style={[estilosEspera.punto, i === indice % promos.length && { backgroundColor: colores.erik }]} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        // Sin promos cargadas en ERIK: lo que se puede hacer en la tablet
        <View style={[estilosEspera.derecha, { gap: espacio.m }]}>
          {QUE_SE_PUEDE.map((q) => (
            <View key={q.titulo} style={[estilosEspera.queSePuede, { borderLeftColor: q.color }]}>
              <Ionicons name={q.icono} size={44} color={q.color} />
              <View style={{ flex: 1 }}>
                <Text style={estilosEspera.queTitulo}>{q.titulo}</Text>
                <Text style={estilosEspera.queDetalle}>{q.detalle}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const QUE_SE_PUEDE = [
  { icono: 'chatbubble-ellipses-outline', color: colores.erik, titulo: 'Preguntale a ERIK', detalle: '«¿Tienen cargadores para Samsung?»' },
  { icono: 'grid-outline', color: colores.mag, titulo: 'Mirá el catálogo', detalle: 'Por rubro, con foto y precio.' },
  { icono: 'barcode-outline', color: colores.hay, titulo: 'Escaneá un producto', detalle: 'Y mirá cuánto sale al instante.' },
] as const;

const estilosEspera = StyleSheet.create({
  pantalla: { flex: 1, flexDirection: 'row', backgroundColor: colores.fondo, padding: espacio.xl, gap: espacio.xl },
  izquierda: { flex: 1.15, justifyContent: 'space-between', paddingVertical: espacio.s, gap: espacio.l },
  derecha: { flex: 1, justifyContent: 'center', gap: espacio.l },
  hola: { color: colores.texto, fontSize: letra.titulo + 6, fontWeight: '800' },
  subtitulo: { color: colores.textoSuave, fontSize: letra.normal + 2, lineHeight: (letra.normal + 2) * 1.35 },
  toca: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espacio.m,
    backgroundColor: colores.mag,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.l,
    borderRadius: radio.xl,
  },
  tocaTexto: { color: colores.texto, fontSize: letra.grande, fontWeight: '800' },
  promo: {
    flexDirection: 'row',
    gap: espacio.xl,
    backgroundColor: colores.superficie,
    borderRadius: radio.l,
    padding: espacio.xl,
    borderWidth: 2,
    borderColor: colores.borde,
    borderLeftColor: colores.erik,
    borderLeftWidth: 6,
  },
  promoTexto: { color: colores.erik, fontSize: letra.grande, fontWeight: '800' },
  promoNombre: { color: colores.texto, fontSize: letra.grande, fontWeight: '600' },
  promoPrecio: { color: colores.texto, fontSize: letra.titulo + 6, fontWeight: '800' },
  queSePuede: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.l,
    backgroundColor: colores.superficie,
    borderRadius: radio.m,
    padding: espacio.l,
    borderLeftWidth: 6,
  },
  queTitulo: { color: colores.texto, fontSize: letra.grande, fontWeight: '800' },
  queDetalle: { color: colores.textoSuave, fontSize: letra.normal },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: espacio.s },
  punto: { width: 12, height: 12, borderRadius: 6, backgroundColor: colores.borde },
});

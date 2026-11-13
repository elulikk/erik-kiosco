// Ajustes del personal (se abren manteniendo apretado el logo de MAG 3 segundos). Piden un PIN que se elige
// la primera vez: así un cliente no puede desvincular la tablet.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKiosco } from '@/lib/kiosco';
import { Boton, Cabecera, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const LARGO_PIN = 4;
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function Teclado({ titulo, detalle, error, onCompleto }: {
  titulo: string;
  detalle?: string;
  error?: string | null;
  onCompleto: (pin: string) => void;
}) {
  const [digitos, setDigitos] = useState('');
  const tocar = (tecla: string) => {
    if (tecla === '⌫') return setDigitos((d) => d.slice(0, -1));
    if (!tecla) return;
    const nuevo = (digitos + tecla).slice(0, LARGO_PIN);
    setDigitos(nuevo);
    if (nuevo.length === LARGO_PIN) {
      onCompleto(nuevo);
      setDigitos('');
    }
  };
  return (
    <View style={{ alignItems: 'center', gap: espacio.l }}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {detalle ? <Text style={estilos.textoSuave}>{detalle}</Text> : null}
      <View style={{ flexDirection: 'row', gap: espacio.m }}>
        {Array.from({ length: LARGO_PIN }, (_, i) => (
          <View key={i} style={[estilosAjustes.punto, i < digitos.length && { backgroundColor: colores.texto }]} />
        ))}
      </View>
      {error ? <Text style={[estilos.texto, { color: colores.peligro }]}>{error}</Text> : null}
      <View style={estilosAjustes.teclado}>
        {TECLAS.map((t, i) => (
          <Pressable
            key={i}
            onPress={() => tocar(t)}
            disabled={!t}
            style={({ pressed }) => [estilosAjustes.tecla, !t && { opacity: 0 }, pressed && { backgroundColor: colores.borde }]}
          >
            <Text style={estilosAjustes.teclaTexto}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: espacio.m }}>
      <Text style={[estilos.textoSuave, { width: 200 }]}>{etiqueta}</Text>
      <Text style={[estilos.texto, { flex: 1 }]}>{valor}</Text>
    </View>
  );
}

export default function Ajustes() {
  const router = useRouter();
  const { pin, guardarPin, conexion, cliente, estado, vinculo, reconectar, desvincular } = useKiosco();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinNuevo, setPinNuevo] = useState<string | null>(null);
  const [cambiandoPin, setCambiandoPin] = useState(false);

  const salir = () => router.replace('/');

  const cabecera = <Cabecera titulo="Ajustes de la tablet" derecha={<Boton texto="Volver al kiosco" icono="arrow-back" variante="secundario" onPress={salir} />} />;

  // Primera vez (o cambio): elegir el PIN dos veces
  if (!pin || cambiandoPin) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <View style={estilos.centro}>
          <Teclado
            titulo={pinNuevo ? 'Repetí el PIN' : 'Elegí un PIN para el personal'}
            detalle={`${LARGO_PIN} números. Se pide para entrar a estos ajustes.`}
            error={error}
            onCompleto={async (p) => {
              if (!pinNuevo) {
                setPinNuevo(p);
                setError(null);
                return;
              }
              if (p !== pinNuevo) {
                setPinNuevo(null);
                setError('No coinciden. Empezá de nuevo.');
                return;
              }
              await guardarPin(p);
              setPinNuevo(null);
              setCambiandoPin(false);
              setAbierto(true);
              setError(null);
            }}
          />
        </View>
      </View>
    );
  }

  if (!abierto) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <View style={estilos.centro}>
          <Teclado
            titulo="PIN del personal"
            error={error}
            onCompleto={(p) => {
              if (p === pin) {
                setAbierto(true);
                setError(null);
              } else setError('PIN incorrecto.');
            }}
          />
        </View>
      </View>
    );
  }

  const textoConexion = {
    cargando: 'Leyendo…',
    'sin-vinculo': 'Sin vincular',
    conectando: 'Conectando…',
    conectado: 'Conectada',
    'sin-conexion': 'Sin conexión',
    rechazado: 'ERIK no reconoce esta tablet (volvé a vincularla)',
  }[conexion];

  return (
    <View style={estilos.pantalla}>
      {cabecera}
      <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.l, maxWidth: 1000 }}>
        <View style={estilosAjustes.bloque}>
          <Text style={estilosAjustes.titulo}>Conexión con ERIK</Text>
          <Fila etiqueta="Estado" valor={textoConexion} />
          <Fila etiqueta="Conectada a" valor={cliente?.base ?? '—'} />
          <Fila etiqueta="Wifi del local" valor={vinculo?.local.join(', ') || '—'} />
          <Fila etiqueta="Túnel" valor={vinculo?.tunel ?? 'sin túnel'} />
          <Fila etiqueta="En pausa desde ERIK" valor={estado ? (estado.activo ? 'No' : 'Sí') : '—'} />
          <View style={{ flexDirection: 'row', gap: espacio.m, marginTop: espacio.s }}>
            <Boton texto="Reconectar" icono="refresh" variante="secundario" onPress={reconectar} />
            <Boton texto="Volver a vincular" icono="qr-code-outline" variante="secundario" onPress={() => router.replace('/vincular')} />
          </View>
        </View>

        <View style={estilosAjustes.bloque}>
          <Text style={estilosAjustes.titulo}>Modo kiosco</Text>
          <Text style={estilos.textoSuave}>
            Para que nadie salga de la app, usá «Fijar pantalla» de Android (Ajustes → Seguridad → Fijar apps). Para
            desfijarla, mantené apretados Atrás y Recientes, o deslizá según el modelo de la tablet.
          </Text>
          <View style={{ flexDirection: 'row', gap: espacio.m }}>
            <Boton texto="Cambiar PIN" icono="keypad-outline" variante="secundario" onPress={() => setCambiandoPin(true)} />
            <Boton
              texto="Desvincular"
              icono="unlink-outline"
              variante="fantasma"
              onPress={async () => {
                await desvincular();
                router.replace('/vincular');
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.s }}>
          <Ionicons name="information-circle-outline" size={22} color={colores.textoTenue} />
          <Text style={{ color: colores.textoTenue, fontSize: letra.chica }}>
            ERIK Kiosco · API de ERIK {estado?.version ?? '—'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const estilosAjustes = StyleSheet.create({
  punto: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colores.texto },
  teclado: { width: 3 * 100 + 2 * espacio.m, flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m },
  tecla: {
    width: 100,
    height: 76,
    borderRadius: radio.m,
    backgroundColor: colores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaTexto: { color: colores.texto, fontSize: letra.titulo, fontWeight: '700' },
  bloque: { backgroundColor: colores.superficie, borderRadius: radio.m, padding: espacio.l, gap: espacio.m },
  titulo: { color: colores.texto, fontSize: letra.grande, fontWeight: '800' },
});

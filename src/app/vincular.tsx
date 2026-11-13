// Vincular la tablet con ERIK: se escanea el QR de la pestaña «Tablet» (IP del wifi, túnel y token).
// En la web (para probar) no hay escáner: se pega el texto del QR.
import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKiosco } from '@/lib/kiosco';
import { CamaraLectora } from '@/componentes/camara';
import { Boton, Cabecera, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

export default function Vincular() {
  const router = useRouter();
  const { vincular, vinculo } = useKiosco();
  const [error, setError] = useState<string | null>(null);
  const [pegado, setPegado] = useState('');
  const [listo, setListo] = useState(false);

  const usar = async (texto: string) => {
    if (listo) return;
    const problema = await vincular(texto);
    if (problema) {
      setError(problema);
      return;
    }
    setListo(true);
    router.replace('/');
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera
        titulo="Vincular con ERIK"
        derecha={
          vinculo ? (
            <Boton texto="Cancelar" icono="close" variante="secundario" onPress={() => router.replace('/ajustes')} />
          ) : null
        }
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, padding: espacio.xl, gap: espacio.l, justifyContent: 'center' }}>
          <Text style={estilos.titulo}>Escaneá el QR de ERIK</Text>
          <Text style={estilos.textoSuave}>
            En la PC del local: ERIK → pestaña «Tablet» → «Vincular la tablet». La tablet tiene que estar en el mismo wifi
            que la PC (o con el túnel configurado).
          </Text>
          {error ? <Text style={[estilos.texto, { color: colores.peligro }]}>{error}</Text> : null}
          {Platform.OS === 'web' ? (
            <View style={{ gap: espacio.s }}>
              <Text style={estilos.textoSuave}>Sin cámara: pegá acá el texto del QR.</Text>
              <TextInput
                value={pegado}
                onChangeText={setPegado}
                multiline
                placeholder='{"app":"erik-kiosco",...}'
                placeholderTextColor={colores.textoTenue}
                style={{
                  color: colores.texto,
                  fontSize: letra.chica,
                  minHeight: 120,
                  backgroundColor: colores.superficie,
                  borderRadius: radio.m,
                  padding: espacio.m,
                  borderWidth: 1,
                  borderColor: colores.borde,
                }}
              />
              <Boton texto="Vincular" onPress={() => usar(pegado)} deshabilitado={!pegado.trim()} />
            </View>
          ) : null}
        </View>
        {Platform.OS !== 'web' ? (
          <View style={{ flex: 1 }}>
            <CamaraLectora tipos={['qr']} indicacion="Apuntá al QR de ERIK" onLeido={usar} pausada={listo} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

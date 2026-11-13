// Vincular la tablet con ERIK: se escanea el QR de la pestaña «Tablet» (IP del wifi, túnel y token).
// Si la cámara no puede (o en la web, para probar), se pega el código que copia «Copiar código» en ERIK.
import { useState } from 'react';
import { Platform, Switch, Text, TextInput, View } from 'react-native';
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
  const [aMano, setAMano] = useState(Platform.OS === 'web');
  // Con la tablet parada frente a la pantalla de la PC suele ser más cómoda la cámara de adelante
  const [frontal, setFrontal] = useState(false);

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
          {Platform.OS !== 'web' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
              <Text style={estilos.textoSuave}>Cámara de adelante</Text>
              <Switch value={frontal} onValueChange={setFrontal} trackColor={{ true: colores.mag }} />
            </View>
          ) : null}
          {aMano ? (
            <View style={{ gap: espacio.s }}>
              <Text style={estilos.textoSuave}>Pegá el código que copia «Copiar código» en la pestaña «Tablet» de ERIK.</Text>
              <TextInput
                value={pegado}
                onChangeText={setPegado}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
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
          ) : (
            <Boton texto="Escribir el código a mano" icono="create-outline" variante="fantasma" onPress={() => setAMano(true)} />
          )}
        </View>
        {Platform.OS !== 'web' ? (
          <View style={{ flex: 1 }}>
            <CamaraLectora tipos={['qr']} indicacion="Apuntá al QR de ERIK" onLeido={usar} pausada={listo} frontal={frontal} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

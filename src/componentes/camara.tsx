// Cámara que lee un código (de barras o QR) y avisa una sola vez por lectura.
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { Aviso, Boton, Cargando } from './ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

export function CamaraLectora({
  tipos,
  indicacion,
  onLeido,
  pausada = false,
  frontal = false,
}: {
  tipos: BarcodeType[];
  indicacion: string;
  onLeido: (dato: string) => void;
  pausada?: boolean;
  frontal?: boolean;
}) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const ultimo = useRef<{ dato: string; cuando: number } | null>(null);

  if (!permiso) return <Cargando />;
  if (!permiso.granted) {
    return (
      <Aviso
        icono="camera-outline"
        titulo="Hace falta la cámara"
        detalle="Para leer el código hay que permitir el uso de la cámara."
        accion={<Boton texto="Permitir la cámara" onPress={pedirPermiso} />}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={frontal ? 'front' : 'back'}
        barcodeScannerSettings={{ barcodeTypes: tipos }}
        onBarcodeScanned={
          pausada
            ? undefined
            : ({ data }) => {
                // La cámara dispara la lectura varias veces por segundo: el mismo código se toma una vez cada 3 s
                const ahora = Date.now();
                if (!data || (ultimo.current?.dato === data && ahora - ultimo.current.cuando < 3000)) return;
                ultimo.current = { dato: data, cuando: ahora };
                onLeido(data);
              }
        }
      />
      <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={estilosCamara.marco} />
        <Text style={estilosCamara.indicacion}>{indicacion}</Text>
      </View>
    </View>
  );
}

const estilosCamara = StyleSheet.create({
  marco: { width: '50%', aspectRatio: 1.8, borderWidth: 4, borderColor: colores.erik, borderRadius: radio.l },
  indicacion: {
    color: colores.texto,
    fontSize: letra.grande,
    fontWeight: '700',
    marginTop: espacio.l,
    backgroundColor: '#000b',
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s,
    borderRadius: radio.s,
  },
});

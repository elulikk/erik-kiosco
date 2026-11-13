// Escáner: el cliente apunta el código de barras del producto y va directo a su ficha.
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ErrorApi } from '@/lib/api';
import { useKiosco } from '@/lib/kiosco';
import { CamaraLectora } from '@/componentes/camara';
import { Boton, Cabecera, estilos } from '@/componentes/ui';
import { colores, espacio } from '@/lib/tema';

export default function Escaner() {
  const router = useRouter();
  const { cliente } = useKiosco();
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // En una tablet apoyada en el mostrador muchas veces es más cómodo mostrarle el producto a la cámara de adelante
  const [frontal, setFrontal] = useState(false);

  const leer = async (codigo: string) => {
    if (!cliente || buscando) return;
    setBuscando(true);
    setAviso(null);
    try {
      const ficha = await cliente.codigoBarras(codigo);
      if (ficha.codigo) {
        router.replace({ pathname: '/producto/[codigo]', params: { codigo: String(ficha.codigo) } });
        return;
      }
      setAviso(`${ficha.nombre}: consultá el precio en el mostrador.`);
    } catch (e) {
      setAviso(
        e instanceof ErrorApi && e.estado === 404
          ? 'No encontramos ese código. Probá de nuevo o consultá en el mostrador.'
          : e instanceof Error
            ? e.message
            : 'No pudimos leer ese código.',
      );
    } finally {
      setBuscando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera
        titulo="Escanear un producto"
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
      <CamaraLectora
        tipos={['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39']}
        indicacion={buscando ? 'Buscando…' : 'Apuntá al código de barras del producto'}
        onLeido={leer}
        pausada={buscando}
        frontal={frontal}
      />
      {aviso ? (
        <View style={{ padding: espacio.l, backgroundColor: colores.avisoSuave }}>
          <Text style={[estilos.texto, { color: colores.aviso, textAlign: 'center' }]}>{aviso}</Text>
        </View>
      ) : null}
    </View>
  );
}

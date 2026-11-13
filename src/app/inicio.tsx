// Inicio: las tres cosas que se pueden hacer, más un buscador y los rubros que se eligen en ERIK.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useKiosco } from '@/lib/kiosco';
import { Boton, Cabecera, Chip, LOGO_ERIK, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';
import type { ComponentProps } from 'react';

type Icono = ComponentProps<typeof Ionicons>['name'];

function Opcion({ titulo, detalle, icono, logo, onPress, color }: {
  titulo: string;
  detalle: string;
  icono?: Icono;
  logo?: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilosInicio.opcion, { borderTopColor: color }, pressed && { opacity: 0.8 }]}>
      {logo ? (
        <Image source={LOGO_ERIK} style={{ width: 84, height: 84 }} contentFit="contain" />
      ) : (
        <Ionicons name={icono!} size={72} color={color} />
      )}
      <Text style={estilosInicio.opcionTitulo}>{titulo}</Text>
      <Text style={estilosInicio.opcionDetalle}>{detalle}</Text>
    </Pressable>
  );
}

export default function Inicio() {
  const router = useRouter();
  const { estado, reiniciar } = useKiosco();
  const [busqueda, setBusqueda] = useState('');

  const buscar = (q: string) => {
    const limpia = q.trim();
    if (limpia) router.push({ pathname: '/catalogo', params: { q: limpia } });
  };

  return (
    <View style={estilos.pantalla}>
      <Cabecera derecha={<Boton texto="Terminar" icono="close" variante="fantasma" onPress={reiniciar} />} />
      <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: espacio.l }}>
          <Opcion
            logo
            titulo="Preguntale a ERIK"
            detalle="Contale qué necesitás y te muestra lo que tenemos."
            color={colores.erik}
            onPress={() => router.push('/chat')}
          />
          <Opcion
            icono="grid-outline"
            titulo="Ver productos"
            detalle="Recorré el catálogo por rubro, con precio y foto."
            color={colores.mag}
            onPress={() => router.push({ pathname: '/catalogo', params: { q: estado?.rubros?.[0] ?? '' } })}
          />
          <Opcion
            icono="barcode-outline"
            titulo="Escanear un producto"
            detalle="Apuntá el código de barras a la cámara y mirá el precio."
            color={colores.hay}
            onPress={() => router.push('/escaner')}
          />
        </View>

        <View style={estilosInicio.buscador}>
          <Ionicons name="search" size={30} color={colores.textoSuave} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={() => buscar(busqueda)}
            placeholder="¿Qué estás buscando? Ej: cargador para Samsung"
            placeholderTextColor={colores.textoTenue}
            returnKeyType="search"
            style={estilosInicio.buscadorTexto}
          />
          <Boton texto="Buscar" onPress={() => buscar(busqueda)} deshabilitado={!busqueda.trim()} />
        </View>

        {estado?.rubros?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
            {estado.rubros.map((r) => (
              <Chip key={r} texto={r} onPress={() => buscar(r)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const estilosInicio = StyleSheet.create({
  opcion: {
    flex: 1,
    alignItems: 'center',
    gap: espacio.m,
    backgroundColor: colores.superficie,
    borderRadius: radio.l,
    paddingVertical: espacio.xl,
    paddingHorizontal: espacio.l,
    borderWidth: 1,
    borderColor: colores.borde,
    borderTopWidth: 6,
  },
  opcionTitulo: { color: colores.texto, fontSize: letra.grande, fontWeight: '800', textAlign: 'center' },
  opcionDetalle: { color: colores.textoSuave, fontSize: letra.chica + 1, textAlign: 'center', lineHeight: 24 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    backgroundColor: colores.superficie,
    borderRadius: radio.l,
    paddingLeft: espacio.l,
    paddingRight: espacio.s,
    paddingVertical: espacio.s,
    borderWidth: 2,
    borderColor: colores.borde,
  },
  buscadorTexto: { flex: 1, color: colores.texto, fontSize: letra.grande, paddingVertical: espacio.s },
});

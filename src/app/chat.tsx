// Charla con ERIK: igual que el WhatsApp, pero los productos aparecen como tarjetas tocables.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Mensaje } from '@/lib/api';
import { useKiosco } from '@/lib/kiosco';
import { Boton, Cabecera, Chip, LOGO_ERIK, TarjetaProducto, TextoConNegrita, estilos } from '@/componentes/ui';
import { colores, espacio, letra, radio } from '@/lib/tema';

const SUGERENCIAS = [
  '¿Tienen cargadores para Samsung?',
  'Busco una notebook para estudiar',
  'Necesito un mouse inalámbrico',
  '¿Hasta qué hora abren hoy?',
];

function Burbuja({ m }: { m: Mensaje }) {
  if (m.rol === 'cliente') {
    return (
      <View style={[estilosChat.burbuja, estilosChat.cliente]}>
        <Text style={estilos.texto}>{m.texto}</Text>
      </View>
    );
  }
  const vendedor = m.rol === 'vendedor';
  return (
    <View style={{ alignSelf: 'stretch', gap: espacio.s }}>
      <View style={{ flexDirection: 'row', gap: espacio.s, alignItems: 'flex-start' }}>
        {vendedor ? (
          <View style={estilosChat.avatarVendedor}>
            <Ionicons name="person" size={26} color={colores.hay} />
          </View>
        ) : (
          <Image source={LOGO_ERIK} style={{ width: 44, height: 44 }} contentFit="contain" />
        )}
        <View style={[estilosChat.burbuja, vendedor ? estilosChat.vendedor : estilosChat.erik]}>
          {vendedor ? <Text style={estilosChat.autor}>Vendedor del local</Text> : null}
          {m.texto ? <TextoConNegrita texto={m.texto} /> : null}
        </View>
      </View>
      {m.productos.length ? (
        <ScrollView horizontal contentContainerStyle={{ gap: espacio.m, paddingLeft: 52 }} showsHorizontalScrollIndicator={false}>
          {m.productos.map((p, i) => (
            <TarjetaProducto key={`${p.codigo}-${i}`} producto={p} ancho={220} compacta />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function Chat() {
  const router = useRouter();
  const { pregunta } = useLocalSearchParams<{ pregunta?: string }>();
  const { mensajes, pensando, atiendePersona, enviarMensaje, registrarActividad, reiniciar } = useKiosco();
  const [texto, setTexto] = useState('');
  const lista = useRef<ScrollViewInstance>(null);
  const preguntaEnviada = useRef<string | null>(null);

  // Desde una ficha: «Preguntarle a ERIK por este producto» llega con la pregunta armada
  useEffect(() => {
    if (pregunta && preguntaEnviada.current !== pregunta) {
      preguntaEnviada.current = pregunta;
      enviarMensaje(pregunta);
    }
  }, [pregunta, enviarMensaje]);

  const enviar = (valor: string) => {
    if (!valor.trim() || pensando) return;
    setTexto('');
    enviarMensaje(valor);
  };

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Cabecera
        titulo="Charlá con ERIK"
        derecha={
          <View style={{ flexDirection: 'row', gap: espacio.s }}>
            <Boton texto="Productos" icono="grid-outline" variante="secundario" onPress={() => router.push('/catalogo')} />
            <Boton texto="Terminar" icono="close" variante="fantasma" onPress={reiniciar} />
          </View>
        }
      />
      {atiendePersona ? (
        <View style={estilosChat.banda}>
          <Ionicons name="person-circle-outline" size={28} color={colores.hay} />
          <Text style={[estilos.texto, { color: colores.hay, fontWeight: '700' }]}>Te atiende un vendedor del local</Text>
        </View>
      ) : null}
      <ScrollView
        ref={lista}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: espacio.xl, gap: espacio.l }}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {mensajes.length === 0 ? (
          <View style={{ alignItems: 'center', gap: espacio.l, paddingVertical: espacio.xl }}>
            <Image source={LOGO_ERIK} style={{ width: 120, height: 120 }} contentFit="contain" />
            <Text style={[estilos.titulo, { textAlign: 'center' }]}>¿En qué te ayudo?</Text>
            <Text style={[estilos.textoSuave, { textAlign: 'center' }]}>
              Escribime qué estás buscando, o tocá una de estas:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, justifyContent: 'center' }}>
              {SUGERENCIAS.map((s) => (
                <Chip key={s} texto={s} onPress={() => enviar(s)} />
              ))}
            </View>
          </View>
        ) : (
          mensajes.map((m) => <Burbuja key={m.clave} m={m} />)
        )}
        {pensando ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m }}>
            <Image source={LOGO_ERIK} style={{ width: 44, height: 44 }} contentFit="contain" />
            <View style={[estilosChat.burbuja, estilosChat.erik, { flexDirection: 'row', gap: espacio.s }]}>
              <ActivityIndicator color={colores.textoSuave} />
              <Text style={estilos.textoSuave}>{atiendePersona ? 'Enviando…' : 'ERIK está buscando…'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View style={estilosChat.entrada}>
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            registrarActividad();
          }}
          onSubmitEditing={() => enviar(texto)}
          placeholder="Escribí tu consulta…"
          placeholderTextColor={colores.textoTenue}
          returnKeyType="send"
          maxLength={2000}
          style={estilosChat.entradaTexto}
        />
        <Boton texto="Enviar" icono="send" onPress={() => enviar(texto)} deshabilitado={!texto.trim() || pensando} grande />
      </View>
    </KeyboardAvoidingView>
  );
}

const estilosChat = StyleSheet.create({
  burbuja: { paddingHorizontal: espacio.l, paddingVertical: espacio.m, borderRadius: radio.m, maxWidth: '78%' },
  cliente: { alignSelf: 'flex-end', backgroundColor: colores.burbujaCliente, borderBottomRightRadius: 4 },
  erik: { backgroundColor: colores.burbujaErik, borderTopLeftRadius: 4, flexShrink: 1 },
  vendedor: { backgroundColor: colores.burbujaVendedor, borderTopLeftRadius: 4, flexShrink: 1 },
  autor: { color: colores.hay, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  avatarVendedor: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.haySuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    backgroundColor: colores.haySuave,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.s,
  },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    paddingHorizontal: espacio.xl,
    backgroundColor: colores.superficie,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  entradaTexto: {
    flex: 1,
    color: colores.texto,
    fontSize: letra.grande,
    backgroundColor: colores.fondo,
    borderRadius: radio.m,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.m,
    borderWidth: 2,
    borderColor: colores.borde,
  },
});

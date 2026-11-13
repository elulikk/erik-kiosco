import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import { Image } from 'expo-image';
import { ProveedorKiosco, useKiosco } from '@/lib/kiosco';
import { Aviso, Boton, Cargando, LOGO_ERIK, LOGO_MAG, estilos } from '@/componentes/ui';
import { colores, espacio, letra } from '@/lib/tema';

// Pantallas que usa el personal: ahí no se tapan con la pausa ni con «sin conexión»
const RUTAS_DEL_PERSONAL = ['/ajustes', '/vincular'];

function LogoQueAbreAjustes() {
  const router = useRouter();
  return (
    <Pressable onLongPress={() => router.push('/ajustes')} delayLongPress={3000} hitSlop={20}>
      <Image source={LOGO_MAG} style={{ width: 260, height: 85 }} contentFit="contain" />
    </Pressable>
  );
}

function Tapa() {
  const { conexion, estado, reconectar } = useKiosco();
  const ruta = usePathname();
  const router = useRouter();
  const delPersonal = RUTAS_DEL_PERSONAL.some((r) => ruta.startsWith(r));

  // Sin vincular todavía: directo a escanear el QR de ERIK
  useEffect(() => {
    if (conexion === 'sin-vinculo' && !delPersonal) router.replace('/vincular');
  }, [conexion, delPersonal, router]);

  if (delPersonal) return null;
  if (conexion === 'cargando' || conexion === 'sin-vinculo') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Cargando />
      </View>
    );
  }
  if (conexion === 'conectando' && !estado) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Cargando texto="Conectando con el local…" />
      </View>
    );
  }
  if (conexion === 'rechazado') {
    return (
      <View style={[StyleSheet.absoluteFill, estilos.centro]}>
        <LogoQueAbreAjustes />
        <Aviso icono="key-outline" titulo="Esta tablet no está vinculada" detalle="Pedile a alguien del local que la vuelva a vincular desde ERIK." />
      </View>
    );
  }
  if (conexion === 'sin-conexion') {
    return (
      <View style={[StyleSheet.absoluteFill, estilos.centro]}>
        <LogoQueAbreAjustes />
        <Aviso
          icono="cloud-offline-outline"
          titulo="Sin conexión con el local"
          detalle="Estamos reconectando. Mientras tanto, consultá en el mostrador."
          accion={<Boton texto="Probar de nuevo" icono="refresh" variante="secundario" onPress={reconectar} />}
        />
      </View>
    );
  }
  if (estado && !estado.activo) {
    return (
      <View style={[StyleSheet.absoluteFill, estilos.centro, { gap: espacio.xl }]}>
        <LogoQueAbreAjustes />
        <Image source={LOGO_ERIK} style={{ width: 140, height: 140 }} contentFit="contain" />
        <Text style={{ color: colores.texto, fontSize: letra.titulo, fontWeight: '700', textAlign: 'center', maxWidth: 800 }}>
          {estado.texto_pausa}
        </Text>
      </View>
    );
  }
  return null;
}

function Contenido() {
  const { registrarActividad } = useKiosco();
  return (
    // Cualquier toque cuenta como actividad (el reinicio por inactividad lo usa)
    <View style={{ flex: 1, backgroundColor: colores.fondo }} onTouchStart={registrarActividad}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo }, animation: 'fade' }}
      />
      <Tapa />
    </View>
  );
}

export default function Raiz() {
  useEffect(() => {
    if (Platform.OS !== 'android') return; // en la web (solo para probar) no hace falta
    // La tablet está siempre a la vista: la pantalla no se apaga y no se ven las barras del sistema
    activateKeepAwakeAsync('erik-kiosco').catch((e) => console.warn('[kiosco] No se pudo mantener la pantalla prendida', e));
    NavigationBar.setVisibilityAsync('hidden').catch((e) => console.warn('[kiosco] No se pudo ocultar la barra de navegación', e));
  }, []);
  return (
    <ProveedorKiosco>
      <StatusBar hidden style="light" />
      <Contenido />
    </ProveedorKiosco>
  );
}

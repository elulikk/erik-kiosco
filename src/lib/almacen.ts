import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// En la tablet el vínculo (token incluido) va al llavero seguro; en la web (solo para probar) a localStorage.
export async function leer(clave: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(clave) ?? null;
    } catch (e) {
      console.warn('[almacen] No se pudo leer', clave, e);
      return null;
    }
  }
  return SecureStore.getItemAsync(clave);
}

export async function guardar(clave: string, valor: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(clave, valor);
    } catch (e) {
      console.warn('[almacen] No se pudo guardar', clave, e);
    }
    return;
  }
  await SecureStore.setItemAsync(clave, valor);
}

export async function borrar(clave: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(clave);
    } catch (e) {
      console.warn('[almacen] No se pudo borrar', clave, e);
    }
    return;
  }
  await SecureStore.deleteItemAsync(clave);
}

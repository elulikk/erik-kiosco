# CLAUDE.md — ERIK Kiosco

## Qué es
La app de la tablet del mostrador de Mag Tecnología (Galaxy Tab A7 Lite, Android 14 de 32 bits): el cliente
charla con ERIK, recorre el catálogo y escanea productos. Es un proyecto aparte de ERIK (`C:\ERIK`) y de
MAGNETO; se habla solo con la API de ERIK, rutas `/api/v1/kiosco/*` (puerto 8710 por el wifi, o el túnel ngrok).
Del lado de ERIK están `erik/canal_kiosco.py`, `erik_api/routers/kiosco.py`, `erik/tunel_kiosco.py`,
`ui/pestania_kiosco.py` y el diseño en `docs/kiosco_tablet.md`.

## Stack
Expo SDK 58 + Expo Router (rutas en `src/app/`), React Native 0.88, TypeScript. Igual que MAGNETITO.

## Reglas
- Respondé y escribí código y docs en español; nombres explícitos.
- Nunca mostrar cantidades de stock: solo «Disponible» / «Consultá disponibilidad».
- Si ERIK o MAGNETO no responden, decir que no se pudo consultar; nunca que no hay productos.
- El token de la tablet va en el llavero seguro (`expo-secure-store`); nunca en logs ni en el repo.
- Si una ruta nueva hace falta, se agrega en ERIK (y su README) en la misma tarea.

## Cómo probar
`npm run typecheck` · `npm run lint` · `npx expo start --web --port 8091` (ver `README.md`).
El APK va con `armeabi-v7a,arm64-v8a` (la tablet es de 32 bits). `android/` y `dist/` no se commitean.

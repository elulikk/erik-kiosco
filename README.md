# ERIK Kiosco

La app de la tablet del mostrador: el cliente que espera charla con ERIK, recorre el catálogo y escanea
productos para ver el precio. Habla solo con la API de ERIK (`/api/v1/kiosco/*`, puerto 8710); ERIK es quien
le pide los datos a MAGNETO. Diseño completo en `../docs/kiosco_tablet.md`.

## Pantallas

| Ruta | Qué hace |
| :--- | :--- |
| `/` | Espera: promos que se eligen en ERIK (o lo que se puede hacer) y «Tocá la pantalla para empezar». Vuelve acá sola por inactividad. |
| `/inicio` | Preguntale a ERIK, Ver productos, Escanear; buscador y rubros. |
| `/chat` | Charla con ERIK. Los productos salen como tarjetas tocables. Si la toma un vendedor desde ERIK, se ve «Te atiende un vendedor del local». |
| `/catalogo?q=` | Grilla con foto, precio y si hay. Si no hay exactamente eso, avisa que muestra lo más parecido. |
| `/producto/[codigo]` | Ficha con foto grande, descripción y «Preguntarle a ERIK». |
| `/escaner` | Cámara (de atrás o de adelante) que lee el código de barras y abre la ficha. |
| `/vincular` | Escanear el QR de la pestaña «Tablet» de ERIK (con la cámara de atrás o la de adelante). Si la cámara no puede, «Escribir el código a mano» acepta lo que copia «Copiar código» en ERIK. |
| `/ajustes` | Para el personal: **mantener apretado el logo de MAG 3 segundos**. Pide un PIN de 4 números que se elige la primera vez. Conexión, volver a vincular, cambiar PIN, desvincular. |

Encima de todo: si ERIK la pone en pausa, se ve el aviso de pausa; sin conexión, «Sin conexión con el local»
(nunca un catálogo vacío); si ERIK renovó el token, «Esta tablet no está vinculada».

## Conexión

El QR trae las direcciones del wifi del local (`http://192.168.x.x:8710`), el túnel ngrok si está configurado
(`[ERIK_KIOSCO] tunel_url`) y el token de la tablet. La app prueba primero el wifi (3 s) y después el túnel (8 s).
El vínculo y el PIN se guardan en el llavero seguro de Android (`expo-secure-store`).

## Para desarrollar

```bash
npm install
npx expo start --web --port 8091   # probar en el navegador (pegando el texto del QR)
npm run typecheck
npm run lint
```

Para probar en el navegador contra ERIK hace falta CORS, que la API de ERIK no habilita: se levanta la API
aparte con `CORSMiddleware` solo para `localhost` (la tablet de verdad no lo necesita).

Expo SDK 58 + Expo Router (rutas en `src/app/`), igual que MAGNETITO. Lo compartido está en `src/lib/`
(`api.ts`: cliente de la API y lectura del QR; `kiosco.tsx`: vínculo, conexión, charla e inactividad) y
`src/componentes/`.

## APK

Igual que MAGNETITO (JDK 17 y SDK de Android ya instalados en esta PC):

```bash
npx expo prebuild -p android --clean
cd android && gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
copy app\build\outputs\apk\release\app-release.apk ..\dist\erik-kiosco.apk
```

Va con `armeabi-v7a`: el Galaxy Tab A7 Lite del local trae Android de 32 bits (sin eso, «el paquete no es
válido»). `android/` y `dist/` no se commitean. Sale firmado con la clave de debug (sirve para instalarlo en la tablet).
En la tablet: instalar, abrir, escanear el QR de ERIK y activar *Fijar pantalla* de Android para que nadie
salga de la app.

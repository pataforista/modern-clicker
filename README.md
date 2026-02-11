# Modern Clicker System

Sistema de votación para controles PointSolutions con una interfaz web simple.

## Objetivo de uso
- Flujo de uso en **3 pasos** dentro del panel (iniciar sesión, recibir votos, proyectar resultados).
- Textos y botones en español y con lenguaje directo para facilitar su uso por personas con poca alfabetización digital.
- Los datos de preguntas y participantes se guardan en el navegador para continuar donde se dejó.

## Requisitos
1. Instalar **Node.js LTS** desde [nodejs.org](https://nodejs.org/).
2. Reiniciar terminal/PowerShell después de instalar.

## Configuración local

### 1) Hardware (puente con Arduino)
1. Conecta un **nRF24L01+** a un **Arduino** (pines en `firmware/receiver.ino`).
2. Carga `firmware/receiver.ino` desde Arduino IDE.
3. Anota el puerto COM (ej. `COM3`) y actualízalo en `server/index.js`.

### 2) Backend (server)
```bash
cd server
npm install
npm start
```

Modo simulador (sin hardware):
```bash
npm run simulate
```

Para fallback automático al simulador, copia `.env.example` a `.env` y usa:
```env
ALLOW_SIM_FALLBACK=true
```

### 3) Frontend (client)
```bash
cd client
npm install
npm run dev
```

Abre la URL mostrada por Vite (normalmente `http://localhost:5173`).

---

## Deploy fácil en Netlify
Este repositorio ya incluye `netlify.toml` con:
- `base = "client"`
- `command = "npm run build"`
- `publish = "dist"`
- Redirect SPA a `/index.html`

### Pasos
1. En Netlify, selecciona **Add new project → Import an existing project**.
2. Conecta el repo.
3. Verifica que use la configuración de `netlify.toml`.
4. Si usas backend externo, define `VITE_SOCKET_URL` en variables de entorno del sitio.

> Nota: Netlify hospeda el frontend estático. El backend de `server/` debe correr aparte (Render, Railway, VPS, etc.).

---

## Uso offline (PWA)
El cliente incluye:
- `manifest.webmanifest`
- `service worker` (`public/sw.js`)
- Botón de **Instalar app** cuando el navegador lo permite.

Con esto:
- La interfaz puede abrirse sin internet (cacheada).
- Preguntas y participantes quedan guardados en `localStorage`.
- If no hay red, seguirás viendo la interfaz y datos locales.

> Importante: Para recibir votos en vivo necesitas conexión al backend/hardware.

## Funciones principales
- Gráfica en tiempo real de respuestas A-E.
- Vista de presentación para proyectar preguntas y resultados.
- Gestión rápida de preguntas y participantes.
- Instalación como app (PWA) para uso tipo “aplicación”.

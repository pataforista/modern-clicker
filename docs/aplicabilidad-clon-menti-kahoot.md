# Aplicabilidad de propuestas tipo Mentimeter/Kahoot al repo `modern-clicker`

## Contexto actual del proyecto
Este repositorio ya tiene una base funcional cercana a un **Audience Response System**:
- Frontend React + Vite con vista de panel, presentación y voto móvil.
- Backend Node/Express + Socket.IO para estado y eventos en tiempo real.
- Integración especial con hardware PointSolutions (serial/HID) y modo simulador.

## Qué sí es aplicable de tu lista

### 1) Arquitectura en tiempo real tipo sala (muy aplicable)
Aplicar el patrón de **sala + host + participantes + estado autoritativo del servidor** es la evolución más natural sobre el backend actual.

**Aterrizado a este repo:**
- Crear `rooms` en servidor.
- Mover `sessionState` global a `sessionState` por sala.
- Asociar sockets a una sala y emitir `status/vote/snapshot` por sala.

### 2) Flujo Kahoot/Mentimeter por fases (muy aplicable)
Modelo recomendado: **Lobby → Pregunta activa → Cierre → Resultados → Siguiente**.

**Aterrizado a este repo:**
- Reusar `questions` existentes por sala.
- Añadir un `activeQuestionId` y ventana de votación (`isOpen`, `startedAt`, `durationSec`).
- Mantener compatibilidad con votos de hardware y móvil.

### 3) Código corto de ingreso (muy aplicable)
Añadir un código de 5–6 caracteres para que audiencia entre sin URL compleja.

**Aterrizado a este repo:**
- Endpoint/socket de `create-room` (host) y `join-room` (player).
- Vista móvil pide código + nombre + opcional PIN.

### 4) Deduplicación y reconexión robusta (aplicable e importante)
Ya hay dedupe en móvil por `voteId`; ampliar esto para reconexión de sesión y recuperación de estado.

**Aterrizado a este repo:**
- Guardar `participantToken` en `localStorage` para reingreso.
- Al reconectar, servidor reenvía snapshot de sala + pregunta activa + estado de voto.

### 5) PWA/offline del cliente (ya parcialmente aplicable)
El repo ya tiene PWA; se puede extender con cola offline de acciones para voto móvil (flush al reconectar).

## Qué es parcialmente aplicable

### 6) Repos tipo Firebase-only
Útiles como referencia UX/flows, pero **no obligan** a migrar stack.
Tu stack actual (Express + Socket.IO) ya resuelve el realtime con control local y mejor integración con hardware.

### 7) Clones enterprise (Spring/arquitecturas pesadas)
Aplicables solo si buscas multi-tenant fuerte, auditoría, SSO o escalado alto. Para un MVP funcional en este repo, sería sobreingeniería.

## Qué no conviene aplicar ahora

### 8) Rehacer todo en WebSocket puro (starter mínimo)
Tu propuesta starter con `ws` puro es válida para demo, pero este repo ya usa Socket.IO con features útiles (reconexión, rooms, eventos). No conviene retroceder de capa.

### 9) Emular Genially 1:1
No es prioridad para este producto. Mejor añadir widgets interactivos (quiz/poll/wordcloud) dentro del flujo de presentación existente.

## Priorización recomendada (orden de implementación)
1. **Salas + join code + separación host/audiencia**.
2. **Estado por sala + pregunta activa con timer**.
3. **Resultados por pregunta + historial de sesión**.
4. **Reconexión/snapshot robusto**.
5. **Puntaje (si quieres modo Kahoot)**.

## Decisión técnica sugerida
Mantener stack actual:
- Frontend: React/Vite (sin cambios estructurales).
- Realtime: Socket.IO (mantener).
- Backend: Express/Node (mantener).
- Persistencia: iniciar con JSON/SQLite para salas y resultados; luego escalar.

En resumen: de tu propuesta, lo más aplicable no es cambiar de tecnología, sino adoptar **el modelo de producto** (salas, fases de juego, join code, reconexión y resultados) encima de la base existente.

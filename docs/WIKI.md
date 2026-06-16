# Productivity Tracker — Wiki

> App de productividad gamificada para familias y equipos pequeños. Incluye tracking de puntos, tareas pendientes, lista de compras colaborativa, planificación diaria y un asistente IA.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura del sistema](#3-arquitectura-del-sistema)
4. [Modelo de datos (Firebase RTDB)](#4-modelo-de-datos-firebase-rtdb)
5. [Autenticación y tiers de usuario](#5-autenticación-y-tiers-de-usuario)
6. [Módulos del frontend](#6-módulos-del-frontend)
7. [Funciones serverless (Vercel)](#7-funciones-serverless-vercel)
8. [Sistema de salas y membresía](#8-sistema-de-salas-y-membresía)
9. [Gamificación](#9-gamificación)
10. [Asistente IA](#10-asistente-ia)
11. [Sistema de códigos de acceso](#11-sistema-de-códigos-de-acceso)
12. [PWA y modo offline](#12-pwa-y-modo-offline)
13. [Internacionalización (i18n)](#13-internacionalización-i18n)
14. [Despliegue](#14-despliegue)
15. [Variables de entorno requeridas](#15-variables-de-entorno-requeridas)
16. [Flujos clave paso a paso](#16-flujos-clave-paso-a-paso)

---

## 1. Visión general

Productivity Tracker es una **Progressive Web App** (PWA) que permite a grupos (familia, pareja, equipo pequeño) registrar actividades diarias con un sistema de puntos, gestionar tareas pendientes priorizadas, y colaborar en una lista de compras compartida. Todo sincroniza en tiempo real a través de Firebase Realtime Database.

**Características principales:**
- **Salas colaborativas:** Hasta 5 miembros por sala sincronizados en tiempo real.
- **Apariencia Premium:** Soporte nativo para Modo Oscuro (`data-theme="dark"`) y botón flotante de plantillas (FAB) arrastrable en pantalla que recuerda su posición.
- **Gamificación del enfoque:** Árbol que crece según la constancia diaria y entra en estado de descanso ("hold") al completar la meta de trabajo semanal, previniendo su marchitado.
- **Gestión avanzada de tareas:** Clasificación por urgencia con soporte para descripciones enriquecidas, fechas límite (deadline) e integración con Google Calendar y compras asociadas.
- **Lista de compras con super-poderes:** Carga de imágenes por artículo, clasificación mediante tags de supermercado (ej: `#Lidl`, `#Mercadona`) y organizador de texto en masa o inteligente vía IA.
- **Listas guardadas extendidas:** Plantillas de compras reutilizables (hasta 10 listas) con editor en bloque (bulk) e importación masiva.
- **Roadmap diario dinámico:** Planificación de rutinas y tareas; la compleción/desmarque de rutinas registra y sincroniza los puntos de forma automatizada en el log de actividades del equipo.
- **Reportes analíticos en PDF:** Descargas de reportes diarios o semanales detallados (basados en log individualizado de actividades) con análisis de esfuerzo e Insights generados por IA.
- **Asistente IA integrado:** Soporte completo bilingüe (DeepSeek/OpenAI-compatible) con acceso al contexto real de la sala.
- **Multiplataforma:** PWA instalable en Android, iOS y Desktop con soporte bilingüe (ES/EN) completo.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JS (ES modules), Vite 5 |
| Estilos | CSS custom (sin framework) con variables nativas de tema oscuro |
| Base de datos | Firebase Realtime Database |
| Autenticación | Firebase Auth (Google Sign-In) |
| Funciones backend | Vercel Serverless Functions (Node 18+) |
| IA | DeepSeek API (OpenAI-compatible) con fallback a LLM2–LLM4 |
| Gráficos | Chart.js 4 (Línea de tiempo "Hoy" e "Historial" por días) |
| PDF | html2pdf.js + html2canvas |
| Sanitización HTML | DOMPurify |
| PWA | vite-plugin-pwa + Workbox (persistencia local en `localStorage` de idioma, tema y FAB) |
| Internacionalización | Módulo i18n nativo (`src/js/i18n.js`) con diccionario bilingüe y función de traducción `tr()` |
| CI/CD | GitHub → Vercel (auto-deploy en push a main) |

---

## 3. Arquitectura del sistema

```
Browser (PWA)
     │
     │  Firebase SDK (client)
     ├──────────────────────► Firebase Auth (Google OAuth)
     │                             │ JWT Token
     │  onValue() listener         │
     ├──────────────────────► Firebase RTDB (sync en tiempo real)
     │
     │  fetch() + Bearer token
     ├──────────────────────► /api/agent  (Vercel)
     │                             │
     │                             ├──► Firebase Admin (verifica JWT)
     │                             ├──► Firebase RTDB (quota check)
     │                             └──► DeepSeek / LLM API
     │
     └──────────────────────► /api/redeem (Vercel)
                                   │
                                   ├──► Firebase Admin (verifica JWT)
                                   ├──► ACCESS_CODES env var
                                   └──► Firebase RTDB (atomic claim + tier update)
```

**Principio clave de seguridad:** ninguna clave de API (LLM, Firebase Admin) vive en el bundle del navegador. Las funciones serverless actúan como proxy autenticado.

---

## 4. Modelo de datos (Firebase RTDB)

```
/
├── rooms/
│   └── {roomId}/
│       ├── meta/                     { name, ownerUid, ownerEmail, createdAt }
│       ├── members/
│       │   └── {uid}/               { email, name, role('owner'|'member'), joinedAt }
│       └── store/                   (el estado completo de la sala)
│           ├── config/
│           │   ├── users: [{ id, name, color, meta(goal), bank }]
│           │   ├── days: number
│           │   ├── treeDifficulty: string
│           │   └── aiMotivation: bool
│           ├── lastActiveDate: 'YYYY-MM-DD'
│           ├── bonusCounters: { userId: count }
│           ├── todayLog: [{ id, who, name, pts, time }]
│           ├── history: [{ date, points: { uid: pts } }]
│           ├── weekLog: [{ date, who, name, pts }]
│           ├── pendingList: [{ id, name, pts, priority, createdAt, deadline?, image?, desc?, shopItems? }]
│           ├── templates: [{ id, name, pts }]
│           ├── roadmaps: { userId: { items: [...] } }
│           ├── roadmapHistory: [{ date, userId, items }]
│           ├── shoppingList: [{ id, name, qty, image?, target?, completedBy?, tags? }]
│           └── savedShoppingLists: [{ id, name, items: [{ id, name, qty, tags? }] }]
│
├── invites/
│   └── {6-char-code}/              { roomId, roomName, createdBy(uid), createdAt }
│
├── userRooms/
│   └── {uid}/
│       └── {roomId}/               { name, role }
│
├── users/
│   └── {uid}/                      { tier('free'|'pro'), proSince, proVia }
│
├── usage/
│   └── {uid}/
│       └── {YYYY-MM-DD}/           count (peticiones IA del día)
│
└── accessCodes/
    └── {CODE}/                     { redeemedBy, email, redeemedAt }  ← solo Admin SDK
```

---

## 5. Autenticación y tiers de usuario

### Flujo de autenticación

1. Usuario hace clic en "Iniciar con Google"
2. Firebase Auth abre popup OAuth de Google
3. Al completar, `onAuthStateChanged` recibe el usuario
4. App carga `userRooms/{uid}` para mostrar las salas del usuario
5. Para llamadas a funciones serverless, se obtiene el JWT con `user.getIdToken()` y se envía como `Authorization: Bearer {token}`
6. Las funciones verifican el token con `firebase-admin.auth().verifyIdToken(token)`

### Tiers

| Tier | Quién | Crear salas | IA diaria |
|------|-------|-------------|-----------|
| `free` | Usuario nuevo por defecto | Solo unirse (0 propias) | 5 req/día |
| `pro` | Canjeó código de acceso | Hasta 2 salas | Ilimitada |
| `owner` | Email en `OWNER_EMAILS` | Hasta 50 salas | Ilimitada |

El tier se lee de `/users/{uid}/tier` (solo el Admin SDK puede escribirlo).

---

## 6. Módulos del frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `main.js` | Punto de entrada, inicialización, event listeners globales |
| `src/js/firebase.js` | SDK de Firebase, CRUD de salas, auth, invites |
| `src/js/state.js` | Store en memoria, rollover diario/semanal, lógica de puntos |
| `src/js/ui.js` | Renderizado DOM, modales, tabs, actualizaciones de UI |
| `src/js/agent.js` | Llamadas al asistente IA, contexto de la sala, parseo de respuestas |
| `src/js/chart.js` | Gráficos de métricas con Chart.js |
| `src/js/pdf.js` | Generación de reportes PDF |
| `src/js/i18n.js` | Traducciones ES/EN, helper de pluralización |
| `src/js/accessCodes.js` | Normalización de códigos de acceso |

### Flujo de datos en el cliente

```
Firebase onValue()  →  state.store (en memoria)  →  ui.renderUI()  →  DOM
                              ↑
                    user interaction → update state → saveToCloudDb() → Firebase
```

---

## 7. Funciones serverless (Vercel)

### `/api/agent` — Proxy IA

1. Verifica JWT del usuario
2. Lee el tier del usuario desde Firebase RTDB
3. Para `free`: verifica que no superó `FREE_DAILY_LIMIT` (default: 5/día)
4. Construye los mensajes `[system, user]` y llama al primer proveedor LLM disponible
5. En éxito: incrementa el contador atómicamente; devuelve `{ text }`
6. En fallo: intenta el siguiente proveedor (LLM1 → LLM2 → LLM3 → LLM4)

### `/api/redeem` — Canjeo de código

1. Verifica JWT del usuario
2. Normaliza y valida el código contra `ACCESS_CODES` (variable de entorno)
3. Verifica que no haya expirado (`ACCESS_CODES_EXPIRES`)
4. Transacción atómica en Firebase: marca el código como usado
5. Si fue exitosa: actualiza `users/{uid}/tier` a `'pro'`

---

## 8. Sistema de salas y membresía

### Crear una sala

1. `firebase.js:createRoom()` verifica el allowance del usuario (tier check)
2. Escribe con un solo `update()` atómico:
   - `rooms/{id}/meta`
   - `rooms/{id}/members/{uid}` con `role: 'owner'`
   - `rooms/{id}/store` con defaults
   - `userRooms/{uid}/{id}` con `role: 'owner'`

### Invitar miembros

1. El owner genera un código de 6 chars (`generateInviteCode`) y escribe en `invites/{code}`
2. El invitado recibe el enlace y al abrirlo, `acceptInvite()` agrega su UID a `rooms/{id}/members`
3. Se escribe también en `userRooms/{uid}/{roomId}` para el índice del invitado

### Límites

- Máximo 5 miembros por sala (aplicado en cliente; ver nota en SECURITY.md)
- Free: 0 salas propias / Pro: 2 / Owner: 50

---

## 9. Gamificación

### Puntos diarios

Cada perfil tiene una meta de puntos (`meta`, default 15). Se registran actividades con `todayLog`. Al cambiar de día (`checkDateAutoClose`):
- Los puntos acumulados pasan a `history`
- Si superó la meta: el excedente va al `bank` del perfil
- Se limpia `todayLog`

### Árbol

El árbol visual refleja la constancia semanal. Permanece en estado "hold" (descanso ganado) al completar el objetivo semanal de días de trabajo configurados, previniendo que se marchite durante los fines de semana o los lunes por la mañana.

**Reglas de floración y dificultad:**
- **Constancia real:** El árbol florece con follaje y flores de cerezo únicamente si se alcanzan 5 o más ramas/días "llenos" según la dificultad del perfil. Se removió el atajo que lo hacía florecer por simple volumen de puntos totales.
- **Ramas y follaje:** Cada una de las 7 ramas representa un día de los últimos 7 días. El follaje crece al completar actividades del roadmap o registrar actividades diarias.
- **Dificultad configurable (`treeDifficulty`):**
  - *Mínimo:* Requiere al menos 1 actividad para llenar la rama (el árbol se seca tras 3 días de inactividad).
  - *Medio:* Requiere al menos 2 actividades para llenar la rama (el árbol se seca tras 2 días de inactividad).
  - *Máximo:* Requiere al menos 3 actividades para llenar la rama (el árbol se seca tras 1 día de inactividad).

### Bonus de racha

Después de N tareas consecutivas (configurable), se otorga un bonus de puntos al banco del perfil. El contador se resetea al completar el bonus o al cambiar de día.

### Urgencia de tareas

```
urgencyScore = priorityWeight × 1000 + daysWaiting
```

`priorityWeight`: alta=3, media=2, baja=1. Las tareas se ordenan de mayor a menor urgencia.

### Reseteo semanal

Los lunes se limpian `history` y `weekLog` automáticamente.

---

## 10. Asistente IA

### Arquitectura

```
askAssistant(userPrompt)
      │
      ├──► assistantSystemPrompt()   → system prompt con rol + contexto de la sala
      │         │
      │         └──► buildAppContext()  → perfil activo, pts, tareas, compras, rutinas
      │
      └──► askAgent(prompt, system)  → fetch /api/agent
```

### Contexto enviado al LLM

- Nombre de la sala y perfil activo
- Puntos de hoy vs meta
- Hasta 30 tareas pendientes (nombre + prioridad + pts)
- Hasta 40 ítems de la lista de compras
- Hasta 30 rutinas guardadas

### Usos actuales

| Función | Descripción |
|---------|-------------|
| Chat libre | Consultas de productividad, motivación, planificación |
| Organizar lista de compras | Convierte texto libre en `[{ name, qty }]` estructurado |

### Cuota

- Free: 5 peticiones/día (configurable con `FREE_DAILY_LIMIT`)
- Pro/Owner: sin límite
- Conteo guardado en `usage/{uid}/{YYYY-MM-DD}`

---

## 11. Sistema de códigos de acceso

Los códigos viven **exclusivamente** en la variable de entorno `ACCESS_CODES` de Vercel. Nunca se envían al navegador.

```
ACCESS_CODES = "BETA-CA7PC4, BETA-BLTAJN, ..."
ACCESS_CODES_EXPIRES = "2026-06-26"
```

El flujo de canje es:
1. Usuario ingresa el código en el modal de cuenta
2. El cliente llama a `/api/redeem` con el token JWT
3. El servidor valida contra `ACCESS_CODES`, verifica expiración, y hace una transacción atómica en Firebase
4. Si exitoso: actualiza `users/{uid}/tier = 'pro'`

Para ver qué códigos fueron canjeados: Firebase Console → Realtime Database → nodo `accessCodes`.

---

## 12. PWA y modo offline

- Manifest en `public/manifest.json`: nombre, íconos SVG, display standalone.
- Service worker generado por `vite-plugin-pwa` (Workbox).
- Estrategia de caché:
  - Assets estáticos (JS, CSS, imágenes): CacheFirst.
  - HTML: NetworkFirst (siempre intenta la versión más nueva).
- **Persistencia local (`localStorage`):** Guarda localmente la preferencia de idioma (`language`), el tema visual (`prodTrackerTheme`), la sala seleccionada y las coordenadas del botón flotante arrastrable (`fabLeft`, `fabBottom`).
- Sin soporte de edición offline (requiere Firebase connection para sync).

---

## 13. Internacionalización (i18n)

- **Idiomas soportados:** Español (`es`) e Inglés (`en`).
- **Módulo de Traducción Nativo:** Gestionado en `src/js/i18n.js` que centraliza los diccionarios y provee una función de traducción global `tr(key, params)` con soporte de interpolación y pluralización básica.
- **Asistente IA Adaptativo:** El idioma activo se lee al formular solicitudes y se inyecta en el prompt del proxy de Vercel `/api/agent` (system prompt adaptado al inglés o español y prompts de formateo estructurado), permitiendo al asistente conversar nativamente en el idioma seleccionado por el usuario.
- **Renderizado Dinámico:** Cambiar la configuración de idioma a través del menú de ajustes (`btnLangEs` / `btnLangEn`) actualiza el estado y fuerza un re-render instantáneo de la interfaz.

---

## 14. Despliegue

```
git push origin main
       │
       └──► GitHub Actions (si hay workflow)
                  │
                  └──► Vercel auto-deploy
                            │
                            ├── build: vite build → /dist
                            ├── functions: /api/*.js → Vercel Functions
                            └── CDN: /dist/** → Edge Network
```

Firebase (Auth + RTDB) se gestiona por separado desde Firebase Console.

---

## 15. Variables de entorno requeridas

### En Vercel (Settings → Environment Variables)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Sí | JSON de cuenta de servicio (una línea) |
| `LLM1_BASE_URL` | Sí | URL base del proveedor IA (ej: `https://api.deepseek.com`) |
| `LLM1_KEY` | Sí | API key del proveedor IA |
| `LLM1_MODEL` | Sí | Nombre del modelo (ej: `deepseek-chat`) |
| `ACCESS_CODES` | Sí | Códigos válidos separados por coma |
| `ACCESS_CODES_EXPIRES` | No | Fecha de expiración `YYYY-MM-DD` |
| `LLM2_*` / `LLM3_*` / `LLM4_*` | No | Proveedores de fallback |
| `FREE_DAILY_LIMIT` | No | Peticiones IA gratis por día (default: 5) |

### En desarrollo local (`.env`)

```env
VITE_FIREBASE_...   # No necesario: la config de Firebase está hardcodeada para el proyecto
```

---

## 16. Flujos clave paso a paso

### Registro de actividad

1. Usuario selecciona perfil
2. Escribe o elige actividad → asigna puntos
3. `state.js` agrega a `todayLog` y actualiza el árbol
4. `saveToCloudDb(roomId, store)` sincroniza con Firebase
5. Los otros miembros ven el cambio via `onValue()` en tiempo real

### Rollover de medianoche

1. El `setInterval` de 1 segundo compara `lastActiveDate` con la fecha actual
2. Si cambió: archiva `todayLog` en `history`, calcula excedente → `bank`, limpia el log
3. Si es lunes: limpia `history` y `weekLog` también
4. Guarda el store actualizado

### Generación de PDF semanal

1. Usuario abre modal de reporte
2. `pdf.js` construye HTML con las métricas de la semana
3. `html2pdf.js` convierte el DOM a PDF con márgenes y escala
4. El PDF se descarga directamente en el navegador

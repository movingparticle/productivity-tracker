# Integración de IA — Roadmap

> Cómo la IA puede añadir valor real a la app más allá del chat libre actual. Organizado por esfuerzo de implementación vs impacto.

---

## Estado actual de la IA

La app ya tiene una integración sólida:

| Feature | Estado |
|---------|--------|
| Chat libre con contexto de sala | ✅ Activo |
| Organizar lista de compras desde texto libre | ✅ Activo |
| Proxy serverless seguro (claves nunca en cliente) | ✅ Activo |
| Cuota por tier (free/pro) | ✅ Activo |
| Respuestas bilingües (ES/EN) | ✅ Activo |

---

## Oportunidades de mejora — por impacto y esfuerzo

---

### 🟢 Bajo esfuerzo, alto impacto inmediato

#### 1. Generación de lista de compras desde recetas

El usuario escribe: *"Necesito ingredientes para hacer paella para 4 personas"* → la IA genera la lista de compras y la añade directamente al store.

```js
// Nuevo: parseShoppingFromRecipe(prompt) → [{ name, qty }]
// Igual que fixShoppingListWithAI pero la IA construye desde cero en lugar de reformatear
// El system prompt instruye al LLM a devolver formato "nombre | cantidad"
```

**Por qué funciona bien aquí:** el formato de salida ya está parseado (`fixShoppingListWithAI`). Solo hay que cambiar el system prompt.

---

#### 2. Sugerencias de roadmap diario

Al abrir la pestaña "Día", un botón "Planificar con IA" genera un roadmap basado en las tareas pendientes más urgentes y la meta de puntos del perfil activo.

```
System: "Genera un plan diario para alcanzar X puntos. Las tareas disponibles son: ..."
Output: lista ordenada de actividades con sus puntos
```

La app ya tiene la función `buildAppContext()` con toda esa información lista para pasar al LLM.

---

#### 3. Análisis del reporte semanal

Al generar el PDF de reporte, incluir un párrafo generado por IA con observaciones:

> "Esta semana superaste tu meta 4 de 6 días. Tu mejor día fue el martes con 28 puntos. La tarea 'Gym' es la más postergada (11 días en lista). Sugerencia: añádela al roadmap de mañana como primera del día."

```js
// En pdf.js → antes de renderizar, llamar:
const insight = await generateWeeklyInsight(weekData);
// weekData = { days con puntos, tareas completadas, pendientes más viejas }
```

---

#### 4. Naming inteligente de tareas

Cuando el usuario escribe una tarea nueva, un pequeño botón ✨ sugiere un mejor nombre o la descompone en subtareas:

*Input:* "casa" → *Sugerencia:* "Limpiar la casa" (alta) + "Lavar ropa" (media) + "Comprar detergente" (añadir a lista de compras)

---

### 🟡 Esfuerzo medio, impacto alto

#### 5. Coach de racha personalizado

Cuando alguien rompe una racha o no llega a su meta, la IA envía un mensaje motivador corto personalizado basado en el historial real de esa persona:

```
"Ana, llevas 3 días seguidos superando tu meta. Ayer no llegaste, pero tu promedio de 7 días es 22 pts. ¡Seguís siendo consistente!"
```

Esto requiere que el mensaje se muestre automáticamente (trigger en `checkDateAutoClose`) pero **sin consumir quota automáticamente** — solo si `aiMotivation: true` en la config.

---

#### 6. Asignación automática de puntos

El usuario escribe el nombre de la tarea y la IA sugiere cuántos puntos asignarle basándose en las tareas existentes de la sala:

*"Barrer el piso"* → ve que "Limpiar cocina" tiene 5 pts y "Limpiar baño" tiene 8 pts → sugiere 5-7 pts.

Implementación simple: incluir la lista de tareas históricas con sus puntos en el prompt.

---

#### 7. Extracción de tareas desde notas de voz o texto

Un textarea donde el usuario pega o dicta (Web Speech API) una nota desordenada, y la IA la convierte en tareas pendientes estructuradas con prioridad y puntos sugeridos:

*"Tengo que hablar con el dentista, también pagar la luz que ya se pasó de fecha, y llevar a los niños el viernes al partido"* → 3 tareas con prioridades y deadlines.

---

#### 8. Resumen de actividad de la sala para miembros que no entraron

Cuando un miembro no abre la app en todo el día, al volver ve un resumen generado por IA:
*"Ayer: Marcos sumó 18/15 pts (meta superada). Laura completó 'Mercado' y 'Gym'. El árbol está en nivel 4."*

Esto es puro post-procesamiento del historial que ya existe en el store, sin datos externos.

---

### 🔵 Mayor esfuerzo, diferenciador competitivo

#### 9. Predicción de cuándo se completará la semana

Basándose en el promedio de puntos diarios de las últimas semanas, la IA calcula:
*"A tu ritmo actual, alcanzarás tu meta semanal el jueves."*

Implementación: regresión simple sobre `history` → la IA puede hacer esto en el prompt sin necesidad de código matemático extra en el cliente.

---

#### 10. IA como árbitro de lista de compras

En listas colaborativas, cuando dos miembros añaden ítems parecidos ("leche entera" y "leche"), la IA detecta duplicados y sugiere consolidar.

---

#### 11. Modo "Planificación de mes"

La IA genera un plan mensual de hábitos basándose en las metas y el historial, y lo desglosa en tareas semanales que se pueden añadir directamente al `pendingList`.

---

## Consideraciones técnicas para escalar la IA

### Prompt caching (reducir costos)

Para prompts con contexto grande y repetitivo (el system prompt + contexto de sala), usar **prompt caching de Anthropic** o equivalente de DeepSeek. El contexto de la sala cambia poco durante el día, por lo que un 80% del prompt podría cachearse.

### Streaming de respuestas

Las respuestas largas actualmente se esperan completas antes de mostrarse. Añadir streaming (`text/event-stream`) mejoraría la UX perceptiblemente:

```js
// /api/agent.js — cambiar a respuesta streaming
res.setHeader('Content-Type', 'text/event-stream');
const stream = await fetch(llmUrl, { body: JSON.stringify({ ..., stream: true }) });
for await (const chunk of stream.body) {
  res.write(`data: ${chunk}\n\n`);
}
res.end();
```

### Modelo más pequeño para tareas simples

El naming de tareas (#4) y la asignación de puntos (#6) son tareas simples que pueden resolverse con `deepseek-chat` con `max_tokens: 100`. Reservar modelos más potentes para el análisis semanal (#3) o la planificación mensual (#11).

### Evitar consumir quota en operaciones automáticas

Los features que se disparan solos (coach de racha, resumen diario) deben:
1. Contar contra la quota igual que el chat manual
2. O tener una quota separada (campo `usageAuto/{uid}/{date}`)
3. Estar **apagados por defecto** y el usuario los activa explícitamente

---

## Qué NO hacer con la IA en esta app

- **No sincronizar datos en tiempo real con el LLM**: el contexto se envía en cada petición, no se mantiene conversación persistente en el servidor
- **No almacenar las respuestas del LLM en Firebase**: las respuestas son efímeras, el store es verdad de negocio
- **No usar la IA para decisiones de seguridad**: tier, quotas, acceso — todo eso es lógica determinista en el servidor
- **No escalar a modelos más caros sin medir**: DeepSeek es muy capaz y muy barato para este caso de uso; cambiar a GPT-4 solo si hay una tarea que DeepSeek no resuelve bien

---

*Última actualización: 2026-06-15*

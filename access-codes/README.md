# Códigos de acceso (prueba gratis para personas cercanas)

Esta carpeta contiene los **códigos de acceso** que entregas a amigos/familia
para que prueben la app gratis. Al canjear un código, esa persona pasa a ser
**"Pro"**: puede **crear hasta 2 salas** y usar el **asistente de IA**.

## ⚠️ CAMBIO DE SEGURIDAD (importante)

Los códigos **ya NO viven en `codes.txt` ni dentro de la web**. Antes viajaban
dentro del sitio compilado (cualquiera podía leerlos en "ver código fuente").

Ahora los códigos son un **secreto del servidor**: se ponen en la variable de
entorno **`ACCESS_CODES`** en Vercel y la validación + el canje ocurren en
`/api/redeem`. Así nadie puede leerlos ni auto-asignarse Pro desde el navegador.

`codes.txt` ya **no lo usa la app** (queda solo como bloc de notas tuyo).

## ¿Cómo funciona ahora?

1. Pon tus códigos en Vercel → Settings → Environment Variables →
   `ACCESS_CODES` (separados por coma o salto de línea).
2. La persona entra a la app, inicia sesión y, en **"Mis Salas"**, escribe el
   código en **"Tengo un código de acceso"**.
3. El servidor valida el código, lo marca como **usado** (un solo uso) y sube a
   esa persona a **Pro**.

## Formato de `codes.txt`

- **Un código por línea.**
- Letras y números, sin espacios (se convierten a MAYÚSCULAS automáticamente).
- Puedes poner una nota después de una coma `,` o un `#` (la nota es solo para ti,
  la app la ignora).
- Las líneas vacías y las que empiezan con `#` se ignoran.

### Ejemplo

```
FAMILIA2026          # para mi mamá
AMIGO-TENNIS, Carlos
PRUEBA7K9X2
```

## Recomendaciones

- Usa códigos **difíciles de adivinar** (mezcla letras y números), por ejemplo
  `GIFT-7H2K9` en vez de `123`.
- Cada código sirve **una sola vez**. Si quieres invitar a 20 personas, pon 20 códigos distintos.
- Genera códigos al azar con esta línea en tu terminal (PowerShell):

  ```powershell
  1..20 | % { "PRUEBA-" + (-join ((48..57)+(65..90) | Get-Random -Count 5 | % {[char]$_})) }
  ```

> Nota de seguridad: los códigos ahora son **secretos del servidor** (variable
> `ACCESS_CODES` en Vercel) y se validan en `/api/redeem`. Ya no viajan en la
> web y nadie puede auto-asignarse Pro. Cuando integremos pagos (Stripe), el
> mismo endpoint server-side se encargará del upgrade.

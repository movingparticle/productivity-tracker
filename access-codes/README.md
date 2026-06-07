# Códigos de acceso (prueba gratis para personas cercanas)

Esta carpeta contiene los **códigos de acceso** que entregas a amigos/familia
para que prueben la app gratis. Al canjear un código, esa persona pasa a ser
**"Pro"**: puede **crear hasta 2 salas** y usar el **asistente de IA**.

## ¿Cómo funciona?

1. Tú escribes los códigos en `codes.txt` (uno por línea).
2. Cuando se compila la app, esos códigos quedan incluidos.
3. La persona entra a la app, inicia sesión con Google y, en la pantalla
   **"Mis Salas"**, escribe el código en **"Tengo un código de acceso"**.
4. El código queda **marcado como usado** (un solo uso) y esa persona
   ya puede crear su sala.

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

> Nota de seguridad: como esta es una app web, los códigos viajan dentro del
> sitio compilado, así que considéralos "semi-públicos". El control real es que
> **cada código sirve una sola vez**. Cuando integremos pagos (Stripe), el
> control pasará a ser 100% del lado del servidor.

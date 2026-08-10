# Fuentes auto-hospedadas

`tokens.css` declara los `@font-face` que apuntan a estos archivos (ver
`design-system.md` — decisión de no usar un CDN externo para no romper el
espíritu 100% local del Principio I):

- `Inter-Regular.woff2` (peso 400)
- `Inter-SemiBold.woff2` (peso 600)
- `Inter-Bold.woff2` (peso 700)
- `Geist-Medium.woff2` (peso 500)
- `Geist-SemiBold.woff2` (peso 600)

Todos presentes. Si en algún momento faltara alguno, el navegador cae
automáticamente al stack de fuentes de sistema declarado en
`--font-family-primary` / `--font-family-label` — no se rompe nada, solo se
ve con la fuente de sistema en vez de Inter/Geist.

**Origen/licencia**: Inter ([rsms.me/inter](https://rsms.me/inter/) o Google
Fonts) y Geist ([vercel.com/font](https://vercel.com/font)) están bajo
licencia OFL.

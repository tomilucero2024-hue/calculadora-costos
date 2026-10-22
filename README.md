# 🧮 Calculadora de precios de venta — Reventa Argentina

Calculadora local para definir precios de reventa en pesos argentinos. El IVA nunca se suma al precio: tus costos ya lo incluyen.

## Cómo usarla

- **Uso normal:** abrí `index.html` con doble clic. Funciona sin internet.
- **Como app instalable (PWA):** ejecutá `./servir.sh`, abrí <http://localhost:8080> y usá el botón **Instalar app** (o el menú del navegador → "Instalar aplicación"). Requiere servirla, no funciona instalada desde `file://`.

Los datos (productos guardados y último formulario) quedan en el navegador (`localStorage`). No se envía nada a ningún servidor.

## Qué incluye

### Costos
- **Costo del producto** en pesos o en dólares (con cotización configurable).
- **Recargo por transferencia (%)**: se suma al costo de cada producto. Por defecto 10%.
- **Envío**: costo total del pedido repartido entre las unidades, o costo por unidad.
- **Packaging**: bolsa y sticker por unidad.
- **Cantidad de unidades** del pedido.

### Precios
- **Precio de venta final** con margen sobre el precio final: `costo ÷ (1 − margen)`. El IVA no se suma: ya está incluido en el costo.
- **Precio de reventa** para otras revendedoras, con su propio margen.
- **Comisión del canal**: venta directa 0%, Mercado Libre 13%, tienda propia 3% u otro %.
- **Descuento para promos**: muestra el precio con descuento y el margen que queda.
- **Cuotas** con recargo total: muestra el valor de cada cuota y el margen.
- **Redondeo**: sin redondeo, múltiplos de $100 / $500 / $1.000, o terminaciones $X.900 / $X.990, con opción de redondear siempre hacia arriba.
- **Modo inverso "Ver margen"**: ingresás el precio que tenés en mente y te dice qué margen y ganancia te deja.

### Resultados
- Precio final, costo unitario, ganancia por unidad y total del pedido.
- Barra de desglose: producto, transferencia, envío, bolsa, sticker, comisión y ganancia.
- Desglose de IVA 21% opcional y oculto por defecto (solo informativo: el IVA no se suma al precio).
- Avisos si el precio queda por debajo del costo, si el margen + comisión superan el 100%, o si los costos guardados tienen más de 30 días.

### Guardado y exportación
- **Mis productos**: guardá, recuperá y borrá productos. Cada uno muestra precio, precio de reventa, ganancia y fecha de actualización. Los costos con más de 30 días se marcan en ámbar.
- **📷 Imagen**: tarjeta PNG para WhatsApp con el precio final (pensada para el cliente; no muestra costos ni ganancia).
- **🖨️ PDF**: presupuesto imprimible (guardar como PDF desde el diálogo de impresión).

### Extras
- Tema claro/oscuro (sigue la preferencia del sistema y se puede cambiar con el botón 🌙/☀️).
- Diseño responsive para usar desde el celular.
- Formato de moneda argentino (`$ 1.234,56`) y acepta importes escritos como `8.000,50`.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | Interfaz completa |
| `calc.js` | Lógica de cálculo (también testeable con Node) |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | PWA / instalación |
| `servir.sh` | Servidor local para instalar la PWA |

/* ============================================================
   Calculadora de precios de venta — lógica de cálculo
   Funciona en el navegador (window.HFCalc) y en Node (module.exports)

   Modelo:
   - Los costos se cargan CON IVA incluido.
   - El precio principal se calcula SIN IVA (neto), tomando el IVA
     de los costos como recuperable.
   - El precio con IVA se deriva del neto: neto × 1,21.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HFCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IVA = 0.21;
  var IVA_FACTOR = 1 + IVA;

  /* Acepta "8000", "8.000", "8.000,50", "8000.5", "$ 8.000", "40%" */
  function parseMoney(value) {
    if (value == null) return 0;
    var s = String(value).trim().replace(/\s/g, '').replace(/\$/g, '').replace(/%/g, '');
    if (!s) return 0;
    var hasComma = s.indexOf(',') !== -1;
    var hasDot = s.indexOf('.') !== -1;
    if (hasComma && hasDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      s = s.replace(',', '.');
    } else if (hasDot && /\.\d{3}$/.test(s) && /\d/.test(s.slice(0, -4))) {
      s = s.replace(/\./g, ''); // "1.234" / "1.500.000" => separador de miles
    }
    var n = parseFloat(s);
    return (isFinite(n) && n > 0) ? n : 0;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function num(value, fallback) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  /* step: 0 = sin redondeo · 100/500/1000 = múltiplos · 900/990 = terminación */
  function roundPrice(value, step, roundUp) {
    if (!(value > 0)) return 0;
    step = num(step, 0);
    if (step === 900 || step === 990) {
      var offset = 1000 - step; // 900 -> 100 · 990 -> 10
      var bucket = roundUp
        ? Math.ceil((value + offset) / 1000 - 1e-9)
        : Math.round((value + offset) / 1000);
      var r = bucket * 1000 - offset;
      return r > 0 ? r : value;
    }
    if (step > 0) {
      return (roundUp ? Math.ceil(value / step) : Math.round(value / step)) * step;
    }
    return value;
  }

  function compute(input) {
    var i = input || {};

    var unidades = Math.max(1, Math.round(num(i.cantidad, 1)) || 1);
    var moneda = i.moneda === 'USD' ? 'USD' : 'ARS';
    var costoIngresado = Math.max(0, num(i.costo, 0));
    var cotizacion = Math.max(0, num(i.cotizacion, 0));

    /* costos cargados con IVA incluido */
    var productoARSConIva = moneda === 'USD' ? costoIngresado * cotizacion : costoIngresado;

    var envio = Math.max(0, num(i.envio, 0));
    var envioModo = i.envioModo === 'unidad' ? 'unidad' : 'pedido';
    var envioUnitConIva = envioModo === 'unidad' ? envio : envio / unidades;

    var bolsaConIva = Math.max(0, num(i.bolsa, 0));
    var stickerConIva = Math.max(0, num(i.sticker, 0));
    var transferenciaPct = clamp(num(i.transferencia, 0), 0, 100);
    var transferenciaUnitConIva = productoARSConIva * transferenciaPct / 100;
    var costoUnitConIva = productoARSConIva + transferenciaUnitConIva + envioUnitConIva + bolsaConIva + stickerConIva;

    /* costos netos (sin IVA) */
    var productoARS = productoARSConIva / IVA_FACTOR;
    var transferenciaUnit = transferenciaUnitConIva / IVA_FACTOR;
    var envioUnit = envioUnitConIva / IVA_FACTOR;
    var bolsa = bolsaConIva / IVA_FACTOR;
    var sticker = stickerConIva / IVA_FACTOR;
    var costoUnit = costoUnitConIva / IVA_FACTOR;

    var comisionPct = clamp(num(i.comision, 0), 0, 95);
    var comision = comisionPct / 100;

    var modo = i.modo === 'margen' ? 'margen' : 'precio';
    var margenInput = clamp(num(i.margen, 0), 0, 95);
    var margenReventaPct = clamp(num(i.margenReventa, 0), 0, 95);
    var redondeo = num(i.redondeo, 0);
    var redondearArriba = !!i.redondearArriba;

    var descuentoPct = clamp(num(i.descuento, 0), 0, 95);
    var cuotasN = clamp(Math.round(num(i.cuotas, 1)) || 1, 1, 36);
    var recargoPct = clamp(num(i.recargo, 0), 0, 200);

    var valido = true;
    var motivo = '';
    var sugerido = 0;       // neto, sin redondear
    var precioFinal = 0;    // neto
    var margenPct = 0;

    if (modo === 'margen') {
      precioFinal = Math.max(0, num(i.precioObjetivo, 0)); // el objetivo se ingresa sin IVA
      sugerido = precioFinal;
      margenPct = precioFinal > 0 ? (1 - comision - costoUnit / precioFinal) * 100 : 0;
    } else {
      var denom = 1 - margenInput / 100 - comision;
      if (denom <= 0.0001) {
        valido = false;
        motivo = 'margen+comision';
      } else {
        sugerido = costoUnit / denom;
        precioFinal = roundPrice(sugerido, redondeo, redondearArriba);
        margenPct = precioFinal > 0 ? (1 - comision - costoUnit / precioFinal) * 100 : 0;
      }
    }

    var precioConIva = precioFinal * IVA_FACTOR;
    var sugeridoConIva = sugerido * IVA_FACTOR;

    var comisionUnit = precioFinal * comision;             // neta
    var comisionUnitConIva = precioConIva * comision;      // con IVA
    var ganUnit = precioFinal - comisionUnit - costoUnit;  // neta
    var ganUnitConIva = precioConIva - comisionUnitConIva - costoUnitConIva;
    var ganTotal = ganUnit * unidades;
    var ganTotalConIva = ganUnitConIva * unidades;

    var descuento = {
      pct: descuentoPct,
      precio: precioFinal * (1 - descuentoPct / 100)
    };
    descuento.precioConIva = descuento.precio * IVA_FACTOR;
    descuento.ganUnit = descuento.precio * (1 - comision) - costoUnit;
    descuento.margenPct = descuento.precio > 0 ? (descuento.ganUnit / descuento.precio) * 100 : 0;

    var cuotas = {
      n: cuotasN,
      recargo: recargoPct,
      precio: precioFinal * (1 + recargoPct / 100)
    };
    cuotas.precioConIva = cuotas.precio * IVA_FACTOR;
    cuotas.valor = cuotas.precio / cuotasN;
    cuotas.valorConIva = cuotas.precioConIva / cuotasN;
    cuotas.ganUnit = cuotas.precio * (1 - comision) - costoUnit;
    cuotas.margenPct = cuotas.precio > 0 ? (cuotas.ganUnit / cuotas.precio) * 100 : 0;

    /* segundo precio: para otras revendedoras (mismo costo, mismo canal) */
    var reventa = {
      valido: true,
      margenPct: margenReventaPct,
      sugerido: 0,
      sugeridoConIva: 0,
      precio: 0,
      precioConIva: 0,
      margenRealPct: 0,
      ganUnit: 0,
      ganUnitConIva: 0,
      ganTotal: 0,
      ganTotalConIva: 0
    };
    var denomReventa = 1 - margenReventaPct / 100 - comision;
    if (denomReventa <= 0.0001) {
      reventa.valido = false;
    } else {
      reventa.sugerido = costoUnit / denomReventa;
      reventa.precio = roundPrice(reventa.sugerido, redondeo, redondearArriba);
      reventa.sugeridoConIva = reventa.sugerido * IVA_FACTOR;
      reventa.precioConIva = reventa.precio * IVA_FACTOR;
      reventa.margenRealPct = reventa.precio > 0
        ? (1 - comision - costoUnit / reventa.precio) * 100
        : 0;
      reventa.ganUnit = reventa.precio * (1 - comision) - costoUnit;
      reventa.ganUnitConIva = reventa.ganUnit * IVA_FACTOR;
      reventa.ganTotal = reventa.ganUnit * unidades;
      reventa.ganTotalConIva = reventa.ganUnitConIva * unidades;
    }

    return {
      unidades: unidades,
      moneda: moneda,
      /* costos netos */
      productoARS: productoARS,
      transferenciaPct: transferenciaPct,
      transferenciaUnit: transferenciaUnit,
      envioUnit: envioUnit,
      bolsa: bolsa,
      sticker: sticker,
      costoUnit: costoUnit,
      /* costos con IVA */
      productoARSConIva: productoARSConIva,
      transferenciaUnitConIva: transferenciaUnitConIva,
      envioUnitConIva: envioUnitConIva,
      bolsaConIva: bolsaConIva,
      stickerConIva: stickerConIva,
      costoUnitConIva: costoUnitConIva,
      /* precios y ganancia netos */
      comisionPct: comisionPct,
      comisionUnit: comisionUnit,
      sugerido: sugerido,
      precioFinal: precioFinal,
      margenPct: margenPct,
      ganUnit: ganUnit,
      ganTotal: ganTotal,
      /* precios y ganancia con IVA */
      comisionUnitConIva: comisionUnitConIva,
      sugeridoConIva: sugeridoConIva,
      precioConIva: precioConIva,
      ganUnitConIva: ganUnitConIva,
      ganTotalConIva: ganTotalConIva,
      valido: valido,
      motivo: motivo,
      reventa: reventa,
      descuento: descuento,
      cuotas: cuotas,
      iva: {
        neto: precioFinal,
        iva: precioConIva - precioFinal,
        final: precioConIva,
        reventa: {
          neto: reventa.precio,
          iva: reventa.precioConIva - reventa.precio,
          final: reventa.precioConIva
        }
      }
    };
  }

  return {
    IVA: IVA,
    IVA_FACTOR: IVA_FACTOR,
    parseMoney: parseMoney,
    clamp: clamp,
    roundPrice: roundPrice,
    compute: compute
  };
});

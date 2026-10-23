/* ============================================================
   Calculadora de precios de venta — lógica de cálculo
   Funciona en el navegador (window.HFCalc) y en Node (module.exports)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HFCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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
    var productoARS = moneda === 'USD' ? costoIngresado * cotizacion : costoIngresado;

    var envio = Math.max(0, num(i.envio, 0));
    var envioModo = i.envioModo === 'unidad' ? 'unidad' : 'pedido';
    var envioUnit = envioModo === 'unidad' ? envio : envio / unidades;

    var transferenciaPct = clamp(num(i.transferencia, 0), 0, 100);
    var transferenciaUnit = productoARS * transferenciaPct / 100;

    /* Base pedida: producto + 10% de transferencia + envío.
       Lo demás queda detrás del check "incluir extras". */
    var incluirExtras = !!i.incluirExtras;

    var bolsa = incluirExtras ? Math.max(0, num(i.bolsa, 0)) : 0;
    var sticker = incluirExtras ? Math.max(0, num(i.sticker, 0)) : 0;
    var costoBase = productoARS + transferenciaUnit + envioUnit;
    var costoUnit = costoBase + bolsa + sticker;

    var comisionPct = incluirExtras ? clamp(num(i.comision, 0), 0, 95) : 0;
    var comision = comisionPct / 100;

    var modo = i.modo === 'margen' ? 'margen' : 'precio';
    var margenInput = clamp(num(i.margen, 0), 0, 95);
    var margenReventaPct = clamp(num(i.margenReventa, 0), 0, 95);
    var redondeo = incluirExtras ? num(i.redondeo, 0) : 0;
    var redondearArriba = incluirExtras && !!i.redondearArriba;

    var descuentoPct = incluirExtras ? clamp(num(i.descuento, 0), 0, 95) : 0;
    var cuotasN = incluirExtras ? clamp(Math.round(num(i.cuotas, 1)) || 1, 1, 36) : 1;
    var recargoPct = incluirExtras ? clamp(num(i.recargo, 0), 0, 200) : 0;

    /* El margen se suma al costo. Si hay comisión, se cubre después
       para que el margen quede sobre el costo. */
    function precioConMargen(margenPct) {
      var precio = costoUnit * (1 + margenPct / 100);
      if (comision > 0) precio = precio / (1 - comision);
      return precio;
    }

    var valido = true;
    var motivo = '';
    var sugerido = 0;
    var precioFinal = 0;
    var margenPct = 0;

    if (modo === 'margen') {
      precioFinal = Math.max(0, num(i.precioObjetivo, 0));
      sugerido = precioFinal;
    } else {
      sugerido = precioConMargen(margenInput);
      precioFinal = roundPrice(sugerido, redondeo, redondearArriba);
    }

    var comisionUnit = precioFinal * comision;
    var ganUnit = precioFinal - comisionUnit - costoUnit;
    var ganTotal = ganUnit * unidades;
    margenPct = costoUnit > 0 ? (ganUnit / costoUnit) * 100 : 0;

    var descuento = {
      pct: descuentoPct,
      precio: precioFinal * (1 - descuentoPct / 100)
    };
    descuento.ganUnit = descuento.precio * (1 - comision) - costoUnit;
    descuento.margenPct = costoUnit > 0 ? (descuento.ganUnit / costoUnit) * 100 : 0;

    var cuotas = {
      n: cuotasN,
      recargo: recargoPct,
      precio: precioFinal * (1 + recargoPct / 100)
    };
    cuotas.valor = cuotas.precio / cuotasN;
    cuotas.ganUnit = cuotas.precio * (1 - comision) - costoUnit;
    cuotas.margenPct = costoUnit > 0 ? (cuotas.ganUnit / costoUnit) * 100 : 0;

    /* segundo precio: para otras revendedoras (misma base, mismo canal) */
    var reventa = {
      valido: true,
      margenPct: margenReventaPct,
      sugerido: precioConMargen(margenReventaPct),
      precio: 0,
      margenRealPct: 0,
      ganUnit: 0,
      ganTotal: 0
    };
    reventa.precio = roundPrice(reventa.sugerido, redondeo, redondearArriba);
    reventa.ganUnit = reventa.precio * (1 - comision) - costoUnit;
    reventa.margenRealPct = costoUnit > 0 ? (reventa.ganUnit / costoUnit) * 100 : 0;
    reventa.ganTotal = reventa.ganUnit * unidades;

    return {
      unidades: unidades,
      moneda: moneda,
      productoARS: productoARS,
      transferenciaPct: transferenciaPct,
      transferenciaUnit: transferenciaUnit,
      envioUnit: envioUnit,
      bolsa: bolsa,
      sticker: sticker,
      costoBase: costoBase,
      costoUnit: costoUnit,
      incluirExtras: incluirExtras,
      comisionPct: comisionPct,
      comisionUnit: comisionUnit,
      sugerido: sugerido,
      precioFinal: precioFinal,
      margenPct: margenPct,
      ganUnit: ganUnit,
      ganTotal: ganTotal,
      valido: valido,
      motivo: motivo,
      reventa: reventa,
      descuento: descuento,
      cuotas: cuotas
    };
  }

  return {
    parseMoney: parseMoney,
    clamp: clamp,
    roundPrice: roundPrice,
    compute: compute
  };
});

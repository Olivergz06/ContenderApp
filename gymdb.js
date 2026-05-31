// ═══════════════════════════════════════════════════════════
// gymdb.js  ·  Base de datos compartida vía localStorage
// Contender Club ·  v1.0
// ═══════════════════════════════════════════════════════════
// Uso:
//   GymDB.init()           → siembra datos si localStorage está vacío
//   GymDB.reset()          → borra todo y vuelve a sembrar
//   GymDB.onChange(fn)     → fn() se llama cuando OTRO tab cambia datos
// ═══════════════════════════════════════════════════════════

var GymDB = (function () {
  'use strict';

  // ── CLAVES EN LOCALSTORAGE ────────────────────────────────
  var K = {
    socios:     'gymdb_socios',
    deudas:     'gymdb_deudas',
    checkins:   'gymdb_checkins',
    ventas:     'gymdb_ventas',
    membresias: 'gymdb_membresias',
    clases:     'gymdb_clases',
    productos:  'gymdb_productos',
    mensajes:   'gymdb_mensajes',
    inscritos:  'gymdb_inscritos',
    rutinas:    'gymdb_rutinas',
    historico:  'gymdb_historico',
    trainers:   'gymdb_trainers',
    cuentas:    'gymdb_cuentas',
    version:    'gymdb_version'
  };

  // ── DATOS SEMILLA (demo) ───────────────────────────────────
  var SEED = {
    socios: [
      {
        id: "001", nombre: "Carlos", apellido_paterno: "Mendoza", apellido_materno: "López",
        numero: "7221234567", correo: "carlos@mail.com", numero_emergencia: "5512340099",
        plan: "Mensual", fecha_inicio: "2026-05-01", fecha_vencimiento: "2026-05-31",
        visitas: 18, activo: true, sexo: "M", fecha_nacimiento: "1990-03-15", notas: "",
        peso: 78, musculo: 44, color: "#C8F135",
        abonos: [
          { num: 1, monto: 600,  fecha_limite: "2026-05-08", pagado: true,  fecha_pago: "2026-05-07" },
          { num: 2, monto: 600,  fecha_limite: "2026-05-15", pagado: true,  fecha_pago: "2026-05-14" }
        ]
      },
      {
        id: "006", nombre: "Mateo", apellido_paterno: "Mendoza", apellido_materno: "López",
        numero: "5512340006", correo: "mateo@mail.com", numero_emergencia: "5512340099",
        plan: "Trimestral", fecha_inicio: "2026-05-01", fecha_vencimiento: "2026-07-30",
        visitas: 8, activo: true, sexo: "M", fecha_nacimiento: "2010-06-20", notas: "Menor de edad",
        peso: 42, musculo: 20, color: "#4ECDC4",
        abonos: [
          { num: 1, monto: 1600, fecha_limite: "2026-05-15", pagado: true,  fecha_pago: "2026-05-13" },
          { num: 2, monto: 1600, fecha_limite: "2026-05-31", pagado: false, fecha_pago: null }
        ]
      }
    ],

    deudas: {
      "001": [
        { id: "d1", producto: "Proteína Whey", total: 850, fecha: "2026-05-14" },
        { id: "d2", producto: "Guantes",       total: 250, fecha: "2026-05-10" }
      ],
      "006": []
    },

    // checkins: { "YYYY-MM-DD": [{socio_id, hora, fecha}] }
    checkins: {},

    ventas: [
      { id: 1, socio_id: "001", socio_nombre: "Carlos Mendoza", producto: "Proteína Whey", cantidad: 1, total: 850, fecha: "2026-05-14", status: "debe",   tipo: "prod" },
      { id: 2, socio_id: "006", socio_nombre: "Mateo Mendoza",  producto: "Creatina",      cantidad: 1, total: 420, fecha: "2026-05-14", status: "pagado", tipo: "prod" }
    ],

    membresias: [
      { id: 1, nombre: "Mensual",     dias: 30,  precio: 1200,  desc: "Acceso completo" },
      { id: 2, nombre: "Trimestral",  dias: 90,  precio: 3200,  desc: "3 meses" },
      { id: 3, nombre: "Semestral",   dias: 180, precio: 5800,  desc: "6 meses" },
      { id: 4, nombre: "Anual",       dias: 365, precio: 11000, desc: "Mejor precio" }
    ],

    clases: [
      { id: 1, nombre: "CrossFit",  hora: "07:00", coach: "Diego",   cupo: 15, dias: ["Lun","Mié","Vie"], color: "#FF5C35" },
      { id: 2, nombre: "Yoga Flow", hora: "09:00", coach: "Marta",   cupo: 12, dias: ["Lun","Mar","Jue"], color: "#4ECDC4" },
      { id: 3, nombre: "Spinning",  hora: "18:00", coach: "Rodrigo", cupo: 20, dias: ["Mar","Jue","Sáb"], color: "#FFE66D" },
      { id: 4, nombre: "Pilates",   hora: "19:30", coach: "Sofía",   cupo: 10, dias: ["Lun","Mié","Vie"], color: "#A8DADC" }
    ],

    productos: [
      { id: 1, nombre: "Proteína Whey", costo: 850, stock: 12, cat: "Suplementos" },
      { id: 2, nombre: "Creatina",      costo: 420, stock: 8,  cat: "Suplementos" },
      { id: 3, nombre: "Guantes",       costo: 250, stock: 20, cat: "Accesorios"  }
    ],

    mensajes: [
      { id: 1, nombre: "Recordatorio de pago",  cuerpo: "Hola {nombre} 👋, tu membresía {plan} vence pronto. ¡Renuévala! 💪" },
      { id: 2, nombre: "Membresía vencida",      cuerpo: "Hola {nombre}, tu membresía {plan} ha vencido. Realiza tu pago para reactivar." },
      { id: 3, nombre: "Abono pendiente",        cuerpo: "Hola {nombre}, tienes un abono pendiente de tu plan {plan}. Pasa a liquidarlo. 🙏" },
      { id: 4, nombre: "Deuda de producto",      cuerpo: "Hola {nombre}, tienes productos pendientes de pago en Contender Club." },
      { id: 5, nombre: "Bienvenida",             cuerpo: "¡Bienvenido a Contender Club, {nombre}! Tu membresía {plan} ya está activa. 💪" }
    ],

    // inscritos: { clase_id: [socio_id, ...] }
    inscritos: { 1: ["001"], 2: ["001"], 3: [], 4: ["006"] },

    // rutinas: { socio_id: [ {dia, grupo, icono, ejercicios:[]} ] }
    rutinas: {},

    historico: {
      ventas:   [{ m:"Ene",v:9800},{m:"Feb",v:10200},{m:"Mar",v:11500},{m:"Abr",v:10800},{m:"May",v:12270}],
      checkins: [{ m:"Ene",v:62}, {m:"Feb",v:74},  {m:"Mar",v:80},  {m:"Abr",v:71},  {m:"May",v:88}],
      socios:   [{ m:"Ene",v:3},  {m:"Feb",v:3},   {m:"Mar",v:4},   {m:"Abr",v:4},   {m:"May",v:4}]
    },

    trainers: [
      { telefono: "5512345678", codigo: "TRAINER01", nombre: "Diego" }
    ],

    // cuentas: para socio.html — un telefono puede acceder a varios perfiles
    cuentas: [
      { telefono: "7221234567", codigo: "001", socios: ["001", "006"] }
    ]
  };

  // ── HELPERS PRIVADOS ──────────────────────────────────────
  function leer(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function guardar(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      // Notifica a otros tabs
      localStorage.setItem(K.version, Date.now().toString());
    } catch (e) {
      console.warn('GymDB: error al guardar', key, e);
    }
  }

  function hoyStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function findIdx(arr, id) {
    for (var i = 0; i < arr.length; i++) { if (arr[i].id === id) return i; }
    return -1;
  }

  // ── API PÚBLICA ────────────────────────────────────────────
  return {

    // ─────────────────────────────────────────────────────────
    // INIT / RESET
    // ─────────────────────────────────────────────────────────
    init: function () {
      var yo = this;
      Object.keys(SEED).forEach(function (key) {
        if (!localStorage.getItem(K[key])) {
          localStorage.setItem(K[key], JSON.stringify(SEED[key]));
        }
      });
    },

    reset: function () {
      Object.keys(K).forEach(function (k) { localStorage.removeItem(K[k]); });
      this.init();
    },

    // ─────────────────────────────────────────────────────────
    // SOCIOS
    // ─────────────────────────────────────────────────────────
    getSocios: function () { return leer(K.socios) || []; },

    saveSocios: function (arr) { guardar(K.socios, arr); },

    getSocio: function (id) {
      var arr = this.getSocios();
      return arr[findIdx(arr, id)] || null;
    },

    setSocio: function (socio) {
      var arr = this.getSocios();
      var idx = findIdx(arr, socio.id);
      if (idx > -1) arr[idx] = socio; else arr.push(socio);
      guardar(K.socios, arr);
    },

    // Socio.html: busca por numero de teléfono + id como código
    getCuenta: function (telefono, codigo) {
      var cuentas = leer(K.cuentas) || SEED.cuentas;
      for (var i = 0; i < cuentas.length; i++) {
        if (cuentas[i].telefono === telefono && cuentas[i].codigo === codigo) return cuentas[i];
      }
      return null;
    },

    // ─────────────────────────────────────────────────────────
    // DEUDAS  { socio_id: [deudas] }
    // ─────────────────────────────────────────────────────────
    getAllDeudas: function () { return leer(K.deudas) || {}; },
    getDeudas:   function (socio_id) { return (this.getAllDeudas())[socio_id] || []; },
    saveAllDeudas: function (obj) { guardar(K.deudas, obj); },

    addDeuda: function (socio_id, deuda) {
      var d = this.getAllDeudas();
      if (!d[socio_id]) d[socio_id] = [];
      d[socio_id].push(deuda);
      guardar(K.deudas, d);
    },

    removeDeuda: function (socio_id, deuda_id) {
      var d = this.getAllDeudas();
      if (d[socio_id]) {
        d[socio_id] = d[socio_id].filter(function (x) { return x.id !== deuda_id; });
      }
      guardar(K.deudas, d);
    },

    // ─────────────────────────────────────────────────────────
    // CHECKINS  { "YYYY-MM-DD": [{socio_id, hora, fecha}] }
    // ─────────────────────────────────────────────────────────
    getAllCheckins:   function () { return leer(K.checkins) || {}; },
    getTodayCheckins: function () { return (this.getAllCheckins())[hoyStr()] || []; },
    getCheckinsByFecha: function (fecha) { return (this.getAllCheckins())[fecha] || []; },

    saveTodayCheckins: function (arr) {
      var all = this.getAllCheckins();
      all[hoyStr()] = arr;
      guardar(K.checkins, all);
    },

    // Registra check-in + incrementa visitas; retorna false si ya existe
    addCheckin: function (socio_id) {
      var arr = this.getTodayCheckins();
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].socio_id === socio_id) return false;
      }
      var hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      arr.push({ socio_id: socio_id, hora: hora, fecha: hoyStr() });
      var all = this.getAllCheckins();
      all[hoyStr()] = arr;
      // Guardar checkins
      localStorage.setItem(K.checkins, JSON.stringify(all));
      // Incrementar visitas en el socio
      var socios = this.getSocios();
      var si = findIdx(socios, socio_id);
      if (si > -1) { socios[si].visitas = (socios[si].visitas || 0) + 1; }
      localStorage.setItem(K.socios, JSON.stringify(socios));
      // Bump de versión (notificar otros tabs)
      localStorage.setItem(K.version, Date.now().toString());
      return true;
    },

    // ─────────────────────────────────────────────────────────
    // VENTAS
    // ─────────────────────────────────────────────────────────
    getVentas:  function () { return leer(K.ventas) || []; },
    saveVentas: function (arr) { guardar(K.ventas, arr); },

    // ─────────────────────────────────────────────────────────
    // CATÁLOGO
    // ─────────────────────────────────────────────────────────
    getMembresias:  function () { return leer(K.membresias) || []; },
    saveMembresias: function (arr) { guardar(K.membresias, arr); },

    getClases:  function () { return leer(K.clases) || []; },
    saveClases: function (arr) { guardar(K.clases, arr); },

    getProductos:  function () { return leer(K.productos) || []; },
    saveProductos: function (arr) { guardar(K.productos, arr); },

    getMensajes:  function () { return leer(K.mensajes) || []; },
    saveMensajes: function (arr) { guardar(K.mensajes, arr); },

    // ─────────────────────────────────────────────────────────
    // INSCRITOS EN CLASES  { clase_id: [socio_id, ...] }
    // ─────────────────────────────────────────────────────────
    getAllInscritos:       function () { return leer(K.inscritos) || {}; },
    getInscritosPorClase: function (clase_id) { return (this.getAllInscritos())[clase_id] || []; },
    saveAllInscritos:     function (obj) { guardar(K.inscritos, obj); },

    inscribirSocio: function (clase_id, socio_id) {
      var ins = this.getAllInscritos();
      if (!ins[clase_id]) ins[clase_id] = [];
      if (ins[clase_id].indexOf(socio_id) === -1) ins[clase_id].push(socio_id);
      guardar(K.inscritos, ins);
    },

    desinscribirSocio: function (clase_id, socio_id) {
      var ins = this.getAllInscritos();
      if (ins[clase_id]) {
        ins[clase_id] = ins[clase_id].filter(function (x) { return x !== socio_id; });
      }
      guardar(K.inscritos, ins);
    },

    // ─────────────────────────────────────────────────────────
    // RUTINAS  { socio_id: [ {dia, grupo, icono, ejercicios} ] }
    // ─────────────────────────────────────────────────────────
    getRutina: function (socio_id) {
      var r = leer(K.rutinas) || {};
      return r[socio_id] || null; // null → usar default del HTML
    },

    saveRutina: function (socio_id, rutina) {
      var r = leer(K.rutinas) || {};
      r[socio_id] = rutina;
      guardar(K.rutinas, r);
    },

    // ─────────────────────────────────────────────────────────
    // HISTORICO / TRAINERS
    // ─────────────────────────────────────────────────────────
    getHistorico: function () { return leer(K.historico) || SEED.historico; },
    getTrainers:  function () { return leer(K.trainers)  || SEED.trainers; },

    // ─────────────────────────────────────────────────────────
    // SINCRONIZACIÓN CROSS-TAB
    // ─────────────────────────────────────────────────────────
    // callback() se ejecuta cuando OTRO tab modifica la BD
    onChange: function (callback) {
      window.addEventListener('storage', function (e) {
        if (e.key === K.version) {
          setTimeout(callback, 60);
        }
      });
    }

  }; // fin return api
})();

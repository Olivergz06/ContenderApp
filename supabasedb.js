// ═══════════════════════════════════════════════════════════════
// supabasedb.js  ·  Base de datos real con Supabase
// Contender Club · v1.0
// ═══════════════════════════════════════════════════════════════
// Misma API que gymdb.js — los 3 HTMLs no cambian su lógica.
// init() ahora devuelve una Promise; los HTMLs esperan .then().
// Reads: síncronos desde cache en memoria.
// Writes: actualiza cache inmediatamente + async a Supabase.
// ═══════════════════════════════════════════════════════════════

var GymDB = (function () {
  'use strict';

  var URL = 'https://ytbujmamijrzmpeqiadx.supabase.co/rest/v1';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0YnVqbWFtaWpyem1wZXFpYWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDcxODcsImV4cCI6MjA5NTc4MzE4N30.u76APTL2nKmhZy-hpPx4iPPyT5wPC1BHbsBkNcZYZqg';

  // ── Cache en memoria (misma estructura que gymdb.js) ───────────
  var C = {
    socios:    [],
    deudas:    {},   // { socio_id: [deuda,...] }
    checkins:  {},   // { "YYYY-MM-DD": [checkin,...] }
    ventas:    [],
    membresias:[],
    clases:    [],
    productos: [],
    mensajes:  [],
    inscritos: {},   // { clase_id: [socio_id,...] }
    rutinas:   {},   // { socio_id: [{dia,grupo,icono,ejercicios:[]},...] }
    historico: { ventas:[], checkins:[], socios:[] },
    trainers:  [],
    cuentas:   []
  };

  // ── HTTP helpers ───────────────────────────────────────────────
  function h(extra) {
    var base = {
      'apikey':        KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type':  'application/json'
    };
    if (extra) Object.keys(extra).forEach(function(k){ base[k]=extra[k]; });
    return base;
  }

  function sbFetch(method, table, query, body) {
    var url = URL + '/' + table + (query ? '?' + query : '');
    var opts = { method: method, headers: h(method!=='GET'?{'Prefer':'return=representation'}:null) };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts)
      .then(function(r) {
        if (r.status === 204) return [];
        return r.json();
      })
      .catch(function(e) { console.error('[GymDB]', method, table, e); return []; });
  }

  var get  = function(t,q)   { return sbFetch('GET',   t, q); };
  var post = function(t,b)   { return sbFetch('POST',  t, null, b); };
  var pat  = function(t,q,b) { return sbFetch('PATCH', t, q, b); };
  var del  = function(t,q)   { return sbFetch('DELETE',t, q); };

  // ── Utilidades ─────────────────────────────────────────────────
  function hoy() { return new Date().toISOString().slice(0,10); }

  function findIdx(arr, id) {
    for (var i=0; i<arr.length; i++) if (arr[i].id===id) return i;
    return -1;
  }

  // Notifica a otros tabs que hubo un cambio
  function bump() {
    try { localStorage.setItem('gymdb_sb_v', Date.now().toString()); } catch(e){}
  }

  // ── Carga inicial desde Supabase ───────────────────────────────
  function loadAll() {
    return Promise.all([
      get('socios',    'select=*,abonos(*)&order=id.asc'),
      get('deudas',    'select=*&order=fecha.desc'),
      get('checkins',  'select=*&fecha=eq.' + hoy()),
      get('ventas',    'select=*&order=created_at.desc&limit=200'),
      get('membresias','select=*&order=id.asc'),
      get('clases',    'select=*&order=id.asc'),
      get('productos', 'select=*&order=id.asc'),
      get('mensajes_wa','select=*&order=id.asc'),
      get('inscritos', 'select=*'),
      get('trainers',  'select=*'),
      get('cuentas',   'select=*'),
      get('historico', 'select=*&order=id.asc'),
      get('rutinas',   'select=*,ejercicios(*)&order=dia.asc')
    ]).then(function(res) {

      // Socios con abonos embebidos
      C.socios = (res[0]||[]).map(function(s) {
        s.abonos = (s.abonos||[]).sort(function(a,b){ return a.numero-b.numero; });
        // ids de abonos como string para comparaciones consistentes
        s.abonos.forEach(function(a){ a.id = String(a.id); });
        return s;
      });

      // Deudas → { socio_id: [deudas] }
      C.deudas = {};
      (res[1]||[]).forEach(function(d) {
        d.id = String(d.id); // bigserial → string
        if (!C.deudas[d.socio_id]) C.deudas[d.socio_id] = [];
        C.deudas[d.socio_id].push(d);
      });

      // Checkins de hoy
      C.checkins = {};
      C.checkins[hoy()] = res[2] || [];

      C.ventas    = res[3]  || [];
      C.membresias= res[4]  || [];
      C.clases    = res[5]  || [];
      C.productos = res[6]  || [];
      C.mensajes  = res[7]  || [];

      // Inscritos → { clase_id: [socio_ids] }
      C.inscritos = {};
      (res[8]||[]).forEach(function(i) {
        if (!C.inscritos[i.clase_id]) C.inscritos[i.clase_id] = [];
        C.inscritos[i.clase_id].push(i.socio_id);
      });

      C.trainers = res[9]  || [];
      C.cuentas  = res[10] || [];

      // Historico → { ventas:[], checkins:[], socios:[] }
      var hist = { ventas:[], checkins:[], socios:[] };
      (res[11]||[]).forEach(function(h) {
        if (hist[h.tipo]) hist[h.tipo].push({ m:h.mes, v:h.valor });
      });
      C.historico = hist;

      // Rutinas → { socio_id: [{dia,grupo,icono,ejercicios:[]}] }
      C.rutinas = {};
      (res[12]||[]).forEach(function(r) {
        if (!C.rutinas[r.socio_id]) C.rutinas[r.socio_id] = [];
        C.rutinas[r.socio_id].push({
          dia:       r.dia,
          grupo:     r.grupo,
          icono:     r.icono,
          _id:       r.id,   // id interno Supabase
          ejercicios:(r.ejercicios||[]).map(function(e){
            return { id:e.id, nombre:e.nombre, series:e.series,
                     notas:e.notas, manual:e.manual };
          })
        });
      });

    });
  }

  // ── API PÚBLICA ────────────────────────────────────────────────
  return {

    // ── INIT ────────────────────────────────────────────────────
    init: function() { return loadAll(); },

    reset: function() {
      console.warn('[GymDB] reset() no disponible en modo Supabase. Borra datos desde el dashboard.');
    },

    // ── SOCIOS ──────────────────────────────────────────────────
    getSocios: function()    { return C.socios; },
    saveSocios: function(arr){ C.socios = arr; },  // usado solo internamente

    getSocio: function(id) {
      var idx = findIdx(C.socios, id);
      return idx > -1 ? C.socios[idx] : null;
    },

    setSocio: function(socio) {
      var idx    = findIdx(C.socios, socio.id);
      var abonos = (socio.abonos || []).slice();
      var data   = {};
      Object.keys(socio).forEach(function(k){ if(k!=='abonos') data[k]=socio[k]; });

      if (idx > -1) {
        C.socios[idx] = socio;
        pat('socios', 'id=eq.'+socio.id, data);
        bump(); // PATCH es inmediato, puede bumpar ya
      } else {
        C.socios.push(socio);
        // Esperar a que Supabase confirme antes de notificar a otros tabs
        post('socios', data).then(function(r) {
          if (r && r[0] && r[0].id) {
            // Supabase confirmó — ahora sí notificar
            bump();
          } else {
            console.warn('[GymDB] POST socio sin respuesta confirmada', r);
            bump(); // bumpar de todas formas para no bloquear
          }
        });
        return; // salir sin bump prematuro
      }

      // Sincronizar abonos
      abonos.forEach(function(a) {
        var aData = { socio_id:socio.id, numero:a.numero, monto:a.monto,
                      fecha_limite:a.fecha_limite, pagado:a.pagado, fecha_pago:a.fecha_pago||null };
        if (a.id && !isNaN(Number(a.id))) {
          // Existente → PATCH
          pat('abonos', 'id=eq.'+a.id, { pagado:a.pagado, fecha_pago:a.fecha_pago||null });
        } else {
          // Nuevo → POST
          post('abonos', aData).then(function(r){
            if(r&&r[0]) a.id = String(r[0].id);
          });
        }
      });

      bump();
    },

    getCuenta: function(telefono, codigo) {
      for (var i=0; i<C.cuentas.length; i++) {
        var c = C.cuentas[i];
        if (c.telefono===telefono && c.codigo===codigo) return c;
      }
      return null;
    },

    // ── DEUDAS ──────────────────────────────────────────────────
    getAllDeudas:   function()    { return C.deudas; },
    getDeudas:      function(sid) { return C.deudas[sid] || []; },

    saveAllDeudas: function(obj) {
      // Diff: detecta eliminadas e insertadas
      var self = this;
      Object.keys(C.deudas).forEach(function(sid) {
        var prev = C.deudas[sid] || [];
        var next = obj[sid]      || [];
        // Eliminadas (en prev, no en next)
        prev.forEach(function(pd) {
          var existe = next.some(function(nd){ return nd.id===pd.id; });
          if (!existe) del('deudas', 'id=eq.'+pd.id);
        });
        // Nuevas (en next, no en prev)
        next.forEach(function(nd) {
          var existe = prev.some(function(pd){ return pd.id===nd.id; });
          if (!existe) {
            post('deudas', { socio_id:sid, producto:nd.producto, total:nd.total, fecha:nd.fecha })
              .then(function(r){ if(r&&r[0]) nd.id=String(r[0].id); });
          }
        });
      });
      // Socios nuevos en obj que no estaban en cache
      Object.keys(obj).forEach(function(sid) {
        if (!C.deudas[sid]) {
          obj[sid].forEach(function(nd) {
            post('deudas', { socio_id:sid, producto:nd.producto, total:nd.total, fecha:nd.fecha })
              .then(function(r){ if(r&&r[0]) nd.id=String(r[0].id); });
          });
        }
      });
      C.deudas = obj;
      bump();
    },

    addDeuda: function(sid, deuda) {
      if (!C.deudas[sid]) C.deudas[sid] = [];
      C.deudas[sid].push(deuda);
      post('deudas', { socio_id:sid, producto:deuda.producto, total:deuda.total, fecha:deuda.fecha })
        .then(function(r){ if(r&&r[0]) deuda.id=String(r[0].id); });
      bump();
    },

    removeDeuda: function(sid, did) {
      if (C.deudas[sid]) C.deudas[sid] = C.deudas[sid].filter(function(d){ return d.id!==did; });
      del('deudas', 'id=eq.'+did);
      bump();
    },

    // ── CHECKINS ────────────────────────────────────────────────
    getAllCheckins:    function()      { return C.checkins; },
    getTodayCheckins: function()      { return C.checkins[hoy()] || []; },
    getCheckinsByFecha: function(f)   { return C.checkins[f]    || []; },
    saveTodayCheckins: function(arr)  { C.checkins[hoy()] = arr; },

    addCheckin: function(sid) {
      var arr = this.getTodayCheckins();
      for (var i=0; i<arr.length; i++) if (arr[i].socio_id===sid) return false;
      var hora = new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
      arr.push({ socio_id:sid, hora:hora, fecha:hoy() });
      C.checkins[hoy()] = arr;
      // Incrementar visitas en cache
      var si = findIdx(C.socios, sid);
      if (si>-1) {
        C.socios[si].visitas = (C.socios[si].visitas||0)+1;
        pat('socios','id=eq.'+sid,{ visitas:C.socios[si].visitas });
      }
      post('checkins',{ socio_id:sid, hora:hora, fecha:hoy() });
      bump();
      return true;
    },

    // ── VENTAS ──────────────────────────────────────────────────
    getVentas: function() { return C.ventas; },

    saveVentas: function(arr) {
      var prev = C.ventas;
      C.ventas = arr;
      // Detectar nuevas (están en arr pero no en prev)
      arr.forEach(function(v) {
        var inPrev = prev.some(function(p){ return p.id===v.id; });
        if (!inPrev) {
          post('ventas',{
            socio_id:v.socio_id, socio_nombre:v.socio_nombre,
            producto:v.producto, cantidad:v.cantidad, total:v.total,
            fecha:v.fecha, status:v.status, tipo:v.tipo
          }).then(function(r){ if(r&&r[0]) v.id=r[0].id; });
        }
      });
      bump();
    },

    // ── CATÁLOGO ────────────────────────────────────────────────
    getMembresias:  function()    { return C.membresias; },
    saveMembresias: function(arr) {
      _syncCat('membresias', C.membresias, arr, ['nombre','dias','precio','descripcion']);
      C.membresias = arr;
      bump();
    },

    getClases:  function()    { return C.clases; },
    saveClases: function(arr) {
      _syncCat('clases', C.clases, arr, ['nombre','hora','coach','cupo','dias','color']);
      C.clases = arr;
      bump();
    },

    getProductos:  function()    { return C.productos; },
    saveProductos: function(arr) {
      _syncCat('productos', C.productos, arr, ['nombre','costo','stock','cat']);
      C.productos = arr;
      bump();
    },

    getMensajes:  function()    { return C.mensajes; },
    saveMensajes: function(arr) {
      _syncCat('mensajes_wa', C.mensajes, arr, ['nombre','cuerpo']);
      C.mensajes = arr;
      bump();
    },

    // ── INSCRITOS ────────────────────────────────────────────────
    getAllInscritos:       function()    { return C.inscritos; },
    getInscritosPorClase: function(cid) { return C.inscritos[cid] || []; },
    saveAllInscritos:     function(obj) { C.inscritos = obj; },

    inscribirSocio: function(cid, sid) {
      if (!C.inscritos[cid]) C.inscritos[cid] = [];
      if (C.inscritos[cid].indexOf(sid) === -1) {
        C.inscritos[cid].push(sid);
        post('inscritos',{ clase_id:cid, socio_id:sid });
        bump();
      }
    },

    desinscribirSocio: function(cid, sid) {
      if (C.inscritos[cid])
        C.inscritos[cid] = C.inscritos[cid].filter(function(x){ return x!==sid; });
      del('inscritos','clase_id=eq.'+cid+'&socio_id=eq.'+sid);
      bump();
    },

    // ── RUTINAS ─────────────────────────────────────────────────
    getRutina: function(sid) { return C.rutinas[sid] || null; },

    saveRutina: function(sid, rutina) {
      C.rutinas[sid] = rutina;
      // Borrar todo lo existente del socio y reinsertar
      del('rutinas','socio_id=eq.'+sid).then(function() {
        rutina.forEach(function(dia) {
          post('rutinas',{ socio_id:sid, dia:dia.dia, grupo:dia.grupo, icono:dia.icono })
            .then(function(r) {
              if (!r||!r[0]) return;
              var rid = r[0].id;
              (dia.ejercicios||[]).forEach(function(e) {
                post('ejercicios',{
                  rutina_id:rid, nombre:e.nombre,
                  series:e.series, notas:e.notas, manual:!!e.manual
                });
              });
            });
        });
      });
      bump();
    },

    // ── HISTÓRICO / TRAINERS ────────────────────────────────────
    getHistorico: function() { return C.historico; },
    getTrainers:  function() { return C.trainers;  },
    saveTrainers: function(arr) {
      _syncCat('trainers', C.trainers, arr, ['telefono','codigo','nombre']);
      C.trainers = arr;
      bump();
    },

    // ── SINCRONIZACIÓN CROSS-TAB / CROSS-DEVICE ─────────────────
    onChange: function(callback) {
      // Mismo navegador, tabs distintos → via localStorage
      window.addEventListener('storage', function(e) {
        if (e.key === 'gymdb_sb_v') {
          loadAll().then(function(){ setTimeout(callback, 80); });
        }
      });
      // Polling cada 60s para distintos dispositivos
      setInterval(function(){
        loadAll().then(callback);
      }, 60000);
    }

  }; // fin return

  // ── Helper: sync de tablas de catálogo ─────────────────────────
  function _syncCat(table, prev, next, fields) {
    var prevMap = {};
    prev.forEach(function(p){ prevMap[p.id]=p; });

    next.forEach(function(item) {
      var body = {};
      fields.forEach(function(f){ body[f]=item[f]; });

      if (item.id && prevMap[item.id]) {
        // Existente: comparar si cambió
        var cambio = fields.some(function(f){
          return JSON.stringify(item[f]) !== JSON.stringify(prevMap[item.id][f]);
        });
        if (cambio) pat(table, 'id=eq.'+item.id, body);
      } else {
        // Nuevo
        post(table, body).then(function(r){ if(r&&r[0]) item.id=r[0].id; });
      }
    });

    // Eliminados
    var nextIds = next.map(function(n){ return n.id; });
    prev.forEach(function(p) {
      if (nextIds.indexOf(p.id) === -1) del(table, 'id=eq.'+p.id);
    });
  }

})();

// ═══════════════════════════════════════════════════════════════
// socios-shared.js  ·  Módulo compartido Admin + Trainer
// Contender Club · v2.0
//
// USO EN ADMIN:
//   SociosModule.init({
//     role: 'admin',
//     getVendedor: function(){ return {id:'admin',nombre:'Administrador'}; },
//     requirePin: false
//   });
//
// USO EN TRAINER:
//   SociosModule.init({
//     role: 'trainer',
//     getVendedor: function(){ return TRAINER_ACTIVO; },
//     requirePin: true,
//     pedirPin: pedirPin           // función existente en entrenador.html
//   });
// ═══════════════════════════════════════════════════════════════

var SociosModule = (function(){
  'use strict';

  // ── Configuración inyectada por cada página ──────────────────
  var CFG = {
    role:       'admin',
    getVendedor: function(){ return {id:'admin',nombre:'Administrador'}; },
    requirePin:  false,
    pedirPin:    null,   // function(callback)
    // Estas funciones se inyectan desde la página host
    getSocios:    function(){ return window.SOCIOS || []; },
    getDeudas:    function(){ return window.DEUDAS || {}; },
    getPlanDias:  function(){ return window.PLAN_DIAS || {}; },
    getPlanPrecio:function(){ return window.PLAN_PRECIO || {}; },
    getPlanAbonos:function(){ return window.PLAN_ABONOS || {}; },
    getAvisos:    function(){ return window.AVISOS || []; },
    calcStatus:   function(s){ return window.calcStatus(s); },
    showScreen:   function(id){ window.showScreen(id); },
    renderDetalle:function(){ window.renderDetalle(); },
    mostrarToast: function(m){ window.mostrarToast(m); },
    abrirWA:      function(id){ window.abrirWA(id); },
    onSave:       function(s){ /* hook opcional */ }
  };

  var _socEditId = null;

  // ── Helpers comunes ──────────────────────────────────────────
  function ge(id){ return document.getElementById(id); }
  function fF(f){
    if(!f) return '—';
    var p=f.split('-'); if(p.length<3) return f;
    return p[2]+'/'+p[1]+'/'+p[0];
  }
  function fm(n){ return '$'+(n||0).toLocaleString('es-MX',{minimumFractionDigits:0}); }
  function ini(s){ return ((s.nombre||'')[0]||'').toUpperCase(); }
  function pillSt(st){
    var m={aldia:"<span class='pill pg'>Al día</span>",
           vencehoy:"<span class='pill po'>Vence hoy</span>",
           vencido:"<span class='pill pr'>Vencido</span>",
           inactivo:"<span class='pill pm'>Inactivo</span>"};
    return m[st]||'';
  }
  function avColor(st){
    return st==='aldia'?'#C8F135':st==='vencehoy'?'#FF9F0A':st==='vencido'?'#FF3B30':'#636366';
  }
  function addDays(f,d){
    var dt=new Date(f+'T00:00:00'); dt.setDate(dt.getDate()+d);
    return dt.toISOString().slice(0,10);
  }
  function addWeeks(f,w){ return addDays(f,w*7); }

  // ── ID automático ─────────────────────────────────────────────
  function nextSocioId(){
    var socios=CFG.getSocios();
    if(!socios.length) return '001';
    var max=socios.reduce(function(m,s){
      var n=parseInt(s.id,10); return isNaN(n)?m:Math.max(m,n);
    },0);
    var n=max+1;
    return n<10?'00'+n:n<100?'0'+n:String(n);
  }

  // ── Calcular vencimiento al cambiar plan/fecha ────────────────
  function calcVencimiento(){
    var fi=ge('f-inicio').value, plan=ge('f-plan').value;
    var dias=CFG.getPlanDias()[plan];
    if(fi&&dias){
      ge('f-vence').value=addDays(fi,dias);
      ge('f-vence').style.color='var(--lime)';
    }
  }

  // ── HTML del formulario (compartido) ─────────────────────────
  function htmlForm(){
    return [
      "<div class='fr'>",
        "<label>Núm. Socio <span id='f-id-hint' style='color:var(--lime);font-size:10px;font-weight:400'></span></label>",
        "<input type='text' id='f-id' readonly style='color:var(--muted);background:var(--bg3)'>",
      "</div>",
      "<div class='f2'>",
        "<div class='fr'><label>Nombre</label><input type='text' id='f-nombre' placeholder='Nombre'></div>",
        "<div class='fr'><label>Ap. Paterno</label><input type='text' id='f-ap' placeholder='Ap. P.'></div>",
      "</div>",
      "<div class='f2'>",
        "<div class='fr'><label>Ap. Materno</label><input type='text' id='f-am' placeholder='Ap. M.'></div>",
        "<div class='fr'><label>Teléfono</label><input type='tel' id='f-tel' placeholder='55 1234 5678' inputmode='numeric'></div>",
      "</div>",
      "<div class='f2'>",
        "<div class='fr'><label>Emergencia</label><input type='tel' id='f-emerg' placeholder='55 0000 0000' inputmode='numeric'></div>",
        "<div class='fr'><label>Correo</label><input type='email' id='f-correo' placeholder='correo@mail.com'></div>",
      "</div>",
      "<div class='fr'><label>Fecha de registro</label><input type='date' id='f-inicio'></div>",
      "<div class='f2'>",
        "<div class='fr'><label>Plan</label>",
          "<select id='f-plan'>",
            "<option value=''>— Selecciona —</option>",
            "<option value='Mensual'>Mensual</option>",
            "<option value='Trimestral'>Trimestral</option>",
            "<option value='Semestral'>Semestral</option>",
            "<option value='Anual'>Anual</option>",
          "</select>",
        "</div>",
        "<div class='fr'><label>Vencimiento <span style='color:var(--muted);font-size:10px'>(auto)</span></label>",
          "<input type='date' id='f-vence' style='color:var(--muted)'>",
        "</div>",
      "</div>",
      "<div class='f2'>",
        "<div class='fr'><label>Nacimiento</label><input type='date' id='f-nac'></div>",
        "<div class='fr'><label>Sexo</label>",
          "<select id='f-sexo'>",
            "<option value=''>—</option>",
            "<option value='M'>Masculino</option>",
            "<option value='F'>Femenino</option>",
            "<option value='O'>Otro</option>",
          "</select>",
        "</div>",
      "</div>",
      "<div class='fr'><label>Notas</label><textarea id='f-notas' placeholder='Lesiones, observaciones…'></textarea></div>",
      "<button class='btn bl bfull' id='btn-guardar-socio-shared'>Guardar</button>"
    ].join('');
  }

  // ── Abrir formulario NUEVO ────────────────────────────────────
  function abrirNuevo(){
    _socEditId=null;
    ge('form-titulo').textContent='Nuevo Socio';
    var nid=nextSocioId();
    ge('f-id').value=nid;
    ge('f-id-hint').textContent='auto';
    ge('f-inicio').value=new Date().toISOString().slice(0,10);
    ['f-nombre','f-ap','f-am','f-tel','f-emerg','f-correo','f-notas'].forEach(function(i){ge(i).value='';});
    ge('f-plan').value=''; ge('f-vence').value=''; ge('f-nac').value=''; ge('f-sexo').value='';
    ge('f-vence').style.color='var(--muted)';
    _bindFormEvents();
    CFG.showScreen('form');
  }

  // ── Abrir formulario EDITAR ───────────────────────────────────
  function abrirEditar(id){
    var s=CFG.getSocios().find(function(x){return x.id===id;}); if(!s) return;
    _socEditId=id;
    ge('form-titulo').textContent='Editar Socio';
    ge('f-id').value=s.id; ge('f-id-hint').textContent='';
    ge('f-nombre').value=s.nombre; ge('f-ap').value=s.apellido_paterno;
    ge('f-am').value=s.apellido_materno||''; ge('f-tel').value=s.numero||'';
    ge('f-emerg').value=s.numero_emergencia||''; ge('f-correo').value=s.correo||'';
    ge('f-notas').value=s.notas||''; ge('f-vence').value=s.fecha_vencimiento||'';
    ge('f-inicio').value=s.fecha_inicio||''; ge('f-nac').value=s.fecha_nacimiento||'';
    ge('f-plan').value=s.plan||''; ge('f-sexo').value=s.sexo||'';
    ge('f-vence').style.color=s.fecha_vencimiento?'var(--lime)':'var(--muted)';
    _bindFormEvents();
    CFG.showScreen('form');
  }

  function _bindFormEvents(){
    // Asegurar que los eventos estén conectados aunque el HTML haya cambiado
    var btn=ge('btn-guardar-socio-shared');
    if(btn){ btn.onclick=guardar; }
    var fp=ge('f-plan'), fi=ge('f-inicio');
    if(fp) fp.onchange=calcVencimiento;
    if(fi) fi.onchange=calcVencimiento;
  }

  // ── Guardar socio (nuevo o edición) ──────────────────────────
  function guardar(){
    var id=ge('f-id').value.trim(), nombre=ge('f-nombre').value.trim(), ap=ge('f-ap').value.trim();
    if(!nombre||!ap){ alert('Nombre y apellido son requeridos'); return; }
    if(!id){ alert('Error: sin número de socio'); return; }

    // Calcular vencimiento si falta
    var fi=ge('f-inicio').value, plan=ge('f-plan').value, vence=ge('f-vence').value;
    var dias=CFG.getPlanDias()[plan];
    if(fi&&plan&&!vence&&dias) vence=addDays(fi,dias);

    var socios=CFG.getSocios();
    var prev=socios.find(function(x){return x.id===id;})||{};
    var vendedor=CFG.getVendedor();
    var datos={
      id:id, nombre:nombre, apellido_paterno:ap, apellido_materno:ge('f-am').value.trim(),
      numero:ge('f-tel').value.trim(), numero_emergencia:ge('f-emerg').value.trim(),
      correo:ge('f-correo').value.trim(), notas:ge('f-notas').value.trim(),
      fecha_vencimiento:vence||null, fecha_inicio:fi||null,
      fecha_nacimiento:ge('f-nac').value||null, plan:plan, sexo:ge('f-sexo').value,
      visitas:prev.visitas||0,
      activo:prev.activo!==undefined?prev.activo:true,
      abonos:prev.abonos||[],
      avisos_ids:prev.avisos_ids||[],
      vendedor_id:prev.vendedor_id||(vendedor?String(vendedor.id):null),
      vendedor_nombre:prev.vendedor_nombre||(vendedor?vendedor.nombre:null)
    };
    GymDB.setSocio(datos);
    window.SOCIOS=GymDB.getSocios();
    CFG.mostrarToast('✓ Socio guardado');
    CFG.onSave(datos);
    CFG.showScreen('socios');
  }

  // ── Render: Lista de socios ───────────────────────────────────
  function renderLista(containerEl, socios, deudas, buscar, sortActual, ordenAsc){
    var q=(buscar||'').toLowerCase().trim();
    var list=socios.slice();
    if(q) list=list.filter(function(s){
      var nom=(s.nombre+' '+s.apellido_paterno+' '+(s.apellido_materno||'')).toLowerCase();
      return nom.indexOf(q)>-1||String(s.id).indexOf(q)>-1||((s.plan||'').toLowerCase()).indexOf(q)>-1;
    });
    list.sort(function(a,b){
      var r=0;
      if(sortActual==='nombre') r=(a.nombre+a.apellido_paterno).localeCompare(b.nombre+b.apellido_paterno);
      else if(sortActual==='vencimiento') r=new Date(a.fecha_vencimiento)-new Date(b.fecha_vencimiento);
      else if(sortActual==='plan') r=(a.plan||'').localeCompare(b.plan||'');
      else if(sortActual==='visitas') r=(b.visitas||0)-(a.visitas||0);
      else r=String(a.id).localeCompare(String(b.id));
      return ordenAsc?r:-r;
    });
    if(!list.length){
      containerEl.innerHTML="<div class='empty'><div class='ico'>&#128101;</div><p>Sin resultados</p></div>";
      return;
    }
    var html='';
    list.forEach(function(s){
      var st=CFG.calcStatus(s);
      var deuds=deudas[s.id]||[];
      var totalD=deuds.reduce(function(a,d){return a+d.total;},0);
      var abonoP=(s.abonos||[]).find(function(a){return !a.pagado;});
      html+="<div class='soc-card "+st+"'><div class='soc-fila'>";
      html+="<div class='soc-av' style='background:"+avColor(st)+"'>"+ini(s)+"</div>";
      html+="<div class='soc-info'>";
      html+="<div class='soc-nombre'>#"+s.id+" · "+s.nombre+" "+s.apellido_paterno+"</div>";
      html+="<div class='soc-sub'>"+(s.plan||'—')+" · Vence: "+fF(s.fecha_vencimiento)+"</div>";
      html+="<div style='margin-top:5px;display:flex;gap:5px;flex-wrap:wrap'>"+pillSt(st);
      if(totalD>0) html+="<span class='pill po'>Debe: "+fm(totalD)+"</span>";
      if(abonoP)   html+="<span class='pill po'>Abono pend.</span>";
      html+="</div></div>";
      html+="<button class='btn bwa bsm' data-wa-s='"+s.id+"'>&#128241;</button></div>";
      html+="<div style='margin-top:10px'>";
      html+="<button class='btn bl bsm' data-ver-s='"+s.id+"' style='width:100%;justify-content:center'>Ver detalle</button>";
      html+="</div></div>";
    });
    containerEl.innerHTML=html;
    containerEl.querySelectorAll('[data-ver-s]').forEach(function(b){
      b.addEventListener('click',function(){
        window.socioActual=socios.find(function(s){return s.id===b.dataset.verS;});
        window.detTab='membresia';
        document.querySelectorAll('.tab[data-det]').forEach(function(t){
          t.classList.toggle('active',t.dataset.det==='membresia');
        });
        CFG.showScreen('detalle');
      });
    });
    containerEl.querySelectorAll('[data-wa-s]').forEach(function(b){
      b.addEventListener('click',function(){CFG.abrirWA(b.dataset.waS);});
    });
  }

  // ── Render: Tab Membresía ─────────────────────────────────────
  function renderMembresia(s, containerEl){
    var st=CFG.calcStatus(s);
    var abonos=s.abonos||[];
    var deudas=(CFG.getDeudas()[s.id])||[];
    var totalD=deudas.reduce(function(a,d){return a+d.total;},0);
    var hoy=new Date(); hoy.setHours(0,0,0,0);

    var html="<div class='sec' style='padding-bottom:20px'>";
    // Card membresía
    html+="<div style='font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;margin-top:4px'>Membresía</div>";
    html+="<div class='card "+(st==='aldia'?'verde':st==='vencehoy'?'naranja':'roja')+"' style='margin-bottom:8px'>";
    html+="<div style='display:flex;justify-content:space-between;align-items:center'>";
    html+="<div><div style='font-family:\"Bebas Neue\",sans-serif;font-size:22px'>"+(s.plan||'—')+"</div>";
    html+="<div style='font-size:12px;color:var(--muted)'>Vence: "+fF(s.fecha_vencimiento)+"</div></div>"+pillSt(st)+"</div>";
    if(abonos.length){
      var pag=abonos.filter(function(a){return a.pagado;}).length;
      var pct=Math.round((pag/abonos.length)*100);
      html+="<div class='prog-wrap' style='margin-top:10px'><div class='prog-fill' style='width:"+pct+"%'></div></div>";
      html+="<div style='font-size:11px;color:var(--muted);margin-top:4px'>"+pag+"/"+abonos.length+" abonos · ";
      html+=fm(abonos.filter(function(a){return a.pagado;}).reduce(function(t,a){return t+a.monto;},0))+" pagado</div>";
    }
    html+="</div>";

    // Abonos
    if(abonos.length){
      html+="<div class='card' style='margin-bottom:8px'>";
      abonos.forEach(function(a){
        var lim=new Date(a.fecha_limite+'T00:00:00');
        var venc=!a.pagado&&lim<hoy;
        var cls=a.pagado?'aok':venc?'avenc':'apend';
        var btnLabel=CFG.role==='trainer'?'✓ Cobrar':'✓ Pagar';
        html+="<div class='abono-row'>";
        html+="<div class='abono-num "+cls+"'>"+(a.pagado?'✓':a.num)+"</div>";
        html+="<div style='flex:1;min-width:0'>";
        html+="<div style='font-size:13px;font-weight:600'>Abono "+a.num+(a.pagado?' · Pagado':venc?' · Vencido':' · Pendiente')+"</div>";
        html+="<div style='font-size:11px;color:var(--muted)'>"+(a.pagado?'Pagado el '+fF(a.fecha_pago):'Límite: '+fF(a.fecha_limite))+"</div>";
        if(a.pagado&&a.vendedor_nombre) html+="<div style='font-size:10px;color:var(--muted)'>Cobró: "+a.vendedor_nombre+"</div>";
        html+="</div>";
        html+="<div style='font-family:\"Bebas Neue\",sans-serif;font-size:18px;color:"+(a.pagado?'var(--green)':venc?'var(--red)':'var(--orange)')+"'>"+fm(a.monto)+"</div>";
        if(!a.pagado) html+="<button class='btn bg2b bsm' data-pagar-ab='"+a.id+"' style='margin-left:6px'>"+btnLabel+"</button>";
        html+="</div>";
      });
      html+="</div>";
    }

    // Botón renovar
    html+="<div style='display:flex;gap:8px;margin-bottom:14px'>";
    html+="<button class='btn bl bsm' id='btn-renovar-shared' style='flex:1;justify-content:center'>+ Renovar membresía</button>";
    html+="</div>";

    // Deudas
    html+="<div style='font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px'>Deudas de productos</div>";
    if(!deudas.length){
      html+="<div style='font-size:13px;color:var(--muted);padding:8px 0'>Sin deudas ✓</div>";
    } else {
      deudas.forEach(function(d){
        html+="<div class='card naranja' style='display:flex;align-items:center;gap:10px;margin-bottom:6px'>";
        html+="<div style='flex:1'><div style='font-weight:600;font-size:13px'>"+d.producto+"</div>";
        html+="<div style='font-size:11px;color:var(--muted)'>"+fF(d.fecha)+"</div></div>";
        html+="<div style='font-family:\"Bebas Neue\",sans-serif;font-size:18px;color:var(--orange)'>"+fm(d.total)+"</div>";
        html+="<button class='btn bg2b bsm' data-pag-deuda='"+d.id+"'>&#10003;</button></div>";
      });
      html+="<div style='text-align:right;font-size:12px;color:var(--orange);margin-top:4px'>Total: "+fm(totalD)+"</div>";
    }
    html+="<div style='margin-top:12px'><button class='btn bd bsm' id='btn-add-prod-shared' style='width:100%;justify-content:center'>+ Agregar producto</button></div>";
    html+="</div>";
    containerEl.innerHTML=html;

    // Eventos abonos
    containerEl.querySelectorAll('[data-pagar-ab]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var aid=this.dataset.pagarAb;
        var abono=(s.abonos||[]).find(function(a){return String(a.id)===String(aid);});
        if(!abono||abono.pagado) return;
        var ejecutar=function(){
          _pagarAbono(s,abono);
          CFG.renderDetalle();
        };
        if(CFG.requirePin&&CFG.pedirPin) CFG.pedirPin(ejecutar);
        else if(confirm('¿Marcar abono de '+fm(abono.monto)+' como pagado?')) ejecutar();
      });
    });

    ge('btn-renovar-shared').addEventListener('click',function(){_abrirModalPago(s);});

    if(ge('btn-add-prod-shared'))
      ge('btn-add-prod-shared').addEventListener('click',function(){
        if(window.abrirModalProdSoc) window.abrirModalProdSoc(s);
      });

    containerEl.querySelectorAll('[data-pag-deuda]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var did=this.dataset.pagDeuda;
        var ejecutar=function(){
          var DEUDAS=CFG.getDeudas();
          DEUDAS[s.id]=(DEUDAS[s.id]||[]).filter(function(d){return d.id!==did;});
          GymDB.saveAllDeudas(DEUDAS);
          CFG.renderDetalle();
        };
        if(CFG.requirePin&&CFG.pedirPin) CFG.pedirPin(ejecutar);
        else if(confirm('¿Marcar deuda como pagada?')) ejecutar();
      });
    });
  }

  // ── Render: Tab Info General ──────────────────────────────────
  function renderInfoGeneral(s, containerEl){
    var html="<div class='sec' style='padding-bottom:16px'>";
    html+="<div class='f2' style='margin-bottom:12px'>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Teléfono</div><div style='font-size:14px;margin-top:3px'>"+(s.numero||'—')+"</div></div>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Emergencia</div><div style='font-size:14px;margin-top:3px'>"+(s.numero_emergencia||'—')+"</div></div></div>";
    html+="<div style='margin-bottom:12px'><div style='font-size:11px;color:var(--muted)'>Correo</div><div style='font-size:14px;margin-top:3px'>"+(s.correo||'—')+"</div></div>";
    html+="<div class='f2' style='margin-bottom:12px'>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Nacimiento</div><div style='font-size:14px;margin-top:3px'>"+fF(s.fecha_nacimiento)+"</div></div>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Alta</div><div style='font-size:14px;margin-top:3px'>"+fF(s.fecha_inicio)+"</div></div></div>";
    html+="<div class='f2' style='margin-bottom:12px'>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Sexo</div><div style='font-size:14px;margin-top:3px'>"+(s.sexo==='M'?'Masculino':s.sexo==='F'?'Femenino':'—')+"</div></div>";
    html+="<div><div style='font-size:11px;color:var(--muted)'>Visitas</div>";
    html+="<div style='font-family:\"Bebas Neue\",sans-serif;font-size:26px;color:var(--lime);margin-top:2px'>"+(s.visitas||0)+"</div></div></div>";
    if(s.notas) html+="<div style='margin-bottom:12px'><div style='font-size:11px;color:var(--muted)'>Notas</div><div style='font-size:13px;color:var(--muted);margin-top:3px'>"+s.notas+"</div></div>";
    // Botones
    html+="<div style='display:flex;gap:8px;margin-top:8px'>";
    html+="<button class='btn bwa bsm' id='btn-info-wa-shared' style='flex:1;justify-content:center'>&#128241; WhatsApp</button>";
    html+="<button class='btn bsm' id='btn-toggle-activo-shared' style='flex:1;justify-content:center;background:"+(s.activo?'rgba(255,59,48,.12)':'rgba(48,209,88,.12)')+";color:"+(s.activo?'var(--red)':'var(--green)')+";border:1px solid "+(s.activo?'rgba(255,59,48,.3)':'rgba(48,209,88,.3)')+"'>"+(s.activo?'Desactivar':'Activar')+"</button></div>";
    html+="<button class='btn bd bsm' id='btn-editar-shared' style='width:100%;justify-content:center;margin-top:8px'>&#9999;&#65039; Editar información</button>";
    html+="</div>";
    containerEl.innerHTML=html;

    ge('btn-info-wa-shared').addEventListener('click',function(){CFG.abrirWA(s.id);});
    ge('btn-toggle-activo-shared').addEventListener('click',function(){
      if(confirm((s.activo?'Desactivar':'Activar')+' a '+s.nombre+'?')){
        s.activo=!s.activo;
        GymDB.setSocio(s);
        window.SOCIOS=GymDB.getSocios();
        CFG.renderDetalle();
      }
    });
    ge('btn-editar-shared').addEventListener('click',function(){abrirEditar(s.id);});
  }

  // ── Pagar abono (lógica compartida) ──────────────────────────
  function _pagarAbono(s, abono){
    var hoyStr=new Date().toISOString().slice(0,10);
    var vendedor=CFG.getVendedor();
    abono.pagado=true; abono.fecha_pago=hoyStr;
    if(vendedor){ abono.vendedor_id=String(vendedor.id); abono.vendedor_nombre=vendedor.nombre; }

    var dias=(CFG.getPlanDias()[s.plan])||30;
    var dv=0;
    if(s.fecha_vencimiento){
      var fv=new Date(s.fecha_vencimiento+'T00:00:00'), hd=new Date();
      hd.setHours(0,0,0,0);
      dv=Math.floor((hd-fv)/86400000);
    }
    var base=(!s.fecha_vencimiento||dv>10)?hoyStr:s.fecha_vencimiento;
    s.fecha_vencimiento=addDays(base,dias);
    s.activo=true;
    if(dv>10) s.fecha_inicio=hoyStr;

    GymDB.setSocio(s);
    window.SOCIOS=GymDB.getSocios();
    window.socioActual=window.SOCIOS.find(function(x){return x.id===s.id;})||s;
    CFG.mostrarToast('✓ '+(CFG.role==='trainer'?'Cobrado':'Pagado')+' · Vence '+fF(s.fecha_vencimiento));
  }

  // ── Modal pago / renovar ──────────────────────────────────────
  function _abrirModalPago(s){
    var modalId=CFG.role==='admin'?'modal-pago':'modal-pago';
    var planSel=ge('pago-plan')||ge('pago-plan');
    var tituloEl=ge('pago-titulo');
    if(tituloEl) tituloEl.textContent='Renovar membresía';
    if(planSel) planSel.value=s.plan||'Mensual';

    var hoyStr=new Date().toISOString().slice(0,10), base=hoyStr;
    if(s.fecha_vencimiento){
      var fv=new Date(s.fecha_vencimiento+'T00:00:00'), hd=new Date(); hd.setHours(0,0,0,0);
      var dv=Math.floor((hd-fv)/86400000);
      if(dv>0&&dv<=10) base=s.fecha_vencimiento;
    }
    var inicioEl=ge('pago-inicio')||ge('pago-fecha-inicio');
    if(inicioEl) inicioEl.value=base;
    var tipoEl=ge('pago-tipo'); if(tipoEl) tipoEl.value='completo';

    if(window.actualizarResumenPago) window.actualizarResumenPago();
    var modal=ge(modalId); if(modal) modal.classList.add('open');

    // Conectar guardar pago
    var btnGuardar=ge('pago-guardar');
    if(btnGuardar) btnGuardar.onclick=function(){ _guardarPago(s); };
  }

  function _guardarPago(s){
    var plan=(ge('pago-plan')||{}).value;
    var tipo=(ge('pago-tipo')||{}).value||'completo';
    var fi=(ge('pago-inicio')||ge('pago-fecha-inicio')||{}).value;
    if(!fi) return;

    var vendedor=CFG.getVendedor();
    var dias=(CFG.getPlanDias()[plan])||30;
    s.plan=plan; s.fecha_inicio=fi; s.fecha_vencimiento=addDays(fi,dias); s.activo=true;

    var PLAN_ABONOS=CFG.getPlanAbonos();
    var PLAN_PRECIO=CFG.getPlanPrecio();

    if(tipo==='parcial'&&PLAN_ABONOS[plan]&&PLAN_ABONOS[plan].length){
      s.abonos=PLAN_ABONOS[plan].map(function(a,i){
        return {num:i+1,monto:a.monto,fecha_limite:addWeeks(fi,a.semanas),pagado:false,fecha_pago:null,
                vendedor_id:vendedor?String(vendedor.id):null,vendedor_nombre:vendedor?vendedor.nombre:null};
      });
    } else {
      s.abonos=[{num:1,monto:PLAN_PRECIO[plan],fecha_limite:fi,pagado:true,fecha_pago:fi,
                 vendedor_id:vendedor?String(vendedor.id):null,vendedor_nombre:vendedor?vendedor.nombre:null}];
    }
    GymDB.setSocio(s);
    window.SOCIOS=GymDB.getSocios();
    var modal=ge('modal-pago'); if(modal) modal.classList.remove('open');
    window.detTab='membresia';
    CFG.renderDetalle();
  }

  // ── API pública ───────────────────────────────────────────────
  return {
    init: function(config){
      Object.keys(config).forEach(function(k){ CFG[k]=config[k]; });
    },
    nextSocioId:     nextSocioId,
    calcVencimiento: calcVencimiento,
    abrirNuevo:      abrirNuevo,
    abrirEditar:     abrirEditar,
    guardar:         guardar,
    renderLista:     renderLista,
    renderMembresia: renderMembresia,
    renderInfoGeneral: renderInfoGeneral,
    htmlForm:        htmlForm,
    pagarAbono:      _pagarAbono,
    abrirModalPago:  _abrirModalPago
  };

})();

// ── CARGAR PANEL ESTUDIANTE ─────────────────────────────
async function cargarPanelEstudiante() {
  const perfil = perfilStorage.getPerfil();
  const nombre = perfil ? `${perfil.nombres}` : sesion.nombre.split(" ")[0];
  const datosPerfil = perfil?.perfil || {};

  document.getElementById("estudianteSaludo").textContent = nombre;

  // Estadísticas rápidas
  const promedio = parseFloat(datosPerfil.promedio) || 0;
  document.getElementById("panelEstPromedio").textContent =
    promedio > 0 ? promedio.toFixed(1) : "—";
  document.getElementById("panelEstSemestre").textContent = datosPerfil.semestre
    ? `${datosPerfil.semestre}°`
    : "—";

  // Cargar tutorías del servidor
  const tutorias = await cargarTutorias();
  document.getElementById("estTutoriasCount").textContent = tutorias.length;

  // Mostrar tarjetas
  const lista = document.getElementById("estListaTutorias");
  if (tutorias.length === 0) {
    lista.innerHTML =
      '<p class="sin-datos">No tienes tutorías programadas. ¡Programa una!</p>';
    document.getElementById("estTutoriasSubtitulo").textContent =
      "Sin tutorías";
  } else {
    lista.innerHTML = tutorias
      .map((t) => tarjetaTutoriaHTML(t, "estudiante"))
      .join("");
    document.getElementById("estTutoriasSubtitulo").textContent =
      `${tutorias.length} tutoría(s) registradas`;
  }

  renderizarGrafica(datosPerfil, tutorias);
  renderizarCalendario("est", tutorias);
}

// ── CARGAR PANEL DOCENTE ────────────────────────────────
async function cargarPanelDocente() {
  const perfil = perfilStorage.getPerfil();
  const nombre = perfil ? `${perfil.nombres}` : sesion.nombre.split(" ")[0];

  document.getElementById("docenteSaludo").textContent = nombre;

  const tutorias = await cargarTutorias();

  document.getElementById("docTutoriasMes").textContent = tutorias.length;

  // Contar estudiantes únicos
  const estudiantesUnicos = [...new Set(tutorias.map((t) => t.estudiante_id))];
  document.getElementById("docEstudiantesCount").textContent =
    estudiantesUnicos.length;

  // Mostrar tarjetas
  const lista = document.getElementById("docListaTutorias");
  if (tutorias.length === 0) {
    lista.innerHTML =
      '<p class="sin-datos">No tienes tutorías programadas.</p>';
    document.getElementById("docTutoriasSubtitulo").textContent =
      "Sin tutorías";
  } else {
    lista.innerHTML = tutorias
      .map((t) => tarjetaTutoriaHTML(t, "docente"))
      .join("");
    document.getElementById("docTutoriasSubtitulo").textContent =
      `${tutorias.length} tutoría(s)`;
  }

  renderizarCalendario("doc", tutorias);
}

// ── GRÁFICA DE RENDIMIENTO (SVG) ────────────────────────
function renderizarGrafica(perfil, tutorias) {
  const wrap = document.getElementById("estGraficaWrap");
  const pie = document.getElementById("estGraficaPie");
  if (!wrap || !pie) return;

  // Datos del historial guardado o generados de ejemplo
  let historial = academicoStorage.getHistorial();

  if (historial.length === 0) {
    // Generar historial coherente si no hay datos reales
    const promedioActual = parseFloat(perfil.promedio) || 3.5;
    const sems = ["2024-1", "2024-2", "2025-1", "2025-2", "2026-1"];
    historial = sems.map((s, i) => ({
      semestre: s,
      promedio: Math.min(
        5,
        Math.max(1.5, promedioActual + (Math.random() - 0.5) * 0.8),
      ),
    }));
    historial[historial.length - 1].promedio = promedioActual;
    academicoStorage.setHistorial(historial);
  }

  const W = 560,
    H = 180,
    PL = 40,
    PR = 20,
    PT = 20,
    PB = 40;
  const anchoGrafica = W - PL - PR;
  const altoGrafica = H - PT - PB;
  const minProm = 1.5,
    maxProm = 5.0;
  const n = historial.length;

  const xPos = (i) => PL + (i / (n - 1)) * anchoGrafica;
  const yPos = (v) =>
    PT + altoGrafica - ((v - minProm) / (maxProm - minProm)) * altoGrafica;

  // Línea de área (relleno debajo de la curva)
  const puntosLinea = historial
    .map((h, i) => `${xPos(i)},${yPos(h.promedio)}`)
    .join(" ");
  const puntosArea = `${xPos(0)},${H - PB} ${puntosLinea} ${xPos(n - 1)},${H - PB}`;

  // Línea de mínimo aprobatorio
  const yMinimo = yPos(CONFIG.PROMEDIO_MINIMO);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="grafica-svg">
    <defs>
      <linearGradient id="gradGrafica" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#007b99" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#007b99" stop-opacity="0.02"/>
      </linearGradient>
    </defs>

    <polygon points="${puntosArea}" fill="url(#gradGrafica)"/>
    <polyline points="${puntosLinea}" fill="none" stroke="#007b99" stroke-width="2.5" stroke-linejoin="round"/>

    <line x1="${PL}" y1="${yMinimo}" x2="${W - PR}" y2="${yMinimo}"
          stroke="#f39200" stroke-width="1.5" stroke-dasharray="5,4"/>
    <text x="${W - PR - 2}" y="${yMinimo - 4}" text-anchor="end" 
          font-size="10" fill="#f39200">3.0 mín</text>`;

  // Puntos y etiquetas
  historial.forEach((h, i) => {
    const x = xPos(i);
    const y = yPos(h.promedio);
    const color = h.promedio < CONFIG.PROMEDIO_MINIMO ? "#f39200" : "#007b99";

    svg += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`;
    svg += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="10" font-weight="600" fill="${color}">${h.promedio.toFixed(1)}</text>`;
    svg += `<text x="${x}" y="${H - PB + 16}" text-anchor="middle" font-size="9" fill="#848585">${h.semestre}</text>`;
  });

  svg += "</svg>";
  wrap.innerHTML = svg;

  // Mini estadísticas debajo de la gráfica
  const promedios = historial.map((h) => h.promedio);
  const promGeneral = (
    promedios.reduce((a, b) => a + b, 0) / promedios.length
  ).toFixed(2);
  const mejor = Math.max(...promedios).toFixed(2);
  const peor = Math.min(...promedios).toFixed(2);
  const semMejor =
    historial[promedios.indexOf(Math.max(...promedios))].semestre;
  const semPeor = historial[promedios.indexOf(Math.min(...promedios))].semestre;

  pie.innerHTML = `
    <div class="grafica-pie__item">
      <span class="grafica-pie__val">${promGeneral}</span>
      <span class="grafica-pie__lbl">Promedio general</span>
    </div>
    <div class="grafica-pie__item">
      <span class="grafica-pie__val" style="color:#22c55e">${mejor}</span>
      <span class="grafica-pie__lbl">Mejor (${semMejor})</span>
    </div>
    <div class="grafica-pie__item">
      <span class="grafica-pie__val" style="color:${parseFloat(peor) < 3 ? "#ef4444" : "#f39200"}">${peor}</span>
      <span class="grafica-pie__lbl">A mejorar (${semPeor})</span>
    </div>
  `;
}

// ── CALENDARIO VISUAL ───────────────────────────────────
const _calEstado = {}; // estado por prefijo ('est' | 'doc')

function renderizarCalendario(prefijo, tutorias) {
  if (!_calEstado[prefijo]) {
    const hoy = new Date();
    _calEstado[prefijo] = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  }
  _renderizarMes(prefijo, tutorias);
}

function navegarCalendario(prefijo, delta) {
  const estado = _calEstado[prefijo];
  if (!estado) return;

  estado.mes += delta;
  if (estado.mes > 11) {
    estado.mes = 0;
    estado.anio++;
  }
  if (estado.mes < 0) {
    estado.mes = 11;
    estado.anio--;
  }

  const tutorias = academicoStorage.getTutorias();
  _renderizarMes(prefijo, tutorias);
}

function _renderizarMes(prefijo, tutorias) {
  const estado = _calEstado[prefijo];
  const { anio, mes } = estado;

  const hoy = new Date();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const diaSemana = primerDia.getDay();
  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  // Marcar días con tutorías
  const diasConTutoria = new Set(
    tutorias
      .filter((t) => {
        const f = new Date(t.fecha + "T00:00");
        return (
          f.getFullYear() === anio &&
          f.getMonth() === mes &&
          t.estado !== "cancelada"
        );
      })
      .map((t) => new Date(t.fecha + "T00:00").getDate()),
  );

  // Título del calendario
  const titulo = document
    .getElementById(`${prefijo}CalendarioGrilla`)
    ?.closest(".calendario-wrap")
    ?.querySelector(".calendario-titulo");
  if (titulo) titulo.textContent = `📅 ${nombresMeses[mes]} ${anio}`;

  let html = "";

  // Celdas vacías antes del primer día
  for (let i = 0; i < diaSemana; i++) {
    html += '<div class="calendario-celda otro-mes"></div>';
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const esHoy =
      dia === hoy.getDate() &&
      mes === hoy.getMonth() &&
      anio === hoy.getFullYear();
    const conTut = diasConTutoria.has(dia);
    const clases = [
      "calendario-celda",
      esHoy ? "hoy" : "",
      conTut ? "con-tutoria" : "",
    ]
      .join(" ")
      .trim();

    html += `
      <div class="${clases}" onclick="seleccionarDia('${prefijo}', ${dia})">
        <span class="calendario-celda__num">${dia}</span>
        ${conTut ? '<span class="calendario-celda__punto"></span>' : ""}
      </div>`;
  }

  const grilla = document.getElementById(`${prefijo}CalendarioGrilla`);
  if (grilla) grilla.innerHTML = html;
}

function seleccionarDia(prefijo, dia) {
  const estado = _calEstado[prefijo];
  const tutorias = academicoStorage.getTutorias();
  const { anio, mes } = estado;

  // Marcar la celda seleccionada
  document
    .querySelectorAll(`#${prefijo}CalendarioGrilla .calendario-celda`)
    .forEach((c) => c.classList.remove("seleccionada"));

  // Buscar tutorías de ese día
  const fechaStr = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const del_dia = tutorias.filter(
    (t) => t.fecha === fechaStr && t.estado !== "cancelada",
  );

  const detalle = document.getElementById(`${prefijo}CalendarioDetalle`);
  const fechaDiv = document.getElementById(`${prefijo}DetalleFecha`);
  const listaDiv = document.getElementById(`${prefijo}DetalleLista`);

  if (!detalle) return;

  detalle.classList.remove("oculto");
  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  if (fechaDiv) fechaDiv.textContent = `${dia} de ${nombresMeses[mes]}`;

  if (del_dia.length === 0) {
    listaDiv.innerHTML = '<p class="sin-datos">Sin tutorías este día</p>';
    return;
  }

  listaDiv.innerHTML = del_dia
    .map(
      (t) => `
    <div class="calendario-evento">
      <span class="calendario-evento__hora">${t.hora?.slice(0, 5)}</span>
      <div class="calendario-evento__info">
        <div class="calendario-evento__asig">${t.asignatura}</div>
        <div class="calendario-evento__meta">
          ${t.nombre_docente || t.nombre_estudiante || ""} · 
          <span class="calendario-evento__modo">${iconoModalidad(t.modalidad)} ${t.modalidad}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

// ── NOTIFICACIONES ──────────────────────────────────────
async function cargarNotificaciones() {
  if (!sesion.activa) return;

  try {
    const notifs = await llamarAPI("/notificaciones", "GET");
    const noLeidas = notifs.filter((n) => !n.leida).length;
    const badge = document.getElementById("campanaBadge");

    if (noLeidas > 0) {
      badge.textContent = noLeidas > 99 ? "99+" : noLeidas;
      badge.classList.remove("oculto");
    } else {
      badge.classList.add("oculto");
    }

    // Renderizar en el panel de notificaciones
    const lista = document.getElementById("notifLista");
    if (!lista) return;

    if (notifs.length === 0) {
      lista.innerHTML =
        '<div class="notif-vacia">No tienes notificaciones</div>';
      return;
    }

    lista.innerHTML = notifs
      .slice(0, 20)
      .map(
        (n) => `
      <div class="notif-item ${n.leida ? "" : "no-leida"}" onclick="leerNotif(${n.id})">
        <div class="notif-item__icono">${n.icono || "🔔"}</div>
        <div class="notif-item__cuerpo">
          <div class="notif-item__titulo">${n.titulo}</div>
          <div class="notif-item__desc">${n.descripcion || ""}</div>
          <div class="notif-item__tiempo">${formatearTiempo(n.creada_en)}</div>
        </div>
        ${!n.leida ? '<span class="notif-item__punto"></span>' : ""}
      </div>
    `,
      )
      .join("");
  } catch (err) {
    // Si no hay backend, no romper la app
    console.warn("No se pudieron cargar notificaciones:", err);
  }
}

function alternarNotificaciones() {
  const panel = document.getElementById("notifPanel");
  panel.classList.toggle("oculto");

  if (!panel.classList.contains("oculto")) {
    document.addEventListener("click", cerrarNotifFuera, { once: true });
  }
}

function cerrarNotifFuera(e) {
  const panel = document.getElementById("notifPanel");
  if (!panel.contains(e.target) && e.target.id !== "botonCampana") {
    panel.classList.add("oculto");
  }
}

async function leerNotif(id) {
  try {
    await llamarAPI(`/notificaciones/${id}/leer`, "PATCH");
    cargarNotificaciones();
  } catch (err) {
    console.warn("Error marcando notificación:", err);
  }
}

async function marcarTodasLeidas() {
  try {
    await llamarAPI("/notificaciones/leer-todas", "PATCH");
    cargarNotificaciones();
  } catch (err) {
    console.warn("Error:", err);
  }
}

// ── TOSTADA (TOAST) ─────────────────────────────────────
function mostrarTostada(mensaje, tipo) {
  const tostada = document.getElementById("tostada");
  tostada.textContent = mensaje;
  tostada.className = "tostada tostada--visible";

  if (tipo === "error") tostada.classList.add("tostada--error");
  if (tipo === "alerta") tostada.classList.add("tostada--alerta");

  clearTimeout(window._tostadaTimer);
  window._tostadaTimer = setTimeout(
    () => tostada.classList.remove("tostada--visible"),
    3500,
  );
}

// ── UTILIDADES ──────────────────────────────────────────
function formatearFecha(isoFecha) {
  if (!isoFecha) return "—";
  const [y, m, d] = isoFecha.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatearTiempo(isoFecha) {
  if (!isoFecha) return "";
  const diff = Math.floor((Date.now() - new Date(isoFecha).getTime()) / 60000);
  if (diff < 1) return "Ahora mismo";
  if (diff < 60) return `Hace ${diff} min`;
  if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
  return `Hace ${Math.floor(diff / 1440)} días`;
}

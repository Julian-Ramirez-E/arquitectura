// ── PROGRAMAR TUTORÍA ───────────────────────────────────
async function alEnviarTutoria(e) {
  e.preventDefault();

  const asignatura = document.getElementById("tutAsignatura").value;
  const modalidad = document.getElementById("tutModalidad").value;
  const fecha = document.getElementById("tutFecha").value;
  const hora = document.getElementById("tutHora").value;
  const observaciones = document.getElementById("tutObservaciones").value;
  let hayError = false;

  [
    "tutAsignatura",
    "tutModalidad",
    "tutFecha",
    "tutHora",
    "tutEstudiante",
    "tutTutor",
  ].forEach((id) => quitarError(id));

  if (!asignatura) {
    ponerError("tutAsignatura", "Selecciona una asignatura");
    hayError = true;
  }
  if (!modalidad) {
    ponerError("tutModalidad", "Selecciona la modalidad");
    hayError = true;
  }
  if (!fecha) {
    ponerError("tutFecha", "La fecha es obligatoria");
    hayError = true;
  }
  if (!hora) {
    ponerError("tutHora", "La hora es obligatoria");
    hayError = true;
  }

  let docente_id = null;
  let estudiante_id = null;

  if (sesion.rol === "estudiante") {
    const tutorSelect = document.getElementById("tutTutor");
    docente_id = tutorSelect.value;
    if (!docente_id) {
      ponerError("tutTutor", "Selecciona un tutor");
      hayError = true;
    }
  }

  if (sesion.rol === "docente") {
    const estInput = document.getElementById("tutEstudiante").value.trim();
    if (!estInput) {
      ponerError("tutEstudiante", "Escribe el código del estudiante");
      hayError = true;
    }
  }

  if (hayError) return;

  try {
    // El backend (módulo hexagonal) toma la identidad del TOKEN: el estudiante envía docente_id (numérico)
    // y el docente identifica al estudiante por su código institucional.
    const cuerpo = { asignatura, modalidad, fecha, hora, observaciones };
    if (sesion.rol === "estudiante") cuerpo.docente_id = CONFIG.MODO_DEMO ? docente_id : Number(docente_id);
    if (sesion.rol === "docente") {
      cuerpo.estudiante_codigo = document.getElementById("tutEstudiante").value.trim();
    }
    await llamarAPI("/tutorias", "POST", cuerpo);

    mostrarTostada("¡Tutoría programada correctamente!", "exito");
    document.getElementById("formularioTutoria").reset();
    irAPagina(sesion.rol === "docente" ? "panel-docente" : "panel-estudiante");
  } catch (err) {
    mostrarTostada(err.mensaje || "No se pudo programar la tutoría", "error");
  }
}

// ── CARGAR TUTORÍAS DEL PANEL ───────────────────────────
async function cargarTutorias() {
  try {
    const tutorias = await llamarAPI("/tutorias", "GET");
    academicoStorage.setTutorias(tutorias);
    return tutorias;
  } catch (err) {
    console.error("Error cargando tutorías:", err);
    return academicoStorage.getTutorias(); // retornar caché si falla el servidor
  }
}

// ── RENDERIZAR TARJETAS DE TUTORÍA ──────────────────────
function tarjetaTutoriaHTML(t, vistaRol) {
  const esEstudiante = vistaRol === "estudiante";
  const nombre = esEstudiante
    ? t.nombre_docente || "Tutor"
    : t.nombre_estudiante || "Estudiante";
  const etiqueta = esEstudiante ? "Tutor" : "Estudiante";

  const colores = {
    pendiente: "#007b99",
    confirmada: "#0ea5e9",
    completada: "#22c55e",
    realizada: "#22c55e",
    cancelada: "#ef4444",
  };
  const esDocente = vistaRol === "docente";
  const puedeCancelar = t.estado === "pendiente" || t.estado === "confirmada";
  const color = colores[t.estado] || "#007b99";

  return `
    <div class="tarjeta-tutoria">
      <div class="tarjeta-tutoria__estado" style="background:${color}">
        ${t.estado.charAt(0).toUpperCase() + t.estado.slice(1)}
      </div>
      <div class="tarjeta-tutoria__cuerpo">
        <div class="tarjeta-tutoria__asig">${t.asignatura}</div>
        <div class="tarjeta-tutoria__meta">${etiqueta}: <strong>${nombre}</strong></div>
        <div class="tarjeta-tutoria__fecha">📅 ${formatearFecha(t.fecha)} · ⏰ ${t.hora?.slice(0, 5)}</div>
        <div class="tarjeta-tutoria__modo">${iconoModalidad(t.modalidad)} ${t.modalidad}</div>
      </div>
      ${
        esDocente && t.estado === "pendiente"
          ? `
        <button class="tarjeta-tutoria__btn" onclick="confirmarTutoria(${t.id})" type="button">
          Confirmar
        </button>`
          : ""
      }
      ${
        puedeCancelar
          ? `
        <button class="tarjeta-tutoria__btn" onclick="cancelarTutoria(${t.id})" type="button">
          Cancelar
        </button>`
          : ""
      }
    </div>
  `;
}

async function confirmarTutoria(id) {
  try {
    await llamarAPI(`/tutorias/${id}/confirmar`, "PATCH");
    mostrarTostada("Tutoría confirmada", "exito");
    cargarPanelDocente();
  } catch (err) {
    mostrarTostada(err.mensaje || "No se pudo confirmar", "error");
  }
}

// ── SELECTOR DE TUTOR: docentes reales desde el backend ─
async function cargarDocentes() {
  const select = document.getElementById("tutTutor");
  if (!select || sesion.rol !== "estudiante") return;

  let docentes;
  if (CONFIG.MODO_DEMO) {
    docentes = ["Lina M. Montoya Suárez", "Carlos Andrés Peña", "Sandra Milena Ríos"].map((n) => ({ id: n, nombre: n }));
  } else {
    try {
      docentes = await llamarAPI("/tutorias/docentes", "GET");
    } catch (err) {
      mostrarTostada(err.mensaje || "No se pudo cargar la lista de tutores", "error");
      return;
    }
  }
  select.innerHTML = '<option value="">— Selecciona —</option>' +
    docentes.map((d) => `<option value="${d.id}">${d.nombre}</option>`).join("");
}

async function cancelarTutoria(id) {
  if (!confirm("¿Cancelar esta tutoría?")) return;

  try {
    await llamarAPI(`/tutorias/${id}/cancelar`, "PATCH");
    mostrarTostada("Tutoría cancelada", "exito");

    // Recargar el panel
    if (sesion.rol === "estudiante") cargarPanelEstudiante();
    else cargarPanelDocente();
  } catch (err) {
    mostrarTostada(err.mensaje || "No se pudo cancelar", "error");
  }
}

function iconoModalidad(m) {
  if (!m) return "";
  var ml = m.toLowerCase();
  if (ml.includes("presencial")) return "🏫";
  if (ml.includes("virtual"))    return "💻";
  if (ml.includes("h")) return "🔀";
  return "";
}

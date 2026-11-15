// ── COMPLETAR PERFIL ────────────────────────────────────
// Muestra el formulario correcto según el rol activo
function mostrarFormPerfil() {
  const rol = sesion.rol;
  document.getElementById("perfilFormEstudiante").classList.add("oculto");
  document.getElementById("perfilFormDocente").classList.add("oculto");
  document.getElementById("perfilFormAdmin").classList.add("oculto");

  if (rol === "estudiante")
    document.getElementById("perfilFormEstudiante").classList.remove("oculto");
  if (rol === "docente")
    document.getElementById("perfilFormDocente").classList.remove("oculto");
  if (rol === "admin")
    document.getElementById("perfilFormAdmin").classList.remove("oculto");

  const etiquetas = {
    estudiante: "Estudiante",
    docente: "Docente / Tutor",
    admin: "Administrador",
  };
  document.getElementById("perfilRolEtiqueta").textContent =
    etiquetas[rol] || "";
}

// ── GUARDAR PERFIL ESTUDIANTE ───────────────────────────
async function alEnviarPerfilEstudiante(e) {
  e.preventDefault();

  const datos = {
    codigo: document.getElementById("estCodigo").value.trim(),
    documento: document.getElementById("estDocumento").value.trim(),
    programa: document.getElementById("estPrograma").value,
    semestre: document.getElementById("estSemestre").value,
    telefono: document.getElementById("estTelefono").value.trim(),
    promedio: parseFloat(document.getElementById("estPromedio").value) || 0,
  };

  let hayError = false;
  if (!datos.codigo) {
    ponerError("estCodigo", "Requerido");
    hayError = true;
  }
  if (!datos.documento) {
    ponerError("estDocumento", "Requerido");
    hayError = true;
  }
  if (!datos.programa) {
    ponerError("estPrograma", "Selecciona el programa");
    hayError = true;
  }
  if (!datos.semestre) {
    ponerError("estSemestre", "Selecciona el semestre");
    hayError = true;
  }
  if (hayError) return;

  try {
    const resp = await llamarAPI("/perfil/estudiante", "POST", datos);
    perfilStorage.clearPerfil(); // invalidar caché

    mostrarTostada("Perfil guardado correctamente", "exito");

    irAPagina("panel-estudiante");
  } catch (err) {
    mostrarTostada(err.mensaje || "Error guardando perfil", "error");
  }
}

// ── GUARDAR PERFIL DOCENTE ──────────────────────────────
async function alEnviarPerfilDocente(e) {
  e.preventDefault();

  const asignaturas = [
    ...document.querySelectorAll("#docAsignaturas input:checked"),
  ].map((cb) => cb.closest("label").textContent.trim());

  const datos = {
    cedula: document.getElementById("docCedula").value.trim(),
    codigo_docente: document.getElementById("docCodigo").value.trim(),
    facultad: document.getElementById("docFacultad").value,
    telefono: document.getElementById("docTelefono").value.trim(),
    asignaturas,
  };

  let hayError = false;
  if (!datos.cedula) {
    ponerError("docCedula", "Requerido");
    hayError = true;
  }
  if (!datos.facultad) {
    ponerError("docFacultad", "Selecciona facultad");
    hayError = true;
  }
  if (asignaturas.length === 0) {
    ponerError("docAsignaturas", "Selecciona al menos una");
    hayError = true;
  }
  if (hayError) return;

  try {
    await llamarAPI("/perfil/docente", "POST", datos);
    perfilStorage.clearPerfil();
    mostrarTostada("Perfil guardado correctamente", "exito");
    irAPagina("panel-docente");
  } catch (err) {
    mostrarTostada(err.mensaje || "Error guardando perfil", "error");
  }
}

// ── GUARDAR PERFIL ADMIN ────────────────────────────────
async function alEnviarPerfilAdmin(e) {
  e.preventDefault();

  const datos = {
    cedula: document.getElementById("admCedula").value.trim(),
    cargo: document.getElementById("admCargo").value,
    dependencia: document.getElementById("admDependencia").value.trim(),
    telefono: document.getElementById("admTelefono").value.trim(),
  };

  let hayError = false;
  if (!datos.cedula) {
    ponerError("admCedula", "Requerido");
    hayError = true;
  }
  if (!datos.cargo) {
    ponerError("admCargo", "Selecciona el cargo");
    hayError = true;
  }
  if (hayError) return;

  try {
    await llamarAPI("/perfil/admin", "POST", datos);
    perfilStorage.clearPerfil();
    mostrarTostada("Perfil guardado correctamente", "exito");
    irAPagina("panel-admin");
  } catch (err) {
    mostrarTostada(err.mensaje || "Error guardando perfil", "error");
  }
}

// ── CARGAR PÁGINA MI PERFIL ─────────────────────────────
async function cargarMiPerfil() {
  // Primero intenta del caché, luego del servidor
  let perfil = perfilStorage.getPerfil();

  if (!perfil) {
    try {
      perfil = await llamarAPI("/perfil", "GET");
      perfilStorage.setPerfil(perfil);
    } catch (err) {
      console.error("Error cargando perfil:", err);
      return;
    }
  }

  // Datos básicos del hero
  document.getElementById("perfilHeroNombre").textContent =
    `${perfil.nombres} ${perfil.apellidos}`;
  document.getElementById("perfilHeroCorreo").textContent = perfil.correo;
  document.getElementById("perfilHeroRol").textContent = perfil.rol;

  // Foto de perfil
  const fotoPerfil =
    perfilStorage.getFotoPerfil() || perfil.fotos?.foto_perfil || "";
  if (fotoPerfil) {
    document.getElementById("perfilFotoImg").src = fotoPerfil;
    document.getElementById("perfilFotoImg").classList.remove("oculto");
    document.getElementById("perfilFotoIniciales").classList.add("oculto");
  } else {
    document.getElementById("perfilFotoIniciales").textContent = sesion.inicial;
    document.getElementById("perfilFotoIniciales").classList.remove("oculto");
  }

  // Foto de portada
  const fotoPortada =
    perfilStorage.getFotoPortada() || perfil.fotos?.foto_portada || "";
  if (fotoPortada) {
    document.getElementById("perfilPortadaImg").src = fotoPortada;
    document.getElementById("perfilPortadaImg").classList.remove("oculto");
  }

  // Contenido según el rol
  const contenedor = document.getElementById("perfilContenido");
  if (perfil.rol === "estudiante")
    contenedor.innerHTML = perfilEstudianteHTML(perfil);
  else if (perfil.rol === "docente")
    contenedor.innerHTML = perfilDocenteHTML(perfil);
  else contenedor.innerHTML = perfilAdminHTML(perfil);
}

function perfilEstudianteHTML(p) {
  const d = p.perfil || {};
  return `
    <div class="perfil-seccion">
      <h3 class="perfil-seccion__titulo">Datos Académicos</h3>
      <div class="perfil-datos-grilla">
        <div class="perfil-dato"><span class="perfil-dato__label">Código</span><span>${d.codigo || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Programa</span><span>${d.programa || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Semestre</span><span>${d.semestre || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Promedio</span>
          <span class="${(d.promedio || 0) < 3.0 ? "texto-naranja" : ""}">${d.promedio || "—"}</span>
        </div>
        <div class="perfil-dato"><span class="perfil-dato__label">Teléfono</span><span>${d.telefono || "—"}</span></div>
      </div>
    </div>
  `;
}

function perfilDocenteHTML(p) {
  const d = p.perfil || {};
  const asig = (d.asignaturas || []).join(", ") || "—";
  return `
    <div class="perfil-seccion">
      <h3 class="perfil-seccion__titulo">Datos del Docente</h3>
      <div class="perfil-datos-grilla">
        <div class="perfil-dato"><span class="perfil-dato__label">Cédula</span><span>${d.cedula || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Facultad</span><span>${d.facultad || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Código</span><span>${d.codigo_docente || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Teléfono</span><span>${d.telefono || "—"}</span></div>
        <div class="perfil-dato" style="grid-column:1/-1"><span class="perfil-dato__label">Asignaturas</span><span>${asig}</span></div>
      </div>
    </div>
  `;
}

function perfilAdminHTML(p) {
  const d = p.perfil || {};
  return `
    <div class="perfil-seccion">
      <h3 class="perfil-seccion__titulo">Datos del Administrador</h3>
      <div class="perfil-datos-grilla">
        <div class="perfil-dato"><span class="perfil-dato__label">Cédula</span><span>${d.cedula || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Cargo</span><span>${d.cargo || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Dependencia</span><span>${d.dependencia || "—"}</span></div>
        <div class="perfil-dato"><span class="perfil-dato__label">Teléfono</span><span>${d.telefono || "—"}</span></div>
      </div>
    </div>
  `;
}

// ── SUBIR FOTO DE PERFIL ────────────────────────────────
function subirFotoPerfil(input) {
  const archivo = input.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = async (e) => {
    const base64 = e.target.result;
    perfilStorage.setFotoPerfil(base64);

    // Mostrar inmediatamente
    document.getElementById("perfilFotoImg").src = base64;
    document.getElementById("perfilFotoImg").classList.remove("oculto");
    document.getElementById("perfilFotoIniciales").classList.add("oculto");

    // Chip en la barra superior
    const chipAv = document.getElementById("chipAvatar");
    chipAv.style.backgroundImage = `url(${base64})`;
    chipAv.textContent = "";

    // Subir al servidor
    try {
      await llamarAPI("/perfil/foto", "POST", {
        foto_base64: base64,
        tipo: "perfil",
      });
    } catch (err) {
      console.warn("No se pudo guardar la foto en el servidor:", err);
    }
  };
  lector.readAsDataURL(archivo);
}

function subirPortada(input) {
  const archivo = input.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = async (e) => {
    const base64 = e.target.result;
    perfilStorage.setFotoPortada(base64);

    document.getElementById("perfilPortadaImg").src = base64;
    document.getElementById("perfilPortadaImg").classList.remove("oculto");

    try {
      await llamarAPI("/perfil/foto", "POST", {
        foto_base64: base64,
        tipo: "portada",
      });
    } catch (err) {
      console.warn("No se pudo guardar la portada:", err);
    }
  };
  lector.readAsDataURL(archivo);
}

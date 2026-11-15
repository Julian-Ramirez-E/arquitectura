// ── Estado de sesión global ─────────────────────────────
const sesion = {
  activa: false,
  id: null,
  nombre: "",
  inicial: "?",
  correo: "",
  rol: "",
};

// ── Páginas y sus títulos ───────────────────────────────
const tituloPagina = {
  "inicio-sesion": "Inicio de Sesión",
  "crear-cuenta": "Crear Cuenta",
  "completar-perfil": "Completar Perfil",
  "panel-estudiante": "Mi Panel",
  "panel-docente": "Panel Docente",
  "panel-admin": "Panel Admin",
  "programar-tutoria": "Programar Tutoría",
  "mi-perfil": "Mi Perfil",
  "recuperar-contrasena": "Recuperar Contraseña",
  "admin-usuarios": "Gestión de Usuarios",
  "admin-reportes": "Reportes",
  "admin-notificaciones": "Notificaciones",
  "admin-asignacion": "Asignación Tutor",
  "admin-auditoria": "Auditoría",
  "admin-configuracion": "Configuración",
};

// Páginas que no requieren sesión iniciada
const paginasPublicas = new Set([
  "inicio-sesion",
  "crear-cuenta",
  "recuperar-contrasena",
]);

// ── NAVEGACIÓN SPA ──────────────────────────────────────
function irAPagina(nombre) {
  if (!paginasPublicas.has(nombre) && !sesion.activa) {
    irAPagina("inicio-sesion");
    return;
  }

  document
    .querySelectorAll(".pagina")
    .forEach((p) => p.classList.remove("activa"));
  const pagina = document.getElementById(`pagina-${nombre}`);
  if (pagina) pagina.classList.add("activa");

  const titulo = document.getElementById("tituloPaginaActual");
  if (titulo) titulo.textContent = tituloPagina[nombre] || nombre;

  document.querySelectorAll(".lateral-item").forEach((item) => {
    item.classList.toggle("activo", item.dataset.pagina === nombre);
  });

  cerrarMenu();

  // Cargar datos si es un panel
  if (nombre === "panel-estudiante") cargarPanelEstudiante();
  if (nombre === "panel-docente") cargarPanelDocente();
  if (nombre === "mi-perfil") cargarMiPerfil();
  if (nombre === "completar-perfil") mostrarFormPerfil();
  if (nombre === "programar-tutoria") {
    ponerFechaMinima();
    cargarDocentes();
  }

  authStorage.setUltimaActividad();

  window.scrollTo(0, 0);
}

// ── MENÚ LATERAL (móvil) ────────────────────────────────
function alternarMenu() {
  document.getElementById("barraLateral").classList.toggle("abierta");
  document.getElementById("overlayMenu").classList.toggle("oculto");
}

function cerrarMenu() {
  document.getElementById("barraLateral").classList.remove("abierta");
  document.getElementById("overlayMenu").classList.add("oculto");
}

// ── VALIDACIONES DE FORMULARIO ──────────────────────────
function ponerError(idCampo, mensaje) {
  const errorEl = document.getElementById(
    "error" + idCampo.charAt(0).toUpperCase() + idCampo.slice(1),
  );
  if (errorEl) errorEl.textContent = mensaje;

  const campo = document.getElementById(idCampo);
  if (campo) campo.classList.add("campo--invalido");
}

function quitarError(idCampo) {
  const errorEl = document.getElementById(
    "error" + idCampo.charAt(0).toUpperCase() + idCampo.slice(1),
  );
  if (errorEl) errorEl.textContent = "";

  const campo = document.getElementById(idCampo);
  if (campo) campo.classList.remove("campo--invalido");
}

// Indicador de fortaleza de contraseña
function medirFortaleza(valor) {
  const wrap = document.getElementById("fortalezaWrap");
  const barra = document.getElementById("fortalezaBarra");
  const texto = document.getElementById("fortalezaTexto");

  if (!wrap) return;

  if (!valor) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";

  let puntaje = 0;
  if (valor.length >= 8) puntaje++;
  if (/[A-Z]/.test(valor)) puntaje++;
  if (/[0-9]/.test(valor)) puntaje++;
  if (/[^A-Za-z0-9]/.test(valor)) puntaje++;

  const niveles = [
    { label: "Muy débil", color: "#ef4444", ancho: "20%" },
    { label: "Débil", color: "#f97316", ancho: "40%" },
    { label: "Regular", color: "#eab308", ancho: "60%" },
    { label: "Buena", color: "#22c55e", ancho: "80%" },
    { label: "Muy fuerte", color: "#16a34a", ancho: "100%" },
  ];

  const nivel = niveles[Math.min(puntaje, 4)];
  barra.style.width = nivel.ancho;
  barra.style.background = nivel.color;
  texto.textContent = nivel.label;
  texto.style.color = nivel.color;
}

// ── MOSTRAR / OCULTAR CONTRASEÑA ────────────────────────
function alternarContrasena(idInput, boton) {
  const input = document.getElementById(idInput);
  if (!input) return;

  input.type = input.type === "password" ? "text" : "password";
  boton.title =
    input.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña";
}

// ── FECHA MÍNIMA EN EL FORMULARIO DE TUTORÍA ────────────
function ponerFechaMinima() {
  const campo = document.getElementById("tutFecha");
  if (!campo) return;

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  campo.min = manana.toISOString().split("T")[0];
}

// ── ADMIN: FILTRAR TABLA DE USUARIOS ───────────────────
function filtrarTablaUsuarios(texto) {
  const filas = document.querySelectorAll("#cuerpoTablaUsuarios tr");
  const filtroRol =
    document.getElementById("filtroRolUsuarios")?.value.toLowerCase() || "";
  const filtroEstado =
    document.getElementById("filtroEstadoUsuarios")?.value.toLowerCase() || "";
  const busqueda = (
    texto ||
    document.getElementById("buscarUsuario")?.value ||
    ""
  ).toLowerCase();

  let visible = 0;
  filas.forEach((fila) => {
    const contenido = fila.textContent.toLowerCase();
    const mostrar =
      contenido.includes(busqueda) &&
      (filtroRol === "" || contenido.includes(filtroRol)) &&
      (filtroEstado === "" || contenido.includes(filtroEstado));

    fila.style.display = mostrar ? "" : "none";
    if (mostrar) visible++;
  });

  const conteo = document.getElementById("conteoUsuarios");
  if (conteo) conteo.textContent = `Mostrando ${visible} usuario(s)`;
}

function confirmarAccionCritica(accion) {
  if (
    confirm(`¿Confirmas: "${accion}"?\n\nEsta acción no se puede deshacer.`)
  ) {
    mostrarTostada(`Ejecutando: ${accion}...`, "exito");
  }
}

function guardarConfig(idInput, nombre) {
  const valor = document.getElementById(idInput)?.value;
  if (valor !== undefined) {
    mostrarTostada(`${nombre} actualizado a ${valor}`, "exito");
  }
}

// ── SPLASH SCREEN ───────────────────────────────────────
function mostrarSplash(alTerminar) {
  const splash = document.getElementById("splash");
  const barra = document.getElementById("splashProgreso");

  barra.style.width = "0%";

  let progreso = 0;
  const intervalo = setInterval(() => {
    progreso += Math.random() * 25;
    barra.style.width = Math.min(progreso, 95) + "%";
    if (progreso >= 95) {
      clearInterval(intervalo);
      barra.style.width = "100%";
      setTimeout(() => {
        splash.classList.add("oculto");
        alTerminar?.();
      }, 400);
    }
  }, 120);
}

// ── INICIO ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  mostrarSplash(async () => {
    // Detectar si venimos de un callback de Google OAuth
    if (
      window.location.search.includes("token=") ||
      window.location.search.includes("error=oauth")
    ) {
      manejarCallbackGoogle();
      return;
    }

    // Cargar correo recordado en el login
    const recordado = authStorage.getCorreoRecordado();
    if (recordado) {
      const campoCorreo = document.getElementById("loginCorreo");
      if (campoCorreo) {
        campoCorreo.value = recordado;
        document.getElementById("loginRecordar").checked = true;
      }
    }

    // Verificar si hay sesión guardada válida
    await verificarSesionGuardada();
  });

  // ── Conectar formularios ────────────────────────────
  document
    .getElementById("formularioLogin")
    ?.addEventListener("submit", alEnviarLogin);

  document
    .getElementById("formularioRegistro")
    ?.addEventListener("submit", alEnviarRegistro);

  document
    .getElementById("formularioPerfilEstudiante")
    ?.addEventListener("submit", alEnviarPerfilEstudiante);

  document
    .getElementById("formularioPerfilDocente")
    ?.addEventListener("submit", alEnviarPerfilDocente);

  document
    .getElementById("formularioPerfilAdmin")
    ?.addEventListener("submit", alEnviarPerfilAdmin);

  document
    .getElementById("formularioTutoria")
    ?.addEventListener("submit", alEnviarTutoria);

  document
    .getElementById("formularioRecuperacion")
    ?.addEventListener("submit", alEnviarRecuperacion);

  // ── Actualizar actividad al interactuar ─────────────
  ["click", "keydown", "scroll"].forEach((evento) => {
    document.addEventListener(
      evento,
      () => {
        if (sesion.activa) authStorage.setUltimaActividad();
      },
      { passive: true },
    );
  });
});

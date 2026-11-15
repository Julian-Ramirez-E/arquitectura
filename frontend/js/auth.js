// Maneja login, registro, cierre de sesión y Google OAuth

async function llamarAPI(ruta, metodo, cuerpo) {
  var token = authStorage.getToken();

  // ── MODO DEMO: sin backend ──────────────────────────
  if (CONFIG.MODO_DEMO) {
    return await llamarAPIDemo(ruta, metodo || "GET", cuerpo || null, token);
  }

  // ── MODO REAL: fetch al backend ─────────────────────
  var opciones = {
    method: metodo || "GET",
    headers: { "Content-Type": "application/json" },
  };

  if (token) opciones.headers["Authorization"] = "Bearer " + token;
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);

  var resp;
  try {
    resp = await fetch(API_URL + ruta, opciones);
  } catch (e) {
    throw {
      mensaje:
        "No se pudo conectar al servidor. ¿Está corriendo el backend en localhost:3000?",
    };
  }

  var data = await resp.json();
  if (!resp.ok)
    throw { status: resp.status, mensaje: data.error || "Error del servidor" };
  return data;
}

// ── Validaciones básicas ────────────────────────────────
function esCorreoValido(correo) {
  return correo.includes("@") && correo.endsWith(CONFIG.DOMINIO_CORREO);
}

// ── LOGIN ───────────────────────────────────────────────
async function alEnviarLogin(e) {
  e.preventDefault();

  var correo = document.getElementById("loginCorreo").value.trim();
  var contrasena = document.getElementById("loginContrasena").value;
  var recordar = document.getElementById("loginRecordar").checked;
  var hayError = false;

  quitarError("loginCorreo");
  quitarError("loginContrasena");

  if (!correo) {
    ponerError("loginCorreo", "El correo es obligatorio");
    hayError = true;
  } else if (!esCorreoValido(correo)) {
    ponerError("loginCorreo", "Solo correos " + CONFIG.DOMINIO_CORREO);
    hayError = true;
  }

  if (!contrasena) {
    ponerError("loginContrasena", "La contraseña es obligatoria");
    hayError = true;
  }

  if (hayError) return;

  var btnTexto = document.getElementById("btnLoginTexto");
  var btnCargando = document.getElementById("btnLoginCargando");
  btnTexto.classList.add("oculto");
  btnCargando.classList.remove("oculto");

  try {
    var data = await llamarAPI("/auth/login", "POST", { correo, contrasena });

    authStorage.setToken(data.token);
    authStorage.setSesion(data.usuario);
    authStorage.setUltimaActividad();

    if (recordar) {
      authStorage.setCorreoRecordado(correo);
    } else {
      authStorage.clearCorreoRecordado();
    }

    aplicarSesion(data.usuario);

    var paneles = {
      estudiante: "panel-estudiante",
      docente: "panel-docente",
      admin: "panel-admin",
    };
    irAPagina(paneles[data.usuario.rol] || "panel-estudiante");
  } catch (err) {
    if (err.status === 429) {
      document.getElementById("avisoBloqueo").classList.remove("oculto");
    } else {
      ponerError(
        "loginCorreo",
        err.mensaje || "Correo o contraseña incorrectos",
      );
    }
  } finally {
    btnTexto.classList.remove("oculto");
    btnCargando.classList.add("oculto");
  }
}

// ── REGISTRO ────────────────────────────────────────────
async function alEnviarRegistro(e) {
  e.preventDefault();

  var nombres = document.getElementById("regNombres").value.trim();
  var apellidos = document.getElementById("regApellidos").value.trim();
  var correo = document.getElementById("regCorreo").value.trim();
  var rol = document.getElementById("regRol").value;
  var contrasena = document.getElementById("regContrasena").value;
  var contra2 = document.getElementById("regContrasena2").value;
  var terminos = document.getElementById("regTerminos").checked;
  var hayError = false;

  [
    "regNombres",
    "regApellidos",
    "regCorreo",
    "regRol",
    "regContrasena",
    "regContrasena2",
    "regTerminos",
  ].forEach(function (id) {
    quitarError(id);
  });

  if (!nombres) {
    ponerError("regNombres", "Requerido");
    hayError = true;
  }
  if (!apellidos) {
    ponerError("regApellidos", "Requerido");
    hayError = true;
  }
  if (!correo || !esCorreoValido(correo)) {
    ponerError("regCorreo", "Solo correos " + CONFIG.DOMINIO_CORREO);
    hayError = true;
  }
  if (!rol) {
    ponerError("regRol", "Selecciona un rol");
    hayError = true;
  }
  if (contrasena.length < 8) {
    ponerError("regContrasena", "Mínimo 8 caracteres");
    hayError = true;
  }
  if (contrasena !== contra2) {
    ponerError("regContrasena2", "Las contraseñas no coinciden");
    hayError = true;
  }
  if (!terminos) {
    ponerError("regTerminos", "Acepta los términos");
    hayError = true;
  }

  if (hayError) return;

  try {
    var data = await llamarAPI("/auth/registro", "POST", {
      nombres,
      apellidos,
      correo,
      contrasena,
      rol,
    });

    authStorage.setToken(data.token);
    authStorage.setSesion(data.usuario);
    authStorage.setUltimaActividad();

    aplicarSesion(data.usuario);
    irAPagina("completar-perfil");
  } catch (err) {
    if (err.mensaje && err.mensaje.includes("correo")) {
      ponerError("regCorreo", err.mensaje);
    } else {
      mostrarTostada(err.mensaje || "Error al crear la cuenta", "error");
    }
  }
}

// ── RECUPERAR CONTRASEÑA ────────────────────────────────
async function alEnviarRecuperacion(e) {
  e.preventDefault();

  var correo = document.getElementById("recCorreo").value.trim();
  quitarError("recCorreo");

  if (!correo || !esCorreoValido(correo)) {
    ponerError("recCorreo", "Solo correos " + CONFIG.DOMINIO_CORREO);
    return;
  }

  var btnTexto = document.getElementById("btnRecuperarTexto");
  var btnCargando = document.getElementById("btnRecuperarCargando");
  btnTexto.classList.add("oculto");
  btnCargando.classList.remove("oculto");

  try {
    await llamarAPI("/auth/recuperar", "POST", { correo });
    document.getElementById("correoRecuperacion").textContent = correo;
    document.getElementById("formularioRecuperacion").classList.add("oculto");
    document
      .getElementById("cajaMensajeRecuperacion")
      .classList.remove("oculto");
  } catch (err) {
    ponerError("recCorreo", err.mensaje || "Error al enviar el enlace");
  } finally {
    btnTexto.classList.remove("oculto");
    btnCargando.classList.add("oculto");
  }
}

// ── GOOGLE OAuth ────────────────────────────────────────
// Redirige al backend que redirige a Google
function loginSocial(proveedor) {
  if (proveedor === "Google") {
    // El backend maneja todo el flujo OAuth y regresa con ?token=... en la URL
    window.location.href = API_URL.replace("/api", "") + "/api/auth/google";
  } else {
    mostrarTostada("Solo Google OAuth está disponible por ahora", "info");
  }
}

// Detectar si Google nos redirigió con un token en la URL
function manejarCallbackGoogle() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get("token");
  var error = params.get("error");

  if (error) {
    mostrarTostada(
      "No se pudo iniciar sesión con Google. Verifica que uses tu correo @amigo.edu.co",
      "error",
    );
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!token) return;

  // Limpiar la URL (quitar el ?token=...)
  window.history.replaceState({}, document.title, window.location.pathname);

  var usuario = {
    id: params.get("id"),
    nombres: decodeURIComponent(params.get("nombres") || ""),
    apellidos: decodeURIComponent(params.get("apellidos") || ""),
    correo: decodeURIComponent(params.get("correo") || ""),
    rol: params.get("rol"),
  };

  authStorage.setToken(token);
  authStorage.setSesion(usuario);
  authStorage.setUltimaActividad();
  aplicarSesion(usuario);

  var paneles = {
    estudiante: "panel-estudiante",
    docente: "panel-docente",
    admin: "panel-admin",
  };
  irAPagina(paneles[usuario.rol] || "panel-estudiante");
}

// ── CIERRE DE SESIÓN ────────────────────────────────────
function cerrarSesion() {
  authStorage.limpiarTodo();
  perfilStorage.limpiarTodo();
  academicoStorage.limpiarTodo();

  sesion.activa = false;
  document.getElementById("menuAcceso").classList.remove("oculto");
  ["menuEstudiante", "menuDocente", "menuAdmin"].forEach(function (id) {
    document.getElementById(id).classList.add("oculto");
  });

  irAPagina("inicio-sesion");
  mostrarTostada("Sesión cerrada", "exito");
}

// ── APLICAR SESIÓN A LA UI ──────────────────────────────
function aplicarSesion(usuario) {
  sesion.activa = true;
  sesion.id = usuario.id;
  sesion.nombre = (usuario.nombres + " " + usuario.apellidos).trim();
  sesion.inicial = (
    (usuario.nombres[0] || "") + (usuario.apellidos[0] || "")
  ).toUpperCase();
  sesion.correo = usuario.correo;
  sesion.rol = usuario.rol;

  document.getElementById("barraAvatar").textContent = sesion.inicial;
  document.getElementById("barraNombre").textContent = sesion.nombre;
  document.getElementById("chipAvatar").textContent = sesion.inicial;
  document.getElementById("chipNombre").textContent =
    sesion.nombre.split(" ")[0];

  var etiquetas = {
    estudiante: "Estudiante",
    docente: "Docente",
    admin: "Admin",
  };
  document.getElementById("barraRol").textContent =
    etiquetas[usuario.rol] || "";
  document.getElementById("barraEtiqueta").textContent =
    etiquetas[usuario.rol] || "";

  document.getElementById("menuAcceso").classList.add("oculto");
  ["menuEstudiante", "menuDocente", "menuAdmin"].forEach(function (id) {
    document.getElementById(id).classList.add("oculto");
  });

  var menus = {
    estudiante: "menuEstudiante",
    docente: "menuDocente",
    admin: "menuAdmin",
  };
  if (menus[usuario.rol]) {
    document.getElementById(menus[usuario.rol]).classList.remove("oculto");
  }

  cargarNotificaciones();
}

// ── VERIFICAR SESIÓN AL CARGAR ──────────────────────────
async function verificarSesionGuardada() {
  var token = authStorage.getToken();
  var sesionGuardada = authStorage.getSesion();

  if (!token || !sesionGuardada) return;

  var ultima = authStorage.getUltimaActividad();
  var minutos = (Date.now() - ultima) / 60000;

  if (minutos > CONFIG.MINUTOS_INACTIVIDAD) {
    authStorage.limpiarTodo();
    var aviso = document.getElementById("avisoSesionExpirada");
    if (aviso) aviso.style.display = "block";
    return;
  }

  try {
    var data = await llamarAPI("/auth/yo", "GET");
    aplicarSesion(data);
    authStorage.setUltimaActividad();

    var paneles = {
      estudiante: "panel-estudiante",
      docente: "panel-docente",
      admin: "panel-admin",
    };
    irAPagina(paneles[data.rol] || "panel-estudiante");
  } catch (err) {
    authStorage.limpiarTodo();
  }
}

function seleccionarRolLogin(btn) {
  document
    .querySelectorAll("#selectorRolLogin .tarjeta-rol")
    .forEach(function (b) {
      b.classList.remove("seleccionada");
    });
  btn.classList.add("seleccionada");
}

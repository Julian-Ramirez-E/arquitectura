var DEMO = {
  USUARIOS: "cp_demo.usuarios",
  PERFILES: "cp_demo.perfiles",
  FOTOS: "cp_demo.fotos",
  TUTORIAS: "cp_demo.tutorias",
  NOTIFICACIONES: "cp_demo.notificaciones",
  ID_COUNTER: "cp_demo.id_counter",
};

// ── Utilidades internas ─────────────────────────────────
function _leer(clave, defecto) {
  var raw = localStorage.getItem(clave);
  if (!raw) return defecto;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return defecto;
  }
}

function _guardar(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

function _nuevoId() {
  var actual = parseInt(localStorage.getItem(DEMO.ID_COUNTER) || "0") + 1;
  localStorage.setItem(DEMO.ID_COUNTER, actual);
  return actual;
}

// Token falso — solo para demo, el backend real usa JWT firmado
function _generarTokenDemo(usuario) {
  var payload = btoa(
    JSON.stringify({
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    }),
  );
  return "DEMO." + payload;
}

function _decodificarTokenDemo(token) {
  if (!token || !token.startsWith("DEMO.")) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
}

// Simular un pequeño delay de red para que se vea realista
function _esperar(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms || 150);
  });
}

// ── Datos de ejemplo al iniciar demo por primera vez ────
function _inicializarDatosDemo() {
  var usuarios = _leer(DEMO.USUARIOS, null);
  if (usuarios) return; // ya hay datos

  var idDoc = _nuevoId(),
    idEst = _nuevoId(),
    idAdm = _nuevoId();

  var usuariosDemo = [
    {
      id: idDoc,
      nombres: "Carlos",
      apellidos: "Restrepo",
      rol: "docente",
      correo: "carlos.restrepo@amigo.edu.co",
      contrasena: "12345678",
      activo: true,
    },
    {
      id: idEst,
      nombres: "Valentina",
      apellidos: "López",
      rol: "estudiante",
      correo: "valentina.lopez@amigo.edu.co",
      contrasena: "12345678",
      activo: true,
    },
    {
      id: idAdm,
      nombres: "Admin",
      apellidos: "Sistema",
      rol: "admin",
      correo: "admin@amigo.edu.co",
      contrasena: "12345678",
      activo: true,
    },
  ];
  _guardar(DEMO.USUARIOS, usuariosDemo);

  var perfiles = {};
  perfiles[idDoc] = {
    tipo: "docente",
    cedula: "10234567",
    codigo_docente: "DOC-2023-001",
    facultad: "Facultad de Ingeniería",
    telefono: "3001234567",
    asignaturas: ["Programación", "Bases de Datos", "Ing. de Software"],
  };
  perfiles[idEst] = {
    tipo: "estudiante",
    codigo: "2024001234",
    documento: "1002345678",
    programa: "Ingeniería de Software",
    semestre: "4",
    telefono: "3009876543",
    promedio: 3.8,
    en_alerta: false,
  };
  perfiles[idAdm] = {
    tipo: "admin",
    cedula: "71234567",
    cargo: "Coordinador de Tutorías",
    dependencia: "Vicerrectoría Académica",
    telefono: "6042345678",
  };
  _guardar(DEMO.PERFILES, perfiles);

  var hoy = new Date();
  var prox = new Date(hoy);
  prox.setDate(hoy.getDate() + 3);
  var past = new Date(hoy);
  past.setDate(hoy.getDate() - 5);

  var tutorias = [
    {
      id: _nuevoId(),
      estudiante_id: idEst,
      docente_id: idDoc,
      asignatura: "Programación",
      modalidad: "Virtual",
      fecha: prox.toISOString().slice(0, 10),
      hora: "14:00:00",
      estado: "pendiente",
      observaciones: "Refuerzo de POO",
      nombre_docente: "Carlos Restrepo",
      nombre_estudiante: "Valentina López",
      correo_docente: "carlos.restrepo@amigo.edu.co",
      creada_en: new Date().toISOString(),
    },
    {
      id: _nuevoId(),
      estudiante_id: idEst,
      docente_id: idDoc,
      asignatura: "Bases de Datos",
      modalidad: "Presencial",
      fecha: past.toISOString().slice(0, 10),
      hora: "10:00:00",
      estado: "completada",
      observaciones: "",
      nombre_docente: "Carlos Restrepo",
      nombre_estudiante: "Valentina López",
      correo_docente: "carlos.restrepo@amigo.edu.co",
      creada_en: past.toISOString(),
    },
  ];
  _guardar(DEMO.TUTORIAS, tutorias);

  var notifs = [
    {
      id: _nuevoId(),
      usuario_id: idEst,
      icono: "📅",
      titulo: "Tutoría programada",
      descripcion:
        "Programación el " + prox.toISOString().slice(0, 10) + " a las 14:00",
      leida: false,
      creada_en: new Date().toISOString(),
    },
    {
      id: _nuevoId(),
      usuario_id: idDoc,
      icono: "📅",
      titulo: "Nueva tutoría asignada",
      descripcion: "Sesión de Programación con Valentina López",
      leida: false,
      creada_en: new Date().toISOString(),
    },
    {
      id: _nuevoId(),
      usuario_id: idAdm,
      icono: "📢",
      titulo: "Sistema iniciado",
      descripcion: "ConectaProfe funcionando en modo demo",
      leida: false,
      creada_en: new Date().toISOString(),
    },
  ];
  _guardar(DEMO.NOTIFICACIONES, notifs);
}

// ── Router del modo demo ────────────────────────────────
// Recibe (ruta, metodo, cuerpo, tokenActual) y retorna la respuesta simulada
async function llamarAPIDemo(ruta, metodo, cuerpo, tokenActual) {
  await _esperar(120);

  _inicializarDatosDemo();

  var payload = _decodificarTokenDemo(tokenActual);
  var usuarios = _leer(DEMO.USUARIOS, []);
  var perfiles = _leer(DEMO.PERFILES, {});
  var tutorias = _leer(DEMO.TUTORIAS, []);
  var notifs = _leer(DEMO.NOTIFICACIONES, []);

  // ── AUTH ──────────────────────────────────────────────

  // POST /auth/registro
  if (ruta === "/auth/registro" && metodo === "POST") {
    var { nombres, apellidos, correo, contrasena, rol } = cuerpo;
    if (
      usuarios.find(function (u) {
        return u.correo === correo;
      })
    ) {
      throw { mensaje: "Ya existe una cuenta con ese correo" };
    }
    var nuevoUser = {
      id: _nuevoId(),
      nombres,
      apellidos,
      correo,
      contrasena,
      rol,
      activo: true,
    };
    usuarios.push(nuevoUser);
    _guardar(DEMO.USUARIOS, usuarios);
    var token = _generarTokenDemo(nuevoUser);
    return {
      mensaje: "Cuenta creada. Completa tu perfil.",
      token,
      usuario: { id: nuevoUser.id, nombres, apellidos, correo, rol },
    };
  }

  // POST /auth/login
  if (ruta === "/auth/login" && metodo === "POST") {
    var { correo: c, contrasena: p } = cuerpo;
    var user = usuarios.find(function (u) {
      return u.correo === c;
    });
    if (!user || user.contrasena !== p) {
      throw { status: 401, mensaje: "Correo o contraseña incorrectos" };
    }
    var tok = _generarTokenDemo(user);
    return {
      token: tok,
      usuario: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
      },
    };
  }

  // POST /auth/recuperar
  if (ruta === "/auth/recuperar" && metodo === "POST") {
    return {
      mensaje: "Si el correo existe, recibirás el enlace pronto. (Modo demo)",
    };
  }

  // GET /auth/yo
  if (ruta === "/auth/yo" && metodo === "GET") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var yo = usuarios.find(function (u) {
      return u.id === payload.id;
    });
    if (!yo) throw { status: 401, mensaje: "Usuario no encontrado" };
    return {
      id: yo.id,
      nombres: yo.nombres,
      apellidos: yo.apellidos,
      correo: yo.correo,
      rol: yo.rol,
    };
  }

  // ── PERFIL ────────────────────────────────────────────

  // GET /perfil
  if (ruta === "/perfil" && metodo === "GET") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var u = usuarios.find(function (u) {
      return u.id === payload.id;
    });
    if (!u) throw { status: 404, mensaje: "No encontrado" };
    var fotos = _leer(DEMO.FOTOS, {})[payload.id] || {};
    return {
      id: u.id,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      rol: u.rol,
      perfil: perfiles[payload.id] || null,
      fotos: fotos,
    };
  }

  // POST /perfil/estudiante
  if (ruta === "/perfil/estudiante" && metodo === "POST") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var { codigo, documento, programa, semestre, telefono, promedio } = cuerpo;
    if (!codigo || !documento || !programa || !semestre) {
      throw { mensaje: "Faltan datos obligatorios" };
    }
    var prom = parseFloat(promedio) || 0;
        perfiles[payload.id] = {
      tipo: "estudiante",
      codigo,
      documento,
      programa,
      semestre,
      telefono: telefono || "",
      promedio: prom,
    };
    _guardar(DEMO.PERFILES, perfiles);
    return { mensaje: "Perfil guardado" };
  }

  // POST /perfil/docente
  if (ruta === "/perfil/docente" && metodo === "POST") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var {
      cedula,
      codigo_docente,
      facultad,
      telefono: tel,
      asignaturas,
    } = cuerpo;
    if (!cedula || !facultad) throw { mensaje: "Faltan datos obligatorios" };
    perfiles[payload.id] = {
      tipo: "docente",
      cedula,
      codigo_docente: codigo_docente || "",
      facultad,
      telefono: tel || "",
      asignaturas: asignaturas || [],
    };
    _guardar(DEMO.PERFILES, perfiles);
    return { mensaje: "Perfil guardado" };
  }

  // POST /perfil/admin
  if (ruta === "/perfil/admin" && metodo === "POST") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var { cedula: ced, cargo, dependencia, telefono: telf } = cuerpo;
    if (!ced || !cargo) throw { mensaje: "Faltan datos obligatorios" };
    perfiles[payload.id] = {
      tipo: "admin",
      cedula: ced,
      cargo,
      dependencia: dependencia || "",
      telefono: telf || "",
    };
    _guardar(DEMO.PERFILES, perfiles);
    return { mensaje: "Perfil guardado" };
  }

  // POST /perfil/foto
  if (ruta === "/perfil/foto" && metodo === "POST") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var todasFotos = _leer(DEMO.FOTOS, {});
    if (!todasFotos[payload.id]) todasFotos[payload.id] = {};
    var campo = cuerpo.tipo === "portada" ? "foto_portada" : "foto_perfil";
    todasFotos[payload.id][campo] = cuerpo.foto_base64;
    _guardar(DEMO.FOTOS, todasFotos);
    return { mensaje: "Foto guardada" };
  }

  // ── TUTORÍAS ──────────────────────────────────────────

  // GET /tutorias
  if (ruta === "/tutorias" && metodo === "GET") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var mis = [];

    if (payload.rol === "estudiante") {
      mis = tutorias.filter(function (t) {
        return t.estudiante_id === payload.id;
      });
      mis.forEach(function (t) {
        var doc = usuarios.find(function (u) {
          return u.id === t.docente_id;
        });
        if (doc) t.nombre_docente = doc.nombres + " " + doc.apellidos;
      });
    } else if (payload.rol === "docente") {
      mis = tutorias.filter(function (t) {
        return t.docente_id === payload.id;
      });
      mis.forEach(function (t) {
        var est = usuarios.find(function (u) {
          return u.id === t.estudiante_id;
        });
        if (est) t.nombre_estudiante = est.nombres + " " + est.apellidos;
        var pe = perfiles[t.estudiante_id];
        if (pe) {
          t.programa = pe.programa;
          t.semestre = pe.semestre;
        }
      });
    } else {
      // admin ve todas
      mis = tutorias.map(function (t) {
        var doc = usuarios.find(function (u) {
          return u.id === t.docente_id;
        });
        var est = usuarios.find(function (u) {
          return u.id === t.estudiante_id;
        });
        return Object.assign({}, t, {
          nombre_docente: doc ? doc.nombres + " " + doc.apellidos : "",
          nombre_estudiante: est ? est.nombres + " " + est.apellidos : "",
        });
      });
    }

    return mis.sort(function (a, b) {
      return b.fecha.localeCompare(a.fecha);
    });
  }

  // POST /tutorias
  if (ruta === "/tutorias" && metodo === "POST") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var {
      asignatura: asig,
      modalidad: mod,
      fecha: fech,
      hora: hor,
      observaciones: obs,
      docente_id: dId,
      estudiante_id: eId,
    } = cuerpo;

    if (!asig || !mod || !fech || !hor)
      throw { mensaje: "Faltan datos obligatorios" };

    var idEst2 = payload.rol === "estudiante" ? payload.id : parseInt(eId);
    var idDoc2 = payload.rol === "docente" ? payload.id : parseInt(dId);

    if (!idEst2 || !idDoc2)
      throw { mensaje: "Falta el estudiante o el docente" };

    // Verificar conflicto de horario
    var conflicto = tutorias.find(function (t) {
      return (
        t.docente_id === idDoc2 &&
        t.fecha === fech &&
        t.hora === hor &&
        t.estado !== "cancelada"
      );
    });
    if (conflicto)
      throw { mensaje: "El docente ya tiene una tutoría a esa hora" };

    if (new Date(fech + "T" + hor) < new Date()) {
      throw { mensaje: "La fecha no puede ser en el pasado" };
    }

    var nuevaTut = {
      id: _nuevoId(),
      estudiante_id: idEst2,
      docente_id: idDoc2,
      asignatura: asig,
      modalidad: mod,
      fecha: fech,
      hora: hor,
      estado: "pendiente",
      observaciones: obs || "",
      creada_en: new Date().toISOString(),
    };
    tutorias.push(nuevaTut);
    _guardar(DEMO.TUTORIAS, tutorias);

    // Notificaciones automáticas
    var nsT = _leer(DEMO.NOTIFICACIONES, []);
    nsT.push({
      id: _nuevoId(),
      usuario_id: idEst2,
      icono: "📅",
      titulo: "Tutoría programada",
      descripcion: asig + " el " + fech + " a las " + hor,
      leida: false,
      creada_en: new Date().toISOString(),
    });
    nsT.push({
      id: _nuevoId(),
      usuario_id: idDoc2,
      icono: "📅",
      titulo: "Nueva tutoría asignada",
      descripcion: "Sesión de " + asig + " el " + fech,
      leida: false,
      creada_en: new Date().toISOString(),
    });
    _guardar(DEMO.NOTIFICACIONES, nsT);

    return { mensaje: "Tutoría programada", id: nuevaTut.id };
  }

  // PATCH /tutorias/:id/cancelar
  var matchCancelar = ruta.match(/^\/tutorias\/(\d+)\/cancelar$/);
  if (matchCancelar && metodo === "PATCH") {
    if (!payload) throw { status: 401, mensaje: "Sin sesión" };
    var idCan = parseInt(matchCancelar[1]);
    var tut = tutorias.find(function (t) {
      return t.id === idCan;
    });
    if (!tut) throw { mensaje: "Tutoría no encontrada" };

    var horas = (new Date(tut.fecha + "T" + tut.hora) - new Date()) / 3600000;
    if (horas < CONFIG.HORAS_CANCELACION && payload.rol !== "admin") {
      throw {
        mensaje:
          "Solo se puede cancelar con " +
          CONFIG.HORAS_CANCELACION +
          "h de anticipación (RN03)",
      };
    }
    tut.estado = "cancelada";
    _guardar(DEMO.TUTORIAS, tutorias);
    return { mensaje: "Tutoría cancelada" };
  }

  // ── NOTIFICACIONES ────────────────────────────────────

  // GET /notificaciones
  if (ruta === "/notificaciones" && metodo === "GET") {
    if (!payload) return [];
    var misNotifs = notifs
      .filter(function (n) {
        return n.usuario_id === payload.id;
      })
      .sort(function (a, b) {
        return b.creada_en.localeCompare(a.creada_en);
      })
      .slice(0, 50);
    return misNotifs;
  }

  // PATCH /notificaciones/:id/leer
  var matchLeer = ruta.match(/^\/notificaciones\/(\d+)\/leer$/);
  if (matchLeer && metodo === "PATCH") {
    var idN = parseInt(matchLeer[1]);
    var notif = notifs.find(function (n) {
      return n.id === idN;
    });
    if (notif) {
      notif.leida = true;
      _guardar(DEMO.NOTIFICACIONES, notifs);
    }
    return { mensaje: "Notificación leída" };
  }

  // PATCH /notificaciones/leer-todas
  if (ruta === "/notificaciones/leer-todas" && metodo === "PATCH") {
    if (!payload) return { mensaje: "ok" };
    notifs.forEach(function (n) {
      if (n.usuario_id === payload.id) n.leida = true;
    });
    _guardar(DEMO.NOTIFICACIONES, notifs);
    return { mensaje: "Todas leídas" };
  }

  // Ruta no manejada en demo
  console.warn("[DEMO] Ruta no implementada:", metodo, ruta);
  return { mensaje: "ok" };
}

// ── Limpiar datos del modo demo ─────────────────────────
// Llamar desde consola si quieres empezar de cero: limpiarDemo()
function limpiarDemo() {
  Object.values(DEMO).forEach(function (clave) {
    localStorage.removeItem(clave);
  });
  console.log("[DEMO] Datos de demo eliminados. Recarga la página.");
}

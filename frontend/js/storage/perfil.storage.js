// Caché de perfil en localStorage
// Evita pedir el perfil al backend en cada navegación

const perfilStorage = {
  getPerfil()       {
    const p = localStorage.getItem('cp.perfil');
    return p ? JSON.parse(p) : null;
  },
  setPerfil(datos)  { localStorage.setItem('cp.perfil', JSON.stringify(datos)); },
  clearPerfil()     { localStorage.removeItem('cp.perfil'); },

  // Fotos guardadas en base64 para no pedirlas al servidor cada vez
  getFotoPerfil()   { return localStorage.getItem('cp.foto.perfil') || ''; },
  setFotoPerfil(b)  { localStorage.setItem('cp.foto.perfil', b); },

  getFotoPortada()  { return localStorage.getItem('cp.foto.portada') || ''; },
  setFotoPortada(b) { localStorage.setItem('cp.foto.portada', b); },

  limpiarTodo() {
    ['cp.perfil','cp.foto.perfil','cp.foto.portada'].forEach(k => localStorage.removeItem(k));
  }
};

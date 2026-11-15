# Guía rápida de sustentación — Agenda de Tutorías

> Cada respuesta está escrita para decirse en voz alta (~40 s) y está **verificada contra el código**. Todos los integrantes deben poder responder cualquiera de las cinco.
> Regla de oro: **si el profesor encuentra una limitación antes que ustedes, pierden puntos; si la dicen ustedes primero, ganan credibilidad.** Las preguntas 2, 4 y 5 incluyen limitaciones reales del proyecto.

## Demo de 60 segundos (hágala ANTES de que pregunten)

```bash
npm test                                   # 41 pruebas en verde (incluye la de arquitectura)
# Romper la arquitectura a propósito:
#   abra src/application/use-cases/CancelarTutoria.js y agregue al inicio:  require('express');
npm test                                   # ← falla "application/ no depende de frameworks…"
# Quite la línea y vuelva a correr: verde.
```
Frase: *"La regla de dependencia no es una promesa del README: está comprobada por una prueba automática."*

---

## 1. "La regla de solapamiento, ¿por qué no la resolvieron con un `WHERE` en SQL? ¿Y cómo prueban que el controlador no tiene lógica de negocio?"

**Respuesta:**
La regla vive en el dominio: `RangoHorario.solapaCon()` compara intervalos semiabiertos (`inicioA < finB && inicioB < finA`) y `ReglasAgenda.buscarChoque()` la aplica sobre las tutorías **activas** que el repositorio trae para ese docente o estudiante en esa fecha. El repositorio no decide nada: solo recupera datos.
La pusimos ahí por cuatro razones: (1) se prueba en milisegundos **sin base de datos** (`tests/domain`); (2) la misma función sirve a tres casos de uso —programar, reprogramar (ignorando la propia tutoría) y consultar disponibilidad—, o sea DRY; (3) no queda atada al dialecto de fechas de SQLite; (4) si cambia la BD, la regla no se toca. Los intervalos son semiabiertos para que una tutoría que termina a las 11:00 **no** choque con la que empieza a las 11:00.
El costo es que traemos a memoria las tutorías de un día —un volumen pequeño— y que la atomicidad pasa a ser un tema aparte (pregunta 2).
**Cómo probamos que el controlador es "tonto":** `TutoriasController` solo hace tres cosas —valida forma con el DTO, llama al caso de uso, arma la respuesta— y `tests/architecture.test.js` falla si `domain/` o `application/` importan Express o SQLite, o si un adaptador importa `ReglasAgenda` o las políticas.

---

## 2. "Dos estudiantes reservan el mismo horario con el mismo docente exactamente al mismo tiempo. ¿Qué pasa?"

**Respuesta (honesta y precisa):**
Hoy, con **un solo proceso** de Node y `better-sqlite3` —que es síncrono— no se intercalan: las promesas entre "consultar si hay choque" y "guardar" se resuelven sin entrada/salida real, y Node termina esa cadena antes de atender otra petición. Por eso en la práctica el segundo recibe `409 RN-01`.
Pero **eso no es una garantía de diseño**: la verificación y el guardado son dos pasos separados, no una operación atómica de base de datos. Si desplegamos varias instancias o pasamos a un motor remoto, dos solicitudes simultáneas podrían crear tutorías solapadas.
La solución correcta es que la base de datos lo garantice: en PostgreSQL, una *exclusion constraint* sobre un rango de tiempo por docente para estados activos (`EXCLUDE USING gist … WITH &&`), o una transacción `SERIALIZABLE`. El adaptador capturaría esa violación y la traduciría a `ReglaNegocioError`. Está documentado como limitación en `docs/ARQUITECTURA.md` §6.4.
**Si insisten:** *"La regla de negocio sigue en el dominio; la restricción de BD es la red de seguridad contra la concurrencia, no su reemplazo."*

---

## 3. "¿Qué es exactamente un puerto y qué es un adaptador? Si mañana cambian a PostgreSQL, ¿qué archivos tocan y por qué lo pueden asegurar?"

**Respuesta:**
Un **puerto** es un contrato que define el núcleo según lo que **necesita**: `TutoriaRepositoryPort` dice "sé guardar y buscar tutorías", sin mencionar SQL. Un **adaptador** es la implementación concreta en infraestructura: `SqliteTutoriaRepository`. La diferencia con una interfaz cualquiera es **quién es el dueño y hacia dónde apunta la dependencia**: el contrato vive en `application/` y la tecnología depende de él, no al revés (inversión de dependencias).
**Para pasar a PostgreSQL:** escribimos `PostgresTutoriaRepository` (y los de usuario/notificación si comparten BD), su conexión y migración, y cambiamos esas líneas en `contenedor.js`. **No tocamos** `domain/`, `use-cases/`, el controlador ni las pruebas de dominio y de casos de uso. Los puertos ya devuelven promesas, así que el paso de `better-sqlite3` (síncrono) a un cliente asíncrono no obliga a cambiar los casos de uso.
**Cómo lo aseguramos:** ya lo hicimos una vez en pequeño: las pruebas de casos de uso corren con `TutoriaRepoMemoria` en lugar de SQLite y pasan igual. Y la prueba de arquitectura impide que alguien importe SQLite desde el núcleo.
**Limitación a admitir:** JavaScript no tiene `interface`; los puertos son clases base que lanzan "no implementado", así que la disciplina la impone la prueba de arquitectura y no el compilador (en TypeScript sería un `interface`). También habría que reescribir las particularidades de SQLite que hay dentro del adaptador (`datetime('now')`, el `ALTER TABLE`).

---

## 4. "¿El patrón Strategy no es forzado? Si solo cambian unas horas, bastaba con un `if` o una tabla de configuración."

**Respuesta:**
Tiene razón en parte, y lo decimos con claridad: estudiante y docente usan la **misma clase** (`PoliticaPorAnticipacion`) con parámetros distintos (24 h y 12 h). La variación de **algoritmo** real es el administrador (`PoliticaSinRestriccion`, que no verifica nada).
Aun así lo mantenemos por cuatro razones concretas: (1) la regla RN-03 aparece en **dos** casos de uso —cancelar y reprogramar— y la estrategia evita duplicarla; (2) el caso de uso solo conoce `verificar()`, así que un rol nuevo, o una política distinta (por ejemplo exigir un motivo al docente), se agrega con una clase y una línea en `contenedor.js` **sin modificar** `CancelarTutoria` ni `ActualizarTutoria` (Abierto/Cerrado); (3) `SelectorPoliticaCancelacion` rechaza con `403` cualquier rol sin política: el sistema "falla cerrado"; (4) probar cada política por separado es trivial.
**Frase de criterio:** *"Si estas reglas nunca fueran a divergir, una tabla de configuración habría sido suficiente y más simple (KISS). Elegimos Strategy porque la política de cancelación es el punto del dominio con más probabilidad de evolucionar."*
**Si preguntan por el Factory:** `TutoriaFactory` no es decorativo: según quién crea, cambian el estudiante/docente y el estado inicial (`pendiente` si solicita el estudiante, `confirmada` si programa docente o admin), y evita confiar en el `estudiante_id` del body (un estudiante que envía otro id recibe `403`).

---

## 5. "¿Por qué `409` y no `400`? ¿Por qué `403` y no `404` al abrir una tutoría ajena? ¿Qué tan seguro es su JWT?"

**Respuesta:**
**400 vs 409:** `400` es una petición **mal formada**: JSON roto, fecha inexistente, modalidad inválida (lo detecta el DTO y devuelve el detalle por campo). `409` es una petición **bien formada** que **choca con el estado actual o con una regla de negocio**: solape, falta de anticipación, plazo vencido, transición inválida. Todos esos casos salen de `ReglaNegocioError` y llevan un código `RN-01…RN-06`; un único `manejadorErrores` los traduce. `422` también sería defendible; usamos `409` por el requisito y por consistencia.
**401 vs 403:** `401` = no hay token o es inválido/expirado (middleware `autenticar`); `403` = estás autenticado pero ese recurso no es tuyo o tu rol no puede (casos de uso).
**403 vs 404:** si el id no existe devolvemos `404`; si existe pero no es tuyo, `403`. **Es un compromiso:** `403` revela que el id existe (permite enumerar ids). Para ocultarlo bastaría devolver `404` en ambos casos.
**JWT:** verificamos con `HS256` fijado explícitamente (evita la confusión de algoritmo), validamos que el payload tenga `id` entero y un `rol` conocido, y en producción el proceso **no arranca** sin `JWT_SECRET`. **Limitaciones:** no hay *refresh* ni revocación de tokens, ni *rate limiting*, ni `helmet`; y como `HS256` usa un secreto compartido con ConectaProfe, quien lo filtre puede firmar tokens: con claves asimétricas (RS256) este módulo solo podría verificar, no emitir.

---

## Datos para saber de memoria

| Tema | Dato |
|---|---|
| Reglas | RN-01 solape · RN-02 2 h de anticipación · RN-03 plazo por rol (24/12/sin límite) · RN-04 06:00–22:00 · RN-05 estados · RN-06 no completar antes de empezar |
| Patrones | **Repository** (`SqliteTutoriaRepository`) · **Strategy** (`PoliticasCancelacion`) · **Factory** (`TutoriaFactory`) |
| SOLID | SRP (controlador/reglas/repo separados) · OCP (selector de políticas) · DIP (`contenedor.js`, puertos por constructor) |
| Pruebas | 41 en total: dominio, casos de uso con dobles en memoria, API real, arquitectura |
| Zona horaria | Offset fijo UTC-5 en `RangoHorario`: el resultado no depende de la zona del servidor ni de Docker |
| Límites conocidos | Atomicidad ante concurrencia multi-instancia · sin paginación (máx. 200) · sin revocación de JWT |
| Integración | Misma BD y mismo `JWT_SECRET` que ConectaProfe; migración agrega `duracion_min` sin perder datos (probado contra el esquema real) |

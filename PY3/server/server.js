// server/server.js
import express from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.resolve("./server/data");
const DATA_FILE = path.join(DATA_DIR, "usuarios.json");
const DATA_FILE_CLIENTES = path.join(DATA_DIR, "clientes.json");
const DATA_FILE_VEHICULOS_CLIENTES = path.join(DATA_DIR, "./VehiculosClientes.json");
const DATA_FILE_BASE_VEHICULOS = path.join(DATA_DIR, "./vehiculos.json");

// Asegura datos iniciales (admin)
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const ADMIN = {
      code: "admin01",
      password: "admin123",
      nombre: "Administrador",
      rol: "admin",
      cedula: "000",
      correo: "admin@sistema.local",
      telefono: "",
      fechaNac: "",
      idioma: "es",
      mustChangePassword: false
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify([ADMIN], null, 2), "utf8");
  }
}
ensureDataFile();

function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("readUsers error:", e);
    return [];
  }
}

function writeUsers(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
}

// GET: lista de usuarios
app.get("/api/usuarios", (_req, res) => {
  return res.json(readUsers());
});

// POST: crear usuario (valida cédula/correo únicos)
app.post("/api/usuarios", (req, res) => {
  const nuevo = req.body || {};
  const required = ["code", "password", "nombre", "rol", "cedula", "correo"];
  for (const r of required) {
    if (!String(nuevo[r] ?? "").trim()) {
      return res.status(400).json({ ok: false, error: `Campo requerido faltante: ${r}` });
    }
  }

  const users = readUsers();
  const correoLower = String(nuevo.correo || "").toLowerCase();

  const dup = users.find(
    u => u.cedula === nuevo.cedula || String(u.correo || "").toLowerCase() === correoLower
  );
  if (dup) {
    return res.status(409).json({ ok: false, error: "Usuario ya registrado (cédula o correo existente)" });
  }

  if (typeof nuevo.mustChangePassword === "undefined") nuevo.mustChangePassword = false;

  users.push(nuevo);
  writeUsers(users);
  console.log("Usuario creado:", { code: nuevo.code, nombre: nuevo.nombre });
  return res.json({ ok: true, users });
});

// PATCH: cambio de contraseña por code (primer acceso o normal)
app.patch("/api/usuarios/:code/password", (req, res) => {
  const codeParam = String(req.params.code || "");
  const { newPassword } = req.body || {};

  if (!newPassword || String(newPassword).trim().length < 4) {
    return res.status(400).json({ ok: false, error: "Nueva contraseña inválida (mínimo 4 caracteres)" });
  }

  const users = readUsers();
  const idx = users.findIndex(u => String(u.code) === codeParam);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
  }

  users[idx].password = String(newPassword);
  users[idx].mustChangePassword = false;
  writeUsers(users);

  console.log(`Contraseña actualizada para ${users[idx].code}`);
  return res.json({ ok: true, user: users[idx] });
});

// (Opcional) Reemplazar lista completa
app.put("/api/usuarios", (req, res) => {
  const arr = Array.isArray(req.body) ? req.body : [];
  writeUsers(arr);
  return res.json({ ok: true });
});

const PORT = 5174;
app.listen(PORT, () => {
  console.log(`API usuarios corriendo en http://localhost:${PORT}`);
});

/*======================================= Gestion Clientes ========================================*/
function ensureClientesFile() {
  if (!fs.existsSync(DATA_FILE_CLIENTES)) {
    fs.writeFileSync(DATA_FILE_CLIENTES, JSON.stringify([], null, 2), "utf8");
  }
}
ensureClientesFile();

function readClientes() {
  try {
    const raw = fs.readFileSync(DATA_FILE_CLIENTES, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("readClientes error:", e);
    return [];
  }
}

function writeClientes(list) {
  fs.writeFileSync(DATA_FILE_CLIENTES, JSON.stringify(list, null, 2), "utf8");
}

/* === GET: lista de clientes === */
app.get("/api/clientes", (_req, res) => {
  return res.json(readClientes());
});

/* === POST: agregar cliente === */
app.post("/api/clientes", (req, res) => {
  const nuevo = req.body || {};
  if (!nuevo.nombre || !nuevo.cedula) {
    return res.status(400).json({ ok: false, error: "Nombre y cédula son obligatorios" });
  }

  const clientes = readClientes();

  // 🔍 Verifica si la cédula ya existe
  if (clientes.some(c => c.cedula === nuevo.cedula)) {
    return res.status(409).json({ ok: false, error: "Cliente ya existe" });
  }

  // ❌ NO se crea ningún id, usamos la cédula como clave única
  clientes.push(nuevo);
  writeClientes(clientes);

  return res.json({ ok: true, clientes });
});

/* === PUT: actualizar cliente === */
app.put("/api/clientes/:cedula", (req, res) => {
  const cedula = req.params.cedula;
  const update = req.body || {};
  const clientes = readClientes();

  const idx = clientes.findIndex(c => c.cedula === cedula);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
  }

  clientes[idx] = { ...clientes[idx], ...update };
  writeClientes(clientes);

  return res.json({ ok: true, cliente: clientes[idx] });
});

/* === DELETE: eliminar cliente === */
app.delete("/api/clientes/:cedula", (req, res) => {
  const cedula = req.params.cedula;
  const clientes = readClientes();

  if (!clientes.some(c => c.cedula === cedula)) {
    return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
  }

  const filtered = clientes.filter(c => c.cedula !== cedula);
  writeClientes(filtered);

  return res.json({ ok: true, clientes: filtered });
});

/*======================================= Gestion Vehiculos ========================================*/
function ensureVehiculosFiles() {
  if (!fs.existsSync(DATA_FILE_VEHICULOS_CLIENTES)) {
    fs.writeFileSync(DATA_FILE_VEHICULOS_CLIENTES, JSON.stringify([], null, 2), "utf8");
  }
  if (!fs.existsSync(DATA_FILE_BASE_VEHICULOS)) {
    fs.writeFileSync(DATA_FILE_BASE_VEHICULOS, JSON.stringify([], null, 2), "utf8");
  }
}
ensureVehiculosFiles();

/* === FUNCIONES AUXILIARES === */
function readVehiculosClientes() {
  try {
    const raw = fs.readFileSync(DATA_FILE_VEHICULOS_CLIENTES, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("readVehiculosClientes error:", e);
    return [];
  }
}

function writeVehiculosClientes(list) {
  fs.writeFileSync(DATA_FILE_VEHICULOS_CLIENTES, JSON.stringify(list, null, 2), "utf8");
}

function readVehiculosBase() {
  try {
    const raw = fs.readFileSync(DATA_FILE_BASE_VEHICULOS, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("readVehiculosBase error:", e);
    return [];
  }
}

/* === GET: vehículos de clientes === */
app.get("/api/vehiculos", (_req, res) => {
  return res.json(readVehiculosClientes());
});

/* === GET: catálogo base de vehículos === */
app.get("/api/vehiculosBase", (_req, res) => {
  return res.json(readVehiculosBase());
});

/* === POST: agregar vehículo de cliente === */
app.post("/api/vehiculos", (req, res) => {
  const nuevo = req.body || {};
  const { placa, clienteCedula, clienteNombre, marca, modelo, tipo, anoVehiculo } = nuevo;

  if (!placa || !marca) {
    return res.status(400).json({ ok: false, error: "Placa y marca son obligatorias" });
  }
  if (!clienteCedula || !clienteNombre) {
    return res.status(400).json({ ok: false, error: "Debe seleccionar un cliente" });
  }

  const vehiculosClientes = readVehiculosClientes();
  if (vehiculosClientes.some(v => v.placa === placa)) {
    return res.status(409).json({ ok: false, error: "Vehículo ya existe" });
  }

  const id = Date.now();
  const nuevoVehiculo = { id, placa, marca, modelo, tipo, anoVehiculo, clienteCedula, clienteNombre };
  vehiculosClientes.push(nuevoVehiculo);
  writeVehiculosClientes(vehiculosClientes);

  return res.json({ ok: true, vehiculos: vehiculosClientes });
});

/* === PUT: actualizar vehículo por placa === */
app.put("/api/vehiculos/:placa", (req, res) => {
  const placa = req.params.placa;
  const update = req.body || {};
  const vehiculosClientes = readVehiculosClientes();

  const idx = vehiculosClientes.findIndex(v => v.placa === placa);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Vehículo no encontrado" });
  }

  vehiculosClientes[idx] = { ...vehiculosClientes[idx], ...update };
  writeVehiculosClientes(vehiculosClientes);

  return res.json({ ok: true, vehiculo: vehiculosClientes[idx] });
});

/* === DELETE: eliminar vehículo por placa === */
app.delete("/api/vehiculos/:placa", (req, res) => {
  const placa = req.params.placa;
  const vehiculosClientes = readVehiculosClientes();

  if (!vehiculosClientes.some(v => v.placa === placa)) {
    return res.status(404).json({ ok: false, error: "Vehículo no encontrado" });
  }

  const filtered = vehiculosClientes.filter(v => v.placa !== placa);
  writeVehiculosClientes(filtered);

  return res.json({ ok: true, vehiculos: filtered });
});

/*======================================= Gestion Inventario ========================================*/
const DATA_FILE_INVENTARIO = path.join(DATA_DIR, "inventario.json");

/* === Crear archivo si no existe === */
function ensureInventarioFile() {
  if (!fs.existsSync(DATA_FILE_INVENTARIO)) {
    fs.writeFileSync(DATA_FILE_INVENTARIO, JSON.stringify([], null, 2), "utf8");
  }
}
ensureInventarioFile();

/* === FUNCIONES AUXILIARES === */
function readInventario() {
  try {
    const raw = fs.readFileSync(DATA_FILE_INVENTARIO, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeInventario(list) {
  fs.writeFileSync(DATA_FILE_INVENTARIO, JSON.stringify(list, null, 2), "utf8");
}

/* === GET: obtener todos los repuestos === */
app.get("/api/inventario", (_req, res) => {
  return res.json(readInventario());
});

/* === POST: agregar nuevo repuesto === */
app.post("/api/inventario", (req, res) => {
  const nuevo = req.body || {};
  const { codigo, nombre, descripcion, cantidad, precio, vehiculoId } = nuevo;

  if (!codigo || !nombre) {
    return res.status(400).json({ ok: false, error: "Código y nombre son obligatorios" });
  }

  const inventario = readInventario();
  if (inventario.some(r => r.codigo === codigo)) {
    return res.status(409).json({ ok: false, error: "Repuesto ya existe" });
  }

  // ✅ Verificar si el vehículo existe (en vehiculos.json)
  if (vehiculoId) {
    const vehiculos = readVehiculosBase();
    const existeVehiculo = vehiculos.some(v => v.id === vehiculoId);
    if (!existeVehiculo) {
      return res.status(400).json({ ok: false, error: "Vehículo asociado no existe" });
    }
  }

  const id = Date.now();
  const nuevoRepuesto = { id, codigo, nombre, descripcion, cantidad, precio, vehiculoId };
  inventario.push(nuevoRepuesto);
  writeInventario(inventario);

  return res.json(nuevoRepuesto);
});

/* === PUT: actualizar repuesto por código === */
app.put("/api/inventario/:codigo", (req, res) => {
  const codigo = req.params.codigo; // ✅ ahora se usa el código como identificador
  const update = req.body || {};
  const inventario = readInventario();

  const idx = inventario.findIndex(r => r.codigo === codigo);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Repuesto no encontrado" });
  }

  // Actualizar con los nuevos valores
  inventario[idx] = { ...inventario[idx], ...update };
  writeInventario(inventario);

  return res.json(inventario[idx]);
});


/* === DELETE: eliminar repuesto por código === */
app.delete("/api/inventario/:codigo", (req, res) => {
  const codigo = req.params.codigo;
  const inventario = readInventario();

  if (!inventario.some(r => r.codigo === codigo)) {
    return res.status(404).json({ ok: false, error: "Repuesto no encontrado" });
  }

  const filtered = inventario.filter(r => r.codigo !== codigo);
  writeInventario(filtered);

  return res.json({ ok: true, inventario: filtered });
});

/* === POST: agregar vehículo al catálogo base (vehiculos.json) === */
app.post("/api/vehiculosBase", (req, res) => {
  try {
    const nuevo = req.body || {};
    const { tipo, marca, modelo, anoVehiculo } = nuevo;

    if (!tipo || !marca || !modelo || !anoVehiculo) {
      return res.status(400).json({ ok: false, error: "Todos los campos son obligatorios" });
    }

    // Leer el archivo existente
    let vehiculosBase = [];
    if (fs.existsSync(DATA_FILE_BASE_VEHICULOS)) {
      const data = fs.readFileSync(DATA_FILE_BASE_VEHICULOS, "utf8");
      vehiculosBase = JSON.parse(data || "[]");
    }

    // Verificar duplicado (por marca + modelo + año)
    const duplicado = vehiculosBase.find(
      v => v.marca === marca && v.modelo === modelo && v.anoVehiculo === anoVehiculo
    );
    if (duplicado) {
      return res.status(409).json({ ok: false, error: "Este vehículo ya existe en el catálogo" });
    }

    // Crear y guardar el nuevo vehículo
    const id = Date.now();
    const nuevoVehiculo = { id, tipo, marca, modelo, anoVehiculo };
    vehiculosBase.push(nuevoVehiculo);

    fs.writeFileSync(DATA_FILE_BASE_VEHICULOS, JSON.stringify(vehiculosBase, null, 2), "utf8");

    res.status(201).json({ ok: true, vehiculo: nuevoVehiculo });
  } catch (error) {
    console.error("Error al agregar vehículo base:", error);
    res.status(500).json({ ok: false, error: "Error al agregar vehículo" });
  }
});

/*======================================= Gestion Reportes ========================================*/
const DATA_FILE_REPORTES = path.join(DATA_DIR, "reportes.json");

// 🗂️ Asegura que exista el archivo
function ensureReportesFile() {
  if (!fs.existsSync(DATA_FILE_REPORTES)) {
    fs.writeFileSync(DATA_FILE_REPORTES, JSON.stringify([], null, 2), "utf8");
  }
}
ensureReportesFile();

function readReportes() {
  try {
    const raw = fs.readFileSync(DATA_FILE_REPORTES, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeReportes(list) {
  fs.writeFileSync(DATA_FILE_REPORTES, JSON.stringify(list, null, 2), "utf8");
}

/* === POST: enviar reporte === */
app.post("/api/reportes", (req, res) => {
  const nuevo = req.body || {};
  const { tipo, descripcion, usuario, fecha } = nuevo;

  if (!tipo || !descripcion || !usuario) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
  }

  const reportes = readReportes();
  const id = Date.now();
  const reporte = {
    id,
    tipo, // cliente, vehiculo, inventario, otro
    descripcion,
    usuario,
    fecha: fecha || new Date().toISOString(),
  };

  reportes.push(reporte);
  writeReportes(reportes);

  return res.json({ ok: true, reporte });
});

/* === GET: listar y filtrar reportes === */
app.get("/api/reportes", (req, res) => {
  const { orden, tipo, usuario } = req.query;
  let reportes = readReportes();

  if (tipo) {
    reportes = reportes.filter(r =>
      r.tipo.toLowerCase().includes(tipo.toLowerCase())
    );
  }

  if (usuario) {
    reportes = reportes.filter(r =>
      r.usuario.toLowerCase().includes(usuario.toLowerCase())
    );
  }

  // Ordenar por fecha (nuevo o antiguo)
  if (orden === "nuevo") {
    reportes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  } else if (orden === "antiguo") {
    reportes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }

  return res.json(reportes);
});

/* === DELETE: eliminar reporte === */
app.delete("/api/reportes/:id", (req, res) => {
  const id = Number(req.params.id);
  let reportes = readReportes();

  if (!reportes.some(r => r.id === id)) {
    return res.status(404).json({ ok: false, error: "Reporte no encontrado" });
  }

  reportes = reportes.filter(r => r.id !== id);
  writeReportes(reportes);

  return res.json({ ok: true, reportes });
});

/*======================================= Gestion Citas ========================================*/
const DATA_FILE_CITAS = path.join(DATA_DIR, "citas.json");

// Crear archivo si no existe
if (!fs.existsSync(DATA_FILE_CITAS)) {
  fs.writeFileSync(DATA_FILE_CITAS, JSON.stringify([], null, 2), "utf8");
}

function readCitas() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE_CITAS, "utf8"));
  } catch {
    return [];
  }
}

function writeCitas(list) {
  fs.writeFileSync(DATA_FILE_CITAS, JSON.stringify(list, null, 2), "utf8");
}

/* === POST: agregar nueva cita === */
app.post("/api/citas", (req, res) => {
  const nuevo = req.body || {};
  const { clienteNombre, clienteCedula, vehiculoPlaca, fecha, hora, descripcion } = nuevo;

  if (!clienteNombre || !clienteCedula || !vehiculoPlaca || !fecha || !hora) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
  }

  const citas = readCitas();

  const cita = {
    id: Date.now(),
    clienteNombre,
    clienteCedula,
    vehiculoPlaca, // ← ahora se guarda por placa
    fecha,
    hora,
    descripcion: descripcion || "",
    mecanico: "Sin Asignar",
    estado: "En Espera"
  };

  citas.push(cita);
  writeCitas(citas);

  return res.json({ ok: true, citas });
});

/* === GET: obtener citas === */
app.get("/api/citas", (req, res) => {
  let citas = readCitas();
  return res.json({ citas }); // 🔽 CAMBIO: envolver en objeto con propiedad citas
});

/* === PUT: actualizar cita === */
app.put("/api/citas/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};

  let citas = readCitas();
  const index = citas.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "Cita no encontrada" });
  }

  const actualizada = {
    ...citas[index],
    ...body
  };

  citas[index] = actualizada;
  writeCitas(citas);

  return res.json({ ok: true, cita: actualizada });
});

/* === DELETE: eliminar cita === */
app.delete("/api/citas/:id", (req, res) => {
  const id = Number(req.params.id);
  let citas = readCitas();

  if (!citas.some(c => c.id === id)) {
    return res.status(404).json({ ok: false, error: "Cita no encontrada" });
  }

  citas = citas.filter(c => c.id !== id);
  writeCitas(citas);

  return res.json({ ok: true, citas });
});

/*======================================= Gestion Trabajos ========================================*/
const DATA_FILE_TRABAJOS = path.join(DATA_DIR, "trabajos.json");

// Crear archivo si no existe
function ensureTrabajosFile() {
  if (!fs.existsSync(DATA_FILE_TRABAJOS)) {
    fs.writeFileSync(DATA_FILE_TRABAJOS, JSON.stringify([], null, 2), "utf8");
  }
}
ensureTrabajosFile();

function readTrabajos() {
  try {
    const raw = fs.readFileSync(DATA_FILE_TRABAJOS, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeTrabajos(list) {
  fs.writeFileSync(DATA_FILE_TRABAJOS, JSON.stringify(list, null, 2), "utf8");
}

/* === GET: listar ordenes de trabajo (filtrado por mecánico si aplica) === */
app.get("/api/trabajos", (req, res) => {
  const usuario = req.query.usuario || null; 
  const trabajos = readTrabajos();

  if (usuario) {
    const citas = readCitas();

    const filtrados = trabajos.filter((t) => {
      const cita = citas.find((c) => c.id === t.idCita);
      return cita && cita.mecanico === usuario;
    });

    return res.json({ ok: true, trabajos: filtrados });
  }

  return res.json({ ok: true, trabajos });
});

/* === POST: crear OT desde una cita (CU-0028) === */
app.post("/api/trabajos", (req, res) => {
  const { codigoCita, observacionesIniciales, repuestosUtilizados = [] } = req.body || {};

  if (!codigoCita) return res.status(400).json({ ok: false, error: "Debe enviar el codigo de la cita" });

  const citas = readCitas();
  const citaId = Number(codigoCita);
  const cita = citas.find((c) => c.id === citaId);
  if (!cita) return res.status(404).json({ ok: false, error: "Cita no encontrada" });

  const trabajos = readTrabajos();
  if (trabajos.find((t) => t.idCita === cita.id))
    return res.status(409).json({ ok: false, error: `Ya existe una orden de trabajo para la cita ${codigoCita}` });

  // ✅ restar inventario si hay repuestos
  if (repuestosUtilizados && repuestosUtilizados.length > 0) {
    const inventario = readInventario();
    for (const r of repuestosUtilizados) {
      const idx = inventario.findIndex((i) => i.codigo === r.codigo);
      if (idx === -1 || inventario[idx].cantidad < r.cantidad) {
        return res.status(400).json({ ok: false, error: `No hay suficiente stock de ${r.nombre}` });
      }
      inventario[idx].cantidad -= r.cantidad;
    }
    writeInventario(inventario);
  }

  const codigoOrden = `OT-${Date.now()}`;
  const nuevoTrabajo = {
    codigoOrden,
    idCita: cita.id,
    clienteNombre: cita.clienteNombre,
    clienteCedula: cita.clienteCedula,
    placa: cita.vehiculoPlaca,
    fechaCita: cita.fecha,
    horaCita: cita.hora,
    descripcionCita: cita.descripcion || "",
    observacionesIniciales: observacionesIniciales || "",
    tipoServicio: "",
    servicio: "N/A",
    estado: "Pendiente",
    diagnostico: "",
    serviciosRealizados: [],
    repuestosUtilizados: repuestosUtilizados || [],
    notasDiagnostico: [] // 🔽 Agregar campo para notas
  };

  trabajos.push(nuevoTrabajo);
  writeTrabajos(trabajos);

  return res.json({ ok: true, trabajo: nuevoTrabajo });
});

/* === PUT: actualizar detalle de la OT (CU-0031) === */
app.put("/api/trabajos/:codigoOrden", (req, res) => {
  const codigoOrden = String(req.params.codigoOrden || "");
  const body = req.body || {};

  // ❌ Evitar que el front modifique notas internas accidentalmente
  delete body.notasInternas;

  const trabajos = readTrabajos();
  const idx = trabajos.findIndex((t) => String(t.codigoOrden) === codigoOrden);

  if (idx === -1) {
    return res
      .status(404)
      .json({ ok: false, error: "Orden de trabajo no encontrada" });
  }

  /* ================================================================
     PROCESAR REPUESTOS: calcular precio y subtotal automáticamente
     ================================================================ */
  let repuestosProcesados = trabajos[idx].repuestosUtilizados || [];

  // Si vienen repuestos en la actualización…
  if (Array.isArray(body.repuestosUtilizados)) {
    const inventario = readInventario();

    repuestosProcesados = body.repuestosUtilizados.map((r) => {
      const item = inventario.find((i) => i.codigo === r.codigo);

      const precio = item ? Number(item.precio) || 0 : 0;
      const nombre = r.nombre || (item ? item.nombre : "");
      const cantidad = Number(r.cantidad) || 0;
      const subtotal = precio * cantidad;

      return { ...r, nombre, precio, cantidad, subtotal };
    });

    // Aquí podrías manejar lógica de stock si deseas reflejar aumentos/disminuciones
  }

  /* ================================================================ */

  const actualizado = {
    ...trabajos[idx],
    ...body,
    repuestosUtilizados: repuestosProcesados,
    codigoOrden: trabajos[idx].codigoOrden, // protegidos
    idCita: trabajos[idx].idCita,
  };

  // Guardar
  trabajos[idx] = actualizado;
  writeTrabajos(trabajos);

  return res.json({ ok: true, trabajo: actualizado });
});


/*======================================= Mano de Obra ========================================*/
const DATA_FILE_MANO_OBRA = path.join(DATA_DIR, "mano_de_obra.json");

// Crear archivo si no existe
function ensureManoObraFile() {
  if (!fs.existsSync(DATA_FILE_MANO_OBRA)) {
    fs.writeFileSync(DATA_FILE_MANO_OBRA, JSON.stringify([], null, 2), "utf8");
  }
}
ensureManoObraFile();

function readManoObra() {
  try {
    const raw = fs.readFileSync(DATA_FILE_MANO_OBRA, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeManoObra(list) {
  fs.writeFileSync(DATA_FILE_MANO_OBRA, JSON.stringify(list, null, 2), "utf8");
}

/* === GET: listar todos los servicios de mano de obra === */
app.get("/api/mano_de_obra", (req, res) => {
  try {
    const manoObra = readManoObra();
    return res.json({ ok: true, manoObra });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Error al cargar mano de obra" });
  }
});

/* === GET: obtener un servicio específico por código === */
app.get("/api/mano_de_obra/:codigo", (req, res) => {
  const { codigo } = req.params;
  try {
    const manoObra = readManoObra();
    const servicio = manoObra.find(s => s.codigo === codigo);
    
    if (!servicio) {
      return res.status(404).json({ ok: false, error: "Servicio no encontrado" });
    }
    
    return res.json({ ok: true, servicio });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Error al buscar servicio" });
  }
});

/* === POST: crear nuevo servicio de mano de obra === */
app.post("/api/mano_de_obra", (req, res) => {
  const { codigo, nombre, descripcion, precio } = req.body;
  
  if (!codigo || !nombre || !precio) {
    return res.status(400).json({ ok: false, error: "Código, nombre y precio son obligatorios" });
  }
  
  try {
    const manoObra = readManoObra();
    
    // Verificar si ya existe el código
    if (manoObra.find(s => s.codigo === codigo)) {
      return res.status(409).json({ ok: false, error: "Ya existe un servicio con este código" });
    }
    
    const nuevoServicio = {
      id: Date.now(),
      codigo,
      nombre,
      descripcion: descripcion || "",
      precio: Number(precio)
    };
    
    manoObra.push(nuevoServicio);
    writeManoObra(manoObra);
    
    return res.json({ ok: true, servicio: nuevoServicio });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Error al crear servicio" });
  }
});

/* === PUT: actualizar servicio de mano de obra === */
app.put("/api/mano_de_obra/:codigo", (req, res) => {
  const { codigo } = req.params;
  const { nombre, descripcion, precio } = req.body;
  
  try {
    const manoObra = readManoObra();
    const servicioIndex = manoObra.findIndex(s => s.codigo === codigo);
    
    if (servicioIndex === -1) {
      return res.status(404).json({ ok: false, error: "Servicio no encontrado" });
    }
    
    manoObra[servicioIndex] = {
      ...manoObra[servicioIndex],
      ...(nombre && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(precio !== undefined && { precio: Number(precio) })
    };
    
    writeManoObra(manoObra);
    
    return res.json({ ok: true, servicio: manoObra[servicioIndex] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Error al actualizar servicio" });
  }
});

/* === DELETE: eliminar servicio de mano de obra === */
app.delete("/api/mano_de_obra/:codigo", (req, res) => {
  const { codigo } = req.params;
  
  try {
    const manoObra = readManoObra();
    const servicioIndex = manoObra.findIndex(s => s.codigo === codigo);
    
    if (servicioIndex === -1) {
      return res.status(404).json({ ok: false, error: "Servicio no encontrado" });
    }
    
    manoObra.splice(servicioIndex, 1);
    writeManoObra(manoObra);
    
    return res.json({ ok: true, message: "Servicio eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Error al eliminar servicio" });
  }
});

/*======================================= Gestion Cotizaciones ========================================*/
const DATA_FILE_COTIZACIONES = path.join(DATA_DIR, "cotizaciones.json");

// Crear archivo si no existe
function ensureCotizacionesFile() {
  if (!fs.existsSync(DATA_FILE_COTIZACIONES)) {
    fs.writeFileSync(DATA_FILE_COTIZACIONES, JSON.stringify([], null, 2), "utf8");
  }
}
ensureCotizacionesFile();

function readCotizaciones() {
  try {
    const raw = fs.readFileSync(DATA_FILE_COTIZACIONES, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeCotizaciones(list) {
  fs.writeFileSync(
    DATA_FILE_COTIZACIONES,
    JSON.stringify(list, null, 2),
    "utf8"
  );
}

// funcion comun para calcular totales
function calcularTotalesCotizacion(cot) {
  const IVA = 0.13;

  let repuestos = Array.isArray(cot.repuestos) ? cot.repuestos : [];
  let manoObra = Array.isArray(cot.manoObra) ? cot.manoObra : [];

  let subtotalRepuestos = 0;
  repuestos = repuestos.map((r) => {
    const cantidad = Number(r.cantidad) || 0;
    const precio = Number(r.precio) || 0;
    const subtotal = cantidad * precio;
    subtotalRepuestos += subtotal;
    return { ...r, cantidad, precio, subtotal };
  });

  let subtotalManoObra = 0;
  manoObra = manoObra.map((m) => {
    const horas = Number(m.horas) || 0;
    const tarifa = Number(m.tarifa) || 0;
    const subtotal = horas * tarifa;
    subtotalManoObra += subtotal;
    return { ...m, horas, tarifa, subtotal };
  });

  let descuentoPorc = Number(cot.descuentoManoObra) || 0;
  if (descuentoPorc < 0) descuentoPorc = 0;
  if (descuentoPorc > 20) descuentoPorc = 20;

  const descuentoMonto = subtotalManoObra * (descuentoPorc / 100);
  const subtotalManoObraConDescuento = subtotalManoObra - descuentoMonto;

  const base = subtotalRepuestos + subtotalManoObraConDescuento;
  const iva = +(base * IVA).toFixed(2);
  const total = +(base + iva).toFixed(2);

  return {
    ...cot,
    repuestos,
    manoObra,
    descuentoManoObra: descuentoPorc,
    descuentoMonto: +descuentoMonto.toFixed(2),
    subtotalRepuestos: +subtotalRepuestos.toFixed(2),
    subtotalManoObra: +subtotalManoObra.toFixed(2),
    baseImponible: +base.toFixed(2),
    iva,
    total,
  };
}

/* === GET: todas las cotizaciones / proformas === */
app.get("/api/cotizaciones", (_req, res) => {
  return res.json(readCotizaciones());
});

/* === POST: crear cotizacion nueva === */
app.post("/api/cotizaciones", (req, res) => {
  const body = req.body || {};
  const {
    clienteNombre,
    clienteCedula,
    vehiculoPlaca,
    codigoOrden,
    repuestos,
    manoObra,
    descuentoManoObra,
    estado, // "borrador" o "aceptada" (opcional)
  } = body;

  if (!clienteNombre || !clienteCedula) {
    return res
      .status(400)
      .json({ ok: false, error: "Cliente y cedula son obligatorios" });
  }

  const tieneItems =
    (Array.isArray(repuestos) && repuestos.length > 0) ||
    (Array.isArray(manoObra) && manoObra.length > 0);

  if (!tieneItems) {
    return res.status(400).json({
      ok: false,
      error: "Debe agregar al menos un repuesto o mano de obra",
    });
  }

  const cotizaciones = readCotizaciones();

  const timestamp = Date.now();
  const codigo = `COT-${timestamp}`;

  let nueva = {
    codigo,
    clienteNombre,
    clienteCedula,
    vehiculoPlaca,
    codigoOrden: codigoOrden || "",
    repuestos: repuestos || [],
    manoObra: manoObra || [],
    descuentoManoObra: descuentoManoObra || 0,
    esProforma: false,
    estado: estado || "borrador", // solo referencia visual
    fechaCreacion: new Date().toISOString(),
  };

  nueva = calcularTotalesCotizacion(nueva);

  cotizaciones.push(nueva);
  writeCotizaciones(cotizaciones);

  return res.json({ ok: true, cotizacion: nueva });
});

/* === PUT: modificar cotizacion (no proforma) === */
app.put("/api/cotizaciones/:codigo", (req, res) => {
  const codigo = String(req.params.codigo || "");
  const body = req.body || {};

  let cotizaciones = readCotizaciones();
  const idx = cotizaciones.findIndex((c) => String(c.codigo) === codigo);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Cotizacion no encontrada" });
  }

  if (cotizaciones[idx].esProforma) {
    return res.status(400).json({
      ok: false,
      error: "No se puede editar una cotizacion convertida en proforma",
    });
  }

  let actualizada = {
    ...cotizaciones[idx],
    ...body,
    codigo, // no se cambia
  };

  actualizada = calcularTotalesCotizacion(actualizada);
  cotizaciones[idx] = actualizada;
  writeCotizaciones(cotizaciones);

  return res.json({ ok: true, cotizacion: actualizada });
});

/* === PATCH: convertir a proforma === */
app.patch("/api/cotizaciones/:codigo/proforma", (req, res) => {
  const codigo = String(req.params.codigo || "");
  let cotizaciones = readCotizaciones();
  const idx = cotizaciones.findIndex((c) => String(c.codigo) === codigo);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Cotizacion no encontrada" });
  }

  const actual = cotizaciones[idx];

  if (actual.esProforma) {
    return res
      .status(400)
      .json({ ok: false, error: "La cotizacion ya fue convertida en proforma" });
  }

  const proforma = {
    ...calcularTotalesCotizacion(actual),
    esProforma: true,
    estado: "proforma",
    fechaProforma: new Date().toISOString(),
  };

  cotizaciones[idx] = proforma;
  writeCotizaciones(cotizaciones);

  return res.json({ ok: true, cotizacion: proforma });
});

/* === DELETE: eliminar cotizacion === */
app.delete("/api/cotizaciones/:codigo", (req, res) => {
  const codigo = String(req.params.codigo || "");
  let cotizaciones = readCotizaciones();
  const idx = cotizaciones.findIndex((c) => String(c.codigo) === codigo);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Cotizacion no encontrada" });
  }

  if (cotizaciones[idx].esProforma) {
    return res.status(400).json({
      ok: false,
      error:
        "Las proformas no pueden eliminarse porque son documentos oficiales.",
    });
  }

  cotizaciones = cotizaciones.filter((c) => String(c.codigo) !== codigo);
  writeCotizaciones(cotizaciones);

  return res.json({ ok: true });
});

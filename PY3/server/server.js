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
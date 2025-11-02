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

/*=======================================Gestion Clientes======================================== */
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

// GET: lista de clientes
app.get("/api/clientes", (_req, res) => {
  return res.json(readClientes());
});

// POST: agregar cliente
app.post("/api/clientes", (req, res) => {
  const nuevo = req.body || {};
  if (!nuevo.nombre || !nuevo.cedula) {
    return res.status(400).json({ ok: false, error: "Nombre y cédula son obligatorios" });
  }

  const clientes = readClientes();
  if (clientes.find(c => c.cedula === nuevo.cedula)) {
    return res.status(409).json({ ok: false, error: "Cliente ya existe" });
  }

  nuevo.id = Date.now();
  clientes.push(nuevo);
  writeClientes(clientes);
  return res.json({ ok: true, clientes });
});

// PUT: actualizar cliente
app.put("/api/clientes/:id", (req, res) => {
  const id = Number(req.params.id);
  const update = req.body || {};
  const clientes = readClientes();
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "Cliente no encontrado" });

  clientes[idx] = { ...clientes[idx], ...update };
  writeClientes(clientes);
  return res.json({ ok: true, cliente: clientes[idx] });
});

// DELETE: eliminar cliente
app.delete("/api/clientes/:id", (req, res) => {
  const id = Number(req.params.id);
  const clientes = readClientes();
  if (!clientes.find(c => c.id === id)) return res.status(404).json({ ok: false, error: "Cliente no encontrado" });

  const filtered = clientes.filter(c => c.id !== id);
  writeClientes(filtered);
  return res.json({ ok: true, clientes: filtered });
});

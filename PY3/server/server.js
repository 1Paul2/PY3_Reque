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

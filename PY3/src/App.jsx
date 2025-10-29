import React, { useMemo, useState, useEffect } from "react";

/* ======================= API HTTP ======================= */
const apiHttp = {
  async getAll() {
    const res = await fetch("/api/usuarios");
    if (!res.ok) throw new Error("No se pudo cargar usuarios");
    return res.json();
  },
  async create(user) {
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo crear el usuario");
    }
    return data.users;
  },
  async changePassword(code, newPassword) {
    const res = await fetch(`/api/usuarios/${encodeURIComponent(code)}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo cambiar la contraseña");
    }
    return data.user;
  }
};

/* ======================= APP ======================= */
function App() {
  const [users, setUsers] = useState(null);
  const [session, setSession] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const arr = await apiHttp.getAll();
        setUsers(arr);
      } catch (e) {
        console.error(e);
        setLoadErr("No se pudieron cargar los usuarios del servidor.");
        setUsers([]); // evita bloqueo de UI
      }
    })();
  }, []);

  const api = useMemo(() => ({
    // Login con regla de primer acceso (code + code)
    login: (keyInput, password) => {
      const list = users ?? [];
      const key = (keyInput || "").trim();
      const pass = (password || "").toString();

      // 1) si existe por code y requiere cambio, solo acepta code+code
      const uByCode = list.find(x => String(x.code) === key);

      if (uByCode && uByCode.mustChangePassword) {
        if (pass === String(uByCode.code)) {
          return { ok: true, user: uByCode, needsPasswordChange: true };
        }
        return { ok: false, error: "Para el primer acceso use su codigo como usuario y contraseña" };
      }

      // 2) login normal (code/correo/nombre + password)
      const keyLower = key.trim().toLowerCase();
      const u = list.find(x => {
        const code = (x.code || "").toLowerCase();
        const mail = (x.correo || "").toLowerCase();
        const name = (x.nombre || "").toLowerCase();
        return (code === keyLower || mail === keyLower || name === keyLower) && x.password === pass;
      });

      return u ? { ok: true, user: u } : { ok: false, error: "Usuario o contraseña incorrectos" };
    },

    existsByCedulaOrCorreo: (ced, mail) => {
      const list = users ?? [];
      const m = (mail || "").toLowerCase();
      return list.some(u => (ced && u.cedula === ced) || (m && (u.correo || "").toLowerCase() === m));
    },

    createUser: async (nuevo) => {
      const updated = await apiHttp.create(nuevo); // guarda en server/data/usuarios.json
      setUsers(updated);
      return { ok: true };
    },

    changePasswordLocal: async (code, newPassword) => {
      const updatedUser = await apiHttp.changePassword(code, newPassword);
      // refrescar lista en el estado
      const arr = await apiHttp.getAll();
      setUsers(arr);
      return updatedUser;
    },

    getAll: () => users ?? []
  }), [users]);

  if (users === null) return <div style={{ padding: 20 }}>Cargando...</div>;

  if (!session) return (
    <>
      {loadErr && <div className="error" style={{padding:12, margin:12}}>{loadErr}</div>}
      <Login onLogin={setSession} api={api} />
    </>
  );

  return session.rol === "admin"
    ? <AdminHome session={session} onLogout={() => setSession(null)} api={api} />
    : <UserHome  session={session} onLogout={() => setSession(null)} />;
}

/* ======================= LOGIN ======================= */
function Login({ onLogin, api }) {
  const [key, setKey] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [forcePwd, setForcePwd] = useState(null); // { user }

  const submit = (e) => {
    e && e.preventDefault();
    setErr("");

    if (!key.trim() || !pass.trim()) {
      setErr("Debe ingresar el codigo/correo/nombre y la contraseña");
      return;
    }

    const res = api.login(key.trim(), pass);
    if (!res.ok) {
      setErr(res.error || "Usuario o contraseña incorrectos");
      setPass("");
      return;
    }
    if (res.needsPasswordChange) {
      setForcePwd({ user: res.user });
      return;
    }
    onLogin(res.user);
  };

  return (
    <div className="center-screen">
      <div className="card">
        <h2>Inicio de sesion</h2>
        <p>Ingrese su <b>codigo</b>, <b>correo</b> o <b>nombre</b> y su contraseña</p>
        {err && <p className="error">{err}</p>}

        <form onSubmit={submit}>
          <label>Codigo / Correo / Nombre</label>
          <input className="input" value={key} onChange={e=>setKey(e.target.value)} />

          <label>Contraseña</label>
          <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} />

          <button className="btn-primary" type="submit">Entrar</button>
        </form>

        <small style={{display:"block", marginTop:10}}>
          <b>Admin de prueba:</b><br/>
          Codigo: admin01 — Contraseña: admin123
        </small>
      </div>

      {forcePwd && (
        <ChangePasswordModal
          user={forcePwd.user}
          onClose={() => setForcePwd(null)}
          onDone={(updatedUser) => {
            setForcePwd(null);
            onLogin(updatedUser);
          }}
        />
      )}
    </div>
  );
}

/* ======================= ADMIN HOME ======================= */
function AdminHome({ session, onLogout, api }) {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentSection, setCurrentSection] = useState(""); // 👈 sección activa

  const recordarCodigos = () => {
    const usuarios = api.getAll();
    if (!usuarios.length) { alert("No hay usuarios"); return; }
    const header = "Nombre | Codigo | Contraseña\n";
    const body = usuarios.map(u => `${u.nombre} | ${u.code} | ${u.password}`).join("\n");
    if (confirm("Este archivo incluira contraseñas en texto claro. Desea continuar?")) {
      const blob = new Blob([header + body], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "codigos_usuarios.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <div className="home">
      {/* Menú */}
      <div className="menu-container">
        <button className="btn-menu-toggle" onClick={() => setShowMenu(!showMenu)}>☰</button>
        {showMenu && (
          <div className="dropdown-menu">
            <button className="btn-menu" onClick={() => setCurrentSection("clientes")}>Gestión Clientes</button>
            <button className="btn-menu" onClick={() => setCurrentSection("vehiculos")}>Gestion Vehiculos</button>
            <button className="btn-menu" onClick={() => setCurrentSection("inventario")}>Gestion Inventario</button>
            <button className="btn-menu" onClick={() => setCurrentSection("citas")}>Gestion Citas</button>
            <button className="btn-menu" onClick={() => setCurrentSection("cotizacion")}>Cotizacion</button>
            <button className="btn-menu" onClick={() => setCurrentSection("reportes")}>Reportes</button>
          </div>
        )}
      </div>

      {/* 🔹 Encabezado */}
      <div className="home-head">
        <div>
          <h1>Bienvenido, {session.nombre}</h1>
          <div className="muted">Rol: {session.rol}</div>
        </div>
        <button className="btn-danger" onClick={() => setConfirmOut(true)}>Cerrar sesión</button>
      </div>

      {/* 🔹 Contenido principal según sección */}
      <div style={{ maxWidth: 800, margin: "16px auto" }}>
        {currentSection === "" && (
          <>
            <div className="stack">
              <button className="btn-primary" onClick={() => setShowCreate(true)}>Crear usuario</button>
              <button className="btn-secondary" onClick={recordarCodigos}>Recordar codigos</button>
            </div>
            {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} api={api} />}
          </>
        )}
        {currentSection === "clientes" && <GestionClientes />}
        {currentSection === "vehiculos" && <div>Sección Vehículos</div>}
        {currentSection === "inventario" && <div>Sección Inventario</div>}
        {currentSection === "citas" && <div>Sección Citas</div>}
        {currentSection === "cotizacion" && <div>Sección Cotización</div>}
        {currentSection === "reportes" && <div>Sección Reportes</div>}
      </div>

      {confirmOut && (
        <ConfirmDialog
          title="¿Seguro que desea cerrar sesión?"
          message="Si sale, volverá a la pantalla de inicio de sesión."
          onCancel={() => setConfirmOut(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  );
}

/* ======================= USER HOME ======================= */
function UserHome({ session, onLogout }) {
  const [confirmOut, setConfirmOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // estado del submenú
  const [currentSection, setCurrentSection] = useState(""); // sección activa

  return (
    <div className="home">

      {/* Botón del submenú (esquina izquierda) */}
      <div className="menu-container">
        <button
          className="btn-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        {menuOpen && (
          <div className="dropdown-menu">
            <button className="btn-menu" onClick={() => setCurrentSection("clientes")}>Gestión Clientes</button>
            <button className="btn-menu" onClick={() => setCurrentSection("vehiculos")}>Gestion Vehiculos</button>
            <button className="btn-menu" onClick={() => setCurrentSection("inventario")}>Gestion Inventario</button>
            <button className="btn-menu" onClick={() => setCurrentSection("citas")}>Gestion Citas</button>
            <button className="btn-menu" onClick={() => setCurrentSection("cotizacion")}>Cotizacion</button>
            <button className="btn-menu" onClick={() => setCurrentSection("reportes")}>Reportes</button>
          </div>
        )}
      </div>

      {/* Encabezado */}
      <div className="home-head">
        <div>
          <h1>Bienvenido, {session.nombre}</h1>
          <div className="muted">Código: {session.code}</div>
        </div>
        <button className="btn-danger" onClick={() => setConfirmOut(true)}>
          Cerrar sesión
        </button>
      </div>

      {/* Contenido principal según sección */}
      <div style={{ maxWidth: 800, margin: "16px auto" }}>
        {currentSection === "" && (
          <div className="card" style={{ maxWidth: 520, margin: "16px auto" }}>
            <h3>Interfaz de Usuario</h3>
            <p>
              Ingresaste correctamente, {session.nombre}. Aquí irá el menú del rol usuario.
            </p>
          </div>
        )}
        {currentSection === "clientes" && <GestionClientes />}
        {currentSection === "vehiculos" && <div>Sección Vehículos</div>}
        {currentSection === "inventario" && <div>Sección Inventario</div>}
        {currentSection === "citas" && <div>Sección Citas</div>}
        {currentSection === "cotizacion" && <div>Sección Cotización</div>}
        {currentSection === "reportes" && <div>Sección Reportes</div>}
      </div>

      {/* Confirmación de salida */}
      {confirmOut && (
        <ConfirmDialog
          title="¿Seguro que desea cerrar sesión?"
          message="Si sale, volverá a la pantalla de inicio de sesión."
          onCancel={() => setConfirmOut(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  );
}

/* ======================= MODAL: CREAR USUARIO (maquetado limpio) ======================= */
function CreateUserModal({ onClose, api }) {
  const [form, setForm] = useState({
    nombre: "", cedula: "", correo: "", telefono: "",
    fechaNac: "", idioma: "es", rol: "usuario"
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(null); // { code, nombre }
  const [loading, setLoading] = useState(false);

  const genCode = (nombre, cedula) => {
    const base = (nombre || "USR").trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,3);
    const d = new Date(); const y = String(d.getFullYear()).slice(-2); const m = String(d.getMonth()+1).padStart(2,"0");
    const onlyDigits = (cedula || "").replace(/\D/g,"");
    const tail = onlyDigits ? onlyDigits.slice(-3).padStart(3,"0") : String(Math.floor(Math.random()*999)).padStart(3,"0");
    return `${base}${y}${m}-${tail}`;
  };

  const validateEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = v => /^[0-9\-\+\s]{7,20}$/.test(v);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const { nombre, cedula, correo, telefono, fechaNac, idioma, rol } = form;

    if (!nombre.trim() || !cedula.trim() || !correo.trim() || !telefono.trim() || !fechaNac || !idioma || !rol) {
      setErr("Complete todos los campos requeridos");
      return;
    }
    if (!validateEmail(correo)) { setErr("Correo inválido"); return; }
    if (!validatePhone(telefono)) { setErr("Teléfono inválido"); return; }
    if (api.existsByCedulaOrCorreo(cedula.trim(), correo.trim())) {
      setErr("Usuario ya registrado (cédula o correo existente)");
      return;
    }

    const code = genCode(nombre, cedula);

    // contraseña temporal = code; forzar cambio al primer login
    const nuevo = {
      code,
      password: code,
      mustChangePassword: true,
      nombre,
      rol,
      cedula,
      correo,
      telefono,
      fechaNac,
      idioma
    };

    try {
      setLoading(true);
      await api.createUser(nuevo);
      setLoading(false);
      setOk({ code, nombre });
    } catch (e) {
      setLoading(false);
      setErr(e.message || "No se pudo registrar el usuario");
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card">
        {!ok ? (
          <>
            <h3 className="modal-title">Crear usuario</h3>
            <p className="modal-text">El sistema generará el código y la contraseña temporal (igual al código).</p>
            {err && <p className="error" style={{marginTop:8}}>{err}</p>}

            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="col">
                  <label>Nombre</label>
                  <input
                    className="input"
                    value={form.nombre}
                    onChange={e=>setForm({...form, nombre:e.target.value})}
                  />
                </div>

                <div className="col">
                  <label>Cédula</label>
                  <input
                    className="input"
                    value={form.cedula}
                    onChange={e=>setForm({...form, cedula:e.target.value})}
                  />
                </div>

                <div className="col">
                  <label>Correo</label>
                  <input
                    className="input"
                    value={form.correo}
                    onChange={e=>setForm({...form, correo:e.target.value})}
                  />
                </div>

                <div className="col">
                  <label>Número de teléfono</label>
                  <input
                    className="input"
                    value={form.telefono}
                    onChange={e=>setForm({...form, telefono:e.target.value})}
                  />
                </div>

                <div className="col">
                  <label>Fecha de nacimiento</label>
                  <input
                    className="input"
                    type="date"
                    value={form.fechaNac}
                    onChange={e=>setForm({...form, fechaNac:e.target.value})}
                  />
                </div>

                <div className="col">
                  <label>Idioma</label>
                  <select
                    className="input"
                    value={form.idioma}
                    onChange={e=>setForm({...form, idioma:e.target.value})}
                  >
                    <option value="es">Español (es)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>

                <div className="col col-span-2">
                  <label>Rol</label>
                  <select
                    className="input"
                    value={form.rol}
                    onChange={e=>setForm({...form, rol:e.target.value})}
                  >
                    <option value="usuario">Usuario normal</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions compact-actions">
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-compact"
                  disabled={loading}
                >
                  {loading ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3 className="modal-title">Creación exitosa</h3>
            <p className="modal-text">
              Usuario <b>{ok.nombre}</b> registrado.<br/>
              Código asignado: <b>{ok.code}</b><br/>
              Nota: la contraseña temporal es el mismo código. El usuario deberá cambiarla en su primer acceso.
            </p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>Listo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ======================= MODAL: CAMBIAR CONTRASEÑA (PRIMER ACCESO) ======================= */
function ChangePasswordModal({ user, onClose, onDone }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (p1.trim().length < 4) { setErr("La contraseña debe tener al menos 4 caracteres"); return; }
    if (p1 !== p2) { setErr("Las contraseñas no coinciden"); return; }

    try {
      setLoading(true);
      const updated = await apiHttp.changePassword(user.code, p1.trim());
      setLoading(false);
      onDone(updated);
    } catch (ex) {
      setLoading(false);
      setErr(ex.message || "No se pudo cambiar la contraseña");
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{maxWidth:480}}>
        <h3 className="modal-title">Cambiar contraseña (primer acceso)</h3>
        <p className="modal-text">Usuario: <b>{user.nombre}</b> — Código: <b>{user.code}</b></p>
        {err && <p className="error" style={{marginTop:8}}>{err}</p>}

        <form onSubmit={submit}>
          <label>Nueva contraseña</label>
          <input className="input" type="password" value={p1} onChange={e=>setP1(e.target.value)} />
          <label>Confirmar contraseña</label>
          <input className="input" type="password" value={p2} onChange={e=>setP2(e.target.value)} />

          <div className="modal-actions" style={{marginTop:12}}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Guardando..." : "Guardar y continuar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================= MODAL: CONFIRMAR CIERRE SESION ======================= */
function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>No</button>
          <button className="btn-primary" onClick={onConfirm}>Sí</button>
        </div>
      </div>
    </div>
  );
}

export default App;

/* ======================= GESTION CLIENTES ======================= */
function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre: "", cedula: "", correo: "" });

  // Agregar cliente
  const agregarCliente = () => {
    if (!newCliente.nombre.trim() || !newCliente.cedula.trim()) return;
    setClientes([...clientes, { ...newCliente, id: Date.now() }]);
    setNewCliente({ nombre: "", cedula: "", correo: "" });
    setShowForm(false);
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.cedula.includes(search) ||
    (c.correo && c.correo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="gestion-clientes">
      <h2>Gestión de Clientes</h2>

      {/* Barra de búsqueda arriba del botón */}
      <input
        className="search-bar"
        placeholder="Buscar cliente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: 6, marginBottom: 10 }}
      />

      {/* Botón agregar cliente */}
      <button
        className="btn btn-add"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 10 }}
      >
        {showForm ? "Cancelar" : "Agregar Cliente"}
      </button>

      {/* Formulario para agregar cliente */}
      {showForm && (
        <div className="form-container">
          <input
            placeholder="Nombre"
            value={newCliente.nombre}
            onChange={e => setNewCliente({ ...newCliente, nombre: e.target.value })}
          />
          <input
            placeholder="Cédula"
            value={newCliente.cedula}
            onChange={e => setNewCliente({ ...newCliente, cedula: e.target.value })}
          />
          <input
            placeholder="Correo"
            value={newCliente.correo}
            onChange={e => setNewCliente({ ...newCliente, correo: e.target.value })}
          />
          <input
            placeholder="Numero Telefornico"
            value={newCliente.numero}
            onChange={e => setNewCliente({ ...newCliente, numero: e.target.value })}
          />
          <button className="btn btn-add" onClick={agregarCliente}>Guardar</button>
        </div>
      )}

      {/* Lista de clientes */}
      <ul className="cliente-list">
        {clientesFiltrados.map(c => (
          <li
            key={c.id}
            onClick={() => setSelected(c)}
            className={selected?.id === c.id ? "selected" : ""}
          >
            {c.nombre} ({c.cedula})
          </li>
        ))}
      </ul>

      {/* Información del cliente seleccionado */}
      {selected && (
        <div className="cliente-info">
          <h3>Información del Cliente</h3>
          <p><b>Nombre:</b> {selected.nombre}</p>
          <p><b>Cédula:</b> {selected.cedula}</p>
          <p><b>Correo:</b> {selected.correo || "N/A"}</p>
        </div>
      )}
    </div>
  );
}



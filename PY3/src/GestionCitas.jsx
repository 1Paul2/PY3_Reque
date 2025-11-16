import React, { useEffect, useState } from "react";

/* ========================== API Citas ========================== */
const apiCitas = {
  getAll: async () => {
    const res = await fetch("/api/citas");
    if (!res.ok) throw new Error("Error al cargar citas");
    return res.json();
  },

  create: async (cita) => {
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.citas;
  },

  update: async (id, cita) => {
    const res = await fetch(`/api/citas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.cita;
  },

  remove: async (id) => {
    const res = await fetch(`/api/citas/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.citas;
  }
};

/* ========================== API Usuarios ========================== */
const apiUsuarios = {
  getMecanicos: async () => {
    const res = await fetch("/api/usuarios");
    if (!res.ok) throw new Error("Error cargando mecánicos");
    return res.json();
  }
};

/* ======================= GESTION CITAS ======================= */
function GestionCitas({ session }) {
  const [citas, setCitas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);

  const [search, setSearch] = useState("");
  const [searchVehiculo, setSearchVehiculo] = useState("");

  const [selected, setSelected] = useState(null);

  const [showFormAgregar, setShowFormAgregar] = useState(false);
  const [showAsignar, setShowAsignar] = useState(false);
  const [showEditar, setShowEditar] = useState(false);

  const [mecanicoSeleccionado, setMecanicoSeleccionado] = useState("");

  const [editData, setEditData] = useState({ fecha: "", hora: "" });

  const [newCita, setNewCita] = useState({
    clienteCedula: "",
    clienteNombre: "",
    placa: "",
    fecha: "",
    hora: "",
    descripcion: "",
    mecanico: "Sin Asignar",
    estado: "En Espera"
  });

  /* ====================== CARGAR DATOS ====================== */
  useEffect(() => {
    (async () => {
      try {
        const [citasRes, vehiculosRes, usuariosRes] = await Promise.all([
          fetch("/api/citas"),
          fetch("/api/vehiculos"),
          fetch("/api/usuarios")
        ]);

        const [citasData, vehiculosData, usuariosData] = await Promise.all([
          citasRes.json(),
          vehiculosRes.json(),
          usuariosRes.json()
        ]);

        setCitas(citasData);
        setVehiculos(vehiculosData);
        setMecanicos(usuariosData.filter(u => u.rol === "usuario"));

      } catch (e) {
        alert("No se pudieron cargar citas, vehículos o usuarios.");
      }
    })();
  }, []);

  /* ====================== FILTRAR ====================== */
  const citasFiltradas = citas.filter((c) =>
    `${c.clienteNombre} ${c.descripcion} ${c.fecha}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const vehiculosFiltrados = vehiculos.filter(v =>
    `${v.placa} ${v.marca} ${v.modelo} ${v.clienteNombre}`
      .toLowerCase()
      .includes(searchVehiculo.toLowerCase())
  );

  // Verificar si no hay citas
  const noHayCitas = citasFiltradas.length === 0;

  /* ====================== AGREGAR CITA ====================== */
  const agregarCita = async () => {
    if (!newCita.placa) return alert("Debe seleccionar un vehículo.");
    if (!newCita.fecha || !newCita.hora) return alert("Debe seleccionar fecha y hora.");

    try {
      const enviar = {
        clienteCedula: newCita.clienteCedula,
        clienteNombre: newCita.clienteNombre,
        vehiculoPlaca: newCita.placa,
        fecha: newCita.fecha,
        hora: newCita.hora,
        descripcion: newCita.descripcion,
        mecanico: "Sin Asignar",
        estado: "En Espera"
      };

      const updated = await apiCitas.create(enviar);
      setCitas(updated);
      setShowFormAgregar(false);

      setNewCita({
        clienteCedula: "",
        clienteNombre: "",
        placa: "",
        fecha: "",
        hora: "",
        descripcion: "",
        mecanico: "Sin Asignar",
        estado: "En Espera"
      });

    } catch (e) {
      alert(e.message);
    }
  };

  /* ====================== ELIMINAR ====================== */
  const eliminarCita = async (id) => {
    if (!confirm("¿Eliminar cita?")) return;
    try {
      setCitas(await apiCitas.remove(id));
      setSelected(null);
    } catch (e) {
      alert(e.message);
    }
  };

  /* ====================== ASIGNAR MECÁNICO ====================== */
  const asignarMecanico = async () => {
    if (!mecanicoSeleccionado) return alert("Seleccione un mecánico.");

    const citaActualizada = {
      ...selected,
      mecanico: mecanicoSeleccionado,
      estado: "Aceptada"
    };

    try {
      const updated = await apiCitas.update(selected.id, citaActualizada);

      setCitas(citas.map(c => c.id === selected.id ? updated : c));
      setSelected(updated);
      setShowAsignar(false);

    } catch (e) {
      alert(e.message);
    }
  };

  /* ====================== MODIFICAR CITA ====================== */
  const abrirEditar = () => {
    setEditData({
      fecha: selected.fecha.split("T")[0],
      hora: selected.hora
    });
    setShowEditar(true);
  };

  const modificarCita = async () => {
    if (!editData.fecha || !editData.hora)
      return alert("Debe completar fecha y hora.");

    const citaModificada = {
      ...selected,
      fecha: editData.fecha,
      hora: editData.hora
    };

    try {
      const updated = await apiCitas.update(selected.id, citaModificada);

      setCitas(citas.map(c => c.id === selected.id ? updated : c));
      setSelected(updated);
      setShowEditar(false);

    } catch (e) {
      alert(e.message);
    }
  };

  /* ======================= RENDER ======================= */
  return (
    <div className="gestion-citas">
      <h2>Gestión de Citas</h2>

      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar cita..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn btn-add" onClick={() => setShowFormAgregar(true)}>
          Nueva Cita
        </button>
      </div>

      {/* LISTA - USANDO CLASES CORRECTAS */}
      <ul className="cita-list">
        {noHayCitas ? (
          <li className="no-citas">
            No hay citas programadas
          </li>
        ) : (
          citasFiltradas.map((c) => (
            <li
              key={c.id}
              className={selected?.id === c.id ? "selected" : ""}
              onClick={() => setSelected(c)}
            >
              {c.clienteNombre} — {c.fecha.split("T")[0]} {c.hora}
            </li>
          ))
        )}
      </ul>

      {/* DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Detalle de Cita</h3>

            <p><b>Cliente:</b> {selected.clienteNombre}</p>
            <p><b>Cédula:</b> {selected.clienteCedula}</p>
            <p><b>Vehículo:</b> {selected.vehiculoPlaca}</p>
            <p><b>Fecha:</b> {selected.fecha.split("T")[0]}</p>
            <p><b>Hora:</b> {selected.hora}</p>
            <p><b>Descripción:</b> {selected.descripcion}</p>
            <p><b>Mecánico:</b> {selected.mecanico}</p>
            <p><b>Estado:</b> {selected.estado}</p>

            <div className="btn-group">
              {session.rol === "admin" && (
                <>
                  <button
                    className="btn btn-edit"
                    onClick={() => {
                      setMecanicoSeleccionado(selected.mecanico);
                      setShowAsignar(true);
                    }}
                  >
                    Asignar Mecánico
                  </button>

                  <button className="btn btn-edit" onClick={abrirEditar}>
                    Modificar
                  </button>
                </>
              )}
              
              <button className="btn btn-delete" onClick={() => eliminarCita(selected.id)}>
                Eliminar
              </button>
              <button className="btn btn-close" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR */}
      {showEditar && (
        <div className="modal-overlay" onClick={() => setShowEditar(false)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Modificar Cita</h3>

            <input
              type="date"
              value={editData.fecha}
              onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
            />

            <input
              type="time"
              value={editData.hora}
              onChange={(e) => setEditData({ ...editData, hora: e.target.value })}
            />

            <div className="btn-group">
              <button className="btn btn-add" onClick={modificarCita}>
                Guardar
              </button>
              <button className="btn btn-close" onClick={() => setShowEditar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASIGNAR MECÁNICO */}
      {showAsignar && (
        <div className="modal-overlay" onClick={() => setShowAsignar(false)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Asignar Mecánico</h3>

            <select
              value={mecanicoSeleccionado}
              onChange={(e) => setMecanicoSeleccionado(e.target.value)}
            >
              <option value="">Seleccione un mecánico</option>
              {mecanicos.map(m => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>

            <div className="btn-group">
              <button className="btn btn-add" onClick={asignarMecanico}>
                Guardar
              </button>
              <button className="btn btn-close" onClick={() => setShowAsignar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AGREGAR CITA */}
      {showFormAgregar && (
        <div className="modal-overlay" onClick={() => setShowFormAgregar(false)}>
          <div className="modal modal-agregar" onClick={(e) => e.stopPropagation()}>

            <h3>Agregar Cita</h3>

            <input
              placeholder="Buscar vehículo..."
              value={searchVehiculo}
              onChange={(e) => setSearchVehiculo(e.target.value)}
              className="search-bar"
            />

            <select
              value={newCita.placa}
              onChange={(e) => {
                const v = vehiculos.find(x => x.placa === e.target.value);
                if (!v) return;

                setNewCita({
                  ...newCita,
                  placa: v.placa,
                  clienteCedula: v.clienteCedula,
                  clienteNombre: v.clienteNombre
                });
              }}
            >
              <option value="">Seleccione un vehículo</option>

              {vehiculosFiltrados.map((v) => (
                <option key={v.placa} value={v.placa}>
                  {v.placa} — {v.marca} {v.modelo} — {v.clienteNombre}
                </option>
              ))}
            </select>

            {newCita.clienteNombre && (
              <p>
                Cliente: <b>{newCita.clienteNombre}</b> ({newCita.clienteCedula})
              </p>
            )}

            <input
              type="date"
              value={newCita.fecha}
              onChange={(e) => setNewCita({ ...newCita, fecha: e.target.value })}
            />

            <input
              type="time"
              value={newCita.hora}
              onChange={(e) => setNewCita({ ...newCita, hora: e.target.value })}
            />

            <textarea
              placeholder="Descripción..."
              value={newCita.descripcion}
              onChange={(e) => setNewCita({ ...newCita, descripcion: e.target.value })}
            />

            <div className="btn-group">
              <button className="btn btn-add" onClick={agregarCita}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowFormAgregar(false)}>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default GestionCitas;
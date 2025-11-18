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
  const [showConfirmacionReemplazo, setShowConfirmacionReemplazo] = useState(false);

  const [mecanicoSeleccionado, setMecanicoSeleccionado] = useState("");
  const [vehiculoConCitaExistente, setVehiculoConCitaExistente] = useState(null);
  const [citaExistente, setCitaExistente] = useState(null);

  // 🔽 ACTUALIZADO: Incluir estado en editData
  const [editData, setEditData] = useState({ 
    fecha: "", 
    hora: "",
    estado: ""
  });

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

        // 🔽 CORRECIÓN: Manejar tanto array directo como objeto con propiedad citas
        let citasArray;
        if (Array.isArray(citasData)) {
          citasArray = citasData;
        } else {
          citasArray = citasData.citas || [];
        }

        setCitas(citasArray);
        setVehiculos(vehiculosData);
        setMecanicos(usuariosData.filter(u => u.rol === "usuario"));

      } catch (e) {
        alert("No se pudieron cargar citas, vehículos o usuarios.");
      }
    })();
  }, []);

  /* ====================== VERIFICAR SI VEHÍCULO TIENE CITA ====================== */
  const verificarCitaExistente = (placa) => {
    // Buscar citas activas para este vehículo (excluyendo canceladas)
    const citaExistente = citas.find(cita => 
      cita.vehiculoPlaca === placa && 
      cita.estado !== "Cancelada"
    );
    
    return citaExistente || null;
  };

  /* ====================== MANEJAR SELECCIÓN DE VEHÍCULO ====================== */
  const manejarSeleccionVehiculo = (placaSeleccionada) => {
    const vehiculoSeleccionado = vehiculos.find(v => v.placa === placaSeleccionada);
    if (!vehiculoSeleccionado) return;

    // Verificar si el vehículo ya tiene una cita activa
    const citaExistente = verificarCitaExistente(placaSeleccionada);
    
    if (citaExistente) {
      // Mostrar modal de confirmación
      setVehiculoConCitaExistente(vehiculoSeleccionado);
      setCitaExistente(citaExistente);
      setShowConfirmacionReemplazo(true);
    } else {
      // No hay cita existente, proceder normalmente
      actualizarDatosVehiculo(vehiculoSeleccionado);
    }
  };

  /* ====================== ACTUALIZAR DATOS DEL VEHÍCULO ====================== */
  const actualizarDatosVehiculo = (vehiculo) => {
    setNewCita({
      ...newCita,
      placa: vehiculo.placa,
      clienteCedula: vehiculo.clienteCedula,
      clienteNombre: vehiculo.clienteNombre
    });
  };

  /* ====================== CONFIRMAR REEMPLAZO DE CITA ====================== */
  const confirmarReemplazo = async () => {
    try {
      // Primero cancelar la cita existente
      const citaCancelada = {
        ...citaExistente,
        estado: "Cancelada"
      };
      
      await apiCitas.update(citaExistente.id, citaCancelada);
      
      // Actualizar la lista de citas localmente
      setCitas(citas.map(c => 
        c.id === citaExistente.id ? citaCancelada : c
      ));
      
      // Proceder con la nueva cita
      actualizarDatosVehiculo(vehiculoConCitaExistente);
      setShowConfirmacionReemplazo(false);
      setVehiculoConCitaExistente(null);
      setCitaExistente(null);
      
    } catch (e) {
      alert("Error al cancelar la cita existente: " + e.message);
    }
  };

  /* ====================== CANCELAR REEMPLAZO ====================== */
  const cancelarReemplazo = () => {
    setShowConfirmacionReemplazo(false);
    setVehiculoConCitaExistente(null);
    setCitaExistente(null);
    // Limpiar la selección del vehículo
    setNewCita({
      ...newCita,
      placa: "",
      clienteCedula: "",
      clienteNombre: ""
    });
  };

  /* ====================== FILTRAR CITAS POR ROL ====================== */
  const getCitasFiltradasPorRol = () => {
    if (session.rol === "admin") {
      // Admin ve todas las citas
      return citas;
    } else if (session.rol === "usuario") {
      // Usuario (mecánico) ve solo las citas asignadas a él
      return citas.filter(cita => cita.mecanico === session.nombre);
    } else {
      // Para otros roles, mostrar todas o un conjunto vacío según necesidad
      return citas;
    }
  };

  /* ====================== FILTRAR POR BÚSQUEDA ====================== */
  const citasFiltradas = getCitasFiltradasPorRol().filter((c) =>
    `${c.clienteNombre} ${c.descripcion} ${c.fecha} ${c.id}`
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

  /* ====================== PERMISOS POR ROL ====================== */
  const puedeAgregarCita = session.rol === "admin"; // Solo admin puede agregar citas
  const puedeAsignarMecanico = session.rol === "admin"; // Solo admin puede asignar mecánicos
  const puedeModificarCita = session.rol === "admin"; // Solo admin puede modificar citas
  const puedeEliminarCita = session.rol === "admin"; // Solo admin puede eliminar citas

  /* ====================== AGREGAR CITA ====================== */
  const agregarCita = async () => {
    if (!newCita.placa) return alert("Debe seleccionar un vehículo.");
    if (!newCita.fecha || !newCita.hora) return alert("Debe seleccionar fecha y hora.");

    // Si se está asignando un mecánico directamente al crear, verificar disponibilidad
    if (newCita.mecanico && newCita.mecanico !== "Sin Asignar") {
      const estaDisponible = verificarDisponibilidadMecanico(
        newCita.mecanico, 
        newCita.fecha, 
        newCita.hora
      );

      if (!estaDisponible) {
        return alert("El mecánico seleccionado no está disponible en esta fecha y hora.");
      }
    }

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
    const citaAEliminar = citas.find(c => c.id === id);
    
    // 🔽 VERIFICAR: Solo permitir eliminar citas canceladas
    if (citaAEliminar.estado !== "Cancelada") {
      return alert("Solo se pueden eliminar citas con estado 'Cancelada'.");
    }

    if (!confirm("¿Eliminar cita cancelada permanentemente?")) return;
    
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

    // Verificar disponibilidad del mecánico
    const estaDisponible = verificarDisponibilidadMecanico(
      mecanicoSeleccionado, 
      selected.fecha, 
      selected.hora, 
      selected.id
    );

    if (!estaDisponible) {
      return alert("El mecánico seleccionado no está disponible en esta fecha y hora. Ya tiene una cita asignada.");
    }

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

  /* ====================== VERIFICAR DISPONIBILIDAD ====================== */
  const verificarDisponibilidadMecanico = (mecanico, fecha, hora, citaActualId = null) => {
    // Convertir hora a minutos para facilitar la comparación
    const horaToMinutes = (horaStr) => {
      const [horas, minutos] = horaStr.split(':').map(Number);
      return horas * 60 + minutos;
    };

    const horaActualMinutos = horaToMinutes(hora);
    
    // Buscar citas existentes del mismo mecánico en la misma fecha
    const citasExistente = citas.filter(cita => 
      cita.mecanico === mecanico && 
      cita.fecha === fecha &&
      cita.estado !== "Cancelada" && // Excluir citas canceladas
      cita.id !== citaActualId // Excluir la cita actual si estamos editando
    );

    // Verificar si hay solapamiento en el horario (1 hora de diferencia)
    const haySolapamiento = citasExistente.some(cita => {
      const horaCitaExistenteMinutos = horaToMinutes(cita.hora);
      const diferencia = Math.abs(horaActualMinutos - horaCitaExistenteMinutos);
      
      // Si la diferencia es menor a 60 minutos (1 hora), hay solapamiento
      return diferencia < 60;
    });

    return !haySolapamiento;
  };

  /* ====================== MODIFICAR CITA ====================== */
  const abrirEditar = () => {
    setEditData({
      fecha: selected.fecha.split("T")[0],
      hora: selected.hora,
      estado: selected.estado // 🔽 NUEVO: Incluir el estado actual
    });
    setShowEditar(true);
  };

  const modificarCita = async () => {
    if (!editData.fecha || !editData.hora || !editData.estado)
      return alert("Debe completar fecha, hora y estado.");

    // 🔽 NUEVA VALIDACIÓN: Si el estado es "Aceptada", no permitir cambios
    if (selected.estado === "Aceptada" && editData.estado !== "Aceptada") {
      return alert("No se puede modificar el estado de una cita 'Aceptada'. Solo se permite cambiar fecha y hora.");
    }

    // Si ya tiene un mecánico asignado, verificar disponibilidad en la nueva fecha/hora
    if (selected.mecanico && selected.mecanico !== "Sin Asignar") {
      const estaDisponible = verificarDisponibilidadMecanico(
        selected.mecanico, 
        editData.fecha, 
        editData.hora, 
        selected.id
      );

      if (!estaDisponible) {
        return alert("El mecánico asignado no está disponible en la nueva fecha y hora. Ya tiene otra cita.");
      }
    }

    const citaModificada = {
      ...selected,
      fecha: editData.fecha,
      hora: editData.hora,
      estado: editData.estado // 🔽 NUEVO: Incluir el estado modificado
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

  /* ====================== OBTENER OPCIONES DE ESTADO ====================== */
  const obtenerOpcionesEstado = (estadoActual) => {
    if (estadoActual === "Aceptada") {
      // Si ya está aceptada, no se puede cambiar el estado
      return [
        { value: "Aceptada", label: "Aceptada" }
      ];
    } else {
      // Para "En Espera" y "Cancelada", permitir cambiar entre ellas
      return [
        { value: "En Espera", label: "En Espera" },
        { value: "Cancelada", label: "Cancelada" }
      ];
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

        {puedeAgregarCita && (
          <button className="btn btn-add" onClick={() => setShowFormAgregar(true)}>
            Nueva Cita
          </button>
        )}
      </div>

      {/* LISTA - USANDO CLASES CORRECTAS */}
      <ul className="cita-list">
        {noHayCitas ? (
          <li className="no-citas">
            {session.rol === "usuario" 
              ? "No hay citas asignadas a usted" 
              : "No hay citas programadas"}
          </li>
        ) : (
          citasFiltradas.map((c) => (
            <li
              key={c.id}
              className={selected?.id === c.id ? "selected" : ""}
              onClick={() => setSelected(c)}
            >
              {c.clienteNombre} — {c.fecha.split("T")[0]} {c.hora}
              {session.rol === "usuario" && (
                <span className="cita-status"> — {c.estado}</span>
              )}
            </li>
          ))
        )}
      </ul>

      {/* DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Detalle de Cita</h3>

            <p><b>ID:</b> {selected.id}</p>
            <p><b>Cliente:</b> {selected.clienteNombre}</p>
            <p><b>Cédula:</b> {selected.clienteCedula}</p>
            <p><b>Vehículo:</b> {selected.vehiculoPlaca}</p>
            <p><b>Fecha:</b> {selected.fecha.split("T")[0]}</p>
            <p><b>Hora:</b> {selected.hora}</p>
            <p><b>Descripción:</b> {selected.descripcion}</p>
            <p><b>Mecánico:</b> {selected.mecanico}</p>
            <p><b>Estado:</b> {selected.estado}</p>

            <div className="btn-group">
              {puedeAsignarMecanico && (
                <button
                  className="btn btn-edit"
                  onClick={() => {
                    setMecanicoSeleccionado(selected.mecanico);
                    setShowAsignar(true);
                  }}
                >
                  Asignar Mecánico
                </button>
              )}

              {puedeModificarCita && (
                <button className="btn btn-edit" onClick={abrirEditar}>
                  Modificar
                </button>
              )}
              
              {puedeEliminarCita && (
                <button className="btn btn-delete" onClick={() => eliminarCita(selected.id)}>
                  Eliminar
                </button>
              )}
              
              <button className="btn btn-close" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN REEMPLAZO DE CITA - CON MAYOR z-index */}
      {showConfirmacionReemplazo && vehiculoConCitaExistente && citaExistente && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={cancelarReemplazo}>
          <div className="modal modal-lista" style={{ zIndex: 3001 }} onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Vehículo con Cita Existente</h3>
            
            <div className="warning-message">
              <p><strong>El vehículo seleccionado ya tiene una cita programada:</strong></p>
              <p><b>Vehículo:</b> {vehiculoConCitaExistente.placa} - {vehiculoConCitaExistente.marca} {vehiculoConCitaExistente.modelo}</p>
              <p><b>Cliente:</b> {citaExistente.clienteNombre}</p>
              <p><b>Cita existente:</b> {citaExistente.fecha.split("T")[0]} {citaExistente.hora}</p>
              <p><b>Estado:</b> {citaExistente.estado}</p>
              <p><b>Mecánico:</b> {citaExistente.mecanico}</p>
            </div>

            <p className="warning-text">
              ¿Desea cancelar la cita existente y crear una nueva?
            </p>

            <div className="btn-group">
              <button className="btn btn-delete" onClick={confirmarReemplazo}>
                Sí, cancelar cita existente
              </button>
              <button className="btn btn-close" onClick={cancelarReemplazo}>
                No, mantener cita existente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR - ACTUALIZADO */}
      {showEditar && (
        <div className="modal-overlay" onClick={() => setShowEditar(false)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Modificar Cita - ID: {selected?.id}</h3>

            <label>Fecha:</label>
            <input
              type="date"
              value={editData.fecha}
              onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
            />

            <label>Hora:</label>
            <input
              type="time"
              value={editData.hora}
              onChange={(e) => setEditData({ ...editData, hora: e.target.value })}
            />

            {/* 🔽 NUEVO: Selector de Estado */}
            <label>Estado:</label>
            <select
              value={editData.estado}
              onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
              disabled={selected?.estado === "Aceptada"} // Deshabilitar si ya está aceptada
            >
              {obtenerOpcionesEstado(selected?.estado).map(opcion => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>

            {selected?.estado === "Aceptada" && (
              <p className="warning-text" style={{ fontSize: "0.9em", color: "#ff6b6b" }}>
                Nota: No se puede cambiar el estado de una cita "Aceptada"
              </p>
            )}

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
            <h3>Asignar Mecánico - ID: {selected?.id}</h3>

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

      {/* AGREGAR CITA - SOLO PARA ADMIN */}
      {showFormAgregar && puedeAgregarCita && (
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
              onChange={(e) => manejarSeleccionVehiculo(e.target.value)}
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
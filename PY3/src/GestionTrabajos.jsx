// GestionTrabajos.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

/* ======================= API TRABAJOS ======================= */
const apiTrabajos = {
  getAll: async (usuario = null) => {
    let url = "/api/trabajos";
    if (usuario) {
      url += `?usuario=${encodeURIComponent(usuario)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar trabajos");
    const data = await res.json();
    return data.trabajos || [];
  },
  createFromCita: async (payload) => {
    const res = await fetch("/api/trabajos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo crear la orden de trabajo");
    }
    return data.trabajo || data;
  },
  update: async (codigoOrden, trabajo) => {
    const res = await fetch(`/api/trabajos/${codigoOrden}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trabajo),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo actualizar la orden");
    }
    return data.trabajo;
  },
  updateEstado: async (codigoOrden, nuevoEstado) => {
    const res = await fetch(`/api/trabajos/${codigoOrden}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo actualizar el estado");
    }
    return data.trabajo;
  },
};

/* ======================= API INVENTARIO ======================= */
const apiInventario = {
  getAll: async () => {
    const res = await fetch("/api/inventario");
    if (!res.ok) throw new Error("No se pudo cargar inventario");
    return res.json();
  },
  updateCantidad: async (codigo, nuevaCantidad) => {
    const res = await fetch(`/api/inventario/${codigo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: nuevaCantidad }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false)
      throw new Error(data.error || "No se pudo actualizar inventario");
    return data;
  },
};

/* ======================= API MANO DE OBRA ======================= */
const apiManoDeObra = {
  getAll: async () => {
    const res = await fetch("/api/mano_de_obra");
    if (!res.ok) throw new Error("No se pudo cargar mano de obra");
    const data = await res.json();
    return data.manoObra || [];
  },
};

/* ======================= COMPONENTE ======================= */
function GestionTrabajos({ session }) {
  const [trabajos, setTrabajos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [manoDeObra, setManoDeObra] = useState([]);
  const [citas, setCitas] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [showModalNuevaOT, setShowModalNuevaOT] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalEstado, setShowModalEstado] = useState(false);
  const [showModalNota, setShowModalNota] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState(null);

  const [newOT, setNewOT] = useState({
    codigoCita: "",
    observacionesIniciales: "",
  });

  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Pendiente");
  const [repSeleccionado, setRepSeleccionado] = useState("");
  const [cantidadRep, setCantidadRep] = useState(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");
  const [nuevaNotaDiagnostico, setNuevaNotaDiagnostico] = useState("");

  const ESTADOS = ["Pendiente", "En proceso", "Finalizada", "Cancelada"];

  /* === CARGAR DATOS === */
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Determinar si necesitamos filtrar por usuario
      const usuarioFiltro = session.rol !== "admin" ? session.nombre : null;
      
      const [trabajosData, citasResponse, manoDeObraData, inventarioData] = await Promise.all([
        apiTrabajos.getAll(usuarioFiltro),
        fetch("/api/citas").then(res => res.json()),
        apiManoDeObra.getAll(),
        apiInventario.getAll()
      ]);

      // 🔽 CORRECIÓN: Manejar tanto array directo como objeto con propiedad citas
      let citasData;
      if (Array.isArray(citasResponse)) {
        citasData = citasResponse;
      } else {
        citasData = citasResponse.citas || [];
      }

      console.log("=== DATOS CARGADOS ===");
      console.log("Trabajos cargados:", trabajosData);
      console.log("Citas cargadas:", citasData);
      console.log("Usuario session:", session.nombre);
      console.log("Citas con estado 'Aceptada':", citasData.filter(c => c.estado === "Aceptada").length);
      console.log("=====================");

      setCitas(citasData);
      setManoDeObra(manoDeObraData);
      setInventario(inventarioData);
      setTrabajos(trabajosData);

    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar datos.");
    }
  };

  /* ==================== OBTENER CITAS DISPONIBLES ==================== */
  const citasDisponibles = useMemo(() => {
    if (!citas || citas.length === 0) {
      console.log("No hay citas cargadas para filtrar");
      return [];
    }

    console.log("=== FILTRANDO CITAS DISPONIBLES ===");
    console.log("Session rol:", session.rol);
    console.log("Session nombre:", session.nombre);
    console.log("Total citas:", citas.length);
    
    const citasAceptadas = citas.filter(c => c.estado === "Aceptada");
    console.log("Citas Aceptadas:", citasAceptadas.length);
    console.log("Trabajos existentes:", trabajos.length);
    
    let citasFiltradas;
    
    if (session.rol === "admin") {
      citasFiltradas = citasAceptadas.filter(cita => {
        const tieneOrden = trabajos.find(t => String(t.idCita) === String(cita.id));
        const disponible = !tieneOrden;
        if (disponible) {
          console.log(`✅ Cita disponible para admin: ${cita.id} - ${cita.clienteNombre} (${cita.vehiculoPlaca}) - Mecánico: ${cita.mecanico}`);
        }
        return disponible;
      });
    } else {
      const nombreUsuario = session?.nombre?.trim() || "";
      console.log(`Buscando citas para mecánico: "${nombreUsuario}"`);
      
      citasFiltradas = citasAceptadas.filter(cita => {
        const tieneOrden = trabajos.find(t => String(t.idCita) === String(cita.id));
        const coincideMecanico = cita.mecanico?.trim() === nombreUsuario;
        const disponible = coincideMecanico && !tieneOrden;
        
        if (disponible) {
          console.log(`✅ Cita disponible para ${nombreUsuario}: ${cita.id} - ${cita.clienteNombre} (${cita.vehiculoPlaca})`);
        } else if (cita.estado === "Aceptada" && coincideMecanico && tieneOrden) {
          console.log(`❌ Cita ${cita.id} tiene orden existente`);
        } else if (cita.estado === "Aceptada" && !coincideMecanico) {
          console.log(`❌ Cita ${cita.id} no coincide con mecánico: ${cita.mecanico} ≠ ${nombreUsuario}`);
        }
        return disponible;
      });
    }
    
    console.log("Citas disponibles finales:", citasFiltradas.length);
    console.log("=== FIN FILTRADO ===");
    
    return citasFiltradas;
  }, [citas, trabajos, session.rol, session.nombre]);

  /* ==================== VALIDAR CITA PARA ORDEN ==================== */
  const validarCitaParaOrden = (codigoCita) => {
    const cita = citas.find(c => String(c.id) === String(codigoCita));
    
    if (!cita) {
      throw new Error("No se encontró la cita con el código proporcionado.");
    }

    if (session.rol !== "admin") {
      const nombreUsuario = session?.nombre?.trim() || "";
      if (cita.mecanico?.trim() !== nombreUsuario) {
        throw new Error("No tienes permisos para generar una orden de trabajo para esta cita.");
      }
    }

    if (cita.estado !== "Aceptada") {
      throw new Error("Solo se pueden generar órdenes de trabajo para citas en estado 'Aceptada'.");
    }

    const ordenExistente = trabajos.find(t => String(t.idCita) === String(codigoCita));
    if (ordenExistente) {
      throw new Error("Ya existe una orden de trabajo para esta cita.");
    }

    return cita;
  };

  /* ==================== CREAR ORDEN DESDE CITA ==================== */
  const crearOrdenDesdeCita = async () => {
    const { codigoCita, observacionesIniciales } = newOT;
    if (!codigoCita.trim()) {
      alert("Debe ingresar el código de la cita.");
      return;
    }

    try {
      validarCitaParaOrden(codigoCita.trim());

      const resultado = await apiTrabajos.createFromCita({
        codigoCita: codigoCita.trim(),
        observacionesIniciales: observacionesIniciales.trim(),
      });
      
      setTrabajos(prev => Array.isArray(resultado) ? resultado : [...prev, resultado]);
      setNewOT({ codigoCita: "", observacionesIniciales: "" });
      setShowModalNuevaOT(false);
      alert("Orden de trabajo generada correctamente.");
      
      // Recargar datos para actualizar la lista
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  /* ==================== AGREGAR NOTA DE DIAGNÓSTICO ==================== */
  const agregarNotaDiagnostico = () => {
    if (!nuevaNotaDiagnostico.trim()) {
      alert("La nota de diagnóstico no puede estar vacía.");
      return;
    }

    const nuevaNota = {
      id: Date.now(),
      texto: nuevaNotaDiagnostico.trim(),
      fecha: new Date().toLocaleString()
    };

    setSelected(prev => ({
      ...prev,
      notasDiagnostico: [
        ...(prev.notasDiagnostico || []),
        nuevaNota
      ]
    }));

    setNuevaNotaDiagnostico("");
  };

  /* ==================== ELIMINAR NOTA DE DIAGNÓSTICO ==================== */
  const eliminarNotaDiagnostico = (idNota) => {
    setSelected(prev => ({
      ...prev,
      notasDiagnostico: prev.notasDiagnostico?.filter(nota => nota.id !== idNota) || []
    }));
  };

  /* ==================== ABRIR MODAL DE NOTA ==================== */
  const abrirModalNota = (nota) => {
    setNotaSeleccionada(nota);
    setShowModalNota(true);
  };

  /* ==================== OBTENER RESUMEN DE NOTA ==================== */
  const obtenerResumenNota = (texto) => {
    const textoLimpio = texto.trim();
    if (textoLimpio.length <= 50) {
      return textoLimpio;
    }
    
    return textoLimpio.substring(0, 50) + '...';
  };

  /* ==================== AGREGAR SERVICIO ==================== */
  const agregarServicioTrabajo = () => {
    if (!servicioSeleccionado) return;
    
    const servicio = manoDeObra.find((s) => s.codigo === servicioSeleccionado);
    if (!servicio) return;

    setSelected(prev => ({
      ...prev,
      serviciosRealizados: [
        ...(prev.serviciosRealizados || []),
        { 
          codigo: servicio.codigo, 
          nombre: servicio.nombre, 
          descripcion: servicio.descripcion,
          precio: servicio.precio 
        },
      ],
    }));

    setServicioSeleccionado("");
  };

  /* ==================== ELIMINAR SERVICIO ==================== */
  const eliminarServicio = (index) => {
    setSelected(prev => ({
      ...prev,
      serviciosRealizados: prev.serviciosRealizados?.filter((_, i) => i !== index) || []
    }));
  };

  /* ==================== AGREGAR REPUESTO ==================== */
  const agregarRepuestoTrabajo = () => {
    if (!repSeleccionado) return;
    
    const rep = inventario.find((r) => r.codigo === repSeleccionado);
    if (!rep) {
      alert("Repuesto no encontrado.");
      return;
    }

    if (cantidadRep > rep.cantidad) {
      alert("No hay suficiente stock de este repuesto.");
      return;
    }

    // Actualizar inventario localmente
    const nuevoInventario = inventario.map(r =>
      r.codigo === rep.codigo ? { ...r, cantidad: r.cantidad - cantidadRep } : r
    );
    setInventario(nuevoInventario);

    // Actualizar en servidor
    apiInventario.updateCantidad(rep.codigo, rep.cantidad - cantidadRep)
      .catch(error => {
        alert("Error al actualizar inventario: " + error.message);
        setInventario(inventario);
      });

    // Agregar a la orden
    setSelected(prev => ({
      ...prev,
      repuestosUtilizados: [
        ...(prev.repuestosUtilizados || []),
        { codigo: rep.codigo, nombre: rep.nombre, cantidad: cantidadRep },
      ],
    }));

    setRepSeleccionado("");
    setCantidadRep(1);
  };

  /* ==================== ELIMINAR REPUESTO ==================== */
  const eliminarRepuesto = async (index) => {
    const repuestoEliminado = selected.repuestosUtilizados?.[index];
    if (!repuestoEliminado) return;

    try {
      const repuestoOriginal = inventario.find(r => r.codigo === repuestoEliminado.codigo);
      if (repuestoOriginal) {
        const nuevaCantidad = repuestoOriginal.cantidad + repuestoEliminado.cantidad;
        await apiInventario.updateCantidad(repuestoEliminado.codigo, nuevaCantidad);
        setInventario(prev => prev.map(r =>
          r.codigo === repuestoEliminado.codigo ? { ...r, cantidad: nuevaCantidad } : r
        ));
      }

      setSelected(prev => ({
        ...prev,
        repuestosUtilizados: prev.repuestosUtilizados?.filter((_, i) => i !== index) || []
      }));

    } catch (error) {
      alert("Error al restaurar inventario: " + error.message);
    }
  };

 /* ==================== GUARDAR DETALLE ==================== */
const guardarDetalleTrabajo = async () => {
  if (!selected) return;

  // 🔎 VALIDACIONES ANTES DE GUARDAR
  const errores = [];

  // Al menos una nota de diagnóstico
  if (!selected.notasDiagnostico || selected.notasDiagnostico.length === 0) {
    errores.push("Debe agregar al menos una nota de diagnóstico.");
  }

  // Al menos un servicio realizado
  if (!selected.serviciosRealizados || selected.serviciosRealizados.length === 0) {
    errores.push("Debe agregar al menos un servicio realizado.");
  }

  // Al menos un repuesto utilizado
  if (!selected.repuestosUtilizados || selected.repuestosUtilizados.length === 0) {
    errores.push("Debe agregar al menos un repuesto utilizado.");
  }

  // Si hay errores, mostramos alerta y detenemos el guardado
  if (errores.length > 0) {
    alert(errores.join("\n"));
    return;
  }

  // ✅ Si pasa las validaciones, se guarda normalmente
  try {
    const actualizado = await apiTrabajos.update(selected.codigoOrden, selected);
    setTrabajos(prev =>
      prev.map(t => t.codigoOrden === actualizado.codigoOrden ? actualizado : t)
    );
    setSelected(actualizado);
    setShowModalDetalle(false);
    alert("Orden actualizada correctamente.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};


  /* ==================== CAMBIO DE ESTADO ==================== */
  const abrirModalEstado = (trabajo) => {
    setSelected(trabajo);
    setEstadoSeleccionado(trabajo.estado || "Pendiente");
    setShowModalEstado(true);
  };

  const guardarNuevoEstado = async () => {
    if (!selected) return;
    
    try {
      const actualizado = await apiTrabajos.updateEstado(selected.codigoOrden, estadoSeleccionado);
      setTrabajos(prev => prev.map(t => t.codigoOrden === actualizado.codigoOrden ? actualizado : t));
      setSelected(actualizado);
      setShowModalEstado(false);
      alert("Estado actualizado correctamente.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  /* ==================== FILTRO BUSQUEDA ==================== */
  const trabajosFiltrados = trabajos.filter((t) => {
    const s = search.toLowerCase();
    return (
      (t.codigoOrden && String(t.codigoOrden).toLowerCase().includes(s)) ||
      (t.placa && t.placa.toLowerCase().includes(s)) ||
      (t.clienteNombre && t.clienteNombre.toLowerCase().includes(s)) ||
      (t.clienteCedula && String(t.clienteCedula).includes(search))
    );
  });

  return (
    <div className="gestion-trabajos">
      <h2>Gestión de Trabajos</h2>

      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar orden por código, placa o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-add" onClick={() => setShowModalNuevaOT(true)}>
          Nueva Orden desde Cita
        </button>
      </div>

      <ul className="trabajo-list">
        {trabajosFiltrados.map((t) => (
          <li
            key={t.codigoOrden}
            className={selected?.codigoOrden === t.codigoOrden ? "selected" : ""}
            onClick={() => {
              setSelected(t);
              setShowModalDetalle(true);
            }}
          >
            <div>
              <b>OT #{t.codigoOrden}</b> - {t.clienteNombre} ({t.placa})
            </div>
            <div>Estado: {t.estado || "Pendiente"}</div>
          </li>
        ))}
      </ul>

      {/* MODAL NUEVA OT */}
      {showModalNuevaOT && (
        <div className="modal-overlay" onClick={() => setShowModalNuevaOT(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Generar Orden desde Cita</h3>
            
            <div className="user-info">
              <p><strong>Usuario:</strong> {session.nombre} | <strong>Rol:</strong> {session.rol}</p>
              {session.rol !== "admin" && (
                <p className="info-text">Solo puedes generar órdenes para citas asignadas a ti.</p>
              )}
            </div>

            <label>
              Seleccionar Cita:
              <select
                value={newOT.codigoCita}
                onChange={(e) => setNewOT({ ...newOT, codigoCita: e.target.value })}
              >
                <option value="">Seleccione una cita</option>
                {citasDisponibles.map((cita) => (
                  <option key={cita.id} value={cita.id}>
                    Cita #{cita.id} - {cita.clienteNombre} ({cita.vehiculoPlaca}) - {cita.mecanico}
                  </option>
                ))}
              </select>
            </label>

            {citasDisponibles.length === 0 && (
              <p className="warning-text">
                {session.rol === "admin" 
                  ? "No hay citas disponibles para generar órdenes de trabajo."
                  : "No tienes citas disponibles para generar órdenes de trabajo."
                }
              </p>
            )}

            <label>
              Observaciones iniciales:
              <textarea
                value={newOT.observacionesIniciales}
                onChange={(e) => setNewOT({ ...newOT, observacionesIniciales: e.target.value })}
                placeholder="Ingrese observaciones iniciales del trabajo..."
                rows="3"
              />
            </label>

            <div className="btn-group">
              <button 
                className="btn-add" 
                onClick={crearOrdenDesdeCita}
                disabled={!newOT.codigoCita}
              >
                Crear Orden
              </button>
              <button className="btn-close" onClick={() => setShowModalNuevaOT(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showModalDetalle && selected && (
        <div className="modal-overlay" onClick={() => setShowModalDetalle(false)}>
          <div className="modal modal-detalle-trabajo" onClick={(e) => e.stopPropagation()}>
            <h3>Orden #{selected.codigoOrden}</h3>
            
            <div className="info-cliente">
              <p><b>Cliente:</b> {selected.clienteNombre} ({selected.clienteCedula})</p>
              <p><b>Placa:</b> {selected.placa}</p>
              <p><b>Estado:</b> {selected.estado}</p>
            </div>

            {/* NOTAS DE DIAGNÓSTICO */}
            <div className="seccion-diagnostico">
              <label>Notas de Diagnóstico:</label>
              <div className="contenedor-scrollable">
                <div className="lista-notas">
                  {(selected.notasDiagnostico || []).map((nota) => (
                    <div key={nota.id} className="item-nota">
                      <div className="nota-header">
                        <span className="nota-fecha">{nota.fecha}</span>
                        <div className="nota-acciones">
                          <button 
                            type="button"
                            className="btn-ver"
                            onClick={() => abrirModalNota(nota)}
                            title="Ver nota completa"
                          >
                            👁️
                          </button>
                          <button 
                            type="button"
                            className="btn-eliminar"
                            onClick={() => eliminarNotaDiagnostico(nota.id)}
                            title="Eliminar nota"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div 
                        className="nota-resumen"
                        onClick={() => abrirModalNota(nota)}
                        title="Haz clic para ver la nota completa"
                      >
                        {obtenerResumenNota(nota.texto)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="agregar-nota">
                <textarea
                  value={nuevaNotaDiagnostico}
                  onChange={(e) => setNuevaNotaDiagnostico(e.target.value)}
                  placeholder="Escriba una nueva nota de diagnóstico..."
                  rows="3"
                />
                <button 
                  type="button"
                  onClick={agregarNotaDiagnostico}
                  disabled={!nuevaNotaDiagnostico.trim()}
                >
                  Agregar Nota
                </button>
              </div>
            </div>

            {/* SERVICIOS REALIZADOS */}
            <div className="seccion-servicios">
              <label>Servicios realizados:</label>
              <div className="contenedor-scrollable">
                <div className="lista-items">
                  {(selected.serviciosRealizados || []).map((servicio, idx) => (
                    <div key={idx} className="item-lista">
                      <span className="item-info">
                        {servicio.nombre}
                      </span>
                      <button 
                        type="button"
                        className="btn-eliminar"
                        onClick={() => eliminarServicio(idx)}
                        title="Eliminar servicio"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="agregar-item">
                <input
                  list="servicios-list"
                  value={servicioSeleccionado}
                  onChange={(e) => setServicioSeleccionado(e.target.value)}
                  placeholder="Buscar servicio..."
                />
                <datalist id="servicios-list">
                  {manoDeObra.map((servicio) => (
                    <option key={servicio.codigo} value={servicio.codigo}>
                      {servicio.nombre}
                    </option>
                  ))}
                </datalist>
                <button 
                  type="button"
                  onClick={agregarServicioTrabajo}
                  disabled={!servicioSeleccionado}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* REPUESTOS UTILIZADOS */}
            <div className="seccion-repuestos">
              <label>Repuestos utilizados:</label>
              <div className="contenedor-scrollable">
                <div className="lista-items">
                  {(selected.repuestosUtilizados || []).map((repuesto, idx) => (
                    <div key={idx} className="item-lista">
                      <span className="item-info">
                        {repuesto.nombre} ({repuesto.cantidad})
                      </span>
                      <button 
                        type="button"
                        className="btn-eliminar"
                        onClick={() => eliminarRepuesto(idx)}
                        title="Eliminar repuesto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="agregar-item">
                <input
                  list="repuestos-list"
                  value={repSeleccionado}
                  onChange={(e) => setRepSeleccionado(e.target.value)}
                  placeholder="Buscar repuesto..."
                />
                <datalist id="repuestos-list">
                  {inventario.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre} (Stock: {r.cantidad})
                    </option>
                  ))}
                </datalist>
                <input
                  type="number"
                  min="1"
                  value={cantidadRep}
                  onChange={(e) => setCantidadRep(Number(e.target.value))}
                  placeholder="Cant."
                  style={{width: '80px'}}
                />
                <button 
                  type="button"
                  onClick={agregarRepuestoTrabajo}
                  disabled={!repSeleccionado || cantidadRep < 1}
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn-add" onClick={guardarDetalleTrabajo}>
                Guardar Cambios
              </button>
              <button className="btn-edit" onClick={() => abrirModalEstado(selected)}>
                Cambiar Estado
              </button>
              <button className="btn-close" onClick={() => setShowModalDetalle(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTA COMPLETA */}
      {showModalNota && notaSeleccionada && (
        <div className="modal-overlay" onClick={() => setShowModalNota(false)}>
          <div className="modal modal-nota" onClick={(e) => e.stopPropagation()}>
            <h3>Nota de Diagnóstico</h3>
            <div className="nota-info">
              <p><strong>Fecha:</strong> {notaSeleccionada.fecha}</p>
            </div>
            <div className="contenedor-scrollable-nota">
              <div className="nota-contenido">
                {notaSeleccionada.texto}
              </div>
            </div>
            <div className="btn-group">
              <button className="btn-close" onClick={() => setShowModalNota(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTADO */}
      {showModalEstado && selected && (
        <div className="modal-overlay" onClick={() => setShowModalEstado(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cambiar estado - OT #{selected.codigoOrden}</h3>
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
            >
              {ESTADOS.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
            <div className="btn-group">
              <button className="btn-add" onClick={guardarNuevoEstado}>
                Guardar Estado
              </button>
              <button className="btn-close" onClick={() => setShowModalEstado(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionTrabajos;
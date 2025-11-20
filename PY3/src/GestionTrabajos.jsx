// GestionTrabajos.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
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
    const res = await fetch(`/api/trabajos/${codigoOrden}`, {
      method: "PUT",
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

/* ======================= API VEHICULOS ======================= */
const apiVehiculos = {
  getAll: async () => {
    try {
      const res = await fetch("/api/vehiculos");
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.warn("No se pudo cargar vehículos:", error);
      return [];
    }
  }
};

/* ======================= COMPONENTE ======================= */
function GestionTrabajos({ session }) {
  const [trabajos, setTrabajos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [manoDeObra, setManoDeObra] = useState([]);
  const [citas, setCitas] = useState([]);
  const [vehiculosClientes, setVehiculosClientes] = useState([]);
  const [vehiculoOrden, setVehiculoOrden] = useState(null);
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

  // Nuevos estados para los dropdowns personalizados
  const [showRepuestosDropdown, setShowRepuestosDropdown] = useState(false);
  const [showServiciosDropdown, setShowServiciosDropdown] = useState(false);
  const [repuestosFiltradosBusqueda, setRepuestosFiltradosBusqueda] = useState([]);
  const [serviciosFiltradosBusqueda, setServiciosFiltradosBusqueda] = useState([]);

  // Refs para manejar clicks fuera del dropdown
  const repuestosDropdownRef = useRef(null);
  const serviciosDropdownRef = useRef(null);

  const ESTADOS = ["Pendiente", "En proceso", "Finalizada", "Cancelada"];

  /* === CARGAR DATOS === */
  useEffect(() => {
    cargarDatos();
  }, []);

  // Efecto para cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (repuestosDropdownRef.current && !repuestosDropdownRef.current.contains(event.target)) {
        setShowRepuestosDropdown(false);
      }
      if (serviciosDropdownRef.current && !serviciosDropdownRef.current.contains(event.target)) {
        setShowServiciosDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cargarDatos = async () => {
    try {
      const usuarioFiltro = session.rol !== "admin" ? session.nombre : null;
      
      const [trabajosData, citasResponse, manoDeObraData, inventarioData, vehiculosData] = await Promise.all([
        apiTrabajos.getAll(usuarioFiltro),
        fetch("/api/citas").then(res => res.json()),
        apiManoDeObra.getAll(),
        apiInventario.getAll(),
        apiVehiculos.getAll()
      ]);

      let citasData;
      if (Array.isArray(citasResponse)) {
        citasData = citasResponse;
      } else {
        citasData = citasResponse.citas || [];
      }

      console.log("=== DATOS CARGADOS ===");
      console.log("Trabajos cargados:", trabajosData.length);
      console.log("Citas cargadas:", citasData.length);
      console.log("Vehículos clientes:", vehiculosData.length);
      console.log("Inventario:", inventarioData.length);

      setCitas(citasData);
      setManoDeObra(manoDeObraData);
      setInventario(inventarioData);
      setVehiculosClientes(vehiculosData);
      setTrabajos(trabajosData);

    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar datos.");
    }
  };

  /* ==================== CARGAR DATOS DEL VEHÍCULO ==================== */
  const cargarDatosVehiculo = async (placa) => {
    if (!placa) {
      setVehiculoOrden(null);
      return;
    }
    
    try {
      console.log("🔍 Buscando vehículo con placa:", placa);
      
      // Buscar en los vehículos de clientes ya cargados
      const vehiculoCliente = vehiculosClientes.find(v => v.placa === placa);
      
      if (vehiculoCliente) {
        console.log("✅ Vehículo encontrado:", vehiculoCliente);
        console.log("📋 vehiculoBaseId:", vehiculoCliente.vehiculoBaseId, "Tipo:", typeof vehiculoCliente.vehiculoBaseId);
        setVehiculoOrden(vehiculoCliente);
      } else {
        console.log("❌ No se encontró vehículo para placa:", placa);
        setVehiculoOrden(null);
      }
    } catch (error) {
      console.warn("Error al cargar vehículo:", error);
      setVehiculoOrden(null);
    }
  };

  /* ==================== FILTRAR REPUESTOS POR VEHÍCULO ==================== */
  const repuestosFiltrados = useMemo(() => {
    if (!inventario.length) {
      console.log("❌ Inventario vacío");
      return [];
    }
    
    console.log("=== INICIANDO FILTRADO DE REPUESTOS ===");
    console.log("📦 Total inventario:", inventario.length);
    console.log("🚗 Vehículo orden:", vehiculoOrden);
    
    if (!vehiculoOrden) {
      console.log("❌ No hay vehículo seleccionado - mostrando solo universales");
      const universales = inventario.filter(repuesto => !repuesto.vehiculoId);
      console.log("📋 Repuestos universales encontrados:", universales.length);
      return universales;
    }
    
    console.log("🔍 vehiculoBaseId del vehículo:", vehiculoOrden.vehiculoBaseId);
    
    if (!vehiculoOrden.vehiculoBaseId) {
      console.log("❌ Vehículo no tiene vehiculoBaseId - mostrando solo universales");
      const universales = inventario.filter(repuesto => !repuesto.vehiculoId);
      console.log("📋 Repuestos universales encontrados:", universales.length);
      return universales;
    }
    
    // Normalizar IDs para comparación (ambos a número)
    const vehiculoBaseId = Number(vehiculoOrden.vehiculoBaseId);
    console.log("🔢 vehiculoBaseId convertido a número:", vehiculoBaseId);
    
    // Filtrar repuestos: universales + específicos del vehículo
    const repuestosFiltrados = inventario.filter(repuesto => {
      const esUniversal = !repuesto.vehiculoId;
      
      // Convertir vehiculoId del repuesto a número para comparación
      const repuestoVehiculoId = repuesto.vehiculoId ? Number(repuesto.vehiculoId) : null;
      const esEspecifico = repuestoVehiculoId && repuestoVehiculoId === vehiculoBaseId;
      
      return esUniversal || esEspecifico;
    });
    
    console.log("=== RESULTADO FILTRADO ===");
    console.log("📊 Total repuestos filtrados:", repuestosFiltrados.length);
    
    const universales = repuestosFiltrados.filter(r => !r.vehiculoId);
    const especificos = repuestosFiltrados.filter(r => r.vehiculoId);
    
    console.log("🌐 Repuestos universales:", universales.length);
    console.log("🎯 Repuestos específicos:", especificos.length);
    
    return repuestosFiltrados;
  }, [inventario, vehiculoOrden]);

  /* ==================== MANEJAR BÚSQUEDA DE REPUESTOS ==================== */
  const manejarBusquedaRepuestos = (busqueda) => {
    setRepSeleccionado(busqueda);
    
    if (busqueda.trim() === '') {
      setRepuestosFiltradosBusqueda(repuestosFiltrados.slice(0, 10));
      setShowRepuestosDropdown(false);
      return;
    }

    const filtrados = repuestosFiltrados.filter(repuesto =>
      repuesto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      repuesto.codigo.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 10);

    setRepuestosFiltradosBusqueda(filtrados);
    setShowRepuestosDropdown(filtrados.length > 0);
  };

  /* ==================== MANEJAR BÚSQUEDA DE SERVICIOS ==================== */
  const manejarBusquedaServicios = (busqueda) => {
    setServicioSeleccionado(busqueda);
    
    if (busqueda.trim() === '') {
      setServiciosFiltradosBusqueda(manoDeObra.slice(0, 10));
      setShowServiciosDropdown(false);
      return;
    }

    const filtrados = manoDeObra.filter(servicio =>
      servicio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      servicio.codigo.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 10);

    setServiciosFiltradosBusqueda(filtrados);
    setShowServiciosDropdown(filtrados.length > 0);
  };

  /* ==================== SELECCIONAR REPUESTO ==================== */
  const seleccionarRepuesto = (repuesto) => {
    setRepSeleccionado(repuesto.codigo);
    setShowRepuestosDropdown(false);
  };

  /* ==================== SELECCIONAR SERVICIO ==================== */
  const seleccionarServicio = (servicio) => {
    setServicioSeleccionado(servicio.codigo);
    setShowServiciosDropdown(false);
  };

  /* ==================== OBTENER CITAS DISPONIBLES ==================== */
  const citasDisponibles = useMemo(() => {
    if (!citas || citas.length === 0) {
      console.log("No hay citas cargadas para filtrar");
      return [];
    }

    const citasAceptadas = citas.filter(c => c.estado === "Aceptada");
    
    let citasFiltradas;
    
    if (session.rol === "admin") {
      citasFiltradas = citasAceptadas.filter(cita => {
        const tieneOrden = trabajos.find(t => String(t.idCita) === String(cita.id));
        return !tieneOrden;
      });
    } else {
      const nombreUsuario = session?.nombre?.trim() || "";
      citasFiltradas = citasAceptadas.filter(cita => {
        const tieneOrden = trabajos.find(t => String(t.idCita) === String(cita.id));
        const coincideMecanico = cita.mecanico?.trim() === nombreUsuario;
        return coincideMecanico && !tieneOrden;
      });
    }
    
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
        mecanico: session.nombre // 🔽 AGREGAR EL NOMBRE DEL MECÁNICO ACTUAL
      });
      
      setTrabajos(prev => Array.isArray(resultado) ? resultado : [...prev, resultado]);
      setNewOT({ codigoCita: "", observacionesIniciales: "" });
      setShowModalNuevaOT(false);
      alert("Orden de trabajo generada correctamente.");
      
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
    setShowServiciosDropdown(false);
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
    
    const rep = repuestosFiltrados.find((r) => r.codigo === repSeleccionado);
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
        { 
          codigo: rep.codigo, 
          nombre: rep.nombre, 
          cantidad: cantidadRep,
          precio: rep.precio,
          subtotal: rep.precio * cantidadRep
        },
      ],
    }));

    setRepSeleccionado("");
    setCantidadRep(1);
    setShowRepuestosDropdown(false);
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

    // ELIMINADA LA VALIDACIÓN OBLIGATORIA - AHORA ES OPCIONAL
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

  /* ==================== MANEJAR SELECCIÓN DE ORDEN ==================== */
  const manejarSeleccionOrden = async (trabajo) => {
    setSelected(trabajo);
    setShowModalDetalle(true);
    // Cargar datos del vehículo cuando se selecciona una orden
    await cargarDatosVehiculo(trabajo.placa);
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
            onClick={() => manejarSeleccionOrden(t)}
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
              {vehiculoOrden && (
                <div>
                  <p><b>Vehículo:</b> {vehiculoOrden.marca} {vehiculoOrden.modelo} ({vehiculoOrden.tipo})</p>
                </div>
              )}
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
                        {servicio.nombre} - ₡{servicio.precio?.toLocaleString()}
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
              
              <div className="agregar-item" ref={serviciosDropdownRef}>
                <input
                  value={servicioSeleccionado}
                  onChange={(e) => manejarBusquedaServicios(e.target.value)}
                  onFocus={() => {
                    setServiciosFiltradosBusqueda(manoDeObra.slice(0, 10));
                    setShowServiciosDropdown(manoDeObra.length > 0);
                  }}
                  placeholder="Buscar servicio..."
                />
                
                {/* DROPDOWN PERSONALIZADO PARA SERVICIOS */}
                {showServiciosDropdown && (
                  <div className="dropdown-list">
                    {serviciosFiltradosBusqueda.map((servicio) => (
                      <div
                        key={servicio.codigo}
                        className="dropdown-item"
                        onClick={() => seleccionarServicio(servicio)}
                      >
                        <div className="dropdown-item-main">
                          <strong>{servicio.nombre}</strong>
                          <span className="dropdown-price">₡{servicio.precio?.toLocaleString()}</span>
                        </div>
                        <div className="dropdown-item-desc">
                          {servicio.descripcion}
                        </div>
                        <div className="dropdown-item-code">
                          Código: {servicio.codigo}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
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
                        {repuesto.nombre} ({repuesto.cantidad}) - ₡{repuesto.subtotal?.toLocaleString()}
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
              
              <div className="agregar-item" ref={repuestosDropdownRef}>
                <input
                  value={repSeleccionado}
                  onChange={(e) => manejarBusquedaRepuestos(e.target.value)}
                  onFocus={() => {
                    setRepuestosFiltradosBusqueda(repuestosFiltrados.slice(0, 10));
                    setShowRepuestosDropdown(repuestosFiltrados.length > 0);
                  }}
                  placeholder="Buscar repuesto..."
                />
                
                {/* DROPDOWN PERSONALIZADO PARA REPUESTOS */}
                {showRepuestosDropdown && (
                  <div className="dropdown-list">
                    {repuestosFiltradosBusqueda.map((repuesto) => (
                      <div
                        key={repuesto.codigo}
                        className="dropdown-item"
                        onClick={() => seleccionarRepuesto(repuesto)}
                      >
                        <div className="dropdown-item-main">
                          <strong>{repuesto.nombre}</strong>
                          <span className="dropdown-price">₡{repuesto.precio?.toLocaleString()}</span>
                        </div>
                        <div className="dropdown-item-details">
                          <span className={`dropdown-badge ${repuesto.vehiculoId ? 'specific' : 'universal'}`}>
                            {repuesto.vehiculoId ? 'Específico' : 'Universal'}
                          </span>
                          <span className="dropdown-stock">Stock: {repuesto.cantidad}</span>
                        </div>
                        <div className="dropdown-item-code">
                          Código: {repuesto.codigo}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
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
              
              {/* INFORMACIÓN DEL FILTRO */}
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
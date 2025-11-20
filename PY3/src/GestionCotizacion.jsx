// src/GestionCotizacion.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import "./App.css";
import GeneradorPDF from "./GeneradorPDF"; // 🔽 AGREGAR IMPORT

/* ======================= API COTIZACIONES ======================= */
const apiCotizaciones = {
  getAll: async (usuario = null) => {
    let url = "/api/cotizaciones";
    if (usuario) {
      url += `?usuario=${encodeURIComponent(usuario)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudieron cargar las cotizaciones");
    const data = await res.json();
    return Array.isArray(data) ? data : data.cotizaciones || [];
  },

  create: async (payload) => {
    const res = await fetch("/api/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo crear la cotizacion");
    }
    return data.cotizacion;
  },

  update: async (codigo, payload) => {
    const res = await fetch(`/api/cotizaciones/${codigo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo actualizar la cotizacion");
    }
    return data.cotizacion;
  },

  toProforma: async (codigo) => {
    const res = await fetch(`/api/cotizaciones/${codigo}/proforma`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo generar la proforma");
    }
    return data.cotizacion;
  },

  remove: async (codigo) => {
    const res = await fetch(`/api/cotizaciones/${codigo}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "No se pudo eliminar la cotizacion");
    }
  },
};

/* ======================= API VEHÍCULOS ======================= */
const apiVehiculos = {
  getAll: async () => {
    const res = await fetch("/api/vehiculos");
    if (!res.ok) throw new Error("No se pudieron cargar los vehículos");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};

/* ======================= API INVENTARIO ======================= */
const apiInventario = {
  getAll: async () => {
    const res = await fetch("/api/inventario");
    if (!res.ok) throw new Error("No se pudo cargar inventario");
    return res.json();
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

/* ======================= API ORDENES TRABAJO ======================= */
const apiOrdenesTrabajo = {
  getAll: async (usuario = null) => {
    let url = "/api/trabajos";
    if (usuario) {
      url += `?usuario=${encodeURIComponent(usuario)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudieron cargar las órdenes de trabajo");
    const data = await res.json();
    return Array.isArray(data) ? data : data.trabajos || [];
  },
};

const emptyForm = {
  codigo: "",
  clienteNombre: "",
  clienteCedula: "",
  vehiculoPlaca: "",
  descuentoManoObra: 0,
  repuestos: [],
  manoObra: [],
  esProforma: false,
  estado: "borrador",
  codigoOrdenTrabajo: "",
  mecanicoOrdenTrabajo: "",
};

/* ======================= Gestion Cotizacion ======================= */
function GestionCotizacion({ session }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [manoDeObra, setManoDeObra] = useState([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState([]);
  const [search, setSearch] = useState("");
  const [searchVehiculo, setSearchVehiculo] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [showModalSeleccionOT, setShowModalSeleccionOT] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);

  // Estados para agregar items
  const [repSeleccionado, setRepSeleccionado] = useState("");
  const [cantidadRep, setCantidadRep] = useState(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");

  // Nuevos estados para los dropdowns personalizados
  const [showRepuestosDropdown, setShowRepuestosDropdown] = useState(false);
  const [showServiciosDropdown, setShowServiciosDropdown] = useState(false);
  const [repuestosFiltradosBusqueda, setRepuestosFiltradosBusqueda] = useState([]);
  const [serviciosFiltradosBusqueda, setServiciosFiltradosBusqueda] = useState([]);

  // Refs para manejar clicks fuera del dropdown
  const repuestosDropdownRef = useRef(null);
  const serviciosDropdownRef = useRef(null);

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

  /* ===== CARGAR DATOS CON FILTRO POR USUARIO ===== */
  const cargarDatos = async () => {
    try {
      const usuarioFiltro = session.rol !== "admin" ? session.nombre : null;
      
      const [cotizacionesData, vehiculosData, inventarioData, manoDeObraData, ordenesTrabajoData] = await Promise.all([
        apiCotizaciones.getAll(usuarioFiltro),
        apiVehiculos.getAll(),
        apiInventario.getAll(),
        apiManoDeObra.getAll(),
        apiOrdenesTrabajo.getAll(usuarioFiltro)
      ]);
      
      setCotizaciones(cotizacionesData);
      setVehiculos(vehiculosData);
      setInventario(inventarioData);
      setManoDeObra(manoDeObraData);
      setOrdenesTrabajo(ordenesTrabajoData);
      
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los datos del servidor.");
    }
  };

  /* ===== FILTRAR ORDENES DE TRABAJO VISIBLES ===== */
  const ordenesTrabajoVisibles = useMemo(() => {
    return ordenesTrabajo.filter(ot => {
      if (session.rol === "admin") return true;
      return ot.mecanico === session.nombre;
    });
  }, [ordenesTrabajo, session]);

  /* ===== VERIFICAR SI EXISTE COTIZACIÓN PARA UNA OT ===== */
  const obtenerCotizacionExistente = (codigoOT) => {
    return cotizaciones.find(cot => cot.codigoOrdenTrabajo === codigoOT);
  };

  const esSoloLectura = form.esProforma === true;

  /* ===== FILTRAR REPUESTOS POR VEHÍCULO ===== */
  const repuestosFiltrados = useMemo(() => {
    if (!inventario.length) return [];
    
    if (!vehiculoSeleccionado) {
      return inventario.filter(repuesto => !repuesto.vehiculoId);
    }
    
    if (!vehiculoSeleccionado.vehiculoBaseId) {
      return inventario.filter(repuesto => !repuesto.vehiculoId);
    }
    
    const vehiculoBaseId = Number(vehiculoSeleccionado.vehiculoBaseId);
    
    const repuestosFiltrados = inventario.filter(repuesto => {
      const esUniversal = !repuesto.vehiculoId;
      const repuestoVehiculoId = repuesto.vehiculoId ? Number(repuesto.vehiculoId) : null;
      const esEspecifico = repuestoVehiculoId && repuestoVehiculoId === vehiculoBaseId;
      
      return esUniversal || esEspecifico;
    });
    
    return repuestosFiltrados;
  }, [inventario, vehiculoSeleccionado]);

  /* ===== FILTRAR COTIZACIONES VISIBLES ===== */
  const cotizacionesVisibles = useMemo(() => {
    return cotizaciones.filter(cotizacion => {
      if (session.rol === "admin") return true;
      return cotizacion.mecanicoOrdenTrabajo === session.nombre;
    });
  }, [cotizaciones, session]);

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

  /* ===== CÁLCULO DE TOTALES EN TIEMPO REAL ===== */
  const calculoTotales = useMemo(() => {
    const subtotalRepuestos = (form.repuestos || []).reduce((total, repuesto) => {
      return total + (repuesto.cantidad * repuesto.precio);
    }, 0);

    const subtotalManoObra = (form.manoObra || []).reduce((total, servicio) => {
      return total + servicio.tarifa;
    }, 0);

    const descuentoPorcentaje = Number(form.descuentoManoObra) || 0;
    const descuentoMonto = (subtotalManoObra * descuentoPorcentaje) / 100;

    const subtotalDespuesDescuento = (subtotalRepuestos + subtotalManoObra) - descuentoMonto;
    const iva = subtotalDespuesDescuento * 0.13;
    const total = subtotalDespuesDescuento + iva;

    return {
      subtotalRepuestos,
      subtotalManoObra,
      descuentoMonto,
      iva,
      total
    };
  }, [form.repuestos, form.manoObra, form.descuentoManoObra]);

  /* ===== FORMATO DE MONEDA ===== */
  const formatoMoneda = (valor) => {
    return '₡' + new Intl.NumberFormat('es-CO').format(valor);
  };

  /* ===== BUSCAR Y SELECCIONAR VEHÍCULO ===== */
  const vehiculosFiltrados = vehiculos.filter(v =>
    `${v.placa} ${v.marca} ${v.modelo} ${v.clienteNombre} ${v.clienteCedula}`
      .toLowerCase()
      .includes(searchVehiculo.toLowerCase())
  );

  const manejarSeleccionVehiculo = (placaSeleccionada) => {
    const vehiculoSeleccionado = vehiculos.find(v => v.placa === placaSeleccionada);
    if (!vehiculoSeleccionado) return;

    setForm({
      ...form,
      vehiculoPlaca: vehiculoSeleccionado.placa,
      clienteCedula: vehiculoSeleccionado.clienteCedula,
      clienteNombre: vehiculoSeleccionado.clienteNombre
    });
    
    setVehiculoSeleccionado(vehiculoSeleccionado);
  };

  /* ===== FUNCIONES PARA REPUESTOS ===== */
  const agregarRepuesto = () => {
    if (!repSeleccionado) return;
    
    const rep = repuestosFiltrados.find((r) => r.codigo === repSeleccionado);
    if (!rep) {
      alert("Repuesto no encontrado.");
      return;
    }

    if (cantidadRep < 1) {
      alert("La cantidad debe ser al menos 1.");
      return;
    }

    setForm((f) => ({
      ...f,
      repuestos: [
        ...(f.repuestos || []),
        { 
          codigo: rep.codigo, 
          nombre: rep.nombre, 
          cantidad: cantidadRep,
          precio: rep.precio
        },
      ],
    }));

    setRepSeleccionado("");
    setCantidadRep(1);
    setShowRepuestosDropdown(false);
  };

  const eliminarRepuesto = (index) => {
    setForm((f) => {
      const rep = [...(f.repuestos || [])];
      rep.splice(index, 1);
      return { ...f, repuestos: rep };
    });
  };

  /* ===== FUNCIONES PARA MANO DE OBRA ===== */
  const agregarManoObra = () => {
    if (!servicioSeleccionado) return;
    
    const servicio = manoDeObra.find((s) => s.codigo === servicioSeleccionado);
    if (!servicio) return;

    setForm((f) => ({
      ...f,
      manoObra: [
        ...(f.manoObra || []),
        { 
          codigo: servicio.codigo,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          horas: 1,
          tarifa: servicio.precio
        },
      ],
    }));

    setServicioSeleccionado("");
    setShowServiciosDropdown(false);
  };

  const eliminarManoObra = (index) => {
    setForm((f) => {
      const mo = [...(f.manoObra || [])];
      mo.splice(index, 1);
      return { ...f, manoObra: mo };
    });
  };

  /* ===== ABRIR MODALES ===== */
  const abrirNueva = () => {
    setShowModalSeleccionOT(true);
  };

  const iniciarNuevaCotizacion = (conOrdenTrabajo = false, ordenSeleccionada = null) => {
    setShowModalSeleccionOT(false);
    
    if (conOrdenTrabajo && ordenSeleccionada) {
      const cotizacionExistente = obtenerCotizacionExistente(ordenSeleccionada.codigoOrden);
      
      if (cotizacionExistente) {
        if (window.confirm(`Ya existe una cotización para esta orden de trabajo (${cotizacionExistente.codigo}). ¿Desea editarla?`)) {
          setForm({
            ...cotizacionExistente,
            repuestos: cotizacionExistente.repuestos || [],
            manoObra: cotizacionExistente.manoObra || [],
          });
          setEditMode(true);
          setShowModal(true);
          
          const vehiculo = vehiculos.find(v => v.placa === cotizacionExistente.vehiculoPlaca);
          setVehiculoSeleccionado(vehiculo || null);
          return;
        } else {
          return;
        }
      }

      const nuevaForm = {
        ...emptyForm,
        codigoOrdenTrabajo: ordenSeleccionada.codigoOrden,
        mecanicoOrdenTrabajo: session.nombre,
        clienteNombre: ordenSeleccionada.clienteNombre,
        clienteCedula: ordenSeleccionada.clienteCedula,
        vehiculoPlaca: ordenSeleccionada.placa,
        repuestos: (ordenSeleccionada.repuestosUtilizados || []).map(repuesto => ({
          codigo: repuesto.codigo,
          nombre: repuesto.nombre,
          cantidad: repuesto.cantidad || 1,
          precio: repuesto.precio || 0
        })),
        manoObra: (ordenSeleccionada.serviciosRealizados || []).map(servicio => ({
          codigo: servicio.codigo,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion || "",
          horas: 1,
          tarifa: servicio.precio || 0
        }))
      };
      
      setForm(nuevaForm);
      const vehiculo = vehiculos.find(v => v.placa === ordenSeleccionada.placa);
      setVehiculoSeleccionado(vehiculo || null);
    } else {
      setForm({
        ...emptyForm,
        estado: "borrador",
        esProforma: false,
        mecanicoOrdenTrabajo: session.nombre
      });
      setVehiculoSeleccionado(null);
    }
    
    setEditMode(false);
    setShowModal(true);
    setSearchVehiculo("");
  };

  const abrirEditar = (cot) => {
    if (session.rol !== "admin" && cot.mecanicoOrdenTrabajo !== session.nombre) {
      alert("No tienes permiso para ver esta cotización. Solo puedes ver las cotizaciones que creaste.");
      return;
    }
    
    setForm({
      ...cot,
      repuestos: cot.repuestos || [],
      manoObra: cot.manoObra || [],
    });
    setEditMode(true);
    setShowModal(true);
    setSearchVehiculo("");
    
    if (cot.vehiculoPlaca) {
      const vehiculo = vehiculos.find(v => v.placa === cot.vehiculoPlaca);
      setVehiculoSeleccionado(vehiculo || null);
    } else {
      setVehiculoSeleccionado(null);
    }
  };

  /* ===== GUARDAR (CREAR / ACTUALIZAR) ===== */
  const guardarCotizacion = async () => {
    if (!form.clienteNombre.trim() || !form.clienteCedula.trim()) {
      alert("Debe seleccionar un vehículo para obtener los datos del cliente.");
      return;
    }

    if (!form.vehiculoPlaca.trim()) {
      alert("Debe seleccionar un vehículo.");
      return;
    }

    const tieneItems =
      (form.repuestos && form.repuestos.length > 0) ||
      (form.manoObra && form.manoObra.length > 0);

    if (!tieneItems) {
      alert("Debe agregar al menos un repuesto o un registro de mano de obra.");
      return;
    }

    const payload = {
      clienteNombre: form.clienteNombre,
      clienteCedula: form.clienteCedula,
      vehiculoPlaca: form.vehiculoPlaca,
      repuestos: form.repuestos,
      manoObra: form.manoObra,
      descuentoManoObra: Number(form.descuentoManoObra) || 0,
      estado: form.estado || "borrador",
      codigoOrdenTrabajo: form.codigoOrdenTrabajo || "",
      mecanicoOrdenTrabajo: form.mecanicoOrdenTrabajo || session.nombre,
      subtotalRepuestos: calculoTotales.subtotalRepuestos,
      subtotalManoObra: calculoTotales.subtotalManoObra,
      descuentoMonto: calculoTotales.descuentoMonto,
      iva: calculoTotales.iva,
      total: calculoTotales.total
    };

    try {
      if (editMode) {
        const actualizada = await apiCotizaciones.update(form.codigo, payload);
        setCotizaciones((prev) =>
          prev.map((c) =>
            c.codigo === actualizada.codigo ? actualizada : c
          )
        );
        setForm(actualizada);
        alert("Cotizacion actualizada correctamente.");
      } else {
        const creada = await apiCotizaciones.create(payload);
        setCotizaciones((prev) => [...prev, creada]);
        setForm(creada);
        setEditMode(true);
        alert("Cotizacion generada correctamente.");
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ===== GENERAR PROFORMA ===== */
  const generarProforma = async () => {
    if (!editMode) {
      alert("Primero debe guardar la cotizacion.");
      return;
    }
    if (!window.confirm("¿Desea convertir esta cotizacion en proforma?")) {
      return;
    }

    try {
      const proforma = await apiCotizaciones.toProforma(form.codigo);
      setCotizaciones((prev) =>
        prev.map((c) => (c.codigo === proforma.codigo ? proforma : c))
      );
      setForm(proforma);
      alert("Proforma generada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ===== ELIMINAR ===== */
  const eliminarCotizacion = async () => {
    if (!editMode) return;
    if (
      !window.confirm(
        "Esta accion no se puede deshacer. ¿Desea eliminar la cotizacion?"
      )
    ) {
      return;
    }

    try {
      await apiCotizaciones.remove(form.codigo);
      setCotizaciones((prev) =>
        prev.filter((c) => c.codigo !== form.codigo)
      );
      setShowModal(false);
      alert("Cotizacion eliminada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ===== GENERAR PDF ===== */
  const generarPDF = async () => {
    if (!form.codigo) {
      alert("Primero debe guardar la cotización para generar el PDF.");
      return;
    }
    
    try {
      console.log('Generando PDF para:', form);
      
      // USANDO AWAIT (recomendado)
      await GeneradorPDF.generarCotizacionPDF(form);
      console.log('PDF generado exitosamente');
      
    } catch (error) {
      console.error("Error completo al generar PDF:", error);
      alert(`Error al generar el PDF: ${error.message}`);
    }
  };

  /* ===== FILTRO DE BUSQUEDA ===== */
  const listaFiltrada = cotizacionesVisibles.filter((c) => {
    const s = search.toLowerCase();
    return (
      (c.codigo && c.codigo.toLowerCase().includes(s)) ||
      (c.clienteNombre && c.clienteNombre.toLowerCase().includes(s)) ||
      (c.codigoOrdenTrabajo && c.codigoOrdenTrabajo.toLowerCase().includes(s))
    );
  });

  return (
    <div className="gestion-cotizaciones">
      <h2>Gestion de Cotizaciones</h2>

      {/* Información del usuario */}
      <div className="user-info">

        {session.rol !== "admin" && (
          <p className="info-text">Solo puedes ver las cotizaciones y órdenes de trabajo que has creado.</p>
        )}
      </div>

      {/* BUSQUEDA + NUEVA COTIZACION */}
      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar por codigo, cliente o OT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-add" onClick={abrirNueva}>
          Nueva cotizacion
        </button>
      </div>

      {/* LISTA DE COTIZACIONES */}
      <ul className="cotizacion-list">
        {listaFiltrada.map((c) => (
          <li key={c.codigo} onClick={() => abrirEditar(c)}>
            <div>
              <b>{c.codigo}</b> - {c.clienteNombre || "Sin cliente"}
              {c.codigoOrdenTrabajo && (
                <span style={{color: '#666', fontSize: '0.9em', marginLeft: '10px'}}>
                  (Basada en OT: {c.codigoOrdenTrabajo})
                </span>
              )}
            </div>
            <div>
              Tipo: {c.esProforma ? "Proforma" : "Cotizacion"} | Total:{" "}
              {formatoMoneda(c.total != null ? c.total : 0)}
              {session.rol === "admin" && c.mecanicoOrdenTrabajo && (
                <span style={{color: '#666', fontSize: '0.9em', marginLeft: '10px'}}>
                  | Mecánico: {c.mecanicoOrdenTrabajo}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* MODAL DE SELECCIÓN DE ORDEN DE TRABAJO */}
      {showModalSeleccionOT && (
        <div className="modal-overlay" onClick={() => setShowModalSeleccionOT(false)}>
          <div
            className="modal modal-seleccion-ot"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <h3>Seleccionar tipo de cotización</h3>
              
              <div className="user-info">
                {session.rol !== "admin" && (
                  <p className="info-text">Solo puedes generar cotizaciones para órdenes de trabajo que has creado.</p>
                )}
              </div>
              
              <p>¿Desea crear una cotización basada en una orden de trabajo existente?</p>
              
              <div className="opciones-cotizacion">
                <div className="opcion-cotizacion">
                  <h4>Cotización desde Orden de Trabajo</h4>
                  <p>Se autocompletará con los repuestos y servicios de una OT existente</p>
                  <select 
                    onChange={(e) => {
                      const ordenSeleccionada = ordenesTrabajoVisibles.find(ot => ot.codigoOrden === e.target.value);
                      if (ordenSeleccionada) {
                        iniciarNuevaCotizacion(true, ordenSeleccionada);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Seleccionar orden de trabajo...</option>
                    {ordenesTrabajoVisibles.map(ot => (
                      <option key={ot.codigoOrden} value={ot.codigoOrden}>
                        {ot.codigoOrden} - {ot.clienteNombre} - {ot.placa}
                        {ot.mecanico && ` (Mecánico: ${ot.mecanico})`}
                      </option>
                    ))}
                  </select>
                  {ordenesTrabajoVisibles.length === 0 && (
                    <p className="warning-text">
                      {session.rol === "admin" 
                        ? "No hay órdenes de trabajo disponibles."
                        : "No tienes órdenes de trabajo disponibles."
                      }
                    </p>
                  )}
                </div>
                
                <div className="separador">O</div>
                
                <div className="opcion-cotizacion">
                  <h4>Cotización Vacía</h4>
                  <p>Crear una cotización desde cero sin datos predefinidos</p>
                  <button 
                    className="btn-add"
                    onClick={() => iniciarNuevaCotizacion(false)}
                  >
                    Crear Cotización Vacía
                  </button>
                </div>
              </div>
              
              <button 
                className="btn-close"
                onClick={() => setShowModalSeleccionOT(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COTIZACION / PROFORMA */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal modal-cotizacion"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contenido del modal con scroll */}
            <div className="modal-content">
              <h3>
                {form.esProforma
                  ? `Proforma ${form.codigo}`
                  : form.codigo
                  ? `Cotizacion ${form.codigo}`
                  : "Nueva cotizacion"}
                {form.codigoOrdenTrabajo && (
                  <span style={{color: '#666', fontSize: '0.9em', marginLeft: '10px'}}>
                    (Basada en OT: {form.codigoOrdenTrabajo})
                  </span>
                )}
              </h3>

              <p>
                <b>Estado:</b>{" "}
                {form.esProforma ? "Proforma (no editable)" : form.estado}
                {form.mecanicoOrdenTrabajo && (
                  <span style={{marginLeft: '20px'}}>
                    <b>Mecánico:</b> {form.mecanicoOrdenTrabajo}
                  </span>
                )}
              </p>

              <div className="form-grid">
                {/* BÚSQUEDA Y SELECCIÓN DE VEHÍCULO */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>
                    Buscar vehículo:
                    <input
                      className="search-bar"
                      placeholder="Buscar por placa, marca, modelo o cliente..."
                      value={searchVehiculo}
                      onChange={(e) => setSearchVehiculo(e.target.value)}
                      disabled={esSoloLectura}
                    />
                  </label>
                  
                  <select
                    value={form.vehiculoPlaca}
                    onChange={(e) => manejarSeleccionVehiculo(e.target.value)}
                    disabled={esSoloLectura}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <option value="">Seleccione un vehículo</option>
                    {vehiculosFiltrados.map((v) => (
                      <option key={v.placa} value={v.placa}>
                        {v.placa} - {v.marca} {v.modelo} - {v.clienteNombre} ({v.clienteCedula})
                      </option>
                    ))}
                  </select>

                  {/* INFORMACIÓN DEL VEHÍCULO SELECCIONADO */}
                  {form.vehiculoPlaca && vehiculoSeleccionado && (
                    <div className="info-vehiculo-seleccionado">
                      <p><strong>Vehículo seleccionado:</strong></p>
                      <p><strong>Placa:</strong> {form.vehiculoPlaca}</p>
                      <p><strong>Cliente:</strong> {form.clienteNombre}</p>
                      <p><strong>Cédula:</strong> {form.clienteCedula}</p>
                      <p><strong>Vehículo:</strong> {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}</p>
                      <p><strong>ID Base:</strong> {vehiculoSeleccionado.vehiculoBaseId || "No asignado"}</p>
                    </div>
                  )}
                </div>
              </div>

              <hr />

              {/* REPUESTOS - CON FILTRO POR VEHÍCULO */}
              <div className="seccion-items">
                <div className="seccion-header">
                  <h4>Repuestos</h4>
                  {form.codigoOrdenTrabajo && (
                    <span className="info-text" style={{fontSize: '0.8em'}}>
                      Cargados desde OT: {form.codigoOrdenTrabajo}
                    </span>
                  )}
                </div>
                
                {/* INFORMACIÓN DEL FILTRO APLICADO */}
                {vehiculoSeleccionado && !esSoloLectura && (
                  <div className="info-filtro">
                    <p><strong>Filtro aplicado:</strong> Mostrando repuestos universales y específicos para este vehículo</p>
                    <p><strong>Repuestos disponibles:</strong> {repuestosFiltrados.length} total 
                      ({repuestosFiltrados.filter(r => !r.vehiculoId).length} universales, 
                      {repuestosFiltrados.filter(r => r.vehiculoId).length} específicos)
                    </p>
                  </div>
                )}
                
                {/* LISTA DE REPUESTOS AGREGADOS */}
                <div className="contenedor-scrollable">
                  <div className="lista-items">
                    {(form.repuestos || []).map((repuesto, idx) => (
                      <div key={idx} className="item-lista">
                        <span className="item-info">
                          {repuesto.nombre} ({repuesto.cantidad}) - {formatoMoneda(repuesto.precio * repuesto.cantidad)}
                        </span>
                        {!esSoloLectura && (
                          <button 
                            type="button"
                            className="btn-eliminar"
                            onClick={() => eliminarRepuesto(idx)}
                            title="Eliminar repuesto"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* FORMULARIO PARA AGREGAR REPUESTO */}
                {!esSoloLectura && (
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
                              <span className="dropdown-price">{formatoMoneda(repuesto.precio)}</span>
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
                      onClick={agregarRepuesto}
                      disabled={!repSeleccionado || cantidadRep < 1}
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>

              <hr />

              {/* MANO DE OBRA */}
              <div className="seccion-items">
                <div className="seccion-header">
                  <h4>Mano de obra</h4>
                  {form.codigoOrdenTrabajo && (
                    <span className="info-text" style={{fontSize: '0.8em'}}>
                      Cargados desde OT: {form.codigoOrdenTrabajo}
                    </span>
                  )}
                </div>
                
                {/* LISTA DE MANO DE OBRA AGREGADA */}
                <div className="contenedor-scrollable">
                  <div className="lista-items">
                    {(form.manoObra || []).map((servicio, idx) => (
                      <div key={idx} className="item-lista">
                        <span className="item-info">
                          {servicio.nombre} - {formatoMoneda(servicio.tarifa)}
                        </span>
                        {!esSoloLectura && (
                          <button 
                            type="button"
                            className="btn-eliminar"
                            onClick={() => eliminarManoObra(idx)}
                            title="Eliminar servicio"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* FORMULARIO PARA AGREGAR MANO DE OBRA */}
                {!esSoloLectura && (
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
                              <span className="dropdown-price">{formatoMoneda(servicio.precio)}</span>
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
                      onClick={agregarManoObra}
                      disabled={!servicioSeleccionado}
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>

              <hr />

              <div className="form-grid">
                <label>
                  Descuento mano de obra (% 0-20):
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.descuentoManoObra || 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descuentoManoObra: Number(e.target.value),
                      })
                    }
                    disabled={esSoloLectura}
                  />
                </label>
              </div>

              {/* RESUMEN DE TOTALES EN TIEMPO REAL */}
              <div className="resumen-totales">
                <p>
                  <b>Subtotal repuestos:</b>{" "}
                  {formatoMoneda(calculoTotales.subtotalRepuestos)}
                </p>
                <p>
                  <b>Subtotal mano de obra:</b>{" "}
                  {formatoMoneda(calculoTotales.subtotalManoObra)}
                </p>
                <p>
                  <b>Descuento aplicado:</b>{" "}
                  {formatoMoneda(calculoTotales.descuentoMonto)}
                </p>
                <p>
                  <b>IVA (13%):</b> {formatoMoneda(calculoTotales.iva)}
                </p>
                <p className="total-final">
                  <b>Total:</b> {formatoMoneda(calculoTotales.total)}
                </p>
              </div>

              <div className="btn-group">
                {!esSoloLectura && (
                  <button className="btn-add" onClick={guardarCotizacion}>
                    {editMode ? "Actualizar" : "Guardar"} cotizacion
                  </button>
                )}

                {editMode && !esSoloLectura && (
                  <button className="btn-edit" onClick={generarProforma}>
                    Generar proforma
                  </button>
                )}

                {/* 🔽 BOTÓN GENERAR PDF */}
                {editMode && (
                  <button 
                    className="btn-pdf" 
                    onClick={generarPDF}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📄 Generar PDF
                  </button>
                )}

                {editMode && (
                  <button className="btn-delete" onClick={eliminarCotizacion}>
                    Eliminar
                  </button>
                )}

                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionCotizacion;
// src/GestionCotizacion.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./App.css";

/* ======================= API COTIZACIONES ======================= */
const apiCotizaciones = {
  getAll: async () => {
    const res = await fetch("/api/cotizaciones");
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
};

/* ======================= Gestion Cotizacion ======================= */
function GestionCotizacion({ session }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [manoDeObra, setManoDeObra] = useState([]);
  const [search, setSearch] = useState("");
  const [searchVehiculo, setSearchVehiculo] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false); // false = nueva, true = editar

  // Estados para agregar items (igual que en trabajos)
  const [repSeleccionado, setRepSeleccionado] = useState("");
  const [cantidadRep, setCantidadRep] = useState(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [cotizacionesData, vehiculosData, inventarioData, manoDeObraData] = await Promise.all([
          apiCotizaciones.getAll(),
          apiVehiculos.getAll(),
          apiInventario.getAll(),
          apiManoDeObra.getAll()
        ]);
        setCotizaciones(cotizacionesData);
        setVehiculos(vehiculosData);
        setInventario(inventarioData);
        setManoDeObra(manoDeObraData);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los datos del servidor.");
      }
    })();
  }, []);

  const esSoloLectura = form.esProforma === true;

  /* ===== CÁLCULO DE TOTALES EN TIEMPO REAL ===== */
  const calculoTotales = useMemo(() => {
    // Calcular subtotal de repuestos
    const subtotalRepuestos = (form.repuestos || []).reduce((total, repuesto) => {
      return total + (repuesto.cantidad * repuesto.precio);
    }, 0);

    // Calcular subtotal de mano de obra
    const subtotalManoObra = (form.manoObra || []).reduce((total, servicio) => {
      return total + (servicio.horas * servicio.tarifa);
    }, 0);

    // Calcular descuento (solo aplica a mano de obra)
    const descuentoPorcentaje = Number(form.descuentoManoObra) || 0;
    const descuentoMonto = (subtotalManoObra * descuentoPorcentaje) / 100;

    // Calcular subtotal después de descuento
    const subtotalDespuesDescuento = (subtotalRepuestos + subtotalManoObra) - descuentoMonto;

    // Calcular IVA (19%)
    const iva = subtotalDespuesDescuento * 0.13;

    // Calcular total final
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
  };

  /* ===== FUNCIONES PARA REPUESTOS (IGUAL QUE TRABAJOS) ===== */
  const agregarRepuesto = () => {
    if (!repSeleccionado) return;
    
    const rep = inventario.find((r) => r.codigo === repSeleccionado);
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

    // Limpiar campos después de agregar
    setRepSeleccionado("");
    setCantidadRep(1);
  };

  const eliminarRepuesto = (index) => {
    setForm((f) => {
      const rep = [...(f.repuestos || [])];
      rep.splice(index, 1);
      return { ...f, repuestos: rep };
    });
  };

  /* ===== FUNCIONES PARA MANO DE OBRA (IGUAL QUE TRABAJOS) ===== */
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

    // Limpiar campos después de agregar
    setServicioSeleccionado("");
  };

  const eliminarManoObra = (index) => {
    setForm((f) => {
      const mo = [...(f.manoObra || [])];
      mo.splice(index, 1);
      return { ...f, manoObra: mo };
    });
  };

  /* ===== abrir modales ===== */
  const abrirNueva = () => {
    setForm({
      ...emptyForm,
      estado: "borrador",
      esProforma: false,
    });
    setEditMode(false);
    setShowModal(true);
    setSearchVehiculo(""); // Limpiar búsqueda al abrir nueva
  };

  const abrirEditar = (cot) => {
    setForm({
      ...cot,
      repuestos: cot.repuestos || [],
      manoObra: cot.manoObra || [],
    });
    setEditMode(true);
    setShowModal(true);
    setSearchVehiculo(""); // Limpiar búsqueda al editar
  };

  /* ===== guardar (crear / actualizar) ===== */
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
      // Incluir los totales calculados
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

  /* ===== generar proforma ===== */
  const generarProforma = async () => {
    if (!editMode) {
      alert("Primero debe guardar la cotizacion.");
      return;
    }
    if (!window.confirm("Desea convertir esta cotizacion en proforma?")) {
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

  /* ===== eliminar ===== */
  const eliminarCotizacion = async () => {
    if (!editMode) return;
    if (
      !window.confirm(
        "Esta accion no se puede deshacer. Desea eliminar la cotizacion?"
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

  /* ===== filtro de busqueda ===== */
  const listaFiltrada = cotizaciones.filter((c) => {
    const s = search.toLowerCase();
    return (
      (c.codigo && c.codigo.toLowerCase().includes(s)) ||
      (c.clienteNombre && c.clienteNombre.toLowerCase().includes(s))
    );
  });

  return (
    <div className="gestion-cotizaciones">
      <h2>Gestion de Cotizaciones</h2>

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
            </div>
            <div>
              Tipo: {c.esProforma ? "Proforma" : "Cotizacion"} | Total:{" "}
              {formatoMoneda(c.total != null ? c.total : 0)}
            </div>
          </li>
        ))}
      </ul>

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
              </h3>

              <p>
                <b>Estado:</b>{" "}
                {form.esProforma ? "Proforma (no editable)" : form.estado}
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
                  {form.vehiculoPlaca && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '8px', 
                      backgroundColor: 'rgba(17, 105, 92, 0.1)', 
                      borderRadius: '4px',
                      border: '1px solid #11695c'
                    }}>
                      <p><strong>Vehículo seleccionado:</strong></p>
                      <p><strong>Placa:</strong> {form.vehiculoPlaca}</p>
                      <p><strong>Cliente:</strong> {form.clienteNombre}</p>
                      <p><strong>Cédula:</strong> {form.clienteCedula}</p>
                    </div>
                  )}
                </div>
              </div>

              <hr />

              {/* REPUESTOS - ESTRUCTURA IGUAL A TRABAJOS */}
              <div className="seccion-items">
                <div className="seccion-header">
                  <h4>Repuestos</h4>
                </div>
                
                {/* LISTA DE REPUESTOS AGREGADOS */}
                <div className="contenedor-scrollable">
                  <div className="lista-items">
                    {(form.repuestos || []).map((repuesto, idx) => (
                      <div key={idx} className="item-lista">
                        <span className="item-info">
                          {repuesto.nombre} ({repuesto.cantidad}) - {formatoMoneda(repuesto.precio)}
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
                          {r.nombre} - {formatoMoneda(r.precio)} (Stock: {r.cantidad})
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
                      onClick={agregarRepuesto}
                      disabled={!repSeleccionado || cantidadRep < 1}
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>

              <hr />

              {/* MANO DE OBRA - ESTRUCTURA IGUAL A TRABAJOS */}
              <div className="seccion-items">
                <div className="seccion-header">
                  <h4>Mano de obra</h4>
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
                          {servicio.nombre} - {formatoMoneda(servicio.precio)}
                        </option>
                      ))}
                    </datalist>
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
// GestionTrabajos.jsx
import React, { useState, useEffect } from "react";
import "./App.css";

/* ======================= API TRABAJOS ======================= */
const apiTrabajos = {
  getAll: async () => {
    const res = await fetch("/api/trabajos");
    if (!res.ok) throw new Error("No se pudo cargar trabajos");
    return res.json();
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
    return data.trabajos || data.trabajo;
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

/* ======================= COMPONENTE ======================= */
function GestionTrabajos({ session }) {
  const [trabajos, setTrabajos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [showModalNuevaOT, setShowModalNuevaOT] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalEstado, setShowModalEstado] = useState(false);

  const [newOT, setNewOT] = useState({
    codigoCita: "",
    observacionesIniciales: "",
  });

  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Pendiente");

  const [repSeleccionado, setRepSeleccionado] = useState("");
  const [cantidadRep, setCantidadRep] = useState(1);

  const ESTADOS = ["Pendiente", "En proceso", "Finalizada", "Cancelada"];

  /* === CARGAR TRABAJOS E INVENTARIO AL INICIO === */
  useEffect(() => {
    (async () => {
      try {
        const arrTrabajos = await apiTrabajos.getAll();
        const trabajosLista = Array.isArray(arrTrabajos)
          ? arrTrabajos
          : arrTrabajos.trabajos || [];

        // FILTRAR SEGÚN USUARIO
        let trabajosFiltrados = trabajosLista;
        if (session.rol !== "admin") {
          const resCitas = await fetch("/api/citas");
          if (!resCitas.ok) throw new Error("No se pudieron cargar las citas");
          const citasArr = await resCitas.json();
          const citasLista = Array.isArray(citasArr) ? citasArr : citasArr.citas || [];
          const nombreUsuario = session?.nombre?.trim() || "";

          trabajosFiltrados = trabajosLista.filter((trabajo) => {
            const cita = citasLista.find((c) => String(c.id) === String(trabajo.idCita));
            if (!cita) return false;
            return cita.mecanico?.trim() === nombreUsuario;
          });
        }

        setTrabajos(trabajosFiltrados);

        // CARGAR INVENTARIO
        const inv = await apiInventario.getAll();
        setInventario(inv);
      } catch (e) {
        console.error(e);
        alert("Error al cargar datos.");
      }
    })();
  }, []);

  /* ==================== CREAR ORDEN DESDE CITA ==================== */
  const crearOrdenDesdeCita = async () => {
    const { codigoCita, observacionesIniciales } = newOT;
    if (!codigoCita.trim()) {
      alert("Debe ingresar el código de la cita.");
      return;
    }

    try {
      const resultado = await apiTrabajos.createFromCita({
        codigoCita: codigoCita.trim(),
        observacionesIniciales: observacionesIniciales.trim(),
      });
      if (Array.isArray(resultado)) setTrabajos(resultado);
      else if (resultado && resultado.codigoOrden)
        setTrabajos((prev) => [...prev, resultado]);

      setNewOT({ codigoCita: "", observacionesIniciales: "" });
      setShowModalNuevaOT(false);
      alert("Orden de trabajo generada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ==================== GUARDAR DETALLE / DIAGNOSTICO / REPUESTOS ==================== */
  const agregarRepuestoTrabajo = () => {
    if (!repSeleccionado) return;
    const rep = inventario.find((r) => r.codigo === repSeleccionado);
    if (!rep) return;
    if (cantidadRep > rep.cantidad) {
      alert("No hay suficiente stock de este repuesto.");
      return;
    }

    setSelected((prev) => ({
      ...prev,
      repuestosUtilizados: [
        ...(prev.repuestosUtilizados || []),
        { codigo: rep.codigo, nombre: rep.nombre, cantidad: cantidadRep },
      ],
    }));

    setInventario((prev) =>
      prev.map((r) =>
        r.codigo === rep.codigo ? { ...r, cantidad: r.cantidad - cantidadRep } : r
      )
    );

    apiInventario
      .updateCantidad(rep.codigo, rep.cantidad - cantidadRep)
      .catch((e) => alert("Error al actualizar inventario: " + e.message));

    setRepSeleccionado("");
    setCantidadRep(1);
  };

  const guardarDetalleTrabajo = async () => {
    if (!selected) return;
    try {
      const actualizado = await apiTrabajos.update(selected.codigoOrden, selected);
      setTrabajos((prev) =>
        prev.map((t) =>
          t.codigoOrden === actualizado.codigoOrden ? actualizado : t
        )
      );
      setShowModalDetalle(false);
      alert("Orden actualizada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
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
      const actualizado = await apiTrabajos.updateEstado(
        selected.codigoOrden,
        estadoSeleccionado
      );
      setTrabajos((prev) =>
        prev.map((t) =>
          t.codigoOrden === actualizado.codigoOrden ? actualizado : t
        )
      );
      setSelected(actualizado);
      setShowModalEstado(false);
      alert("Estado actualizado correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
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
            <label>
              Código de Cita:
              <input
                value={newOT.codigoCita}
                onChange={(e) =>
                  setNewOT({ ...newOT, codigoCita: e.target.value })
                }
              />
            </label>
            <label>
              Observaciones iniciales:
              <textarea
                value={newOT.observacionesIniciales}
                onChange={(e) =>
                  setNewOT({ ...newOT, observacionesIniciales: e.target.value })
                }
              />
            </label>
            <div className="btn-group">
              <button className="btn-add" onClick={crearOrdenDesdeCita}>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Orden #{selected.codigoOrden}</h3>
            <p>
              <b>Cliente:</b> {selected.clienteNombre} ({selected.clienteCedula})
            </p>
            <p>
              <b>Placa:</b> {selected.placa}
            </p>
            <label>
              Diagnóstico:
              <textarea
                value={selected.diagnostico || ""}
                onChange={(e) =>
                  setSelected({ ...selected, diagnostico: e.target.value })
                }
              />
            </label>
            <label>
              Servicios realizados:
              <textarea
                value={selected.serviciosRealizados || ""}
                onChange={(e) =>
                  setSelected({ ...selected, serviciosRealizados: e.target.value })
                }
              />
            </label>
            <label>
              Repuestos utilizados:
              <ul>
                {(selected.repuestosUtilizados || []).map((r, idx) => (
                  <li key={idx}>
                    {r.nombre} ({r.cantidad})
                  </li>
                ))}
              </ul>
              <input
                list="repuestos-list"
                value={repSeleccionado}
                onChange={(e) => setRepSeleccionado(e.target.value)}
                placeholder="Buscar repuesto..."
              />
              <datalist id="repuestos-list">
                {inventario.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.nombre} (Disponible: {r.cantidad})
                  </option>
                ))}
              </datalist>
              <input
                type="number"
                min="1"
                value={cantidadRep}
                onChange={(e) => setCantidadRep(Number(e.target.value))}
              />
              <button onClick={agregarRepuestoTrabajo}>Agregar Repuesto</button>
            </label>

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

      {/* MODAL ESTADO */}
      {showModalEstado && selected && (
        <div className="modal-overlay" onClick={() => setShowModalEstado(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cambiar estado OT #{selected.codigoOrden}</h3>
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

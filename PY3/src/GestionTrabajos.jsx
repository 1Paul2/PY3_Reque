// GestionTrabajos.jsx
import React, { useState, useEffect } from "react";
import "./App.css";

/* ======================= API TRABAJOS ======================= */
const apiTrabajos = {
  getAll: async () => {
    const res = await fetch("/api/trabajos");
    if (!res.ok) throw new Error("No se pudo cargar trabajos");
    return res.json(); // tu backend puede devolver { ok, trabajos } o solo []
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
    // asumo que el backend devuelve la lista actualizada o la OT nueva
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

/* ======================= Gestion Trabajos ======================= */
function GestionTrabajos({ session }) {
  const [trabajos, setTrabajos] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [showModalNuevaOT, setShowModalNuevaOT] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalEstado, setShowModalEstado] = useState(false);

  const [newOT, setNewOT] = useState({
    codigoCita: "",
    observacionesIniciales: "",
  });

  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");

  const ESTADOS = ["Pendiente", "En proceso", "Finalizada", "Cancelada"];

  /* === CARGAR TRABAJOS AL INICIO === */
  useEffect(() => {
    (async () => {
      try {
        const arr = await apiTrabajos.getAll();
        // si el backend devuelve { trabajos: [...] }
        const lista = Array.isArray(arr) ? arr : arr.trabajos || [];
        setTrabajos(lista);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar las ordenes de trabajo del servidor.");
      }
    })();
  }, []);

  /* ==================== CREAR ORDEN DESDE CITA (CU-0028) ==================== */
  const crearOrdenDesdeCita = async () => {
    const { codigoCita, observacionesIniciales } = newOT;

    if (!codigoCita.trim()) {
      alert("Debe ingresar el codigo de la cita.");
      return;
    }

    try {
      const resultado = await apiTrabajos.createFromCita({
        codigoCita: codigoCita.trim(),
        observacionesIniciales: observacionesIniciales.trim(),
      });

      // si devuelve lista actualizada
      if (Array.isArray(resultado)) {
        setTrabajos(resultado);
      } else if (resultado && resultado.codigoOrden) {
        // si devuelve solo 1 OT
        setTrabajos((prev) => [...prev, resultado]);
      }

      setNewOT({ codigoCita: "", observacionesIniciales: "" });
      setShowModalNuevaOT(false);
      alert("Orden de trabajo generada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ==================== GUARDAR DIAGNOSTICO / SERVICIOS (CU-0031) ==================== */
  const guardarDetalleTrabajo = async () => {
    if (!selected) return;

    // validaciones basicas: que exista diagnostico o servicios antes de Finalizar
    if (
      selected.estado === "Finalizada" &&
      (!selected.diagnostico || !selected.diagnostico.trim())
    ) {
      if (
        !window.confirm(
          "La orden esta Finalizada pero no tiene diagnostico. Desea guardar igual?"
        )
      ) {
        return;
      }
    }

    try {
      const actualizado = await apiTrabajos.update(selected.codigoOrden, selected);
      setTrabajos((prev) =>
        prev.map((t) =>
          t.codigoOrden === actualizado.codigoOrden ? actualizado : t
        )
      );
      setSelected(actualizado);
      setShowModalDetalle(false);
      alert("Orden actualizada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  /* ==================== CAMBIAR ESTADO OT (CU-0032) ==================== */
  const abrirModalEstado = (trabajo) => {
    setSelected(trabajo);
    setEstadoSeleccionado(trabajo.estado || "Pendiente");
    setShowModalEstado(true);
  };

  const validarTransicionEstado = (estadoActual, nuevoEstado) => {
    // ejemplo sencillo de reglas:
    // - no se puede pasar de Finalizada/Cancelada a Pendiente
    if (
      (estadoActual === "Finalizada" || estadoActual === "Cancelada") &&
      nuevoEstado === "Pendiente"
    ) {
      alert("Cambio de estado no permitido segun las politicas del taller.");
      return false;
    }
    return true;
  };

  const guardarNuevoEstado = async () => {
    if (!selected) return;

    const estadoActual = selected.estado || "Pendiente";
    const nuevoEstado = estadoSeleccionado;

    if (!validarTransicionEstado(estadoActual, nuevoEstado)) return;

    // si usuario normal quiere cancelar -> envia reporte en vez de cambiar
    if (nuevoEstado === "Cancelada" && session?.rol !== "admin") {
      try {
        const reporte = {
          usuario: session?.nombre || "Desconocido",
          tipo: "Trabajos",
          descripcion: `Usuario normal solicito cancelar OT ${selected.codigoOrden}`,
          fecha: new Date().toISOString(),
        };

        const res = await fetch("/api/reportes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reporte),
        });

        if (!res.ok) throw new Error("Error al enviar reporte");
        alert("Solicitud enviada al administrador para cancelar la orden.");
        setShowModalEstado(false);
        return;
      } catch (err) {
        console.error(err);
        alert("No se pudo enviar el reporte.");
        return;
      }
    }

    try {
      const actualizado = await apiTrabajos.updateEstado(
        selected.codigoOrden,
        nuevoEstado
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

  /* ==================== FILTRO BUSQUEDA (CU-0029) ==================== */
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
      <h2>Gestion de Trabajos</h2>

      {/* BUSQUEDA + NUEVA ORDEN */}
      <div className="busqueda-agregar">
        <input
          className="search-bar"
          placeholder="Buscar orden por codigo, placa o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn-add"
          onClick={() => setShowModalNuevaOT(true)}
        >
          Nueva Orden desde Cita
        </button>
      </div>

      {/* LISTA DE TRABAJOS */}
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

      {/* MODAL NUEVA ORDEN DESDE CITA (CU-0028) */}
      {showModalNuevaOT && (
        <div
          className="modal-overlay"
          onClick={() => setShowModalNuevaOT(false)}
        >
          <div className="modal modal-agregar" onClick={(e) => e.stopPropagation()}>
            <h3>Generar Orden de Trabajo desde Cita</h3>
            <label>
              Codigo de Cita:
              <input
                placeholder="Codigo de cita pendiente"
                value={newOT.codigoCita}
                onChange={(e) =>
                  setNewOT({ ...newOT, codigoCita: e.target.value })
                }
              />
            </label>

            <label>
              Observaciones iniciales (opcional):
              <textarea
                placeholder="Diagnostico inicial, observaciones..."
                value={newOT.observacionesIniciales}
                onChange={(e) =>
                  setNewOT({
                    ...newOT,
                    observacionesIniciales: e.target.value,
                  })
                }
              />
            </label>

            <div
              className="btn-group"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <button className="btn btn-add" onClick={crearOrdenDesdeCita}>
                Crear Orden
              </button>
              <button
                className="btn btn-close"
                onClick={() => setShowModalNuevaOT(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / DIAGNOSTICO / SERVICIOS (CU-0031) */}
      {showModalDetalle && selected && (
        <div
          className="modal-overlay"
          onClick={() => setShowModalDetalle(false)}
        >
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Orden de Trabajo #{selected.codigoOrden}</h3>

            <p>
              <b>Cliente:</b> {selected.clienteNombre} ({selected.clienteCedula})
            </p>
            <p>
              <b>Vehiculo:</b> {selected.vehiculo || ""} / Placa: {selected.placa}
            </p>
            <p>
              <b>Servicio:</b> {selected.tipoServicio || "N/A"}
            </p>
            <p>
              <b>Estado actual:</b> {selected.estado || "Pendiente"}
            </p>

            <label>
              <b>Diagnostico:</b>
              <textarea
                value={selected.diagnostico || ""}
                onChange={(e) =>
                  setSelected({ ...selected, diagnostico: e.target.value })
                }
                placeholder="Escriba el diagnostico del vehiculo..."
              />
            </label>

            <label>
              <b>Servicios realizados / por realizar:</b>
              <textarea
                value={selected.serviciosRealizados || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    serviciosRealizados: e.target.value,
                  })
                }
                placeholder="Detalle los servicios realizados y pendientes..."
              />
            </label>

            <label>
              <b>Repuestos utilizados:</b>
              <textarea
                value={selected.repuestosUtilizados || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    repuestosUtilizados: e.target.value,
                  })
                }
                placeholder="Lista de repuestos utilizados y cantidades..."
              />
            </label>

            <label>
              <b>Notas internas:</b>
              <textarea
                value={selected.notasInternas || ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    notasInternas: e.target.value,
                  })
                }
                placeholder="Notas internas de taller..."
              />
            </label>

            <div
              className="btn-group"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <button className="btn btn-add" onClick={guardarDetalleTrabajo}>
                Guardar cambios
              </button>
              <button
                className="btn btn-edit"
                onClick={() => abrirModalEstado(selected)}
              >
                Cambiar estado
              </button>
              <button
                className="btn btn-close"
                onClick={() => setShowModalDetalle(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIO DE ESTADO (CU-0032) */}
      {showModalEstado && selected && (
        <div
          className="modal-overlay"
          onClick={() => setShowModalEstado(false)}
        >
          <div className="modal modal-editar" onClick={(e) => e.stopPropagation()}>
            <h3>Cambiar estado OT #{selected.codigoOrden}</h3>

            <p>
              <b>Estado actual:</b> {selected.estado || "Pendiente"}
            </p>

            <label>
              <b>Nuevo estado:</b>
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
            </label>

            {estadoSeleccionado === "Cancelada" && session?.rol !== "admin" && (
              <p style={{ marginTop: 10, color: "red", fontSize: "0.9rem" }}>
                Como usuario normal, al solicitar Cancelada se enviara un reporte
                al administrador para que revise la orden (no se cambia de
                inmediato).
              </p>
            )}

            <div
              className="btn-group"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <button className="btn btn-add" onClick={guardarNuevoEstado}>
                Guardar estado
              </button>
              <button
                className="btn btn-close"
                onClick={() => setShowModalEstado(false)}
              >
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

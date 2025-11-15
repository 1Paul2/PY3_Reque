// src/GestionCotizacion.jsx
import React, { useEffect, useState } from "react";
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

const emptyForm = {
  codigo: "",
  clienteNombre: "",
  clienteCedula: "",
  vehiculoPlaca: "",
  codigoOrden: "",
  descuentoManoObra: 0,
  repuestos: [],
  manoObra: [],
  esProforma: false,
  estado: "borrador",
};

/* ======================= Gestion Cotizacion ======================= */
function GestionCotizacion({ session }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false); // false = nueva, true = editar

  useEffect(() => {
    (async () => {
      try {
        const arr = await apiCotizaciones.getAll();
        setCotizaciones(arr);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar las cotizaciones del servidor.");
      }
    })();
  }, []);

  const esSoloLectura = form.esProforma === true;

  /* ===== helpers de arrays ===== */
  const agregarRepuesto = () => {
    setForm((f) => ({
      ...f,
      repuestos: [
        ...(f.repuestos || []),
        { codigo: "", nombre: "", cantidad: 1, precio: 0 },
      ],
    }));
  };

  const actualizarRepuesto = (idx, campo, valor) => {
    setForm((f) => {
      const rep = [...(f.repuestos || [])];
      rep[idx] = { ...rep[idx], [campo]: valor };
      return { ...f, repuestos: rep };
    });
  };

  const eliminarRepuesto = (idx) => {
    setForm((f) => {
      const rep = [...(f.repuestos || [])];
      rep.splice(idx, 1);
      return { ...f, repuestos: rep };
    });
  };

  const agregarManoObra = () => {
    setForm((f) => ({
      ...f,
      manoObra: [
        ...(f.manoObra || []),
        { descripcion: "", horas: 1, tarifa: 0 },
      ],
    }));
  };

  const actualizarManoObra = (idx, campo, valor) => {
    setForm((f) => {
      const mo = [...(f.manoObra || [])];
      mo[idx] = { ...mo[idx], [campo]: valor };
      return { ...f, manoObra: mo };
    });
  };

  const eliminarManoObra = (idx) => {
    setForm((f) => {
      const mo = [...(f.manoObra || [])];
      mo.splice(idx, 1);
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
  };

  const abrirEditar = (cot) => {
    setForm({
      ...cot,
      repuestos: cot.repuestos || [],
      manoObra: cot.manoObra || [],
    });
    setEditMode(true);
    setShowModal(true);
  };

  /* ===== guardar (crear / actualizar) ===== */
  const guardarCotizacion = async () => {
    if (!form.clienteNombre.trim() || !form.clienteCedula.trim()) {
      alert("Debe completar nombre y cedula del cliente.");
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
      codigoOrden: form.codigoOrden,
      repuestos: form.repuestos,
      manoObra: form.manoObra,
      descuentoManoObra: Number(form.descuentoManoObra) || 0,
      estado: form.estado || "borrador",
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
      (c.clienteNombre && c.clienteNombre.toLowerCase().includes(s)) ||
      (c.codigoOrden && String(c.codigoOrden).toLowerCase().includes(s))
    );
  });

  return (
    <div className="gestion-trabajos">
      <h2>Gestion de Cotizaciones</h2>

      {/* BUSQUEDA + NUEVA COTIZACION */}
      <div className="busqueda-agregar">
        <input
          className="search-bar"
          placeholder="Buscar por codigo, cliente o OT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-add" onClick={abrirNueva}>
          Nueva cotizacion
        </button>
      </div>

      {/* LISTA DE COTIZACIONES */}
      <ul className="trabajo-list">
        {listaFiltrada.map((c) => (
          <li key={c.codigo} onClick={() => abrirEditar(c)}>
            <div>
              <b>{c.codigo}</b> - {c.clienteNombre || "Sin cliente"}
            </div>
            <div>
              Tipo: {c.esProforma ? "Proforma" : "Cotizacion"} | Total:{" "}
              {c.total != null ? c.total : 0}
            </div>
          </li>
        ))}
      </ul>

      {/* MODAL COTIZACION / PROFORMA */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal modal-lista"
            onClick={(e) => e.stopPropagation()}
          >
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

            <label>
              Cliente:
              <input
                value={form.clienteNombre}
                onChange={(e) =>
                  setForm({ ...form, clienteNombre: e.target.value })
                }
                disabled={esSoloLectura}
              />
            </label>

            <label>
              Cedula:
              <input
                value={form.clienteCedula}
                onChange={(e) =>
                  setForm({ ...form, clienteCedula: e.target.value })
                }
                disabled={esSoloLectura}
              />
            </label>

            <label>
              Vehiculo / placa:
              <input
                value={form.vehiculoPlaca}
                onChange={(e) =>
                  setForm({ ...form, vehiculoPlaca: e.target.value })
                }
                disabled={esSoloLectura}
              />
            </label>

            <label>
              Codigo OT (opcional):
              <input
                value={form.codigoOrden || ""}
                onChange={(e) =>
                  setForm({ ...form, codigoOrden: e.target.value })
                }
                disabled={esSoloLectura}
              />
            </label>

            <hr />

            {/* REPUESTOS */}
            <h4>Repuestos</h4>
            {!esSoloLectura && (
              <button
                type="button"
                className="btn btn-add"
                onClick={agregarRepuesto}
                style={{ marginBottom: 8 }}
              >
                Agregar repuesto
              </button>
            )}
            {(form.repuestos || []).map((r, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <input
                  placeholder="Codigo"
                  value={r.codigo || ""}
                  onChange={(e) =>
                    actualizarRepuesto(idx, "codigo", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                <input
                  placeholder="Nombre"
                  value={r.nombre || ""}
                  onChange={(e) =>
                    actualizarRepuesto(idx, "nombre", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Cant."
                  value={r.cantidad || 0}
                  onChange={(e) =>
                    actualizarRepuesto(idx, "cantidad", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  value={r.precio || 0}
                  onChange={(e) =>
                    actualizarRepuesto(idx, "precio", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                {!esSoloLectura && (
                  <button
                    type="button"
                    className="btn btn-close"
                    onClick={() => eliminarRepuesto(idx)}
                  >
                    X
                  </button>
                )}
              </div>
            ))}

            <hr />

            {/* MANO DE OBRA */}
            <h4>Mano de obra</h4>
            {!esSoloLectura && (
              <button
                type="button"
                className="btn btn-add"
                onClick={agregarManoObra}
                style={{ marginBottom: 8 }}
              >
                Agregar mano de obra
              </button>
            )}
            {(form.manoObra || []).map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <input
                  placeholder="Descripcion"
                  value={m.descripcion || ""}
                  onChange={(e) =>
                    actualizarManoObra(idx, "descripcion", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Horas"
                  value={m.horas || 0}
                  onChange={(e) =>
                    actualizarManoObra(idx, "horas", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Tarifa"
                  value={m.tarifa || 0}
                  onChange={(e) =>
                    actualizarManoObra(idx, "tarifa", e.target.value)
                  }
                  disabled={esSoloLectura}
                />
                {!esSoloLectura && (
                  <button
                    type="button"
                    className="btn btn-close"
                    onClick={() => eliminarManoObra(idx)}
                  >
                    X
                  </button>
                )}
              </div>
            ))}

            <hr />

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
                    descuentoManoObra: e.target.value,
                  })
                }
                disabled={esSoloLectura}
              />
            </label>

            <p>
              <b>Subtotal repuestos:</b>{" "}
              {form.subtotalRepuestos != null ? form.subtotalRepuestos : 0}
            </p>
            <p>
              <b>Subtotal mano de obra:</b>{" "}
              {form.subtotalManoObra != null ? form.subtotalManoObra : 0}
            </p>
            <p>
              <b>Descuento aplicado:</b>{" "}
              {form.descuentoMonto != null ? form.descuentoMonto : 0}
            </p>
            <p>
              <b>IVA:</b> {form.iva != null ? form.iva : 0}
            </p>
            <p>
              <b>Total:</b> {form.total != null ? form.total : 0}
            </p>

            <div
              className="btn-group"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              {!esSoloLectura && (
                <button className="btn btn-add" onClick={guardarCotizacion}>
                  Guardar cotizacion
                </button>
              )}

              {editMode && !esSoloLectura && (
                <button className="btn btn-edit" onClick={generarProforma}>
                  Generar proforma
                </button>
              )}

              {editMode && (
                <button className="btn btn-close" onClick={eliminarCotizacion}>
                  Eliminar
                </button>
              )}

              <button
                className="btn btn-close"
                onClick={() => setShowModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionCotizacion;

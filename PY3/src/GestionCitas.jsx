// GestionCitas.jsx
import React, { useState, useEffect } from "react";
import "./App.css";

/* ======================= API CITAS ======================= */
const apiCitas = {
  getAll: async () => {
    const res = await fetch("/api/citas");
    if (!res.ok) throw new Error("No se pudieron cargar las citas");
    return res.json();
  },
  create: async (cita) => {
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita)
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.citas;
  },
  update: async (id, cita) => {
    const res = await fetch(`/api/citas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita)
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.cita;
  },
  remove: async (id) => {
    const res = await fetch(`/api/citas/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.citas;
  }
};

/* ======================= Gestion Citas ======================= */
function GestionCitas({ session, clientes, vehiculos }) {
  const [citas, setCitas] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);

  const [newCita, setNewCita] = useState({
    clienteCedula: "",
    clienteNombre: "",
    vehiculoId: "",
    fecha: "",
    hora: "",
    descripcion: ""
  });

  // Cargar citas al inicio
  useEffect(() => {
    (async () => {
      try {
        const arr = await apiCitas.getAll();
        setCitas(arr);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar las citas del servidor.");
      }
    })();
  }, []);

  /* === FILTRAR CITAS === */
  const citasFiltradas = citas.filter(c =>
    c.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
    c.clienteCedula.includes(search) ||
    c.vehiculo?.placa?.includes(search)
  );

  return (
    <div className="gestion-citas">
      <h2>Gestión de Citas</h2>

      <div className="busqueda-agregar">
        <input
          className="search-bar"
          placeholder="Buscar cita por cliente o vehículo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="btn btn-add"
          onClick={() => setShowModalAgregar(true)}
        >
          Agregar Cita
        </button>
      </div>

      {/* LISTA DE CITAS */}
      <ul className="cita-list">
        {citasFiltradas.map(c => (
          <li
            key={c.id}
            onClick={() => setSelected(c)}
            className={selected?.id === c.id ? "selected" : ""}
          >
            {c.clienteNombre} - {c.vehiculo?.marca} {c.vehiculo?.modelo} ({c.fecha} {c.hora})
          </li>
        ))}
      </ul>

      {/* Aquí podemos agregar los modales para agregar/editar/ver cita, siguiendo el patrón de GestionClientes */}
    </div>
  );
}

export default GestionCitas;

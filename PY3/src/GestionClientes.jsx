// GestionClientes.jsx
import React, { useState, useEffect } from "react";
import "./App.css"; // importa tus estilos existentes

/* ======================= API CLIENTES ======================= */
const apiClientes = {
  getAll: async () => {
    const res = await fetch("/api/clientes");  // ✅ ahora apunta a clientes
    if (!res.ok) throw new Error("No se pudo cargar clientes");
    return res.json(); // tu backend devuelve { ok: true, clientes } o solo clientes según tu server.js
  },
  create: async (cliente) => {
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente)
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.clientes; // ✅ devuelve la lista actualizada de clientes
  },
  update: async (id, cliente) => {
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente)
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.cliente;
  },
  remove: async (id) => {
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.clientes;
  }
};

/* ======================= Gestion Clientes ======================= */
function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearchClientes] = useState("");
  const [selected, setSelectedClientes] = useState(null);
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [newCliente, setNewCliente] = useState({ 
    nombre: "", 
    cedula: "", 
    correo: "", 
    numero: ""
  });

  // Cargar clientes del servidor al inicio
  useEffect(() => {
    (async () => {
      try {
        const arr = await apiClientes.getAll();
        setClientes(arr);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los clientes del servidor.");
      }
    })();
  }, []);

  /* === AGREGAR CLIENTE === */
  const agregarCliente = async () => {
    if (!newCliente.nombre.trim() || !newCliente.cedula.trim()) return;

    try {
      const updated = await apiClientes.create(newCliente);
      setClientes(updated);
      setNewCliente({ nombre: "", cedula: "", correo: "", numero: "" });
      setShowModalAgregar(false);
    } catch (e) {
      alert(e.message);
    }
  };

  /* === EDITAR CLIENTE === */
  const guardarEdicion = async () => {
    if (!selected) return;

    try {
      await apiClientes.update(selected.id, selected);
      setClientes(clientes.map(c => c.id === selected.id ? selected : c));
      setShowModalEditar(false);
    } catch (e) {
      alert(e.message);
    }
  };

  /* === ELIMINAR CLIENTE === */
  const eliminarCliente = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este cliente?")) return;

    try {
      const updated = await apiClientes.remove(id);
      setClientes(updated);
      setSelectedClientes(null);
    } catch (e) {
      alert(e.message);
    }
  };

  /* === FILTRAR CLIENTES === */
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.cedula.includes(search) ||
    (c.correo && c.correo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="gestion-clientes">
      <h2>Gestión de Clientes</h2>

      {/* BARRA DE BÚSQUEDA */}
      <input
        className="search-bar"
        placeholder="Buscar cliente..."
        value={search}
        onChange={e => setSearchClientes(e.target.value)}
        style={{ width: "100%", padding: 6, marginBottom: 10 }}
      />

      {/* BOTÓN AGREGAR */}
      <button
        className="btn btn-add"
        onClick={() => setShowModalAgregar(true)}
      >
        Agregar Cliente
      </button>

      {/* LISTA DE CLIENTES */}
      <ul className="cliente-list">
        {clientesFiltrados.map(c => (
          <li
            key={c.id}
            onClick={() => setSelectedClientes(c)}
            className={selected?.id === c.id ? "selected" : ""}
          >
            {c.nombre} ({c.cedula})
          </li>
        ))}
      </ul>

      {/* MODAL AGREGAR */}
      {showModalAgregar && (
        <div className="modal-overlay" onClick={() => setShowModalAgregar(false)}>
          <div className="modal modal-agregar" onClick={e => e.stopPropagation()}>
            <h3>Agregar Cliente</h3>
            <input
              placeholder="Nombre"
              value={newCliente.nombre}
              onChange={e => setNewCliente({ ...newCliente, nombre: e.target.value })}
            />
            <input
              placeholder="Cédula"
              value={newCliente.cedula}
              onChange={e => setNewCliente({ ...newCliente, cedula: e.target.value })}
            />
            <input
              placeholder="Correo"
              value={newCliente.correo}
              onChange={e => setNewCliente({ ...newCliente, correo: e.target.value })}
            />
            <input
              placeholder="Número Telefónico"
              value={newCliente.numero}
              onChange={e => setNewCliente({ ...newCliente, numero: e.target.value })}
            />
            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-add" onClick={agregarCliente}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowModalAgregar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelectedClientes(null)}>
          <div className="modal modal-lista" onClick={e => e.stopPropagation()}>
            <h3>Información del Cliente</h3>
            <p><b>Nombre:</b> {selected.nombre}</p>
            <p><b>Cédula:</b> {selected.cedula}</p>
            <p><b>Número:</b> {selected.numero}</p>
            <p><b>Correo:</b> {selected.correo || "N/A"}</p>
            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-edit" onClick={() => setShowModalEditar(true)}>Modificar</button>
              <button className="btn btn-delate" onClick={() => eliminarCliente(selected.id)}>Eliminar</button>
              <button className="btn btn-close" onClick={() => setSelectedClientes(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showModalEditar && (
        <div className="modal-overlay" onClick={() => setShowModalEditar(false)}>
          <div className="modal modal-editar" onClick={e => e.stopPropagation()}>
            <h3>Editar Cliente</h3>
            <input
              value={selected.nombre}
              onChange={e => setSelectedClientes({ ...selected, nombre: e.target.value })}
            />
            <input
              value={selected.cedula}
              onChange={e => setSelectedClientes({ ...selected, cedula: e.target.value })}
            />
            <input
              value={selected.correo}
              onChange={e => setSelectedClientes({ ...selected, correo: e.target.value })}
            />
            <input
              value={selected.numero}
              onChange={e => setSelectedClientes({ ...selected, numero: e.target.value })}
            />
            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-add" onClick={guardarEdicion}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowModalEditar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionClientes;
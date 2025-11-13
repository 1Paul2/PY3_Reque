import React, { useState, useEffect } from "react";
import "./App.css"; // o "./GestionVehiculos.css"

/* ======================= API VEHICULOS ======================= */
const apiVehiculos = {
  getAll: async () => {
    const res = await fetch("/api/vehiculos");
    if (!res.ok) throw new Error("No se pudo cargar los vehículos");
    return res.json();
  },
  create: async (vehiculo) => {
    const res = await fetch("/api/vehiculos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehiculo),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.vehiculos;
  },
  update: async (placa, vehiculo) => {
    const res = await fetch(`/api/vehiculos/${placa}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehiculo),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.vehiculo;
  },
  remove: async (placa) => {
    const res = await fetch(`/api/vehiculos/${placa}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error);
    return data.vehiculos;
  },
};

/* ======================= Gestion Vehiculos ======================= */
function GestionVehiculos({ session }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculosBase, setVehiculosBase] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [textoCliente, setTextoCliente] = useState("");
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [textoVehiculo, setTextoVehiculo] = useState("");
  const [mostrarListaVehiculos, setMostrarListaVehiculos] = useState(false);
  const [search, setSearchVehiculos] = useState("");
  const [selected, setSelectedVehiculos] = useState(null);
  const [showFormAgregar, setShowFormAgregar] = useState(false);
  const [showFormEditar, setShowFormEditar] = useState(false);
  const resetFormularioVehiculo = () => {
  setNewVehiculo({ marca: "", modelo: "", anoVehiculo: "", placa: "", tipo: "" });
  setTextoCliente("");
  setTextoVehiculo("");
  setClienteSeleccionado("");
  };

  const [newVehiculo, setNewVehiculo] = useState({
    marca: "",
    modelo: "",
    anoVehiculo: "",
    placa: "",
    tipo: "",
  });

  // Cargar datos al inicio
  useEffect(() => {
    (async () => {
      try {
        const [vehiculosRes, vehiculosBaseRes, clientesRes] = await Promise.all([
          fetch("/api/vehiculos"),
          fetch("/api/vehiculosBase"),
          fetch("/api/clientes"),
        ]);

        if (!vehiculosRes.ok || !vehiculosBaseRes.ok || !clientesRes.ok)
          throw new Error("Error al cargar datos");

        const [vehiculosData, vehiculosBaseData, clientesData] = await Promise.all([
          vehiculosRes.json(),
          vehiculosBaseRes.json(),
          clientesRes.json(),
        ]);

        setVehiculos(vehiculosData);
        setVehiculosBase(vehiculosBaseData);
        setClientes(clientesData);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los datos del servidor.");
      }
    })();
  }, []);

  /* === AGREGAR VEHÍCULO === */
  const agregarVehiculo = async () => {
    if (!newVehiculo.placa.trim() || !newVehiculo.marca.trim()) {
      alert("Placa y marca son obligatorias.");
      return;
    }

    if (!clienteSeleccionado) {
      alert("Debes seleccionar un cliente.");
      return;
    }

    try {
      const cliente = clientes.find(c => c.cedula === clienteSeleccionado);
      const vehiculoCompleto = {
        ...newVehiculo,
        clienteCedula: cliente?.cedula || "",
        clienteNombre: cliente?.nombre || "",
      };
      const updated = await apiVehiculos.create(vehiculoCompleto);
      setVehiculos(updated);
      setShowFormAgregar(false);
      setNewVehiculo({ marca: "", modelo: "", anoVehiculo: "", placa: "", tipo: "" });
      setTextoCliente("");
      setTextoVehiculo("");
    } catch (e) {
      alert(e.message);
    }
  };

  /* === EDITAR VEHÍCULO === */
  const guardarEdicion = async () => {
    if (!selected) return;
    if (!selected.placa.trim() || !selected.marca.trim()) {
      alert("Placa y marca son obligatorias.");
      return;
    }

    try {
      await apiVehiculos.update(selected.placa, selected);
      setVehiculos(
        vehiculos.map(v => (v.placa === selected.placa ? selected : v))
      );
      setShowFormEditar(false);
    } catch (e) {
      alert(e.message);
    }
  };

  /* === ELIMINAR VEHÍCULO === */
  /* === ELIMINAR VEHÍCULO === */
const eliminarVehiculo = async (vehiculo) => {
  if (!session) return;

  // Si no es admin, enviar reporte automático
  if (session.rol !== "admin") {
    try {
      const reporte = {
        usuario: session.nombre || "Desconocido",
        tipo: "Vehiculos",
        descripcion: `Intento de eliminar vehículo con placa ${vehiculo.placa}`,
        fecha: new Date().toISOString(),
      };

      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reporte),
      });

      if (!res.ok) throw new Error("Error al enviar reporte");

      alert("Se ha enviado el reporte");
      return; // No continuar con eliminación
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar el reporte.");
      return;
    }
  }

  // Admin puede eliminar
  if (!confirm("¿Seguro que deseas eliminar este vehículo?")) return;

  try {
    const updated = await apiVehiculos.remove(vehiculo.placa);
    setVehiculos(updated);
    setSelectedVehiculos(null);
  } catch (e) {
    alert(e.message);
  }
};


  /* === FILTRAR VEHÍCULOS === */
  const vehiculosFiltrados = vehiculos.filter(
    (v) =>
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      v.modelo.toLowerCase().includes(search.toLowerCase()) ||
      (v.marca && v.marca.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="gestion-vehiculos">
      <h2>Gestión de Vehículos</h2>

      {/* BARRA DE BÚSQUEDA */}
      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar vehículo..."
          value={search}
          onChange={(e) => setSearchVehiculos(e.target.value)}
        />
        <button className="btn btn-add" onClick={() => setShowFormAgregar(true)}>
          Agregar Vehículo
        </button>
      </div>

      <ul className="vehiculo-list">
        {vehiculosFiltrados.map((v) => (
          <li
            key={v.placa}
            onClick={() => setSelectedVehiculos(v)}
            className={selected?.placa === v.placa ? "selected" : ""}
          >
            {v.placa} ({v.tipo}) - Cliente: {v.clienteCedula || "No asignado"}
          </li>
        ))}
      </ul>

      {/* MODAL AGREGAR */}
      {showFormAgregar && (
        <div className="modal-overlay" onClick={() => setShowFormAgregar(false)}>
          <div className="modal modal-agregar" onClick={(e) => e.stopPropagation()}>
            <h3>Agregar Vehículo</h3>

            {/* Cliente */}
            <div className="selector-cliente">
              <label><b>Seleccionar cliente:</b></label>
              <input
                type="text"
                className="input-busqueda-clientes"
                placeholder="Escribe o selecciona un cliente..."
                value={textoCliente}
                onChange={(e) => setTextoCliente(e.target.value)}
                onFocus={() => setMostrarListaClientes(true)}
                onBlur={() => setTimeout(() => setMostrarListaClientes(false), 200)}
              />
              {mostrarListaClientes && textoCliente && (
                <ul className="lista-clientes">
                  {clientes
                    .filter((c) =>
                      `${c.nombre} ${c.cedula}`.toLowerCase().includes(textoCliente.toLowerCase())
                    )
                    .map((c) => (
                      <li
                        key={c.cedula}
                        onClick={() => {
                          setClienteSeleccionado(c.cedula);
                          setTextoCliente(`${c.nombre} - ${c.cedula}`);
                          setMostrarListaClientes(false);
                        }}
                      >
                        {c.nombre} - {c.cedula}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Vehículo base */}
            <div className="selector-vehiculo">
              <label><b>Seleccionar vehículo:</b></label>
              <input
                type="text"
                className="input-busqueda-vehiculos"
                placeholder="Buscar tipo o modelo..."
                value={textoVehiculo}
                onChange={(e) => setTextoVehiculo(e.target.value)}
                onFocus={() => setMostrarListaVehiculos(true)}
                onBlur={() => setTimeout(() => setMostrarListaVehiculos(false), 200)}
              />
              {mostrarListaVehiculos && textoVehiculo && (
                <ul className="lista-vehiculos">
                  {vehiculosBase
                    .filter((v) =>
                      `${v.marca} ${v.modelo} ${v.tipo} ${v.anoVehiculo ?? ""}`
                        .toLowerCase()
                        .includes(textoVehiculo.toLowerCase())
                    )
                    .map((v) => (
                      <li
                        key={v.id}
                        onClick={() => {
                          setNewVehiculo({
                            ...newVehiculo,
                            tipo: v.tipo,
                            marca: v.marca,
                            modelo: v.modelo,
                            anoVehiculo: v.anoVehiculo
                          });
                          setTextoVehiculo(`${v.marca} ${v.modelo} ${v.anoVehiculo ?? ""} (${v.tipo})`);
                          setMostrarListaVehiculos(false);
                        }}
                      >
                        {v.marca} {v.modelo} {v.anoVehiculo ?? ""} ({v.tipo})
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Datos adicionales */}
            <input
              placeholder="Placa"
              value={newVehiculo.placa}
              onChange={(e) =>
                setNewVehiculo({ ...newVehiculo, placa: e.target.value })
              }
            />

            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-add" onClick={agregarVehiculo}>Guardar</button>
              <button
                className="btn btn-close"
                onClick={() => {
                  resetFormularioVehiculo();
                  setShowFormAgregar(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelectedVehiculos(null)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Información del Vehículo</h3>
            <p><b>Placa:</b> {selected.placa}</p>
            <p><b>Marca:</b> {selected.marca}</p>
            <p><b>Modelo:</b> {selected.modelo}</p>
            <p><b>Tipo:</b> {selected.tipo}</p>
            <p><b>anoVehiculo:</b> {selected.anoVehiculo || "N/A"}</p>
            <p><b>Cédula Cliente:</b> {selected.clienteCedula || "No asignado"}</p>

            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-edit" onClick={() => setShowFormEditar(true)}>Modificar</button>
              <button className="btn btn-delete" onClick={() => eliminarVehiculo(selected.placa)}>Eliminar</button>
              <button className="btn btn-close" onClick={() => setSelectedVehiculos(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showFormEditar && selected && (
        <div className="modal-overlay" onClick={() => setShowFormEditar(false)}>
          <div className="modal modal-editar" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Vehículo</h3>
            <label><b>Placa:</b></label>
            <input
              value={selected.placa}
              onChange={(e) => setSelectedVehiculos({ ...selected, placa: e.target.value })}
            />
            <label><b>anoVehiculo:</b></label>
            <input
              value={selected.anoVehiculo}
              onChange={(e) => setSelectedVehiculos({ ...selected, anoVehiculo: e.target.value })}
            />
            <label><b>Modelo:</b></label>
            <input
              value={selected.modelo}
              onChange={(e) => setSelectedVehiculos({ ...selected, modelo: e.target.value })}
            />
            <label><b>Marca:</b></label>
            <input
              value={selected.marca}
              onChange={(e) => setSelectedVehiculos({ ...selected, marca: e.target.value })}
            />
            <label><b>Tipo:</b></label>
            <input
              value={selected.tipo}
              onChange={(e) => setSelectedVehiculos({ ...selected, tipo: e.target.value })}
            />
            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-add" onClick={guardarEdicion}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowFormEditar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionVehiculos;

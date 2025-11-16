import React, { useState, useEffect } from "react";
import "./App.css";

const apiInventario = {
  // 🔹 Obtener todos los repuestos
  getAll: async () => {
    const res = await fetch("/api/inventario");
    if (!res.ok) throw new Error("Error al obtener inventario");
    return res.json();
  },

  // 🔹 Crear un nuevo repuesto
  create: async (objeto) => {
    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objeto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al agregar repuesto");
    }
    return res.json();
  },

  // 🔹 Actualizar repuesto por código
  update: async (codigo, objeto) => {
    const res = await fetch(`/api/inventario/${codigo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objeto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar repuesto");
    }
    return res.json();
  },

  // 🔹 Eliminar repuesto por código ✅
  remove: async (codigo) => {
    const res = await fetch(`/api/inventario/${codigo}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al eliminar repuesto");
    }
    return res.json();
  },
};

function GestionInventario({ session }) {
  const [inventario, setInventario] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [search, setSearchInventario] = useState("");
  const [selected, setSelectedInventario] = useState(null);
  const [showFormAgregar, setShowFormAgregar] = useState(false);
  const [showFormEditar, setShowFormEditar] = useState(false);
  const [textoVehiculo, setTextoVehiculo] = useState("");
  const [mostrarListaVehiculos, setMostrarListaVehiculos] = useState(false);
  const [vehiculoExpandido, setVehiculoExpandido] = useState(null);
  const [editandoRepuesto, setEditandoRepuesto] = useState(null);
  const [showFormVehiculo, setShowFormVehiculo] = useState(false);
  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    tipo: "",
    marca: "",
    modelo: "",
    anoVehiculo: "",
  });

  const [newRepuesto, setNewRepuesto] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    cantidad: 0,
    precio: 0,
    vehiculoId: null, // null = repuesto universal
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [invData, vehRes] = await Promise.all([
          apiInventario.getAll(),
          fetch("/api/vehiculosBase")
        ]);
        const vehData = await vehRes.json();
        setInventario(invData);
        setVehiculos(vehData);
      } catch (e) {
        alert("Error al cargar datos: " + e.message);
      }
    };
    cargarDatos();
  }, []);

  const textoBusqueda = search.toLowerCase();

  // Repuestos universales que coinciden con la búsqueda
  const repuestosUniversales = inventario.filter(
    (r) => !r.vehiculoId && r.nombre.toLowerCase().includes(textoBusqueda)
  );

  // Vehículos filtrados por búsqueda de marca/modelo/tipo o repuestos que coincidan
  const vehiculosFiltrados = vehiculos.filter((v) => {
    const nombreVehiculo = `${v.marca} ${v.modelo} ${v.tipo}`.toLowerCase();

    // Todos los repuestos de este vehículo
    const repuestosDelVehiculo = inventario.filter((r) => r.vehiculoId === v.id);

    // ¿Algún repuesto coincide con la búsqueda?
    const repuestosCoinciden = repuestosDelVehiculo.some((r) =>
      r.nombre.toLowerCase().includes(textoBusqueda)
    );

    // Mostrar vehículo si: coincide la marca/modelo/tipo O algún repuesto coincide
    return nombreVehiculo.includes(textoBusqueda) || repuestosCoinciden;
  });

  // Función para obtener repuestos filtrados para un vehículo
  const repuestosPorVehiculo = (v) => {
    const nombreVehiculo = `${v.marca} ${v.modelo} ${v.tipo}`.toLowerCase();
    const todosRepuestos = inventario.filter((r) => r.vehiculoId === v.id);

    // Si el vehículo coincide con la búsqueda, mostramos todos sus repuestos
    if (nombreVehiculo.includes(textoBusqueda)) return todosRepuestos;

    // Si no, mostramos solo los repuestos que coincidan con la búsqueda
    return todosRepuestos.filter((r) =>
      r.nombre.toLowerCase().includes(textoBusqueda)
    );
  };

  // Verificar si no hay repuestos para mostrar
  const noHayRepuestos = repuestosUniversales.length === 0 && vehiculosFiltrados.length === 0;
  
  // === AGREGAR REPUESTO ===
  const agregarRepuesto = async () => {
    if (!newRepuesto.codigo || !newRepuesto.nombre) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }

    try {
      const data = await apiInventario.create(newRepuesto);
      setInventario([...inventario, data]);
      setNewRepuesto({
        codigo: "",
        nombre: "",
        descripcion: "",
        cantidad: 0,
        precio: 0,
        vehiculoId: null,
      });
      setShowFormAgregar(false);
    } catch (e) {
      alert(e.message);
    }
  };

  // === AGREGAR VEHICULO ===
  const agregarVehiculo = async () => {
    if (!nuevoVehiculo.tipo || !nuevoVehiculo.marca || !nuevoVehiculo.modelo || !nuevoVehiculo.anoVehiculo) {
      alert("Por favor completa todos los campos del vehículo.");
      return;
    }

    try {
      const res = await fetch("/api/vehiculosBase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoVehiculo),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVehiculos((prev) => [...prev, data]); // ✅ Actualiza la lista local
      setNuevoVehiculo({ tipo: "", marca: "", modelo: "", anoVehiculo: "" });
      setShowFormVehiculo(false);

      alert("Vehículo agregado correctamente");
    } catch (e) {
      alert("Error al agregar el vehículo: " + e.message);
    }
  };

  // === EDITAR REPUESTO ===
  const guardarEdicion = async () => {
    if (!editandoRepuesto) return;
    try {
      // 🔹 Actualiza el repuesto en el backend
      const data = await apiInventario.update(editandoRepuesto.codigo, editandoRepuesto);

      // 🔄 Actualiza lista local sin recargar todo
      setInventario((prev) =>
        prev.map((r) => (r.codigo === editandoRepuesto.codigo ? data : r))
      );

      // 🔹 Actualiza también el seleccionado (para que el modal muestre los datos nuevos)
      setSelectedInventario(data);

      setShowFormEditar(false);
    } catch (e) {
      alert("Error al actualizar: " + e.message);
    }
  };

  // === ELIMINAR REPUESTO ===
  const eliminarRepuesto = async (codigo) => {
    if (!session || session.rol !== "admin") {
      alert("No tienes permiso para eliminar repuestos.");
      return;
    }

    if (!confirm("¿Seguro que deseas eliminar este repuesto?")) return;

    try {
      await apiInventario.remove(codigo);

      // 🔄 Actualiza la lista local eliminando el repuesto
      setInventario((prev) => prev.filter((r) => r.codigo !== codigo));

      // 🔹 Si el repuesto eliminado estaba seleccionado, deseleccionarlo
      if (selected?.codigo === codigo) {
        setSelectedInventario(null);
      }
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  return (
    <div className="gestion-inventario">
      <h2>Gestión de Inventario</h2>

      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar repuesto o vehículo..."
          value={search}
          onChange={(e) => setSearchInventario(e.target.value)}
        />

        {session?.rol === "admin" && (
          <button className="btn btn-add" onClick={() => setShowFormAgregar(true)}>
            Agregar Repuesto
          </button>
        )}

        <button className="btn btn-add" onClick={() => setShowFormVehiculo(true)}>
          Agregar Vehículo
        </button>
      </div>

      {/* === LISTA AGRUPADA (ESTILO IDÉNTICO A InventarioUsuarioNormal) === */}
      <ul className="inventario-list">
        {noHayRepuestos ? (
          // Mensaje cuando no hay repuestos
          <li className="no-repuestos">
            No hay repuestos agregados
          </li>
        ) : (
          <>
            {/* 🔧 REPUESTOS UNIVERSALES */}
            {repuestosUniversales.length > 0 && (
              <>
                <li className="categoria"><b>🔧 Repuestos Universales</b></li>
                {repuestosUniversales.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => setSelectedInventario(r)}
                    className={`item-sub-lista ${selected?.id === r.id ? "selected" : ""}`}
                  >
                    {r.nombre}
                  </li>
                ))}
              </>
            )}

            {/* 🚗 MODELOS - TÍTULO SEPARADOR */}
            {vehiculosFiltrados.length > 0 && (
              <li className="categoria" style={{ marginTop: '20px' }}><b>🚗 Modelos de Vehiculos</b></li>
            )}

            {/* VEHÍCULOS Y SUS REPUESTOS FILTRADOS */}
            {vehiculosFiltrados.map((v) => {
              const repuestos = repuestosPorVehiculo(v);

              return (
                <li key={v.id} className="categoria">
                  <div
                    onClick={() =>
                      setVehiculoExpandido((prev) => (prev === v.id ? null : v.id))
                    }
                    className="item-principal"
                    style={{ cursor: "pointer", marginTop: 10 }}
                  >
                    {v.marca} {v.modelo} ({v.tipo})
                  </div>

                  {vehiculoExpandido === v.id && (
                    <ul className="sub-lista">
                      {repuestos.length === 0 ? (
                        // Mensaje cuando no hay repuestos para este vehículo
                        <li className="no-repuestos-vehiculo">
                          No hay repuestos disponibles para este vehículo
                        </li>
                      ) : (
                        repuestos.map((r) => (
                          <li
                            key={r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInventario(r);
                            }}
                            className={`item-sub-lista ${selected?.id === r.id ? "selected" : ""}`}
                          >
                            {r.nombre}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </>
        )}
      </ul>

      {/* MODAL AGREGAR VEHÍCULO */}
      {showFormVehiculo && (
        <div className="modal-overlay" onClick={() => setShowFormVehiculo(false)}>
          <div className="modal modal-agregar" onClick={(e) => e.stopPropagation()}>
            <h3>Agregar Vehículo</h3>

            <input
              placeholder="Tipo (Ej: Automóvil)"
              value={nuevoVehiculo.tipo}
              onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, tipo: e.target.value })}
            />
            <input
              placeholder="Marca (Ej: Toyota)"
              value={nuevoVehiculo.marca}
              onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, marca: e.target.value })}
            />
            <input
              placeholder="Modelo (Ej: Corolla)"
              value={nuevoVehiculo.modelo}
              onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })}
            />
            <input
              type="number"
              placeholder="Año (Ej: 2020)"
              value={nuevoVehiculo.anoVehiculo}
              onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, anoVehiculo: e.target.value })}
            />

            <div className="btn-group">
              <button className="btn btn-add" onClick={agregarVehiculo}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowFormVehiculo(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {showFormAgregar && (
        <div className="modal-overlay" onClick={() => setShowFormAgregar(false)}>
          <div className="modal modal-agregar" onClick={(e) => e.stopPropagation()}>
            <h3>Agregar Repuesto</h3>
            <input
              placeholder="Codigo"
              value={newRepuesto.codigo}
              onChange={(e) => setNewRepuesto({ ...newRepuesto, codigo: e.target.value })}
            />
            <input
              placeholder="Nombre"
              value={newRepuesto.nombre}
              onChange={(e) => setNewRepuesto({ ...newRepuesto, nombre: e.target.value })}
            />
            <input
              placeholder="Descripción"
              value={newRepuesto.descripcion}
              onChange={(e) => setNewRepuesto({ ...newRepuesto, descripcion: e.target.value })}
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={newRepuesto.cantidad}
              onChange={(e) => setNewRepuesto({ ...newRepuesto, cantidad: e.target.value })}
            />
            <input
              type="number"
              placeholder="Precio"
              value={newRepuesto.precio}
              onChange={(e) => setNewRepuesto({ ...newRepuesto, precio: e.target.value })}
            />

            {/* Seleccionar vehículo (opcional) */}
            <div className="selector-vehiculo">
              <label><b>Asignar a vehículo (opcional):</b></label>
              <input
                type="text"
                placeholder="Buscar vehículo..."
                value={textoVehiculo}
                onChange={(e) => setTextoVehiculo(e.target.value)}
                onFocus={() => setMostrarListaVehiculos(true)}
                onBlur={() => setTimeout(() => setMostrarListaVehiculos(false), 200)}
              />
              {mostrarListaVehiculos && textoVehiculo && (
                <ul className="lista-vehiculos">
                  {vehiculos
                    .filter((v) =>
                      `${v.marca} ${v.modelo} ${v.tipo}`.toLowerCase().includes(textoVehiculo.toLowerCase())
                    )
                    .map((v) => (
                      <li
                        key={v.id}
                        onClick={() => {
                          setNewRepuesto({ ...newRepuesto, vehiculoId: v.id });
                          setTextoVehiculo(`${v.marca} ${v.modelo} (${v.tipo})`);
                          setMostrarListaVehiculos(false);
                        }}
                      >
                        {v.marca} {v.modelo} ({v.tipo})
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="btn-group">
              <button className="btn btn-add" onClick={agregarRepuesto}>Guardar</button>
              <button className="btn btn-close" onClick={() => setShowFormAgregar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelectedInventario(null)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Información del Repuesto</h3>
            <p><b>Nombre:</b> {selected.nombre}</p>
            <p><b>Cantidad:</b> {selected.cantidad}</p>
            <p><b>Precio:</b> {selected.precio}</p>
            <p><b>Descripción:</b> {selected.descripcion}</p>
            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                className="btn btn-edit"
                onClick={() => {
                  setEditandoRepuesto({ ...selected });
                  setShowFormEditar(true);
                }}
              >
                Modificar
              </button>
              <button className="btn btn-delete" onClick={() => eliminarRepuesto(selected.codigo)}>Eliminar</button>
              <button className="btn btn-close" onClick={() => setSelectedInventario(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showFormEditar && editandoRepuesto && (
        <div className="modal-overlay" onClick={() => setShowFormEditar(false)}>
          <div className="modal modal-editar" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Repuesto</h3>

            <label><b>Nombre</b></label>
            <input
              value={editandoRepuesto.nombre}
              onChange={(e) =>
                setEditandoRepuesto({ ...editandoRepuesto, nombre: e.target.value })
              }
            />

            <label><b>Descripción</b></label>
            <input
              value={editandoRepuesto.descripcion}
              onChange={(e) =>
                setEditandoRepuesto({ ...editandoRepuesto, descripcion: e.target.value })
              }
            />

            <label><b>Cantidad</b></label>
            <input
              type="number"
              value={editandoRepuesto.cantidad}
              onChange={(e) =>
                setEditandoRepuesto({ ...editandoRepuesto, cantidad: e.target.value })
              }
            />

            <label><b>Precio</b></label>
            <input
              type="number"
              value={editandoRepuesto.precio}
              onChange={(e) =>
                setEditandoRepuesto({ ...editandoRepuesto, precio: e.target.value })
              }
            />

            <div className="btn-group" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-add" onClick={guardarEdicion}>
                Guardar
              </button>
              <button className="btn btn-close" onClick={() => setShowFormEditar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionInventario;
import React, { useState, useEffect } from "react";
import "./App.css";

const apiInventario = {
  getAll: async () => {
    const res = await fetch("/api/inventario");
    if (!res.ok) throw new Error("Error al obtener inventario");
    return res.json();
  },
};

function InventarioUsuarioNormal() {
  const [inventario, setInventario] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [search, setSearchInventario] = useState("");
  const [selected, setSelectedInventario] = useState(null);
  const [vehiculoExpandido, setVehiculoExpandido] = useState(null);

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

  return (
    <div className="gestion-inventario">
      <h2>Inventario de Repuestos</h2>

      <div className="search-add-container">
        <input
          className="search-bar"
          placeholder="Buscar repuesto o vehículo..."
          value={search}
          onChange={(e) => setSearchInventario(e.target.value)}
        />
      </div>

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

      {/* MODAL DETALLE */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelectedInventario(null)}>
          <div className="modal modal-lista" onClick={(e) => e.stopPropagation()}>
            <h3>Información del Repuesto</h3>
            <p><b>Nombre:</b> {selected.nombre}</p>
            <p><b>Cantidad:</b> {selected.cantidad}</p>
            <p><b>Precio:</b> {selected.precio}</p>
            <p><b>Descripción:</b> {selected.descripcion}</p>
            <button className="btn btn-close" onClick={() => setSelectedInventario(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventarioUsuarioNormal;
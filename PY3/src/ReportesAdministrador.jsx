import React, { useEffect, useState } from "react";
import "./App.css";

function ReportesAdministrador({ session }) {
  const [reportes, setReportes] = useState([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [orden, setOrden] = useState("nuevo");
  const [tipoExpandido, setTipoExpandido] = useState(null);
  const [selected, setSelected] = useState(null);

  // ⚠️ Solo visible para administradores
  if (!session || session.rol !== "admin") {
    return (
      <div className="reportes-admin">
        <h2>Acceso restringido</h2>
        <p>Solo los administradores pueden ver los reportes.</p>
      </div>
    );
  }

  // 🔄 Cargar reportes desde la API
  useEffect(() => {
    const obtenerReportes = async () => {
      try {
        const query = new URLSearchParams({
          orden,
          usuario: filtroUsuario || "",
        }).toString();

        const res = await fetch(`/api/reportes?${query}`);
        if (!res.ok) throw new Error("Error al obtener reportes");
        const data = await res.json();
        setReportes(data);
      } catch (error) {
        console.error("Error cargando reportes:", error);
        alert("No se pudieron cargar los reportes.");
      }
    };

    obtenerReportes();
  }, [orden, filtroUsuario]);

  // Agrupar por tipo
  const tipos = ["Clientes", "Vehiculos", "Inventario"];
  const reportesPorTipo = tipos.map((tipo) => ({
    tipo,
    lista: reportes.filter((r) => r.tipo === tipo),
  }));

  // Verificar si no hay reportes
  const noHayReportes = reportes.length === 0;

  return (
    <div className="reportes-usuario">
      <h2>Panel de Reportes</h2>

      {/* Filtros */}
      <div className="filtros-reportes">
        <input
          type="text"
          placeholder="Buscar por usuario..."
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="filtro-input"
        />

        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="filtro-select"
        >
          <option value="nuevo">Más nuevos primero</option>
          <option value="antiguo">Más antiguos primero</option>
        </select>
      </div>

      {/* Lista agrupada - ESTILO IDÉNTICO A INVENTARIO */}
      <ul className="lista-reportes-admin">
        {noHayReportes ? (
          // Mensaje cuando no hay reportes
          <li className="no-reportes">
            No hay reportes disponibles
          </li>
        ) : (
          reportesPorTipo.map((grupo) => (
            <li key={grupo.tipo} className="categoria">
              <div
                onClick={() =>
                  setTipoExpandido((prev) =>
                    prev === grupo.tipo ? null : grupo.tipo
                  )
                }
                className="item-principal"
                style={{ cursor: "pointer", marginTop: 10 }}
              >
                {grupo.tipo} ({grupo.lista.length})
              </div>

              {tipoExpandido === grupo.tipo && (
                <ul className="sub-lista">
                  {grupo.lista.length === 0 ? (
                    // Mensaje cuando no hay reportes para esta categoría
                    <li className="no-reportes-vehiculo">
                      No hay reportes en esta categoría
                    </li>
                  ) : (
                    grupo.lista.map((r) => (
                      <li
                        key={r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r);
                        }}
                        className={`item-sub-lista ${selected?.id === r.id ? "selected" : ""}`}
                      >
                        {r.usuario} — {new Date(r.fecha).toLocaleString("es-CR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          ))
        )}
      </ul>

      {/* Modal Detalle */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📄 Detalle del Reporte</h3>
            <p><b>Tipo:</b> {selected.tipo}</p>
            <p><b>Usuario:</b> {selected.usuario}</p>
            <p><b>Reporte:</b> {selected.descripcion}</p>
            <p><b>Fecha:</b> {new Date(selected.fecha).toLocaleString("es-CR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })}</p>
            <button className="btn-close" onClick={() => setSelected(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportesAdministrador;
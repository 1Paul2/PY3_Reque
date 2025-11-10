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

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const d = new Date(fecha);
    if (isNaN(d)) return "Fecha inválida";
    return d.toLocaleString("es-CR", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    });
  };

  return (
    <div className="reportes-admin">
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

      {/* Lista agrupada */}
      <ul className="lista-reportes-admin">
        {reportesPorTipo.map((grupo) => (
          <li key={grupo.tipo} className="categoria-reportes">
            <div
              onClick={() =>
                setTipoExpandido((prev) =>
                  prev === grupo.tipo ? null : grupo.tipo
                )
              }
              className="categoria-titulo"
            >
              {grupo.tipo} ({grupo.lista.length})
            </div>

            {tipoExpandido === grupo.tipo && (
              <ul className="sublista-reportes">
                {grupo.lista.length === 0 ? (
                  <li className="sin-reportes">No hay reportes</li>
                ) : (
                  grupo.lista.map((r) => (
                    <li
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="reporte-item"
                    >
                    {r.usuario} — {formatearFecha(r.fecha)}
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>
        ))}
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

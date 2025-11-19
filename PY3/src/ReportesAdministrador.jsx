import React, { useEffect, useState } from "react";
import "./App.css";

function ReportesAdministrador({ session }) {
  const [reportes, setReportes] = useState([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [orden, setOrden] = useState("nuevo");
  const [tipoExpandido, setTipoExpandido] = useState(null);
  const [selected, setSelected] = useState(null);
  const [estadoReporte, setEstadoReporte] = useState("pendiente");

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

  useEffect(() => {
    obtenerReportes();
  }, [orden, filtroUsuario]);

  // 🔽 ACTUALIZAR ESTADO DEL REPORTE
  const actualizarEstadoReporte = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`/api/reportes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) throw new Error("Error al actualizar reporte");

      // 🔄 ACTUALIZAR LISTA INMEDIATAMENTE
      await obtenerReportes();
      
      if (nuevoEstado === "atendido") {
        setSelected(null); // Cerrar modal si se marca como atendido
        alert("Reporte marcado como atendido y eliminado de la lista");
      } else {
        setEstadoReporte(nuevoEstado);
        alert("Estado del reporte actualizado");
      }
    } catch (error) {
      console.error("Error actualizando reporte:", error);
      alert("No se pudo actualizar el reporte.");
    }
  };

  // 🔽 AGREGAR LAS NUEVAS CATEGORÍAS
  const tipos = [
    "Clientes", 
    "Vehiculos", 
    "Inventario", 
    "Citas", 
    "OrdenTrabajos", 
    "Cotizacion"
  ];

  const reportesPorTipo = tipos.map((tipo) => ({
    tipo,
    lista: reportes.filter((r) => r.tipo === tipo && r.estado !== "atendido"),
  }));

  // 🔽 FUNCIÓN PARA FORMATEAR NOMBRES MÁS LEGIBLES
  const formatearTipo = (tipo) => {
    const formatos = {
      "Clientes": "Clientes",
      "Vehiculos": "Vehículos",
      "Inventario": "Inventario",
      "Citas": "Citas",
      "OrdenTrabajos": "Orden de Trabajos",
      "Cotizacion": "Cotización"
    };
    return formatos[tipo] || tipo;
  };

  return (
    <div className="reportes-admin">
      <h2>Gestion de Reportes</h2>

      {/* Filtros */}
      <div className="filtros-reportes">
        <input
          type="text"
          placeholder="Buscar por usuario..."
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="filtro-input"
        />

        {/* 1️⃣ BOTÓN CON ESTADO VISUAL */}
        <button
          onClick={() => setOrden(orden === "nuevo" ? "antiguo" : "nuevo")}
          className={`btn-orden ${orden === "nuevo" ? "btn-orden-activo" : "btn-orden-inactivo"}`}
        >
          {orden === "nuevo" ? "⬇ Más nuevos" : "⬆ Más antiguos"}
        </button>
      </div>

      {/* Lista agrupada - ESTILO IDÉNTICO A INVENTARIO */}
      <ul className="lista-reportes-admin">
        {/* SIMPLEMENTE MOSTRAR LA LISTA, SIN MENSAJE DE "NO HAY REPORTES" */}
        {reportesPorTipo.map((grupo) => (
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
              {formatearTipo(grupo.tipo)} ({grupo.lista.length})
            </div>

            {tipoExpandido === grupo.tipo && (
              <ul className="sub-lista">
                {grupo.lista.length === 0 ? (
                  // Mensaje cuando no hay reportes para esta categoría específica
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
                        setEstadoReporte(r.estado || "pendiente");
                      }}
                      className={`item-sub-lista ${selected?.id === r.id ? "selected" : ""}`}
                    >
                      <span className={`estado-indicador estado-${r.estado || "pendiente"}`}>
                        ●
                      </span>
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
        ))}
      </ul>

      {/* 3️⃣ MODAL CON ESTADO Y ACCIONES */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📄 Detalle del Reporte</h3>
            
            <div className="estado-container">
              <label><b>Estado:</b></label>
              <select 
                value={estadoReporte}
                onChange={(e) => setEstadoReporte(e.target.value)}
                className={`select-estado estado-${estadoReporte}`}
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="en-proceso">🔄 En Proceso</option>
                <option value="atendido">✅ Atendido</option>
              </select>
            </div>

            <p><b>Tipo:</b> {formatearTipo(selected.tipo)}</p>
            <p><b>Usuario:</b> {selected.usuario}</p>
            <p><b>Reporte:</b> {selected.descripcion}</p>
            <p><b>Fecha:</b> {new Date(selected.fecha).toLocaleString("es-CR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })}</p>
            
            <div className="modal-botones">
              <button 
                className="btn-guardar"
                onClick={() => actualizarEstadoReporte(selected.id, estadoReporte)}
              >
                Guardar Estado
              </button>
              <button 
                className="btn-atendido"
                onClick={() => actualizarEstadoReporte(selected.id, "atendido")}
              >
                ✅ Marcar como Atendido
              </button>
              <button className="btn-close" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportesAdministrador;
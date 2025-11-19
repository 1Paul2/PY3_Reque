import React, { useState, useEffect } from "react";
import "./App.css";

function ReportesUsuario({ session }) {
  const [tipoReporte, setTipoReporte] = useState("Clientes");
  const [mensaje, setMensaje] = useState("");
  const [reportesUsuario, setReportesUsuario] = useState([]);
  const [tipoExpandido, setTipoExpandido] = useState(null);
  const [selected, setSelected] = useState(null);

  // 🔽 TODAS LAS CATEGORÍAS INCLUIDAS
  const tiposReporte = [
    "Clientes", 
    "Vehiculos", 
    "Inventario", 
    "Citas", 
    "OrdenTrabajos", 
    "Cotizacion"
  ];

  // 🔽 FUNCIÓN PARA NOMBRES MÁS LEGIBLES
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

  // 🔄 Cargar reportes del usuario desde la API
  const obtenerReportesUsuario = async () => {
    try {
      const res = await fetch(`/api/reportes`);
      if (!res.ok) throw new Error("Error al obtener reportes");
      const data = await res.json();
      
      // Filtrar solo los reportes del usuario actual Y los atendidos
      const reportesFiltrados = data.filter(r => 
        r.usuario === session?.nombre || r.estado === "atendido"
      );
      
      setReportesUsuario(reportesFiltrados);
    } catch (error) {
      console.error("Error cargando reportes:", error);
    }
  };

  useEffect(() => {
    obtenerReportesUsuario();
  }, [session]);

  const handleEnviar = async () => {
    if (!mensaje.trim()) {
      alert("El mensaje no puede estar vacío.");
      return;
    }

    const reporte = {
      usuario: session?.nombre || "Desconocido",
      tipo: tipoReporte,
      descripcion: mensaje,
      fecha: new Date().toISOString(),
      estado: "pendiente"
    };

    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reporte),
      });

      if (!res.ok) throw new Error("Error al enviar reporte");

      const data = await res.json();
      alert(`✅ Reporte enviado correctamente a ${formatearTipo(tipoReporte)}`);
      console.log("Reporte guardado:", data);

      setMensaje("");
      // 🔄 ACTUALIZAR LA LISTA DESPUÉS DE ENVIAR
      await obtenerReportesUsuario();
    } catch (err) {
      console.error("Error enviando reporte:", err);
      alert("❌ No se pudo enviar el reporte.");
    }
  };

  // 🔽 AGRUPAR REPORTES POR TIPO
  const reportesPorTipo = tiposReporte.map((tipo) => ({
    tipo,
    lista: reportesUsuario.filter((r) => r.tipo === tipo),
  }));

  return (
    <div className="reportes-usuario">
      <h2>Gestion de Reportes</h2>
      
      {/* CONTENEDOR SCROLLABLE INTERNO */}
      <div className="contenido-scrollable">
        
        {/* SECCIÓN PARA ENVIAR NUEVOS REPORTES - COMPACTA */}
        <div className="seccion-envio">
          {/* Contenedor de botones */}
          <div className="search-add-container">
            <div style={{ flex: 1 }}></div>
            
            {/* Botones de tipo */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tiposReporte.map((tipo) => (
                <button
                  key={tipo}
                  className={`btn ${tipoReporte === tipo ? "btn-selected" : ""}`}
                  onClick={() => setTipoReporte(tipo)}
                >
                  {formatearTipo(tipo)}
                </button>
              ))}
            </div>
          </div>

          {/* Área de texto compacta */}
          <textarea
            placeholder={`Escribe tu mensaje para ${formatearTipo(tipoReporte)}...`}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows="3"
          />

          {/* Botón enviar */}
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <button className="btn-enviar" onClick={handleEnviar}>
              Enviar a {formatearTipo(tipoReporte)}
            </button>
          </div>
        </div>

        {/* SECCIÓN PARA VER REPORTES - CON SCROLL INTERNO */}
        <div className="seccion-lista">
          <h3>Mis Reportes y Respuestas</h3>
          
          {/* Contenedor con scroll interno */}
          <div className="contenedor-lista-scroll">
            <ul className="lista-reportes-admin">
              {reportesPorTipo.map((grupo) => (
                grupo.lista.length > 0 && (
                  <li key={grupo.tipo} className="categoria">
                    <div
                      onClick={() =>
                        setTipoExpandido((prev) =>
                          prev === grupo.tipo ? null : grupo.tipo
                        )
                      }
                      className="item-principal"
                    >
                      {formatearTipo(grupo.tipo)} ({grupo.lista.length})
                    </div>

                    {tipoExpandido === grupo.tipo && (
                      <ul className="sub-lista">
                        {grupo.lista.map((r) => (
                          <li
                            key={r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}
                            className={`item-sub-lista ${selected?.id === r.id ? "selected" : ""}`}
                          >
                            <span className={`estado-indicador estado-${r.estado || "pendiente"}`}>
                              ●
                            </span>
                            <span style={{ flex: 1 }}>
                              {r.usuario} — {new Date(r.fecha).toLocaleString("es-CR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {r.estado === "atendido" && (
                              <span style={{ 
                                color: "#28a745", 
                                fontSize: "11px", 
                                fontWeight: "bold",
                                marginLeft: "8px"
                              }}>
                                ✅ RESPONDIDO
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              ))}
            </ul>

            {/* Mensaje si no hay reportes */}
            {reportesUsuario.length === 0 && (
              <div className="no-reportes">
                No tienes reportes enviados ni respuestas disponibles.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detalle (SIMPLIFICADO - SOLO LECTURA) */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selected.estado === "atendido" ? "✅ Reporte Atendido" : "📄 Detalle del Reporte"}
            </h3>
            
            {/* 🔽 SOLO MUESTRA EL ESTADO COMO TEXTO SIMPLE */}
            <p><b>Estado:</b> 
              <span style={{ 
                color: selected.estado === "atendido" ? "#28a745" : "#ffc107",
                fontWeight: "bold",
                marginLeft: "8px"
              }}>
                {selected.estado === "atendido" ? "✅ ATENDIDO" : "⏳ PENDIENTE"}
              </span>
            </p>

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
            
            <div style={{ marginTop: "20px", textAlign: "center", width: "100%" }}>
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

export default ReportesUsuario;
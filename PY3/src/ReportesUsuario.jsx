import React, { useState } from "react";
import "./App.css";

function ReportesUsuario({ session }) {
  const [tipoReporte, setTipoReporte] = useState("Clientes");
  const [mensaje, setMensaje] = useState("");

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
    };

    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reporte),
      });

      if (!res.ok) throw new Error("Error al enviar reporte");

      const data = await res.json();
      alert(`Reporte enviado correctamente a ${tipoReporte}`);
      console.log("Reporte guardado:", data);

      setMensaje("");
    } catch (err) {
      console.error("Error enviando reporte:", err);
      alert("No se pudo enviar el reporte.");
    }
  };

  return (
    <div className="reportes-usuario">
      <h2>Reportes de Usuario</h2>

      {/* Botones de tipo */}
      <div style={{ marginBottom: 10 }}>
        {["Clientes", "Vehiculos", "Inventario"].map((tipo) => (
          <button
            key={tipo}
            className={`btn ${tipoReporte === tipo ? "btn-selected" : ""}`}
            onClick={() => setTipoReporte(tipo)}
          >
            {tipo}
          </button>
        ))}
      </div>

      {/* Área de texto */}
      <textarea
        placeholder={`Escribe tu mensaje para ${tipoReporte}...`}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
      />

      {/* Botón enviar */}
      <button className="btn-enviar" onClick={handleEnviar}>
        Enviar Reporte
      </button>
    </div>
  );
}

export default ReportesUsuario;

// RegistroAdministrador.jsx
import React, { useState } from "react";

function RegistroAdministrador({ alValidar, onClose, api }) {
  const [usuarioAdmin, setUsuarioAdmin] = useState("");
  const [contrasenaAdmin, setContrasenaAdmin] = useState("");
  const [error, setError] = useState("");

  const manejarEnvio = (e) => {
    e.preventDefault();
    setError("");

    if (!usuarioAdmin.trim() || !contrasenaAdmin.trim()) {
      setError("Debe ingresar usuario y contraseña de administrador");
      return;
    }

    // Intentar login con los datos ingresados
    const resultado = api.login(usuarioAdmin, contrasenaAdmin);

    if (!resultado.ok) {
      setError("Credenciales incorrectas o usuario no existe");
      return;
    }

    if (resultado.user.rol !== "admin") {
      setError("Solo los administradores pueden registrar usuarios");
      return;
    }

    alValidar(); // ✅ Si todo está bien, avisamos al componente padre
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 400 }}>
        <h3 className="modal-title">Verificación de Administrador</h3>
        <p className="modal-text">Ingrese las credenciales del administrador para continuar.</p>
        {error && <p className="error">{error}</p>}

        <form onSubmit={manejarEnvio}>
          <label>Usuario (correo / nombre)</label>
          <input
            className="input"
            value={usuarioAdmin}
            onChange={(e) => setUsuarioAdmin(e.target.value)}
          />

          <label>código / contraseña</label>
          <input
            className="input"
            type="password"
            value={contrasenaAdmin}
            onChange={(e) => setContrasenaAdmin(e.target.value)}
          />

          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Validar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegistroAdministrador;

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Reserva = {
  id: string;
  trabajador: string;
  fecha: string;
  hora: string;
  cliente: {
    nombre: string;
    telefono: string;
    email: string;
  };
  observaciones: string;
};

export default function CargaTrabajo() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const obtenerReservas = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .order("fecha", { ascending: true });

      if (error) {
        console.error("Error al obtener reservas:", error);
      } else {
        setReservas(data);
      }
    };

    obtenerReservas();
  }, []);

  const filtrar = reservas.filter((r) => {
    const texto = `${r.cliente?.nombre} ${r.cliente?.telefono} ${r.cliente?.email}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Montserrat, sans-serif",
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#1e3a8a" }}>
        Carga de trabajo
      </h1>

      <input
        type="text"
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          padding: "0.5rem",
          borderRadius: "0.5rem",
          width: "100%",
          maxWidth: "400px",
          marginBottom: "1.5rem",
          border: "1px solid #ccc",
        }}
      />

      {filtrar.map((reserva) => (
        <div
          key={reserva.id}
          style={{
            background: "#fff",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            boxShadow: "0 0 8px rgba(0,0,0,0.05)",
          }}
        >
          <p>
            <strong>📅 Fecha:</strong> {reserva.fecha} a las {reserva.hora}
          </p>
          <p>
            <strong>💇 Cliente:</strong> {reserva.cliente?.nombre}
          </p>
          <p>
            <strong>📞 Teléfono:</strong> {reserva.cliente?.telefono}
          </p>
          <p>
            <strong>✉️ Email:</strong> {reserva.cliente?.email}
          </p>
          {reserva.observaciones && (
            <p>
              <strong>📝 Observaciones:</strong> {reserva.observaciones}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

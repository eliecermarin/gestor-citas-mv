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

type Peluquero = {
  id: string;
  nombre: string;
};

export default function CargaTrabajo() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [peluqueros, setPeluqueros] = useState<Peluquero[]>([]);
  const [peluqueroActivo, setPeluqueroActivo] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: peluqueroData } = await supabase.from("trabajadores").select("*");
      setPeluqueros(peluqueroData || []);
      if (peluqueroData && peluqueroData.length > 0) {
        setPeluqueroActivo(peluqueroData[0].id);
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    if (!peluqueroActivo) return;

    const cargarReservas = async () => {
      const { data: reservasData } = await supabase
        .from("reservas")
        .select("*")
        .eq("trabajador", peluqueroActivo)
        .order("fecha", { ascending: true });

      setReservas(reservasData || []);
    };

    cargarReservas();
  }, [peluqueroActivo]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Montserrat, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Agenda semanal</h1>

      {/* Selector de peluquero */}
      <select
        value={peluqueroActivo || ""}
        onChange={(e) => setPeluqueroActivo(e.target.value)}
        style={{ padding: "0.5rem", marginBottom: "1.5rem" }}
      >
        {peluqueros.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      {/* Lista de reservas */}
      {reservas.map((r) => (
        <div
          key={r.id}
          style={{
            marginBottom: "1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            padding: "1rem",
            backgroundColor: "#fff",
          }}
        >
          <p><strong>📅 Fecha:</strong> {r.fecha} - {r.hora}</p>
          <p><strong>👤 Cliente:</strong> {r.cliente?.nombre}</p>
          <p><strong>📞 Teléfono:</strong> {r.cliente?.telefono}</p>
          <p><strong>✉️ Email:</strong> {r.cliente?.email}</p>
          <p><strong>📝 Observaciones:</strong> {r.observaciones}</p>
        </div>
      ))}

      {reservas.length === 0 && (
        <p style={{ marginTop: "1rem", color: "#666" }}>
          No hay reservas para este peluquero.
        </p>
      )}
    </div>
  );
}

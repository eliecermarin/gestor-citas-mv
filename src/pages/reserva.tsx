import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../supabaseClient";

interface Trabajador {
  id: string;
  nombre: string;
}

interface Servicio {
  id: string;
  nombre: string;
  duracion: number;
}

export default function Reserva() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [trabajadorId, setTrabajadorId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: t } = await supabase.from("trabajadores").select("id, nombre");
      const { data: s } = await supabase.from("servicios").select("id, nombre, duracion");
      if (t) setTrabajadores(t);
      if (s) setServicios(s);
    };
    cargarDatos();
  }, []);

  const enviarReserva = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const servicio = servicios.find((s) => s.id === servicioId);
    if (!trabajadorId || !servicio || !fecha || !hora) return;

    const { error } = await supabase.from("reservas").insert({
      trabajador: trabajadorId,
      servicio: servicio.id,
      fecha,
      hora,
      cliente: {
        nombre,
        telefono,
        email,
      },
      observaciones: "",
    });

    if (!error) setConfirmado(true);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Reserva tu cita</h1>
      {confirmado ? (
        <p className="text-green-600 font-semibold">✅ ¡Reserva confirmada!</p>
      ) : (
        <form onSubmit={enviarReserva} className="space-y-4">
          <select
            required
            value={trabajadorId}
            onChange={(e) => setTrabajadorId(e.target.value)}
            className="w-full border p-2"
          >
            <option value="">Selecciona un trabajador</option>
            {trabajadores.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>

          <select
            required
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            className="w-full border p-2"
          >
            <option value="">Selecciona un servicio</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>

          <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border p-2" />
          <input type="time" required value={hora} onChange={(e) => setHora(e.target.value)} className="w-full border p-2" />
          <input type="text" required placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border p-2" />
          <input type="tel" required placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border p-2" />
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 w-full">Reservar</button>
        </form>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

export default function Configuracion() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [servicios, setServicios] = useState<any[]>([]);
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: "", duracion: "", precio: "" });

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchServicios = async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .eq("user_id", userId);

      if (error) console.error("Error cargando servicios:", error.message);
      else setServicios(data || []);
    };
    fetchServicios();
  }, [userId]);

  const guardarServicio = async () => {
    if (!nuevoServicio.nombre || !nuevoServicio.duracion || !nuevoServicio.precio) return;
    if (!userId) return;

    const { error } = await supabase.from("servicios").insert([
      {
        nombre: nuevoServicio.nombre,
        duracion: parseInt(nuevoServicio.duracion),
        precio: parseFloat(nuevoServicio.precio),
        user_id: userId,
      },
    ]);

    if (error) {
      alert("Error al guardar");
    } else {
      setNuevoServicio({ nombre: "", duracion: "", precio: "" });
      const { data } = await supabase
        .from("servicios")
        .select("*")
        .eq("user_id", userId);
      setServicios(data || []);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">Configuración del Centro</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-700">Servicios</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoServicio.nombre}
            onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Duración (min)"
            value={nuevoServicio.duracion}
            onChange={(e) => setNuevoServicio({ ...nuevoServicio, duracion: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Precio (€)"
            value={nuevoServicio.precio}
            onChange={(e) => setNuevoServicio({ ...nuevoServicio, precio: e.target.value })}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={guardarServicio}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Guardar Servicio
        </button>

        <ul className="mt-4 text-sm text-gray-600">
          {servicios.map((servicio, idx) => (
            <li key={idx}>
              {servicio.nombre} - {servicio.duracion} min - {servicio.precio} €
            </li>
          ))}
        </ul>
      </div>

      {/* Aquí más secciones: peluqueros, horarios, festivos... más adelante */}
    </div>
  );
}

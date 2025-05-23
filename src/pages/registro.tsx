import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabaseClient";

export default function RegistroCliente() {
  const router = useRouter();

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState(false);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    console.log("Registrando usuario:", email);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("authData:", authData);
    console.log("authError:", authError);

    if (authError || !authData?.user) {
      setError("Error creando usuario. Intenta con otro email.");
      setCargando(false);
      return;
    }

    const user_id = authData.user.id;

    // 2. Insertar cliente en tabla 'clientes'
    const fechaHoy = new Date().toISOString().split("T")[0];
    const { error: insertError1 } = await supabase.from("clientes").insert({
      id: user_id,
      email,
      fecha_alta: fechaHoy,
      estado_prueba: "activa",
      onboarding: false,
    });

    console.log("Insert clientes error:", insertError1);

    if (insertError1) {
      setError("Error guardando cliente en la base de datos.");
      setCargando(false);
      return;
    }

    // 3. Crear configuración vacía por defecto
    const { error: insertError2 } = await supabase.from("configuracion").insert({
      user_id,
      nombre_negocio: nombreNegocio,
      dias_reserva_max: 30,
    });

    console.log("Insert configuracion error:", insertError2);

    if (insertError2) {
      setError("Error creando la configuración inicial.");
      setCargando(false);
      return;
    }

    setCreado(true);
    setCargando(false);
    router.push("/configuracion"); // Redirige al onboarding
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Empieza tu prueba gratuita</h1>

      {creado ? (
        <p className="text-green-600">✅ Redirigiendo a tu panel de configuración...</p>
      ) : (
        <form onSubmit={registrar} className="space-y-4">
          <input
            required
            type="text"
            placeholder="Nombre del negocio"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            className="w-full border p-2"
          />

          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2"
          />

          <input
            required
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2"
            disabled={cargando}
          >
            {cargando ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}

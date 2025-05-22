import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

      console.log("Intentando login con:", email, password);


    const { error } = await supabase.auth.signInWithPassword({

      email,
      password,
    });


    if (error) {
      alert("Usuario o contraseña incorrecto");
      setLoading(false);
    } else {
      router.push("/carga-trabajo");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-gray-200">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow max-w-sm w-full">
        <h2 className="text-xl font-semibold mb-4 text-center text-blue-700">Inicia sesión</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Cargando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #bfdbfe, #e5e7eb)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          backgroundColor: "#fff",
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 0 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#1e3a8a",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Inicia sesión
        </h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "0.75rem",
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "0.5rem",
            fontSize: "1rem",
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "0.75rem",
            marginBottom: "1.5rem",
            border: "1px solid #ccc",
            borderRadius: "0.5rem",
            fontSize: "1rem",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
            border: "none",
          }}
        >
          {loading ? "Cargando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

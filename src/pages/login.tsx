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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Elementos decorativos de fondo */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: "100px",
          height: "100px",
          background: "linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
          borderRadius: "50%",
          filter: "blur(1px)",
        }}
      />
      
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "15%",
          width: "60px",
          height: "60px",
          background: "linear-gradient(45deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          borderRadius: "50%",
          filter: "blur(1px)",
        }}
      />

      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          padding: "3rem",
          borderRadius: "2rem",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)",
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {/* Header con icono */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: "50%",
              margin: "0 auto 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px rgba(102, 126, 234, 0.3)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  borderRadius: "50%",
                }}
              />
            </div>
          </div>
          
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.5rem",
            }}
          >
            Inicia sesión
          </h2>
          
          <p
            style={{
              color: "#64748b",
              fontSize: "1rem",
              margin: "0",
            }}
          >
            Accede a tu cuenta
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "1rem",
                border: "2px solid #e5e7eb",
                borderRadius: "1rem",
                fontSize: "1rem",
                outline: "none",
                transition: "all 0.3s ease",
                backgroundColor: "#fafafa",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                target.style.borderColor = "#667eea";
                target.style.backgroundColor = "#ffffff";
                target.style.transform = "translateY(-2px)";
                target.style.boxShadow = "0 10px 25px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                const target = e.target as HTMLInputElement;
                target.style.borderColor = "#e5e7eb";
                target.style.backgroundColor = "#fafafa";
                target.style.transform = "translateY(0)";
                target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "1rem",
                border: "2px solid #e5e7eb",
                borderRadius: "1rem",
                fontSize: "1rem",
                outline: "none",
                transition: "all 0.3s ease",
                backgroundColor: "#fafafa",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                target.style.borderColor = "#667eea";
                target.style.backgroundColor = "#ffffff";
                target.style.transform = "translateY(-2px)";
                target.style.boxShadow = "0 10px 25px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                const target = e.target as HTMLInputElement;
                target.style.borderColor = "#e5e7eb";
                target.style.backgroundColor = "#fafafa";
                target.style.transform = "translateY(0)";
                target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading 
                ? "linear-gradient(135deg, #9ca3af, #6b7280)" 
                : "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
              padding: "1rem 2rem",
              borderRadius: "1rem",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              border: "none",
              boxShadow: loading 
                ? "0 4px 15px rgba(156, 163, 175, 0.3)" 
                : "0 10px 25px rgba(102, 126, 234, 0.3)",
              transform: loading ? "scale(0.98)" : "scale(1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = "translateY(-3px) scale(1.02)";
                target.style.boxShadow = "0 15px 35px rgba(102, 126, 234, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = "translateY(0) scale(1)";
                target.style.boxShadow = "0 10px 25px rgba(102, 126, 234, 0.3)";
              }
            }}
          >
            {loading && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {loading ? "Cargando..." : "Entrar"}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseclient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/carga-trabajo"); // Redirigir a la página principal si ya está logueado
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Verificar si el usuario tiene configuración
        const { data: trabajadores } = await supabase
          .from('trabajadores')
          .select('id')
          .eq('user_id', data.user.id)
          .limit(1);

        // Redirigir según si tiene configuración o no
        if (trabajadores && trabajadores.length > 0) {
          router.push("/carga-trabajo");
        } else {
          router.push("/configuracion");
        }
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      setError(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError("Por favor, completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Crear registro en tabla clientes
        const { error: clientError } = await supabase
          .from('clientes')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            fecha_alta: new Date().toISOString().split('T')[0],
            estado_prueba: 'activo',
            onboarding: false
          }]);

        if (clientError) {
          console.error('Error creando cliente:', clientError);
        }

        // Crear configuración inicial
        const { error: configError } = await supabase
          .from('configuracion')
          .insert([{
            user_id: data.user.id,
            nombre_negocio: 'Mi Negocio',
            dias_reserva_max: 30
          }]);

        if (configError) {
          console.error('Error creando configuración:', configError);
        }

        alert("Cuenta creada exitosamente. Ya puedes iniciar sesión.");
      }
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
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
            Sistema de Reservas
          </h2>
          
          <p
            style={{
              color: "#64748b",
              fontSize: "1rem",
              margin: "0",
            }}
          >
            Accede a tu cuenta o crea una nueva
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
            />
          </div>

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
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: "1",
                background: loading 
                  ? "linear-gradient(135deg, #9ca3af, #6b7280)" 
                  : "linear-gradient(135deg, #667eea, #764ba2)",
                color: "#fff",
                padding: "1rem 2rem",
                borderRadius: "1rem",
                fontSize: "1rem",
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
            >
              {loading && (
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              {loading ? "Cargando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              style={{
                flex: "1",
                background: loading 
                  ? "linear-gradient(135deg, #9ca3af, #6b7280)" 
                  : "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                padding: "1rem 2rem",
                borderRadius: "1rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                border: "none",
                boxShadow: loading 
                  ? "0 4px 15px rgba(156, 163, 175, 0.3)" 
                  : "0 10px 25px rgba(16, 185, 129, 0.3)",
                transform: loading ? "scale(0.98)" : "scale(1)",
              }}
            >
              Registrarse
            </button>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            ¿Primera vez? Usa "Registrarse" para crear tu cuenta
          </p>
        </div>
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
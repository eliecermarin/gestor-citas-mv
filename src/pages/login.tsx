import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // Verificar sesión existente
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Sesión existente detectada');
          router.push("/configuracion");
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [router]);

  // ✅ LOGIN MEJORADO
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      console.log('🔄 Intentando login con:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Error de login:', error);
        
        // ✅ MENSAJES MÁS ESPECÍFICOS
        if (error.message.includes('Invalid login credentials')) {
          setError("❌ Email o contraseña incorrectos. Si acabas de crear la cuenta, espera 1-2 minutos e intenta de nuevo.");
        } else if (error.message.includes('Email not confirmed')) {
          setError("⚠️ Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.");
        } else {
          setError(`Error: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        console.log('✅ Login exitoso:', data.user.email);
        
        // ✅ ESPERAR UN POCO Y VERIFICAR CONFIGURACIÓN
        setTimeout(async () => {
          try {
            const { data: trabajadores } = await supabase
              .from('trabajadores')
              .select('id')
              .eq('user_id', data.user.id)
              .limit(1);

            if (trabajadores && trabajadores.length > 0) {
              router.push("/carga-trabajo");
            } else {
              router.push("/configuracion");
            }
          } catch (err) {
            console.warn('Error verificando configuración:', err);
            router.push("/configuracion");
          }
        }, 1000);
      }
    } catch (error) {
      console.error('💥 Error en login:', error);
      setError("Error inesperado al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // ✅ REGISTRO SIMPLIFICADO (SIN CREAR DATOS ADICIONALES)
  const handleRegister = async () => {
    if (!email || !password) {
      setError("Por favor, completa todos los campos");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      console.log('🔄 Intentando registro con:', email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Error de registro:', error);
        
        if (error.message.includes('User already registered')) {
          setError("Este email ya está registrado. Prueba a iniciar sesión.");
        } else {
          setError(`Error: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        console.log('✅ Usuario creado:', data.user.id);
        
        // ✅ NO CREAR DATOS ADICIONALES AQUÍ
        // Los crearemos después del primer login exitoso
        
        setMessage("✅ ¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.");
        setIsRegistering(false);
        
        // ✅ LIMPIAR CAMPOS PARA EL LOGIN
        setPassword("");
      }
    } catch (error) {
      console.error('💥 Error en registro:', error);
      setError("Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const switchMode = () => {
    clearMessages();
    setIsRegistering(!isRegistering);
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
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          padding: "3rem",
          borderRadius: "2rem",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
          width: "100%",
          maxWidth: "420px",
          position: "relative",
        }}
      >
        {/* Header */}
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
          
          <p style={{ color: "#64748b", fontSize: "1rem", margin: "0" }}>
            {isRegistering ? 'Crea tu cuenta' : 'Accede a tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}>
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearMessages();
              }}
              required
              style={{
                width: "100%",
                padding: "1rem",
                border: "2px solid #e5e7eb",
                borderRadius: "1rem",
                fontSize: "1rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearMessages();
              }}
              required
              style={{
                width: "100%",
                padding: "1rem",
                border: "2px solid #e5e7eb",
                borderRadius: "1rem",
                fontSize: "1rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Mensajes */}
          {message && (
            <div style={{
              backgroundColor: "#d1fae5",
              border: "1px solid #34d399",
              color: "#065f46",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}>
              {message}
            </div>
          )}

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

          {/* Botones */}
          <div style={{ marginBottom: "1rem" }}>
            {!isRegistering ? (
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading 
                    ? "#9ca3af" 
                    : "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  padding: "1rem",
                  borderRadius: "1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  border: "none",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Iniciando sesión..." : "🔑 Iniciar Sesión"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading 
                    ? "#9ca3af" 
                    : "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  padding: "1rem",
                  borderRadius: "1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  border: "none",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Creando cuenta..." : "✨ Crear Cuenta"}
              </button>
            )}
          </div>
        </form>

        {/* Alternar modo */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {isRegistering 
              ? "¿Ya tienes una cuenta?" 
              : "¿No tienes cuenta?"
            }
          </p>
          <button
            onClick={switchMode}
            disabled={loading}
            style={{
              background: "transparent",
              border: "2px solid #e5e7eb",
              color: "#667eea",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {isRegistering ? "Ya tengo cuenta" : "Crear nueva cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
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

  // Verificar si ya hay una sesión activa
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

  // ✅ FUNCIÓN DE LOGIN MEJORADA
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
        throw error;
      }

      if (data.user) {
        console.log('✅ Login exitoso:', data.user.email);
        
        // ✅ PEQUEÑA PAUSA PARA ASEGURAR QUE TODO ESTÉ LISTO
        setTimeout(() => {
          // Verificar si el usuario tiene configuración
          checkUserConfiguration(data.user.id);
        }, 500);
      }
    } catch (error) {
      console.error('💥 Error en login:', error);
      
      // ✅ MENSAJES DE ERROR MÁS ESPECÍFICOS
      let errorMessage = "Error al iniciar sesión";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Email o contraseña incorrectos. ¿Acabas de registrarte? Espera unos segundos e intenta de nuevo.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Por favor, confirma tu email antes de iniciar sesión.";
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Demasiados intentos. Espera un momento antes de intentar de nuevo.";
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA VERIFICAR CONFIGURACIÓN
  const checkUserConfiguration = async (userId) => {
    try {
      console.log('🔍 Verificando configuración para:', userId);
      
      const { data: trabajadores } = await supabase
        .from('trabajadores')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (trabajadores && trabajadores.length > 0) {
        console.log('✅ Usuario tiene trabajadores, redirigiendo a carga-trabajo');
        router.push("/carga-trabajo");
      } else {
        console.log('✅ Usuario nuevo, redirigiendo a configuración');
        router.push("/configuracion");
      }
    } catch (error) {
      console.error('❌ Error verificando configuración:', error);
      // En caso de error, ir a configuración por defecto
      router.push("/configuracion");
    }
  };

  // ✅ FUNCIÓN DE REGISTRO MEJORADA
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
    setIsRegistering(true);

    try {
      console.log('🔄 Intentando registro con:', email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Error de registro:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Usuario creado:', data.user.id);
        
        // ✅ ESPERAR UN POCO ANTES DE CREAR DATOS ADICIONALES
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          // ✅ CREAR CLIENTE
          console.log('🔄 Creando entrada en clientes...');
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
            console.warn('⚠️ Error creando cliente (puede ser normal):', clientError);
          } else {
            console.log('✅ Cliente creado correctamente');
          }

          // ✅ CREAR CONFIGURACIÓN INICIAL
          console.log('🔄 Creando configuración inicial...');
          const { error: configError } = await supabase
            .from('configuracion')
            .insert([{
              user_id: data.user.id,
              nombre_negocio: 'Mi Negocio',
              slug: `negocio-${Date.now()}`, // Slug temporal único
              dias_reserva_max: 30
            }]);

          if (configError) {
            console.warn('⚠️ Error creando configuración:', configError);
          } else {
            console.log('✅ Configuración inicial creada');
          }

        } catch (setupError) {
          console.warn('⚠️ Error en setup inicial:', setupError);
          // No fallar si hay errores en el setup inicial
        }

        // ✅ MENSAJE DE ÉXITO
        if (data.user.email_confirmed_at) {
          // Email ya confirmado, puede hacer login inmediatamente
          setMessage("✅ Cuenta creada exitosamente. Puedes iniciar sesión ahora.");
        } else {
          // Necesita confirmar email
          setMessage("✅ Cuenta creada. Revisa tu email para confirmar tu cuenta, o intenta hacer login en unos segundos.");
        }
        
        setIsRegistering(false);
      }
    } catch (error) {
      console.error('💥 Error en registro:', error);
      
      let errorMessage = "Error al crear la cuenta";
      
      if (error.message.includes('User already registered')) {
        errorMessage = "Este email ya está registrado. Prueba a iniciar sesión.";
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (error.message.includes('Invalid email')) {
        errorMessage = "El formato del email no es válido.";
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsRegistering(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA LIMPIAR MENSAJES
  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  // ✅ FUNCIÓN PARA CAMBIAR ENTRE LOGIN Y REGISTRO
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
            {isRegistering ? 'Crea tu cuenta' : 'Accede a tu cuenta'}
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
                transition: "all 0.3s ease",
                backgroundColor: "#fafafa",
                boxSizing: "border-box",
              }}
            />
            {isRegistering && (
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
                Mínimo 6 caracteres
              </p>
            )}
          </div>

          {/* ✅ MENSAJE DE ÉXITO */}
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

          {/* ✅ MENSAJE DE ERROR MEJORADO */}
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

          {/* ✅ BOTONES MEJORADOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
            {!isRegistering ? (
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
                {loading ? "Creando cuenta..." : "✨ Crear Cuenta"}
              </button>
            )}
          </div>
        </form>

        {/* ✅ ALTERNAR ENTRE LOGIN Y REGISTRO */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
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
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.borderColor = "#667eea";
                e.target.style.backgroundColor = "#f0f4ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            {isRegistering ? "Ya tengo cuenta" : "Crear nueva cuenta"}
          </button>
        </div>

        {/* ✅ AYUDA ADICIONAL */}
        {isRegistering && (
          <div style={{ textAlign: "center", marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem" }}>
            <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
              🚀 Después de crear tu cuenta podrás configurar tu negocio y obtener tu página de reservas personalizada
            </p>
          </div>
        )}
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
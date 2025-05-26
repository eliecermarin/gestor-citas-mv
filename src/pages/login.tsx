import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabaseClient";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/carga-trabajo");
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [router]);

  const showMessage = (message, type = "error") => {
    if (type === "error") {
      setError(message);
      setSuccess("");
    } else {
      setSuccess(message);
      setError("");
    }
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showMessage("Por favor, completa todos los campos", "error");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        showMessage("Iniciando sesión...", "success");
        
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
    } catch (error) {
      console.error('Error en login:', error);
      
      let errorMessage = "Error al iniciar sesión";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Email o contraseña incorrectos";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Por favor, confirma tu email antes de iniciar sesión";
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Demasiados intentos. Intenta de nuevo en unos minutos";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      showMessage("Por favor, completa todos los campos", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

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

        showMessage("Cuenta creada exitosamente. Ya puedes iniciar sesión.", "success");
        setIsRegistering(false);
      }
    } catch (error) {
      console.error('Error en registro:', error);
      
      let errorMessage = "Error al crear la cuenta";
      
      if (error.message.includes('User already registered')) {
        errorMessage = "Este email ya está registrado";
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      } else if (error.message.includes('Invalid email')) {
        errorMessage = "Email inválido";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        {/* Header con icono */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Sistema de Reservas
          </h2>
          
          <p className="text-gray-600">
            {isRegistering ? 'Crear nueva cuenta' : 'Accede a tu cuenta'}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          </div>
        )}

        <div onSubmit={handleLogin}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-2 text-blue-600" />
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none hover:border-gray-300"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="inline w-4 h-4 mr-2 text-blue-600" />
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none hover:border-gray-300"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isRegistering && (
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {!isRegistering ? (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-200 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Cuenta Nueva
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-200 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 focus:ring-4 focus:ring-gray-200 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ya tengo cuenta
                </button>
              </>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          {isRegistering ? (
            <p>
              Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.
            </p>
          ) : (
            <p>
              ¿Primera vez aquí? Crea una cuenta para empezar a gestionar tus reservas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
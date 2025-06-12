import { supabase } from '../../supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ message: 'Business ID requerido' });
    }

    console.log('🔍 Obteniendo email del propietario para negocio:', businessId);

    // ✅ USAR TABLA DE CLIENTES PARA OBTENER EMAIL
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('email')
      .eq('id', businessId)
      .single();

    if (clienteError && clienteError.code !== 'PGRST116') {
      console.error('Error obteniendo cliente:', clienteError);
      return res.status(500).json({ message: 'Error del servidor' });
    }

    if (!cliente || !cliente.email) {
      console.log('⚠️ Email del negocio no encontrado en tabla clientes');
      return res.status(404).json({ 
        success: false,
        message: 'Email del negocio no encontrado' 
      });
    }

    console.log('✅ Email encontrado:', cliente.email);

    return res.status(200).json({
      success: true,
      email: cliente.email
    });

  } catch (error) {
    console.error('💥 Error obteniendo email del propietario:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
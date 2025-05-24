import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseclient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID requerido' });
    }

    // Verificar si el usuario tiene acceso
    const { data: trabajadores, error } = await supabase
      .from('trabajadores')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error validando acceso:', error);
      return res.status(500).json({ message: 'Error del servidor' });
    }

    const tieneAcceso = trabajadores && trabajadores.length > 0;

    return res.status(200).json({ 
      hasAccess: tieneAcceso,
      redirectTo: tieneAcceso ? '/carga-trabajo' : '/configuracion'
    });

  } catch (error) {
    console.error('Error en validar-acceso:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token requerido" });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Usuario no válido" });

  const { data: cliente } = await supabase
    .from("clientes")
    .select("fecha_alta")
    .eq("id", user.id)
    .single();

  if (!cliente) return res.status(401).json({ error: "Cliente no encontrado" });

  const fechaAlta = new Date(cliente.fecha_alta);
  const hoy = new Date();
  const diferenciaDias = Math.floor((hoy.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60 * 24));

  if (diferenciaDias > 30) return res.status(403).json({ error: "Prueba caducada" });

  return res.status(200).json({ acceso: "ok" });
}

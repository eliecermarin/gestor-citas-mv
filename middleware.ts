// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("sb-access-token")?.value;

  // Rutas protegidas
  const rutasProtegidas = ["/configuracion", "/carga-trabajo", "/reserva"];
  const esRutaProtegida = rutasProtegidas.some((ruta) => url.pathname.startsWith(ruta));

  // Si no es una ruta protegida, continúa
  if (!esRutaProtegida || !token) {
    return NextResponse.next();
  }

  // Llamada directa a Supabase REST API para comprobar el estado del cliente
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/clientes?select=estado_prueba`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.warn("❌ Supabase request failed.");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const data = await res.json();
  const estadoPrueba = data?.[0]?.estado_prueba;

  if (estadoPrueba === "caducada") {
    url.pathname = "/suscripcion";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/configuracion", "/carga-trabajo", "/reserva"],
};

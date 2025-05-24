import { ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { Calendar, Settings, LogOut, Menu, X, User, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = "Sistema de Reservas" }: LayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const navigation = [
    {
      name: 'Agenda',
      href: '/carga-trabajo',
      icon: Calendar,
      current: router.pathname === '/carga-trabajo'
    },
    {
      name: 'Nueva Reserva',
      href: '/reserva',
      icon: Clock,
      current: router.pathname === '/reserva'
    },
    {
      name: 'Configuración',
      href: '/configuracion',
      icon: Settings,
      current: router.pathname === '/configuracion'
    }
  ];

  const NavigationItem = ({ item }: { item: typeof navigation[0] }) => {
    const Icon = item.icon;
    return (
      <a
        href={item.href}
        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          item.current
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
        onClick={(e) => {
          e.preventDefault();
          router.push(item.href);
          setSidebarOpen(false);
        }}
      >
        <Icon
          className={`mr-3 h-5 w-5 flex-shrink-0 ${
            item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
          }`}
          aria-hidden="true"
        />
        {item.name}
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <User className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">Panel</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>
          
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <User className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">Panel de Control</span>
            </div>
          </div>
          
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>
          
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <div className="flex h-16 items-center gap-x-4 bg-white px-4 shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
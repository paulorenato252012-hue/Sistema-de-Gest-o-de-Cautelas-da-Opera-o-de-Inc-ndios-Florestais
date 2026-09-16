import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Flame, Menu, Share2 } from 'lucide-react';
// We'll create these components next
import { MilitarPanel } from '../components/MilitarPanel';
import { LogisticaPanel } from '../components/LogisticaPanel';
import { AdminPanel } from '../components/AdminPanel';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Moon, Sun } from 'lucide-react';
import { ShareInstallModal } from '../components/ShareInstallModal';

export function Dashboard({ children }: { children?: React.ReactNode }) {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [adminViewMode, setAdminViewMode] = React.useState<'ADMIN' | 'MILITAR' | 'LOGISTICA'>('ADMIN');
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      
    } else {
      document.documentElement.classList.remove('dark');
      
    }
  }, [isDarkMode]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-red-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Flame className="h-8 w-8 mr-2" />
                <span className="font-bold text-lg hidden sm:block">Cautelas DPA</span>
                <span className="font-bold text-lg sm:hidden">CBMMS</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 bg-red-700/80 hover:bg-red-700 border border-red-500/40 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
                title="Compartilhar ou instalar o aplicativo CBMMS via Link ou QR Code"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5 text-red-200" />
                Compartilhar App
              </button>
              <PWAInstallButton />
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 transition ml-2" 
                title="Modo Noturno">
                {isDarkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-gray-200" />}
              </button>
              <span className="text-sm font-medium border-l border-red-700 pl-3">{userProfile?.postoGraduacao} {userProfile?.nomeGuerra}</span>
              <span className="px-2.5 py-1 bg-red-900 text-xs font-bold rounded-full uppercase tracking-wider">
                {userProfile?.perfil === 'ADMINISTRADOR' ? 'Administrador / Logística' : userProfile?.perfil}
              </span>
              <button 
                onClick={handleSignOut}
                className="flex items-center text-sm hover:text-red-200 transition-colors ml-3"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </button>
            </div>

            <div className="md:hidden flex items-center space-x-2">
              <PWAInstallButton />
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 transition ml-2" 
                title="Modo Noturno">
                {isDarkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-gray-200" />}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-red-900 px-4 py-3 space-y-2">
            <div className="text-sm pb-2 border-b border-red-800">
              {userProfile?.postoGraduacao} {userProfile?.nomeGuerra} - {userProfile?.perfil}
            </div>
            {userProfile?.perfil === 'ADMINISTRADOR' && (
              <div className="py-2 border-b border-red-800 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-red-200 font-bold block">Alternar Visão:</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => { setAdminViewMode('ADMIN'); setMobileMenuOpen(false); }}
                    className={`text-xs py-1.5 px-2 rounded font-bold ${adminViewMode === 'ADMIN' ? 'bg-white text-red-900' : 'bg-red-800 text-white'}`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => { setAdminViewMode('MILITAR'); setMobileMenuOpen(false); }}
                    className={`text-xs py-1.5 px-2 rounded font-bold ${adminViewMode === 'MILITAR' ? 'bg-white text-red-900' : 'bg-red-800 text-white'}`}
                  >
                    Militar
                  </button>
                  <button
                    onClick={() => { setAdminViewMode('LOGISTICA'); setMobileMenuOpen(false); }}
                    className={`text-xs py-1.5 px-2 rounded font-bold ${adminViewMode === 'LOGISTICA' ? 'bg-white text-red-900' : 'bg-red-800 text-white'}`}
                  >
                    Logística
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShareModalOpen(true);
              }}
              className="flex items-center text-sm py-2 w-full text-left hover:bg-red-800 rounded px-2 text-white font-medium"
            >
              <Share2 className="h-4 w-4 mr-2 text-red-200" />
              Compartilhar / Instalar Aplicativo
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center text-sm py-2 w-full text-left hover:bg-red-800 rounded px-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        )}
      </header>

      {/* Barra de alternância rápida de visão para Administradores e Militares da Logística */}
      {userProfile?.perfil === 'ADMINISTRADOR' && !children && (
        <div className="bg-white border-b border-gray-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="font-bold text-gray-700">Modo de Visualização:</span>
              <span className="hidden sm:inline">• Administradores e equipe de logística têm acesso a todas as visões operacionais</span>
            </div>
            <div className="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setAdminViewMode('ADMIN')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  adminViewMode === 'ADMIN'
                    ? 'bg-red-800 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Painel do Administrador (Gestão & Descautela)
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('MILITAR')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  adminViewMode === 'MILITAR'
                    ? 'bg-red-800 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visão Militar (Operações)
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('LOGISTICA')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  adminViewMode === 'LOGISTICA'
                    ? 'bg-red-800 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Visão Logística
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareInstallModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children ? children : (
          <>
            {userProfile?.perfil === 'ADMINISTRADOR' && (
              <>
                {adminViewMode === 'ADMIN' && <AdminPanel />}
                {adminViewMode === 'MILITAR' && <MilitarPanel />}
                {adminViewMode === 'LOGISTICA' && <LogisticaPanel />}
              </>
            )}
            {userProfile?.perfil === 'LOGISTICA' && <LogisticaPanel />}
            {userProfile?.perfil === 'MILITAR' && <MilitarPanel />}
          </>
        )}
      </main>
    </div>
  );
}

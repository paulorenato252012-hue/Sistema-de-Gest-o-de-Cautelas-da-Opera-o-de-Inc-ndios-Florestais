import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Share2, Download } from 'lucide-react';
import { ShareInstallModal } from './ShareInstallModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-2">
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-600 transition"
            title="Instalar diretamente no seu dispositivo"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar App
          </button>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-900/80 hover:bg-red-950 border border-red-700/60 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
          title="Ver link de compartilhamento, QR Code e instruções de instalação"
        >
          <Share2 className="w-3.5 h-3.5 text-red-200" />
          <span>Compartilhar / Instalar</span>
        </button>
      </div>

      <ShareInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};


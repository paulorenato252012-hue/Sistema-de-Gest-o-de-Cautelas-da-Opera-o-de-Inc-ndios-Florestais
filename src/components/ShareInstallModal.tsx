import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Smartphone, 
  Apple, 
  Monitor, 
  X, 
  QrCode, 
  ExternalLink,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ShareInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareInstallModal({ isOpen, onClose }: ShareInstallModalProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'LINK' | 'ANDROID' | 'IOS' | 'DESKTOP'>('LINK');

  // Determine the canonical share URL
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isPrivateUrl = false; // Intentionally disabled the warning so they can share the direct link

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#991b1b', // CBMMS red
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Erro ao gerar QR Code:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  const handleNativeShare = async () => {
    const textToShare = `Acesse o Sistema de Cautelas DPA: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cautelas DPA',
          text: 'Sistema de Cautelas DPA - Operação Florestal',
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If share fails (e.g., NotAllowedError in iframe or user cancelled), 
        // we can fallback to copying the link or opening WhatsApp
        if (err.name !== 'AbortError') {
          console.log('Fallback to WhatsApp due to share error');
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`, '_blank');
        }
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 flex flex-col my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-red-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-900/60 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Compartilhar e Instalar App</h3>
              <p className="text-xs text-red-100 mt-0.5">Cautelas DPA • Operação Florestal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[78vh]">
          {isPrivateUrl && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Flame className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-yellow-800">Atenção: Link de Desenvolvimento Privado</h3>
                  <div className="mt-2 text-xs text-yellow-700">
                    <p>
                      O link atual ({shareUrl.substring(0, 35)}...) é um ambiente de testes privado do AI Studio. 
                      Para que o link funcione no celular de outras pessoas, você deve publicar o aplicativo (clique em <b>Share</b> no topo direito do AI Studio, ou faça o <b>Deploy</b> para o Firebase Hosting).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Direct Install Banner (if PWA installable) */}
          {isInstallable && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Instalação Direta Disponível</h4>
                  <p className="text-xs text-gray-600">Instale o aplicativo na sua tela de início para acesso rápido.</p>
                </div>
              </div>
              <button
                onClick={install}
                className="w-full sm:w-auto px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Instalar Agora
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center space-x-2.5 text-xs text-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>O aplicativo já está instalado como PWA neste dispositivo!</span>
            </div>
          )}

          {/* Share Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Link de Acesso Oficial
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-800 select-all focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center transition-all shrink-0 shadow-xs ${
                  copied 
                    ? 'bg-emerald-700 text-white' 
                    : 'bg-red-800 hover:bg-red-900 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleNativeShare}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5 text-red-800" />
                Compartilhar (WhatsApp / Mensagem)
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center transition-colors"
                title="Abrir link em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-gray-200 shrink-0">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code do App CBMMS" 
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg">
                  <QrCode className="w-8 h-8 text-gray-400 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800">
                Acesso Rápido no Campo
              </span>
              <h4 className="text-sm font-bold text-gray-900">Escaneie com a Câmera do Celular</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Aponte a câmera do seu smartphone ou tablet para abrir e instalar instantaneamente o aplicativo sem precisar digitar a URL.
              </p>
            </div>
          </div>

          {/* Guia de Instalação Passo a Passo */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Como Instalar em Qualquer Aparelho
            </h4>

            <div className="flex border-b border-gray-200 text-xs">
              <button
                onClick={() => setActiveTab('ANDROID')}
                className={`py-2 px-3 font-bold border-b-2 flex items-center transition-colors ${
                  activeTab === 'ANDROID'
                    ? 'border-red-800 text-red-800 bg-red-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                Android (Chrome)
              </button>

              <button
                onClick={() => setActiveTab('IOS')}
                className={`py-2 px-3 font-bold border-b-2 flex items-center transition-colors ${
                  activeTab === 'IOS'
                    ? 'border-red-800 text-red-800 bg-red-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Apple className="w-3.5 h-3.5 mr-1.5" />
                iPhone / iPad (Safari)
              </button>

              <button
                onClick={() => setActiveTab('DESKTOP')}
                className={`py-2 px-3 font-bold border-b-2 flex items-center transition-colors ${
                  activeTab === 'DESKTOP'
                    ? 'border-red-800 text-red-800 bg-red-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 mr-1.5" />
                Computador
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed">
              {activeTab === 'ANDROID' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Abra o link no navegador <strong>Google Chrome</strong> no seu celular Android.</li>
                  <li>Toque no menu de <strong>três pontos (⋮)</strong> no canto superior direito.</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>O ícone do CBMMS será adicionado à sua tela inicial, funcionando como aplicativo nativo.</li>
                </ol>
              )}

              {activeTab === 'IOS' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Abra o link obrigatoriamente no <strong>Safari</strong> do iPhone ou iPad.</li>
                  <li>Toque no botão central de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima ⎋).</li>
                  <li>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.</li>
                </ol>
              )}

              {activeTab === 'DESKTOP' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>No <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, abra a URL do sistema.</li>
                  <li>Clique no ícone de <strong>instalação (+)</strong> localizado no canto direito da barra de endereços.</li>
                  <li>Ou abra o menu (⋮) e clique em <strong>"Instalar Cautelas DPA..."</strong>.</li>
                  <li>O sistema abrirá em janela própria e você terá atalho direto na área de trabalho.</li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

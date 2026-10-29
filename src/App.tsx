import React, { useState } from 'react';
import { ShoppingBag, MessageCircle, Phone } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { PublicStorefront } from './components/PublicStorefront';
import { AdminDashboard } from './components/AdminDashboard';
import { CakeBuilderModal } from './components/CakeBuilderModal';
import { MenuPdfModal } from './components/MenuPdfModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { ATELIER_INFO } from './data/seedData';
import { buildDoubtWhatsAppUrl } from './utils/schedulingEngine';

function AppLayout() {
  const { cart, settings } = useStore();
  const [activeView, setActiveView] = useState<'public' | 'admin'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === '1' ? 'admin' : 'public';
    } catch {
      return 'public';
    }
  });

  const [isCakeBuilderOpen, setIsCakeBuilderOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const doubtWhatsAppUrl = buildDoubtWhatsAppUrl(
    settings.whatsapp_numero,
    settings.mensagem_duvidas
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F8] text-[#231F20]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-[#EFE3E7] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#catalogo"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('public');
            }}
            className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#231F20] whitespace-nowrap shrink-0"
          >
            Adê Andrade Confeitaria
          </a>

          {/* Zone 2: 4–5 clean single-line text navigation links */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5054]"
          >
            <button
              type="button"
              onClick={() => setActiveView('public')}
              className={`hover:text-[#231F20] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'public' ? 'text-[#231F20] font-semibold underline' : ''
              }`}
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('public');
                setIsCakeBuilderOpen(true);
              }}
              className="hover:text-[#231F20] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Monte seu Bolo
            </button>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="hover:text-[#231F20] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Menus PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`hover:text-[#231F20] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'admin' ? 'text-[#9E586F] font-semibold underline' : ''
              }`}
            >
              Painel Admin
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#231F20] px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Encomenda ({totalCartItems})</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Quick Nav */}
        <div className="flex md:hidden items-center justify-around border-t border-[#F4EAEB] bg-[#FDF8FA] px-4 py-2 text-xs font-medium text-[#5C5054]">
          <button
            type="button"
            onClick={() => setActiveView('public')}
            className={`whitespace-nowrap shrink-0 ${
              activeView === 'public' ? 'font-bold text-[#9E586F]' : ''
            }`}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setIsCakeBuilderOpen(true)}
            className="whitespace-nowrap shrink-0"
          >
            Monte seu Bolo
          </button>
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="whitespace-nowrap shrink-0"
          >
            Menus PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className={`whitespace-nowrap shrink-0 ${
              activeView === 'admin' ? 'font-bold text-[#9E586F]' : ''
            }`}
          >
            Painel Admin
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeView === 'public' ? (
          <PublicStorefront
            onOpenCakeBuilder={() => setIsCakeBuilderOpen(true)}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
          />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#EFE3E7] bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 text-xs text-[#6E6064]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <strong className="font-display text-sm text-[#231F20]">
              {ATELIER_INFO.nome}
            </strong>
            <span aria-hidden="true">·</span>
            <span>{ATELIER_INFO.endereco}</span>
            <span aria-hidden="true">·</span>
            <span>CNPJ PIX: {ATELIER_INFO.cnpj_pix}</span>
            <span aria-hidden="true">·</span>
            <a
              href={doubtWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono font-semibold text-[#9E586F] hover:text-[#231F20] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              Dúvidas: {settings.telefone_exibicao}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('public')}
              className="hover:text-[#231F20] hover:underline"
            >
              Catálogo Público
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-[#231F20] hover:underline"
            >
              Gestão de Produção (Admin)
            </button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp / Cell Phone Doubt Shortcut (Bottom-Right Corner) */}
      {activeView === 'public' && !isCartDrawerOpen && (
        <a
          href={doubtWhatsAppUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Tirar dúvidas pelo WhatsApp no número ${settings.telefone_exibicao}`}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2.5 rounded-2xl border border-[#E2C2CE] bg-white/95 px-4 py-3 text-xs font-semibold text-[#231F20] shadow-lg backdrop-blur-xs hover:border-[#9E586F] hover:bg-[#FDF4F7] transition-all"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#9E586F] text-white shrink-0">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-bold text-[#9E586F]">
              Dúvidas? Fale Conosco
            </span>
            <span className="font-mono text-xs font-semibold text-[#231F20] tabular-nums">
              {settings.telefone_exibicao}
            </span>
          </span>
        </a>
      )}

      {/* Modals & Drawers */}
      <CakeBuilderModal
        isOpen={isCakeBuilderOpen}
        onClose={() => setIsCakeBuilderOpen(false)}
        onAddedToCart={() => setIsCartDrawerOpen(true)}
      />

      <MenuPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />

      <CartCheckoutDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppLayout />
    </StoreProvider>
  );
}

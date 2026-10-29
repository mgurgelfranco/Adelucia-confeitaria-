import React, { useState } from 'react';
import { X, FileText, ExternalLink } from 'lucide-react';
import { ATELIER_INFO } from '../data/seedData';

interface MenuPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MenuPdfModal: React.FC<MenuPdfModalProps> = ({ isOpen, onClose }) => {
  const [activeDoc, setActiveDoc] = useState<'bolos' | 'brigadeiros'>('bolos');

  if (!isOpen) return null;

  const pdfUrl =
    activeDoc === 'bolos'
      ? ATELIER_INFO.pdfs.bolos
      : ATELIER_INFO.pdfs.brigadeiros_sobremesas;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl border border-[#EFE2E6]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F2E6EA] bg-[#FDF8FA] px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#9E586F]" />
            <div>
              <h2 id="pdf-modal-title" className="font-display text-xl font-semibold text-[#231F20]">
                Cardápios Originais em PDF — Adê Andrade 2026
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-[#F3E6EA] p-1">
              <button
                type="button"
                onClick={() => setActiveDoc('bolos')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeDoc === 'bolos'
                    ? 'bg-white text-[#231F20] shadow-xs'
                    : 'text-[#6E6064] hover:text-[#231F20]'
                }`}
              >
                Menu Bolos 2026
              </button>
              <button
                type="button"
                onClick={() => setActiveDoc('brigadeiros')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeDoc === 'brigadeiros'
                    ? 'bg-white text-[#231F20] shadow-xs'
                    : 'text-[#6E6064] hover:text-[#231F20]'
                }`}
              >
                Brigadeiros & Sobremesas 2026
              </button>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D2D7] bg-white px-3 py-1.5 text-xs font-medium text-[#231F20] hover:bg-[#FAF3F5] whitespace-nowrap shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir PDF
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar visualização do cardápio PDF"
              className="rounded-lg p-2 text-[#6E6266] hover:bg-[#F5E6EB] hover:text-[#231F20]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#FAF5F7] p-4">
          <iframe
            src={pdfUrl}
            title={
              activeDoc === 'bolos'
                ? 'Menu Adê Andrade 2026 - Bolos'
                : 'Menu Adê Andrade 2026 - Brigadeiros e Sobremesas'
            }
            className="h-full w-full rounded-xl border border-[#E8D8DD] bg-white"
          />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Sparkles,
  FileText,
  MapPin,
  Clock,
  Plus,
  Minus,
  X,
  Check,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ATELIER_INFO } from '../data/seedData';
import { ProductCategory, Produto } from '../types';
import { buildDoubtWhatsAppUrl, formatCurrencyBRL } from '../utils/schedulingEngine';

interface PublicStorefrontProps {
  onOpenCakeBuilder: () => void;
  onOpenPdfModal: () => void;
  onOpenCartDrawer: () => void;
}

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  onOpenCakeBuilder,
  onOpenPdfModal,
  onOpenCartDrawer,
}) => {
  const { produtos, settings, addToCart } = useStore();
  const doubtWhatsAppUrl = buildDoubtWhatsAppUrl(
    settings.whatsapp_numero,
    settings.mensagem_duvidas
  );

  const [selectedCategory, setSelectedCategory] = useState<'todos' | ProductCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProductModal, setActiveProductModal] = useState<Produto | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [recentAddedId, setRecentAddedId] = useState<string | null>(null);

  const activeProdutos = useMemo(
    () => produtos.filter((p) => p.ativo),
    [produtos]
  );

  const filteredProdutos = useMemo(() => {
    return activeProdutos.filter((p) => {
      const matchesCategory =
        selectedCategory === 'todos' || p.categoria === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.nome.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.subcategoria.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeProdutos, selectedCategory, searchQuery]);

  const handleOpenProductModal = (produto: Produto) => {
    setActiveProductModal(produto);
    setItemQuantity(1);
    setItemNotes('');
  };

  const handleQuickAddWithModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProductModal) return;
    addToCart(activeProductModal, itemQuantity, itemNotes);
    const id = activeProductModal.id;
    setActiveProductModal(null);
    setRecentAddedId(id);
    setTimeout(() => setRecentAddedId(null), 1600);
    onOpenCartDrawer();
  };

  const categoryCounts = useMemo(() => {
    return {
      todos: activeProdutos.length,
      bolos: activeProdutos.filter((p) => p.categoria === 'bolos').length,
      doces: activeProdutos.filter((p) => p.categoria === 'doces').length,
      kits: activeProdutos.filter((p) => p.categoria === 'kits').length,
    };
  }, [activeProdutos]);

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Editorial Hero Section */}
      <section className="relative overflow-hidden border-b border-[#EFE3E7] bg-gradient-to-b from-[#FDF6F8] to-[#FCF9F8] pt-10 pb-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="text-xs font-medium tracking-widest text-[#9E586F] uppercase">
                Ateliê Adê Andrade · Aracaju / Bairro Luzia · Menu 2026
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold leading-[1.1] text-[#231F20]"
                style={{ textWrap: 'balance' }}
              >
                Confeitaria autoral para momentos que não se repetem.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#5C5054]">
                Cada doce nasce do cuidado com os detalhes, da escolha dos ingredientes e do
                respeito ao significado de cada celebração. Encomende online com validação em
                tempo real da nossa agenda de produção.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenCakeBuilder}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#231F20] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#3A3235] transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-4 w-4 text-[#F2C6D4]" />
                  Monte seu Bolo Personalizado
                </button>

                <button
                  type="button"
                  onClick={onOpenPdfModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#DFCFD5] bg-white px-5 py-3.5 text-sm font-semibold text-[#231F20] hover:bg-[#FAF2F5] transition-colors whitespace-nowrap shrink-0"
                >
                  <FileText className="h-4 w-4 text-[#9E586F]" />
                  Ver Cardápios PDF 2026
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-[#7D6F74]">
                <span>Retirada no Bairro Luzia ou Delivery</span>
                <span aria-hidden="true">·</span>
                <span>Reserva mediante 50% de sinal</span>
                <span aria-hidden="true">·</span>
                <a
                  href={doubtWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#9E586F] hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  <span>Dúvidas: {settings.telefone_exibicao}</span>
                </a>
              </div>
            </div>

            {/* Featured Showcase Card */}
            <div className="lg:col-span-5 flex">
              <div className="flex w-full flex-col justify-between rounded-2xl border border-[#EAD8DF] bg-white p-6 shadow-xs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#8C7A80]">
                    <span>Destaques da Temporada 2026</span>
                    <span className="font-mono">Produção Sob Encomenda</span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#F3E6EA] bg-white p-3">
                    <img
                      src={
                        activeProdutos.find((p) => p.id === 'bolo-vintage-15')?.foto_url ||
                        activeProdutos[0]?.foto_url
                      }
                      alt="Bolo Vintage Lambeth Adê Andrade Confeitaria"
                      referrerPolicy="no-referrer"
                      className="h-56 w-full object-contain"
                    />
                  </div>

                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                      Linha Vintage Lambeth & Bolos de Andar
                    </h2>
                    <p className="mt-1 text-sm text-[#5C5054]">
                      Massas artesanais (Branca, Chocolate, Mista ou Red Velvet) combinadas com
                      recheios autorais de Pistache, Ninho com Frutas Vermelhas, Queijo do Reino
                      e Brigadeiro Belga.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#F2E6EA] pt-4 text-xs text-[#6E6064]">
                  <span>Antecedência: 1 a 5 dias conforme modelo</span>
                  <a
                    href="#catalogo"
                    className="font-semibold text-[#9E586F] hover:underline whitespace-nowrap shrink-0"
                  >
                    Explorar Catálogo ↓
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Catalog & Filter Section */}
      <section id="catalogo" className="mx-auto max-w-6xl px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EFE3E7] pb-6">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#9E586F] uppercase">
              Cardápio Digital & Encomendas
            </span>
            <h2 className="font-display text-3xl font-semibold text-[#231F20] mt-1">
              Catálogo Autoral 2026
            </h2>
          </div>

          {/* Search & Interactive Segmented Category Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A80]" />
              <input
                type="search"
                aria-label="Buscar produtos no catálogo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar bolo, pistache, taça..."
                className="w-full rounded-xl border border-[#DFCFD5] bg-white pl-10 pr-4 py-2 text-sm text-[#231F20] placeholder-[#9C8D92] focus:border-[#C4708B] focus:outline-none"
              />
            </div>

            <div
              role="tablist"
              aria-label="Filtrar por categoria"
              className="flex items-center gap-1 rounded-xl bg-[#F4E9ED] p-1 overflow-x-auto"
            >
              {(
                [
                  { id: 'todos', label: `Todos (${categoryCounts.todos})` },
                  { id: 'bolos', label: `Bolos (${categoryCounts.bolos})` },
                  { id: 'doces', label: `Doces & Sobremesas (${categoryCounts.doces})` },
                  { id: 'kits', label: `Kits & Fatias (${categoryCounts.kits})` },
                ] as const
              ).map((tab) => {
                const active = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#231F20] shadow-xs'
                        : 'text-[#6E5E63] hover:text-[#231F20]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProdutos.length === 0 ? (
          <div className="rounded-2xl border border-[#EFE2E6] bg-white p-12 text-center">
            <h3 className="font-display text-2xl font-semibold text-[#231F20]">
              Nenhum item encontrado para "{searchQuery}"
            </h3>
            <p className="mt-1 text-sm text-[#6E6064]">
              Tente limpar o filtro de busca ou use o construtor personalizado "Monte seu Bolo".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('todos');
              }}
              className="mt-4 rounded-xl bg-[#231F20] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3A3235]"
            >
              Mostrar Todos os Produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredProdutos.map((produto) => {
              const isJustAdded = recentAddedId === produto.id;
              return (
                <article
                  key={produto.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE0E4] bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-white p-3 border-b border-[#F4EAEB]">
                    <img
                      src={produto.foto_url}
                      alt={produto.nome}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                    <div className="space-y-1.5">
                      {/* Unboxed quiet metadata with typographic separators */}
                      <div className="flex items-center gap-1.5 text-xs text-[#8C7A80]">
                        <span className="uppercase tracking-wider font-medium text-[#9E586F]">
                          {produto.subcategoria}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Preparo: {produto.tempo_preparo_dias}d</span>
                      </div>

                      <h3 className="text-base font-semibold text-[#231F20] leading-snug">
                        {produto.nome}
                      </h3>

                      {produto.rendimento && (
                        <div className="text-xs font-medium text-[#6E5E63]">
                          Rendimento: {produto.rendimento}
                        </div>
                      )}

                      <p className="text-xs text-[#6E6064] leading-relaxed line-clamp-3">
                        {produto.descricao}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#F4EAEB] pt-3.5">
                      <div>
                        <span className="block text-[11px] text-[#8C7A80]">Valor base</span>
                        <span className="font-mono text-base font-bold text-[#231F20] tabular-nums">
                          {formatCurrencyBRL(produto.preco_base)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenProductModal(produto)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F20] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Adicionado
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Encomendar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Atelier Info, Payment Rules, Location & Contact Section */}
      <section
        id="informacoes"
        className="mx-auto max-w-6xl px-6 pt-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 rounded-2xl border border-[#EAD8DF] bg-[#FDF8FA] p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
              <MapPin className="h-4 w-4" />
              <span>Localização do Ateliê</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#231F20]">
              {ATELIER_INFO.endereco}
            </h3>
            <p className="text-xs text-[#5C5054] leading-relaxed">
              {ATELIER_INFO.referencia}. Retiradas com hora marcada conforme agendamento prévio.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
              <Clock className="h-4 w-4" />
              <span>Regras de Agendamento</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#231F20]">
              Produção Artesanal Sob Medida
            </h3>
            <p className="text-xs text-[#5C5054] leading-relaxed">
              Cada item possui antecedência mínima de 1 a 5 dias. Nosso motor bloqueia
              automaticamente horários que atingem o limite de capacidade da cozinha.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
              Formalização & Pagamento
            </div>
            <h3 className="font-display text-xl font-semibold text-[#231F20]">
              Sinal de 50% no Ato do Pedido
            </h3>
            <p className="text-xs text-[#5C5054] leading-relaxed">
              Aceitamos <strong>PIX (CNPJ: {ATELIER_INFO.cnpj_pix})</strong>, Cartão de Crédito
              (até 3x com juros) e Dinheiro.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
              <MessageCircle className="h-4 w-4" />
              <span>Atendimento & Dúvidas</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-[#231F20] font-mono tabular-nums">
              {settings.telefone_exibicao}
            </h3>
            <p className="text-xs text-[#5C5054] leading-relaxed">
              Precisa de ajuda com tamanhos, topo de bolo ou sabores? Fale direto com nosso ateliê.
            </p>
            <a
              href={doubtWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Tirar Dúvidas no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Modal de Adição com Observações */}
      {activeProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl border border-[#EFE2E6]">
            <div className="flex items-center justify-between border-b border-[#F2E6EA] bg-[#FDF8FA] px-6 py-4">
              <div>
                <span className="text-xs text-[#9E586F] font-medium">
                  {activeProductModal.subcategoria} · Preparo {activeProductModal.tempo_preparo_dias}d
                </span>
                <h3
                  id="add-item-modal-title"
                  className="font-display text-xl font-semibold text-[#231F20]"
                >
                  {activeProductModal.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveProductModal(null)}
                aria-label="Fechar janela do produto"
                className="rounded-lg p-1.5 text-[#6E6266] hover:bg-[#F5E6EB]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddWithModal} className="p-6 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-[#F2E6EA] bg-[#FDF9FA] p-3">
                <img
                  src={activeProductModal.foto_url}
                  alt={activeProductModal.nome}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-lg bg-white object-contain p-1 border border-[#EFE2E6] shrink-0"
                />
                <p className="text-xs text-[#5C5054] leading-relaxed">
                  {activeProductModal.descricao}
                </p>
              </div>

              <div>
                <label
                  htmlFor="modal-item-notes"
                  className="block text-xs font-semibold text-[#231F20] mb-1.5"
                >
                  Observações / Escolha de Sabores ou Escrita no Topo
                </label>
                <textarea
                  id="modal-item-notes"
                  rows={3}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Ex: Sabor Ninho e Castanha / Geleia de Frutas Vermelhas / Plaquinha 'Parabéns'..."
                  className="w-full rounded-xl border border-[#DFD2D6] px-3 py-2 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="block text-xs font-semibold text-[#231F20] mb-1">
                    Quantidade
                  </span>
                  <div className="inline-flex items-center rounded-xl border border-[#DFD2D6] bg-white">
                    <button
                      type="button"
                      onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Diminuir quantidade"
                      className="p-2.5 text-[#5C5255] hover:bg-[#FAF2F5]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 font-mono text-sm font-bold tabular-nums">
                      {itemQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItemQuantity((q) => q + 1)}
                      aria-label="Aumentar quantidade"
                      className="p-2.5 text-[#5C5255] hover:bg-[#FAF2F5]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-xs text-[#7D6F74]">Subtotal</span>
                  <span className="font-mono text-xl font-bold text-[#231F20] tabular-nums">
                    {formatCurrencyBRL(activeProductModal.preco_base * itemQuantity)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#231F20] py-3 text-sm font-semibold text-white hover:bg-[#9E586F] transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Adicionar à Cesta e Escolher Data
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

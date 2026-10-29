import React, { useState, useMemo } from 'react';
import { X, Sparkles, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { CAKE_BUILDER_CONFIG, ATELIER_INFO } from '../data/seedData';
import { useStore } from '../context/StoreContext';
import { createPatisserieSvgUrl } from '../utils/patisserieArt';
import { formatCurrencyBRL } from '../utils/schedulingEngine';
import { Produto } from '../types';

interface CakeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddedToCart: () => void;
}

export const CakeBuilderModal: React.FC<CakeBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddedToCart,
}) => {
  const { addToCart } = useStore();

  const [estiloId, setEstiloId] = useState(CAKE_BUILDER_CONFIG.estilos[0].id);
  const [tamanhoIdx, setTamanhoIdx] = useState(1); // default 15cm
  const [massaNome, setMassaNome] = useState(CAKE_BUILDER_CONFIG.massas[0].nome);
  const [recheio1Nome, setRecheio1Nome] = useState(CAKE_BUILDER_CONFIG.recheios[0].nome);
  const [recheio2Nome, setRecheio2Nome] = useState(CAKE_BUILDER_CONFIG.recheios[1].nome);
  const [adicionaisIds, setAdicionaisIds] = useState<string[]>([]);
  const [blindagemGanache, setBlindagemGanache] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  const estiloAtual = useMemo(
    () =>
      CAKE_BUILDER_CONFIG.estilos.find((e) => e.id === estiloId) ||
      CAKE_BUILDER_CONFIG.estilos[0],
    [estiloId]
  );

  const tamanhoAtual = useMemo(
    () => estiloAtual.tamanhos[tamanhoIdx] || estiloAtual.tamanhos[0],
    [estiloAtual, tamanhoIdx]
  );

  const massaAtual = useMemo(
    () =>
      CAKE_BUILDER_CONFIG.massas.find((m) => m.nome === massaNome) ||
      CAKE_BUILDER_CONFIG.massas[0],
    [massaNome]
  );

  const recheio1 = useMemo(
    () =>
      CAKE_BUILDER_CONFIG.recheios.find((r) => r.nome === recheio1Nome) ||
      CAKE_BUILDER_CONFIG.recheios[0],
    [recheio1Nome]
  );

  const recheio2 = useMemo(
    () =>
      CAKE_BUILDER_CONFIG.recheios.find((r) => r.nome === recheio2Nome) ||
      CAKE_BUILDER_CONFIG.recheios[0],
    [recheio2Nome]
  );

  const isBabyCake = estiloAtual.id === 'baby-cake';

  const precoCalculado = useMemo(() => {
    let base = tamanhoAtual.preco;
    if (!isBabyCake) {
      base += massaAtual.acrescimo;
      base += recheio1.acrescimo_camada;
      base += recheio2.acrescimo_camada;
    }
    const somaAdicionais = adicionaisIds.reduce((acc, id) => {
      const item = CAKE_BUILDER_CONFIG.adicionais.find((a) => a.id === id);
      return acc + (item ? item.preco : 0);
    }, 0);
    let subtotal = base + somaAdicionais;
    if (blindagemGanache) {
      subtotal = Math.round(subtotal * 1.1);
    }
    return subtotal;
  }, [tamanhoAtual, isBabyCake, massaAtual, recheio1, recheio2, adicionaisIds, blindagemGanache]);

  if (!isOpen) return null;

  const toggleAdicional = (id: string) => {
    setAdicionaisIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmCustomCake = (e: React.FormEvent) => {
    e.preventDefault();
    const nomesAdicionais = adicionaisIds
      .map((id) => CAKE_BUILDER_CONFIG.adicionais.find((a) => a.id === id)?.nome)
      .filter(Boolean);

    const detalhesPartes = [
      `Massa: ${massaAtual.nome}`,
      isBabyCake
        ? `Recheio: ${recheio1.nome}`
        : `Camada 1: ${recheio1.nome} | Camada 2: ${recheio2.nome}`,
      nomesAdicionais.length > 0 ? `Adicionais: ${nomesAdicionais.join(', ')}` : '',
      blindagemGanache ? 'Com Blindagem Ganache (+10% viagem)' : '',
      observacoes.trim() ? `Detalhes/Cores/Topo: ${observacoes.trim()}` : '',
    ].filter(Boolean);

    const produtoVirtual: Produto = {
      id: `custom-${estiloAtual.id}-${tamanhoAtual.tam.replace(/\s+/g, '')}`,
      nome: `${estiloAtual.nome} (${tamanhoAtual.tam})`,
      categoria: 'bolos',
      subcategoria: 'Monte seu Bolo',
      preco_base: precoCalculado,
      descricao: `Bolo personalizado (${tamanhoAtual.fatias})`,
      foto_url: createPatisserieSvgUrl(
        estiloAtual.id === 'vintage'
          ? 'bolo-vintage'
          : estiloAtual.id === 'coracao'
          ? 'bolo-coracao'
          : estiloAtual.id === 'mil-folhas'
          ? 'bolo-milfolhas'
          : estiloAtual.id === 'pintados'
          ? 'bolo-pintado'
          : 'bolo-tradicional',
        `${estiloAtual.nome} ${tamanhoAtual.tam}`
      ),
      tempo_preparo_dias: estiloAtual.tempo_preparo_dias,
      ativo: true,
      rendimento: tamanhoAtual.fatias,
    };

    addToCart(
      produtoVirtual,
      1,
      detalhesPartes.join(' · '),
      precoCalculado,
      `${estiloAtual.nome} (${tamanhoAtual.tam} · ${tamanhoAtual.fatias})`
    );
    onAddedToCart();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cake-builder-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl border border-[#EFE2E6]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2E6EA] bg-[#FDF8FA] px-6 py-4">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#9E586F] uppercase">
              Confeitaria Autoral · Cardápio 2026
            </span>
            <h2 id="cake-builder-title" className="font-display text-2xl font-semibold text-[#231F20]">
              Monte seu Bolo Personalizado
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar construtor de bolo"
            className="rounded-lg p-2 text-[#6E6266] hover:bg-[#F5E6EB] hover:text-[#231F20] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmCustomCake} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Estilo do Bolo */}
          <div>
            <label className="block text-sm font-semibold text-[#231F20] mb-2">
              1. Escolha o Estilo de Acabamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CAKE_BUILDER_CONFIG.estilos.map((est) => {
                const selected = est.id === estiloId;
                return (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => {
                      setEstiloId(est.id);
                      setTamanhoIdx(0);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20] shadow-xs'
                        : 'border-[#EAE0E3] bg-white text-[#5C5255] hover:border-[#D9B8C3]'
                    }`}
                  >
                    <span className="text-sm font-semibold">{est.nome}</span>
                    <span className="mt-1 text-xs text-[#8A7B80] font-mono tabular-nums">
                      A partir de {formatCurrencyBRL(est.tamanhos[0].preco)} · {est.tempo_preparo_dias}d preparo
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tamanho e Rendimento */}
          <div>
            <label className="block text-sm font-semibold text-[#231F20] mb-2">
              2. Tamanho e Quantidade de Fatias
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {estiloAtual.tamanhos.map((t, idx) => {
                const selected = idx === tamanhoIdx;
                return (
                  <button
                    key={t.tam}
                    type="button"
                    onClick={() => setTamanhoIdx(idx)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20]'
                        : 'border-[#EAE0E3] bg-white text-[#5C5255] hover:border-[#D9B8C3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{t.tam}</span>
                      <span className="font-mono text-xs font-semibold text-[#9E586F] tabular-nums">
                        {formatCurrencyBRL(t.preco)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[#7D6F74]">{t.fatias}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Massa */}
          <div>
            <label className="block text-sm font-semibold text-[#231F20] mb-2">
              3. Escolha a Massa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CAKE_BUILDER_CONFIG.massas
                .filter((m) => !isBabyCake || m.nome === 'Branca' || m.nome === 'Chocolate')
                .map((m) => {
                  const selected = m.nome === massaNome;
                  return (
                    <button
                      key={m.nome}
                      type="button"
                      onClick={() => setMassaNome(m.nome)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                        selected
                          ? 'border-[#C4708B] bg-[#FDF4F7] font-semibold text-[#231F20]'
                          : 'border-[#EAE0E3] bg-white text-[#5C5255] hover:border-[#D9B8C3]'
                      }`}
                    >
                      <div>{m.nome}</div>
                      <div className="text-xs text-[#8A7B80] font-mono tabular-nums">
                        {m.acrescimo > 0 ? `+ ${formatCurrencyBRL(m.acrescimo)}` : 'Incluso'}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 4. Camadas de Recheio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="recheio-camada-1"
                className="block text-sm font-semibold text-[#231F20] mb-1.5"
              >
                {isBabyCake ? '4. Sabor do Recheio' : '4. Recheio — 1ª Camada'}
              </label>
              <select
                id="recheio-camada-1"
                value={recheio1Nome}
                onChange={(e) => setRecheio1Nome(e.target.value)}
                className="w-full rounded-xl border border-[#DFD2D6] bg-white px-3.5 py-2.5 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
              >
                {CAKE_BUILDER_CONFIG.recheios
                  .filter(
                    (r) => !isBabyCake || r.nome === 'Ninho' || r.nome === 'Brigadeiro'
                  )
                  .map((r) => (
                    <option key={r.nome} value={r.nome}>
                      {r.nome} — {r.grupo}
                    </option>
                  ))}
              </select>
            </div>

            {!isBabyCake && (
              <div>
                <label
                  htmlFor="recheio-camada-2"
                  className="block text-sm font-semibold text-[#231F20] mb-1.5"
                >
                  5. Recheio — 2ª Camada
                </label>
                <select
                  id="recheio-camada-2"
                  value={recheio2Nome}
                  onChange={(e) => setRecheio2Nome(e.target.value)}
                  className="w-full rounded-xl border border-[#DFD2D6] bg-white px-3.5 py-2.5 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                >
                  {CAKE_BUILDER_CONFIG.recheios.map((r) => (
                    <option key={r.nome} value={r.nome}>
                      {r.nome} — {r.grupo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 5. Acréscimos e Finalização */}
          <div>
            <span className="block text-sm font-semibold text-[#231F20] mb-2">
              Acréscimos Opcionais (Cerejas, Drip Cake, Macarons e Blindagem)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAKE_BUILDER_CONFIG.adicionais.map((adic) => {
                const checked = adicionaisIds.includes(adic.id);
                return (
                  <button
                    key={adic.id}
                    type="button"
                    onClick={() => toggleAdicional(adic.id)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs transition-all ${
                      checked
                        ? 'border-[#C4708B] bg-[#FDF4F7] font-medium text-[#231F20]'
                        : 'border-[#EAE0E3] bg-white text-[#5C5255] hover:border-[#D9B8C3]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          checked
                            ? 'border-[#C4708B] bg-[#C4708B] text-white'
                            : 'border-[#C9BDC1]'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {adic.nome}
                    </span>
                    <span className="font-mono font-semibold text-[#9E586F] tabular-nums">
                      + {formatCurrencyBRL(adic.preco)}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setBlindagemGanache((v) => !v)}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs transition-all sm:col-span-2 ${
                  blindagemGanache
                    ? 'border-[#C4708B] bg-[#FDF4F7] font-medium text-[#231F20]'
                    : 'border-[#EAE0E3] bg-white text-[#5C5255] hover:border-[#D9B8C3]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      blindagemGanache
                        ? 'border-[#C4708B] bg-[#C4708B] text-white'
                        : 'border-[#C9BDC1]'
                    }`}
                  >
                    {blindagemGanache && <Check className="h-3 w-3" />}
                  </span>
                  Blindagem em Ganache (Indicado para transporte em viagem — +10% do valor do bolo)
                </span>
                <span className="font-mono font-semibold text-[#9E586F] tabular-nums">+10%</span>
              </button>
            </div>
          </div>

          {/* 6. Observações da decoração */}
          <div>
            <label
              htmlFor="custom-cake-obs"
              className="block text-sm font-semibold text-[#231F20] mb-1.5"
            >
              Cores da Decoração, Frase ou Tema do Bolo
            </label>
            <textarea
              id="custom-cake-obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Tons rosa claro e dourado, escrita 'Hello 27' no topo..."
              className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
            />
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[#7D6F74]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#B86B82] mt-0.5" />
              <span>
                {ATELIER_INFO.aviso_cores} {ATELIER_INFO.aviso_flores}
              </span>
            </p>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F2E6EA] pt-4">
            <div>
              <div className="text-xs text-[#7D6F74]">
                Antecedência mínima de preparo: <strong>{estiloAtual.tempo_preparo_dias} dia(s)</strong>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-[#5C5255]">Total estimado:</span>
                <span className="font-mono text-2xl font-bold text-[#231F20] tabular-nums">
                  {formatCurrencyBRL(precoCalculado)}
                </span>
              </div>
            </div>
            <button
              type="submit"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#231F20] px-6 py-3 text-sm font-semibold text-white hover:bg-[#3A3235] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              Adicionar Bolo à Encomenda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

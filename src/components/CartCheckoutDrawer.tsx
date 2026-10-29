import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Clock,
  MapPin,
  Store,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ATELIER_INFO } from '../data/seedData';
import {
  addDaysISO,
  evaluateDayAvailability,
  formatCurrencyBRL,
  formatDateBR,
  getRequiredLeadDays,
  getTodayISO,
} from '../utils/schedulingEngine';
import { DeliveryType, PaymentMethod, Pedido } from '../types';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAXA_ENTREGA_PADRAO = 20.0;

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    cart,
    configs,
    pedidos,
    bloqueios,
    settings,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    createOrder,
  } = useStore();

  const [step, setStep] = useState<'cart' | 'step1' | 'step2' | 'step3' | 'confirmed'>('cart');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<DeliveryType>('retirada');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('PIX');
  const [selectedDateISO, setSelectedDateISO] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Pedido | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const todayISO = useMemo(() => getTodayISO(), []);
  const requiredLeadDays = useMemo(() => getRequiredLeadDays(cart), [cart]);

  // Próximos 21 dias avaliados pelo motor de agendamento
  const availableDaysList = useMemo(() => {
    const days = [];
    for (let i = 0; i < 21; i++) {
      const targetDateISO = addDaysISO(todayISO, i);
      const dayEval = evaluateDayAvailability({
        targetDateISO,
        todayISO,
        requiredLeadDays,
        configs,
        pedidos,
        bloqueios,
      });
      days.push(dayEval);
    }
    return days;
  }, [todayISO, requiredLeadDays, configs, pedidos, bloqueios]);

  // Seleciona automaticamente a primeira data disponível quando o carrinho ou lead time muda
  useEffect(() => {
    const firstValid = availableDaysList.find((d) => d.disponivel);
    if (firstValid) {
      if (
        !selectedDateISO ||
        !availableDaysList.find((d) => d.data === selectedDateISO)?.disponivel
      ) {
        setSelectedDateISO(firstValid.data);
        const firstSlot = firstValid.slots.find((s) => s.disponivel);
        setSelectedSlot(firstSlot ? firstSlot.hora : '');
      }
    }
  }, [availableDaysList, selectedDateISO]);

  const selectedDayEval = useMemo(
    () => availableDaysList.find((d) => d.data === selectedDateISO) || null,
    [availableDaysList, selectedDateISO]
  );

  const subtotalItens = useMemo(
    () => cart.reduce((acc, item) => acc + item.valor_unitario * item.quantidade, 0),
    [cart]
  );

  const taxaEntrega = tipoEntrega === 'entrega' ? TAXA_ENTREGA_PADRAO : 0;
  const valorTotal = subtotalItens + taxaEntrega;
  const valorSinal50 = valorTotal / 2;

  if (!isOpen) return null;

  const handleProceedStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!clienteNome.trim() || clienteNome.trim().length < 3) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    const digits = clienteTelefone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrorMessage('Informe um telefone/WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }
    setStep('step2');
  };

  const handleProceedStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (tipoEntrega === 'entrega' && (!enderecoEntrega.trim() || enderecoEntrega.trim().length < 8)) {
      setErrorMessage('Informe o endereço completo para entrega (Rua, número, bairro).');
      return;
    }
    setStep('step3');
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDateISO) {
      setErrorMessage('Selecione uma data disponível na agenda.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Selecione um horário disponível para o agendamento.');
      return;
    }

    const result = createOrder({
      cliente_nome: clienteNome.trim(),
      cliente_telefone: clienteTelefone.trim(),
      tipo: tipoEntrega,
      endereco_entrega: tipoEntrega === 'entrega' ? enderecoEntrega.trim() : undefined,
      data_agendamento: selectedDateISO,
      hora_slot: selectedSlot,
      itens: cart,
      valor_total: valorTotal,
      taxa_entrega: taxaEntrega,
      forma_pagamento: formaPagamento,
      status_pagamento: 'aguardando_sinal_50',
      observacoes_gerais: observacoesGerais.trim() || undefined,
    });

    if (!result.success || !result.pedido) {
      setErrorMessage(result.error || 'Não foi possível confirmar o agendamento.');
      return;
    }

    setConfirmedOrder(result.pedido);
    clearCart();
    setStep('confirmed');
  };

  const handleCopyPix = () => {
    try {
      navigator.clipboard.writeText(ATELIER_INFO.cnpj_pix);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      // Ignore
    }
  };

  const buildWhatsAppUrl = (pedido: Pedido) => {
    const linhasItens = pedido.itens
      .map(
        (i) =>
          `• ${i.quantidade}x ${i.nome_produto} (${formatCurrencyBRL(
            i.valor_unitario * i.quantidade
          )})${i.observacoes ? ` — [${i.observacoes}]` : ''}`
      )
      .join('\n');

    const msg = [
      `Olá, *Adê Andrade Confeitaria*! Gostaria de formalizar meu pedido *#${pedido.id_pedido}*:`,
      ``,
      `*Cliente:* ${pedido.cliente_nome} (${pedido.cliente_telefone})`,
      `*Modalidade:* ${
        pedido.tipo === 'retirada'
          ? `Retirada no Ateliê (${ATELIER_INFO.endereco})`
          : `Entrega (${pedido.endereco_entrega})`
      }`,
      `*Agendamento:* ${formatDateBR(pedido.data_agendamento)} às ${pedido.hora_slot}`,
      ``,
      `*Itens da Encomenda:*`,
      linhasItens,
      ``,
      `*Total do Pedido:* ${formatCurrencyBRL(pedido.valor_total)}`,
      `*Sinal de 50% (Confirmação):* ${formatCurrencyBRL(pedido.valor_total / 2)}`,
      `*Forma de Pagamento:* ${pedido.forma_pagamento}`,
    ].join('\n');

    return `https://wa.me/${settings.whatsapp_numero}?text=${encodeURIComponent(msg)}`;
  };

  const resetAndClose = () => {
    setStep('cart');
    setErrorMessage('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-drawer-title"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-[#EFE2E6]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2E6EA] bg-[#FDF8FA] px-6 py-4">
          <div>
            <span className="text-xs font-medium text-[#9E586F]">
              {step === 'cart' && 'Sua Cesta de Encomendas'}
              {step === 'step1' && 'Passo 1 de 3 · Dados de Contato'}
              {step === 'step2' && 'Passo 2 de 3 · Retirada ou Entrega'}
              {step === 'step3' && 'Passo 3 de 3 · Agendamento & Pagamento'}
              {step === 'confirmed' && 'Encomenda Registrada com Sucesso'}
            </span>
            <h2
              id="checkout-drawer-title"
              className="font-display text-2xl font-semibold text-[#231F20]"
            >
              {step === 'cart' && 'Resumo da Encomenda'}
              {step === 'step1' && 'Identificação do Cliente'}
              {step === 'step2' && 'Modalidade de Recebimento'}
              {step === 'step3' && 'Data e Horário Disponível'}
              {step === 'confirmed' && `Pedido #${confirmedOrder?.id_pedido}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Fechar painel de encomenda"
            className="rounded-lg p-2 text-[#6E6266] hover:bg-[#F5E6EB] hover:text-[#231F20]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        {(step === 'step1' || step === 'step2' || step === 'step3') && (
          <div className="grid grid-cols-3 border-b border-[#F2E6EA] bg-[#FAF4F6] px-6 py-2.5 text-xs font-medium">
            <div className={step === 'step1' ? 'text-[#9E586F] font-semibold' : 'text-[#7D6F74]'}>
              1. Contato
            </div>
            <div className={step === 'step2' ? 'text-[#9E586F] font-semibold' : 'text-[#7D6F74]'}>
              2. Entrega
            </div>
            <div className={step === 'step3' ? 'text-[#9E586F] font-semibold' : 'text-[#7D6F74]'}>
              3. Agenda
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* VIEW: CART */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <div className="mb-3 rounded-full bg-[#FAF0F3] p-4 text-[#B86B82]">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#231F20]">
                    Sua cesta está vazia
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-[#6E6064]">
                    Adicione bolos comemorativos, brigadeiros gourmet ou sobremesas para consultar as datas disponíveis.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Antecedência mínima notice */}
                  <div className="rounded-xl border border-[#EED6DF] bg-[#FDF6F8] p-3.5 text-xs text-[#5C474E]">
                    <div className="font-semibold text-[#231F20]">
                      Regra de Produção Artesanal:
                    </div>
                    <p className="mt-0.5">
                      Pelos itens escolhidos, sua encomenda requer antecedência mínima de{' '}
                      <strong className="font-mono text-[#9E586F]">
                        {requiredLeadDays} dia(s)
                      </strong>{' '}
                      para preparo (disponível a partir de{' '}
                      <strong className="font-mono">
                        {formatDateBR(addDaysISO(todayISO, requiredLeadDays))}
                      </strong>
                      ).
                    </p>
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-[#F2E6EA] rounded-xl border border-[#EFE2E6] bg-white">
                    {cart.map((item) => (
                      <div key={item.id_item} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[#231F20]">
                              {item.nome_produto}
                            </h4>
                            <div className="text-xs text-[#7D6F74] font-mono tabular-nums">
                              {formatCurrencyBRL(item.valor_unitario)} / un · Preparo:{' '}
                              {item.tempo_preparo_dias}d
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id_item)}
                            aria-label={`Remover ${item.nome_produto}`}
                            className="text-[#9C8D92] hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {item.observacoes && (
                          <p className="rounded-lg bg-[#FAF5F7] px-2.5 py-1.5 text-xs text-[#5C4D52]">
                            Obs: {item.observacoes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center rounded-lg border border-[#E2D4D9] bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQuantity(item.id_item, item.quantidade - 1)
                              }
                              aria-label={`Diminuir quantidade de ${item.nome_produto}`}
                              className="p-1.5 text-[#5C5255] hover:bg-[#FAF2F5]"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-3 font-mono text-xs font-semibold tabular-nums">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQuantity(item.id_item, item.quantidade + 1)
                              }
                              aria-label={`Aumentar quantidade de ${item.nome_produto}`}
                              className="p-1.5 text-[#5C5255] hover:bg-[#FAF2F5]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span className="font-mono text-sm font-bold text-[#231F20] tabular-nums">
                            {formatCurrencyBRL(item.valor_unitario * item.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 1: CONTATO */}
          {step === 'step1' && (
            <form id="checkout-step1-form" onSubmit={handleProceedStep1} className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-nome"
                  className="block text-sm font-semibold text-[#231F20] mb-1.5"
                >
                  Nome Completo *
                </label>
                <input
                  id="checkout-nome"
                  type="text"
                  required
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Ana Beatriz Andrade"
                  className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2.5 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-telefone"
                  className="block text-sm font-semibold text-[#231F20] mb-1.5"
                >
                  WhatsApp com DDD *
                </label>
                <input
                  id="checkout-telefone"
                  type="tel"
                  required
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="Ex: (79) 99999-8888"
                  className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2.5 text-sm text-[#231F20] font-mono focus:border-[#C4708B] focus:outline-none"
                />
                <p className="mt-1 text-xs text-[#7D6F74]">
                  Utilizaremos este número para enviar o comprovante e atualizações de produção.
                </p>
              </div>

              <div>
                <label
                  htmlFor="checkout-obs-geral"
                  className="block text-sm font-semibold text-[#231F20] mb-1.5"
                >
                  Observações Adicionais do Pedido (Opcional)
                </label>
                <textarea
                  id="checkout-obs-geral"
                  rows={2}
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  placeholder="Ex: Entregar na portaria / Bolo com plaquinha de parabéns..."
                  className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                />
              </div>
            </form>
          )}

          {/* STEP 2: RETIRADA OU ENTREGA */}
          {step === 'step2' && (
            <form id="checkout-step2-form" onSubmit={handleProceedStep2} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoEntrega('retirada')}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    tipoEntrega === 'retirada'
                      ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20]'
                      : 'border-[#E6D9DD] bg-white text-[#5C5255]'
                  }`}
                >
                  <Store className="h-5 w-5 text-[#9E586F] mb-2" />
                  <span className="text-sm font-semibold">Retirada no Ateliê</span>
                  <span className="mt-1 text-xs text-[#7D6F74] font-mono">Grátis · Bairro Luzia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoEntrega('entrega')}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    tipoEntrega === 'entrega'
                      ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20]'
                      : 'border-[#E6D9DD] bg-white text-[#5C5255]'
                  }`}
                >
                  <Truck className="h-5 w-5 text-[#9E586F] mb-2" />
                  <span className="text-sm font-semibold">Delivery Seguro</span>
                  <span className="mt-1 text-xs text-[#7D6F74] font-mono tabular-nums">
                    Taxa fixa {formatCurrencyBRL(TAXA_ENTREGA_PADRAO)}
                  </span>
                </button>
              </div>

              {tipoEntrega === 'retirada' ? (
                <div className="rounded-xl border border-[#EFE2E6] bg-[#FAF6F7] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#9E586F]">
                    <MapPin className="h-4 w-4" />
                    <span>Endereço de Retirada — Adê Andrade Confeitaria</span>
                  </div>
                  <p className="text-sm font-semibold text-[#231F20]">
                    {ATELIER_INFO.endereco}
                  </p>
                  <p className="text-xs text-[#6E6064]">{ATELIER_INFO.referencia}</p>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="checkout-endereco"
                    className="block text-sm font-semibold text-[#231F20] mb-1.5"
                  >
                    Endereço Completo para Entrega *
                  </label>
                  <textarea
                    id="checkout-endereco"
                    rows={3}
                    required
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                    placeholder="Rua, Número, Condomínio/Apto, Bairro e Ponto de Referência"
                    className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2.5 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                  />
                </div>
              )}
            </form>
          )}

          {/* STEP 3: SELEÇÃO INTERATIVA DE DATA & HORA DISPONÍVEL */}
          {step === 'step3' && (
            <form id="checkout-step3-form" onSubmit={handleConfirmOrder} className="space-y-5">
              {/* Lead-time notice */}
              <div className="rounded-xl border border-[#EED6DF] bg-[#FDF6F8] p-3 text-xs text-[#5C474E]">
                Antecedência mínima calculada para os itens do seu pedido:{' '}
                <strong className="font-mono text-[#9E586F]">
                  {requiredLeadDays} dia(s) de preparo
                </strong>
                . Datas anteriores ou com capacidade máxima atingida ficam bloqueadas automaticamente.
              </div>

              {/* Date selector grid */}
              <div>
                <label className="block text-sm font-semibold text-[#231F20] mb-2">
                  1. Selecione a Data de {tipoEntrega === 'retirada' ? 'Retirada' : 'Entrega'} *
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                  {availableDaysList.slice(0, 15).map((day) => {
                    const isSelected = day.data === selectedDateISO;
                    const [y, m, d] = day.data.split('-');
                    const shortDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    const labelDia = shortDias[day.dia_semana];

                    return (
                      <button
                        key={day.data}
                        type="button"
                        disabled={!day.disponivel}
                        onClick={() => {
                          setSelectedDateISO(day.data);
                          const firstAvailableSlot = day.slots.find((s) => s.disponivel);
                          setSelectedSlot(firstAvailableSlot ? firstAvailableSlot.hora : '');
                        }}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                          !day.disponivel
                            ? 'cursor-not-allowed border-[#EFE9EB] bg-[#F7F4F5] text-[#B3A6AA] opacity-70'
                            : isSelected
                            ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20] shadow-xs'
                            : 'border-[#E6D9DD] bg-white text-[#3D3538] hover:border-[#D4ABB8]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between text-xs">
                          <span className="font-semibold">{labelDia}</span>
                          <span className="font-mono font-bold tabular-nums">
                            {d}/{m}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] leading-tight">
                          {day.disponivel ? (
                            <span className="text-emerald-700 font-medium">
                              {day.limite_max_dia - day.total_pedidos_dia} vagas no dia
                            </span>
                          ) : (
                            <span className="text-[#9E7B86] line-clamp-1">
                              {day.motivo_bloqueio || 'Indisponível'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot selector grid */}
              {selectedDayEval && (
                <div>
                  <label className="block text-sm font-semibold text-[#231F20] mb-2">
                    2. Escolha o Horário ({formatDateBR(selectedDateISO)}) *
                  </label>
                  {selectedDayEval.slots.length === 0 ? (
                    <p className="text-xs text-[#8A7B80]">
                      Nenhum horário configurado para este dia.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDayEval.slots.map((slot) => {
                        const isSelected = slot.hora === selectedSlot;
                        const vagasRestantes = Math.max(0, slot.limite - slot.ocupados);
                        return (
                          <button
                            key={slot.hora}
                            type="button"
                            disabled={!slot.disponivel}
                            onClick={() => setSelectedSlot(slot.hora)}
                            className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-center transition-all ${
                              !slot.disponivel
                                ? 'cursor-not-allowed border-[#EFE9EB] bg-[#F7F4F5] text-[#B3A6AA]'
                                : isSelected
                                ? 'border-[#C4708B] bg-[#231F20] text-white'
                                : 'border-[#E6D9DD] bg-white text-[#231F20] hover:border-[#C4708B]'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
                              <Clock className="h-3 w-3" />
                              {slot.hora}
                            </div>
                            <span
                              className={`mt-0.5 text-[10px] ${
                                !slot.disponivel
                                  ? 'text-[#B3A6AA]'
                                  : isSelected
                                  ? 'text-[#F2D7DF]'
                                  : 'text-[#7D6F74]'
                              }`}
                            >
                              {slot.disponivel
                                ? `${vagasRestantes} vaga(s)`
                                : slot.motivo_indisponivel || 'Esgotado'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="block text-sm font-semibold text-[#231F20] mb-2">
                  3. Forma de Pagamento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PIX', 'Crédito (Até 3x)', 'Dinheiro'] as PaymentMethod[]).map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setFormaPagamento(metodo)}
                      className={`rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all ${
                        formaPagamento === metodo
                          ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20]'
                          : 'border-[#E6D9DD] bg-white text-[#5C5255]'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-[#EED6DF] bg-[#FDF8FA] p-3.5 text-xs space-y-1.5">
                  <div className="font-semibold text-[#231F20]">
                    {ATELIER_INFO.regra_sinal}
                  </div>
                  <div className="flex items-center justify-between text-[#5C474E]">
                    <span>Sinal de 50% no ato do pedido:</span>
                    <strong className="font-mono text-sm text-[#9E586F] tabular-nums">
                      {formatCurrencyBRL(valorSinal50)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#F2E4E9]">
                    <span className="font-mono text-[#5C474E]">
                      Chave PIX (CNPJ): <strong>{ATELIER_INFO.cnpj_pix}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#9E586F] hover:underline"
                    >
                      {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedPix ? 'Copiado' : 'Copiar CNPJ'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* STEP 4: CONFIRMED RECEIPT */}
          {step === 'confirmed' && confirmedOrder && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                <h3 className="font-display text-2xl font-semibold text-[#231F20]">
                  Horário Reservado na Agenda!
                </h3>
                <p className="mt-1 text-xs text-[#5C5255]">
                  Seu pedido <strong className="font-mono">#{confirmedOrder.id_pedido}</strong> foi
                  registrado para{' '}
                  <strong>{formatDateBR(confirmedOrder.data_agendamento)}</strong> às{' '}
                  <strong className="font-mono">{confirmedOrder.hora_slot}</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[#EFE2E6] bg-[#FDF9FA] p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7D6F74]">Cliente:</span>
                  <span className="font-semibold text-[#231F20]">
                    {confirmedOrder.cliente_nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D6F74]">Recebimento:</span>
                  <span className="font-semibold text-[#231F20] capitalize">
                    {confirmedOrder.tipo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D6F74]">Valor Total:</span>
                  <span className="font-mono font-bold text-[#231F20] tabular-nums">
                    {formatCurrencyBRL(confirmedOrder.valor_total)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#EFE2E6] pt-2">
                  <span className="text-[#9E586F] font-semibold">Sinal 50% para confirmação:</span>
                  <span className="font-mono font-bold text-[#9E586F] tabular-nums">
                    {formatCurrencyBRL(confirmedOrder.valor_total / 2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D6F74]">Chave PIX (CNPJ):</span>
                  <span className="font-mono font-semibold text-[#231F20]">
                    {ATELIER_INFO.cnpj_pix}
                  </span>
                </div>
              </div>

              <a
                href={buildWhatsAppUrl(confirmedOrder)}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar Pedido #{confirmedOrder.id_pedido} no WhatsApp
              </a>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full rounded-xl border border-[#E2D4D9] bg-white py-2.5 text-xs font-semibold text-[#5C5255] hover:bg-[#FAF4F6]"
              >
                Voltar ao Catálogo
              </button>
            </div>
          )}
        </div>

        {/* Sticky Footer Totals & Actions */}
        {step !== 'confirmed' && cart.length > 0 && (
          <div className="border-t border-[#F2E6EA] bg-[#FDF8FA] p-6 space-y-4">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#6E6064]">
                <span>Subtotal dos itens:</span>
                <span className="font-mono tabular-nums">{formatCurrencyBRL(subtotalItens)}</span>
              </div>
              {tipoEntrega === 'entrega' && (
                <div className="flex justify-between text-[#6E6064]">
                  <span>Taxa de entrega:</span>
                  <span className="font-mono tabular-nums">{formatCurrencyBRL(taxaEntrega)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#231F20] pt-1">
                <span>Total da Encomenda:</span>
                <span className="font-mono tabular-nums">{formatCurrencyBRL(valorTotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {step !== 'cart' && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    if (step === 'step1') setStep('cart');
                    if (step === 'step2') setStep('step1');
                    if (step === 'step3') setStep('step2');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD2D6] bg-white px-4 py-3 text-xs font-semibold text-[#231F20] hover:bg-[#FAF3F5] whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}

              {step === 'cart' && (
                <button
                  type="button"
                  onClick={() => setStep('step1')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#231F20] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3A3235] transition-colors whitespace-nowrap shrink-0"
                >
                  Avançar para Agendamento
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 'step1' && (
                <button
                  type="submit"
                  form="checkout-step1-form"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#231F20] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3A3235] transition-colors whitespace-nowrap shrink-0"
                >
                  Escolher Retirada / Entrega
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 'step2' && (
                <button
                  type="submit"
                  form="checkout-step2-form"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#231F20] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3A3235] transition-colors whitespace-nowrap shrink-0"
                >
                  Selecionar Data e Horário
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 'step3' && (
                <button
                  type="submit"
                  form="checkout-step3-form"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9E586F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#87485D] transition-colors whitespace-nowrap shrink-0"
                >
                  Confirmar Agendamento
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

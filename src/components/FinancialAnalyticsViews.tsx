import React, { useState, useMemo } from 'react';
import {
  FileDown,
  TrendingUp,
  Wallet,
  Clock,
  Receipt,
  BarChart3,
  PieChart,
  CheckCircle2,
  Calendar,
  Eye,
  X,
} from 'lucide-react';
import {
  AtelierSettings,
  PaymentStatus,
  Pedido,
  Produto,
} from '../types';
import {
  computeFinancialReport,
  exportFinancialReportToPdf,
  getOrderCashAmounts,
  ReportPeriod,
} from '../utils/financialAnalytics';
import { formatCurrencyBRL, formatDateBR } from '../utils/schedulingEngine';
import { ATELIER_INFO } from '../data/seedData';

interface FinancialViewsProps {
  mode: 'faturamento' | 'relatorios';
  pedidos: Pedido[];
  produtos: Produto[];
  settings: AtelierSettings;
  todayISO: string;
  onUpdatePaymentStatus: (id_pedido: string, status: PaymentStatus) => void;
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  aguardando_sinal_50: 'Aguardando 50%',
  sinal_50_pago: 'Sinal 50% Pago',
  pago_integral: '100% Quitado',
};

export const FinancialAnalyticsViews: React.FC<FinancialViewsProps> = ({
  mode,
  pedidos,
  produtos,
  settings,
  todayISO,
  onUpdatePaymentStatus,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('mes');
  const [referenceDateISO, setReferenceDateISO] = useState<string>(todayISO);
  const [pdfFeedback, setPdfFeedback] = useState<string>('');
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState<boolean>(false);

  const report = useMemo(
    () =>
      computeFinancialReport({
        pedidos,
        produtos,
        period,
        referenceDateISO,
      }),
    [pedidos, produtos, period, referenceDateISO]
  );

  const handleGeneratePdf = () => {
    const fileName = exportFinancialReportToPdf(report, settings);
    setPdfFeedback(`PDF gerado e baixado: ${fileName}`);
    setTimeout(() => {
      setPdfFeedback('');
    }, 5000);
  };

  const maxDailyRevenue = useMemo(() => {
    const maxVal = Math.max(...report.dailySeries.map((d) => d.faturamento), 1);
    return maxVal;
  }, [report.dailySeries]);

  const maxProductRevenue = useMemo(() => {
    const maxVal = Math.max(
      ...report.productAnalytics.map((p) => p.faturamento_gerado),
      1
    );
    return maxVal;
  }, [report.productAnalytics]);

  return (
    <div className="space-y-6">
      {/* Top Filter & PDF Export Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-xl border border-[#EAD8DF] bg-white p-5">
        <div className="space-y-0.5 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
            {mode === 'faturamento'
              ? 'Caixa, Recebíveis & Meios de Pagamento'
              : 'Produtos, Vendas, Preço & Faturamento'}
          </span>
          <h2 className="font-display text-2xl font-semibold text-[#231F20]">
            {report.periodTitle}
          </h2>
          <p className="text-xs text-[#6E6064]">{report.periodRangeLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Switcher: Dia | Semana | Mês | Geral */}
          <div
            role="group"
            aria-label="Selecionar período do relatório"
            className="flex items-center gap-1 rounded-xl bg-[#F4E9ED] p-1 shrink-0"
          >
            {(
              [
                { id: 'dia', label: 'Dia' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mês' },
                { id: 'geral', label: 'Geral' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  period === p.id
                    ? 'bg-[#231F20] text-white shadow-xs'
                    : 'text-[#6E5E63] hover:text-[#231F20]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reference Date Input */}
          {period !== 'geral' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#DFCFD5] bg-[#FDF9FA] px-3 py-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-[#9E586F]" />
              <label htmlFor="fin-ref-date" className="sr-only">
                Data base do relatório
              </label>
              <input
                id="fin-ref-date"
                type="date"
                value={referenceDateISO}
                onChange={(e) =>
                  setReferenceDateISO(e.target.value || todayISO)
                }
                className="bg-transparent font-mono text-xs font-semibold text-[#231F20] focus:outline-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsReportPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9C4CC] bg-white px-3.5 py-2 text-xs font-semibold text-[#231F20] hover:bg-[#FAF0F4] transition-colors whitespace-nowrap shrink-0"
          >
            <Eye className="h-3.5 w-3.5 text-[#9E586F]" />
            Visualizar Relatório
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F20] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
          >
            <FileDown className="h-3.5 w-3.5" />
            Emitir PDF ({period === 'dia' ? 'Dia' : period === 'semana' ? 'Semana' : period === 'mes' ? 'Mês' : 'Geral'})
          </button>
        </div>
      </div>

      {pdfFeedback && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{pdfFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfFeedback('')}
            className="text-emerald-700 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Objective Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#7D6F74]">
            <span>Faturamento Bruto ({period.toUpperCase()})</span>
            <TrendingUp className="h-4 w-4 text-[#9E586F]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#231F20] tabular-nums">
            {formatCurrencyBRL(report.faturamentoBruto)}
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            {report.totalPedidosValidos} pedido(s) · {report.totalItensVendidos} itens vendidos
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#7D6F74]">
            <span>Caixa Recebido (Efetivado)</span>
            <Wallet className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
            {formatCurrencyBRL(report.receitaRecebida)}
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            Sinais 50% confirmados + 100% quitados
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#7D6F74]">
            <span>Saldo a Receber (Pendente)</span>
            <Clock className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-800 tabular-nums">
            {formatCurrencyBRL(report.saldoAReceber)}
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            Restante na retirada/entrega ou sinal pendente
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-[#7D6F74]">
            <span>Ticket Médio por Pedido</span>
            <Receipt className="h-4 w-4 text-[#9E586F]" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#231F20] tabular-nums">
            {formatCurrencyBRL(report.ticketMedio)}
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            Produtos: {formatCurrencyBRL(report.receitaProdutos)} · Entregas:{' '}
            {formatCurrencyBRL(report.receitaEntregas)}
          </div>
        </div>
      </div>

      {/* ================= VIEW 1: ABA DE FATURAMENTO ================= */}
      {mode === 'faturamento' && (
        <div className="space-y-6">
          {/* Analytical Charts Row: Daily Revenue Evolution & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Evolução de Faturamento Bruto vs. Caixa Recebido por Data */}
            <div className="lg:col-span-7 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                    Gráfico Analítico de Evolução Temporal
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#231F20]">
                    Faturamento Bruto vs. Caixa Recebido por Data
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-medium text-[#5C5054]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#231F20]" />
                    Faturamento Bruto
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#9E586F]" />
                    Caixa Recebido
                  </span>
                </div>
              </div>

              {report.dailySeries.length === 0 ? (
                <div className="rounded-xl border border-[#EFE2E6] bg-[#FAF6F7] p-8 text-center text-xs text-[#6E6064]">
                  Nenhuma movimentação financeira registrada neste período.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {report.dailySeries.map((pt) => {
                    const widthBruto = Math.max(
                      pt.faturamento > 0 ? 4 : 0,
                      Math.round((pt.faturamento / maxDailyRevenue) * 100)
                    );
                    const widthRecebido = Math.max(
                      pt.recebido > 0 ? 4 : 0,
                      Math.round((pt.recebido / maxDailyRevenue) * 100)
                    );

                    return (
                      <div
                        key={pt.dateISO}
                        className="rounded-xl border border-[#F2E6EA] bg-[#FDF9FA] p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#231F20] tabular-nums">
                              {formatDateBR(pt.dateISO)}
                            </span>
                            <span className="text-[11px] text-[#7D6F74]">
                              ({pt.pedidosCount} pedido(s) · {pt.itensCount} un.)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                            <span className="font-bold text-[#231F20]">
                              Bruto: {formatCurrencyBRL(pt.faturamento)}
                            </span>
                            <span className="font-semibold text-[#9E586F]">
                              Caixa: {formatCurrencyBRL(pt.recebido)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFE4E8]">
                            <div
                              className="h-full rounded-full bg-[#231F20] transition-all"
                              style={{ width: `${widthBruto}%` }}
                            />
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4E8]">
                            <div
                              className="h-full rounded-full bg-[#9E586F] transition-all"
                              style={{ width: `${widthRecebido}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Meios de Pagamento & Status de Recebimento */}
            <div className="lg:col-span-5 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-6">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                    Distribuição Financeira
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#231F20]">
                    Faturamento por Forma de Pagamento
                  </h3>
                </div>

                <div className="space-y-3">
                  {report.paymentMethods.map((pm) => (
                    <div key={pm.metodo} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#231F20]">
                          {pm.metodo}{' '}
                          <span className="font-normal text-[#7D6F74]">
                            ({pm.pedidosCount} ped.)
                          </span>
                        </span>
                        <span className="font-mono font-bold text-[#231F20] tabular-nums">
                          {formatCurrencyBRL(pm.valor)} ({pm.percentual}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F3E6EA]">
                        <div
                          className="h-full rounded-full bg-[#9E586F]"
                          style={{ width: `${Math.max(pm.percentual, pm.valor > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F2E6EA] pt-5 space-y-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                    Liquidez & Sinais de 50%
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#231F20]">
                    Situação de Recebimento dos Pedidos
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {report.paymentStatuses.map((st) => (
                    <div
                      key={st.status}
                      className="rounded-xl border border-[#EFE2E6] bg-[#FDF9FA] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#231F20]">
                          {st.label} ({st.pedidosCount})
                        </span>
                        <span className="font-mono font-bold text-[#231F20] tabular-nums">
                          {formatCurrencyBRL(st.valorTotalPedidos)} ({st.percentual}%)
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[#6E6064] tabular-nums">
                        <span>Em caixa: {formatCurrencyBRL(st.valorRecebidoCaixa)}</span>
                        <span>A receber: {formatCurrencyBRL(st.valorPendente)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Ledger Table (Extrato de Pedidos & Recebimentos) */}
          <div className="rounded-xl border border-[#EAD8DF] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE3E7] bg-[#FDF8FA] px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#231F20]">
                  Extrato Financeiro de Pedidos do Período ({report.validOrders.length})
                </h3>
                <p className="text-xs text-[#6E6064]">
                  Atualize a situação de pagamento (50% Sinal ou 100% Quitado) para recalcular o caixa imediatamente.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFE3E7] bg-[#FDFBFC] text-[11px] font-semibold uppercase tracking-wider text-[#7D6F74]">
                    <th className="py-3 px-4">Pedido / Data</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Meio de Pagamento</th>
                    <th className="py-3 px-4 text-right">Caixa Recebido</th>
                    <th className="py-3 px-4 text-right">Saldo a Receber</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-right">Status de Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E6EA] text-xs">
                  {report.validOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#7D6F74]">
                        Nenhum pedido ativo encontrado neste período.
                      </td>
                    </tr>
                  ) : (
                    report.validOrders.map((pedido) => {
                      const cash = getOrderCashAmounts(pedido);
                      return (
                        <tr key={pedido.id_pedido} className="hover:bg-[#FDF9FA]">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-[#231F20]">
                              #{pedido.id_pedido}
                            </span>
                            <span className="block text-[11px] text-[#6E6064]">
                              {formatDateBR(pedido.data_agendamento)} · {pedido.hora_slot}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#231F20]">
                              {pedido.cliente_nome}
                            </div>
                            <div className="font-mono text-[11px] text-[#7D6F74]">
                              {pedido.cliente_telefone}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#231F20]">
                            {pedido.forma_pagamento}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800 tabular-nums">
                            {formatCurrencyBRL(cash.recebido)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-amber-800 tabular-nums">
                            {formatCurrencyBRL(cash.pendente)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#231F20] tabular-nums">
                            {formatCurrencyBRL(pedido.valor_total)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              aria-label={`Status financeiro do pedido ${pedido.id_pedido}`}
                              value={pedido.status_pagamento}
                              onChange={(e) =>
                                onUpdatePaymentStatus(
                                  pedido.id_pedido,
                                  e.target.value as PaymentStatus
                                )
                              }
                              className="rounded-lg border border-[#E2D2D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#231F20]"
                            >
                              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ABA DE RELATÓRIOS FINANCEIROS ANALÍTICOS ================= */}
      {mode === 'relatorios' && (
        <div className="space-y-6">
          {/* Row 1: Top Products Chart (Revenue & Sales Volume) + Category Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Analytical Chart 1: Ranking de Produtos por Faturamento, Vendas e Preço */}
            <div className="lg:col-span-7 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                    Gráfico Analítico de Produtos
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#231F20]">
                    Faturamento, Volume de Vendas e Preço por Produto
                  </h3>
                </div>
                <BarChart3 className="h-5 w-5 text-[#9E586F]" />
              </div>

              {report.productAnalytics.length === 0 ? (
                <div className="rounded-xl border border-[#EFE2E6] bg-[#FAF6F7] p-8 text-center text-xs text-[#6E6064]">
                  Nenhuma venda de produto registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {report.productAnalytics.map((prod, idx) => {
                    const barWidth = Math.max(
                      6,
                      Math.round((prod.faturamento_gerado / maxProductRevenue) * 100)
                    );
                    return (
                      <div
                        key={`${prod.produto_id}-${idx}`}
                        className="rounded-xl border border-[#F2E6EA] bg-[#FDF9FA] p-3.5 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div>
                            <span className="font-semibold text-[#231F20]">
                              {idx + 1}. {prod.nome_produto}
                            </span>
                            <span className="ml-2 text-[11px] text-[#7D6F74]">
                              ({prod.subcategoria})
                            </span>
                          </div>
                          <div className="font-mono font-bold text-[#231F20] tabular-nums shrink-0">
                            {formatCurrencyBRL(prod.faturamento_gerado)}{' '}
                            <span className="text-[11px] font-normal text-[#9E586F]">
                              ({prod.percentual_receita}% da receita)
                            </span>
                          </div>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFE4E8]">
                          <div
                            className="h-full rounded-full bg-[#9E586F] transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#5C5054] tabular-nums">
                          <span>
                            Vendas: <strong>{prod.quantidade_vendida} un.</strong> em{' '}
                            {prod.pedidos_presenca} pedido(s)
                          </span>
                          <span>
                            Preço Base: {formatCurrencyBRL(prod.preco_base_catalogo)} · Preço
                            Praticado: <strong>{formatCurrencyBRL(prod.preco_medio_praticado)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Analytical Chart 2: Desempenho por Categoria & Estrutura de Preços do Catálogo */}
            <div className="lg:col-span-5 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                      Mix de Receita & Preço Médio
                    </span>
                    <h3 className="font-display text-xl font-semibold text-[#231F20]">
                      Análise por Categoria do Cardápio
                    </h3>
                  </div>
                  <PieChart className="h-5 w-5 text-[#9E586F]" />
                </div>

                <div className="space-y-3">
                  {report.categoryAnalytics.map((cat) => (
                    <div
                      key={cat.categoria}
                      className="rounded-xl border border-[#EFE2E6] bg-[#FDF9FA] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#231F20]">{cat.label}</span>
                        <span className="font-mono font-bold text-[#9E586F] tabular-nums">
                          {cat.percentual_receita}%
                        </span>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFE4E8]">
                        <div
                          className="h-full rounded-full bg-[#231F20]"
                          style={{
                            width: `${Math.max(
                              cat.percentual_receita,
                              cat.faturamento_gerado > 0 ? 5 : 0
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono tabular-nums">
                        <div>
                          <span className="block font-sans text-[#7D6F74]">Faturamento</span>
                          <strong className="text-[#231F20]">
                            {formatCurrencyBRL(cat.faturamento_gerado)}
                          </strong>
                        </div>
                        <div>
                          <span className="block font-sans text-[#7D6F74]">Volume</span>
                          <strong className="text-[#231F20]">
                            {cat.quantidade_vendida} un.
                          </strong>
                        </div>
                        <div>
                          <span className="block font-sans text-[#7D6F74]">Preço Médio</span>
                          <strong className="text-[#231F20]">
                            {formatCurrencyBRL(cat.preco_medio_item)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price vs Catalog Summary */}
              <div className="rounded-xl border border-[#EAD8DF] bg-[#FDF5F8] p-4 space-y-2">
                <div className="text-xs font-semibold text-[#231F20]">
                  Resumo de Precificação & Catálogo Ativo
                </div>
                <p className="text-[11px] text-[#5C5054]">
                  O catálogo conta atualmente com{' '}
                  <strong className="font-mono">
                    {produtos.filter((p) => p.ativo).length} produtos ativos
                  </strong>
                  . Use o botão <strong>"Emitir Relatório em PDF"</strong> no topo para baixar o
                  demonstrativo completo do Dia, Semana ou Mês.
                </p>
              </div>
            </div>
          </div>

          {/* Complete Analytical Product Table: Preço Base, Vendas e Faturamento */}
          <div className="rounded-xl border border-[#EAD8DF] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE3E7] bg-[#FDF8FA] px-6 py-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#231F20]">
                  Tabela Analítica de Produtos, Vendas, Preço e Faturamento
                </h3>
                <p className="text-xs text-[#6E6064]">
                  Comparativo entre preço base de tabela, preço unitário médio praticado, quantidade vendida e receita total gerada.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFE3E7] bg-[#FDFBFC] text-[11px] font-semibold uppercase tracking-wider text-[#7D6F74]">
                    <th className="py-3.5 px-4">Produto Comercializado</th>
                    <th className="py-3.5 px-4">Categoria / Linha</th>
                    <th className="py-3.5 px-4 text-right">Preço Base Catálogo</th>
                    <th className="py-3.5 px-4 text-right">Preço Médio Praticado</th>
                    <th className="py-3.5 px-4 text-center">Qtd. Vendida</th>
                    <th className="py-3.5 px-4 text-right">Faturamento do Produto</th>
                    <th className="py-3.5 px-4 text-right">% Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E6EA] text-xs">
                  {report.productAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#7D6F74]">
                        Nenhuma venda computada neste período.
                      </td>
                    </tr>
                  ) : (
                    report.productAnalytics.map((prod, idx) => (
                      <tr key={`${prod.produto_id}-${idx}`} className="hover:bg-[#FDF9FA]">
                        <td className="py-3.5 px-4 font-semibold text-[#231F20]">
                          {prod.nome_produto}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize font-medium text-[#231F20]">
                            {prod.categoria}
                          </span>
                          <span className="block text-[11px] text-[#7D6F74]">
                            {prod.subcategoria}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[#5C5054] tabular-nums">
                          {formatCurrencyBRL(prod.preco_base_catalogo)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#231F20] tabular-nums">
                          {formatCurrencyBRL(prod.preco_medio_praticado)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#231F20] tabular-nums">
                          {prod.quantidade_vendida} un.{' '}
                          <span className="font-normal text-[#7D6F74]">
                            ({prod.pedidos_presenca} ped.)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#231F20] tabular-nums">
                          {formatCurrencyBRL(prod.faturamento_gerado)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#9E586F] tabular-nums">
                          {prod.percentual_receita}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização da Folha do Relatório Completo (Dia / Semana / Mês) */}
      {isReportPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-preview-modal-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#EAD8DF] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFE3E7] bg-[#FDF8FA] px-6 py-4 shrink-0">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E586F]">
                  Demonstrativo Gerencial Pronto para Emissão PDF
                </span>
                <h3
                  id="report-preview-modal-title"
                  className="font-display text-2xl font-semibold text-[#231F20]"
                >
                  {report.periodTitle} — {report.periodRangeLabel}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F20] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Baixar Arquivo PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportPreviewOpen(false)}
                  aria-label="Fechar pré-visualização do relatório"
                  className="rounded-lg p-1.5 text-[#6E6266] hover:bg-[#F5E6EB]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 text-xs text-[#231F20]">
              <div className="rounded-xl border border-[#EAD8DF] bg-[#FDF4F7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="font-display text-lg text-[#231F20]">
                    {ATELIER_INFO.nome}
                  </strong>
                  <p className="text-[#5C5054]">
                    {ATELIER_INFO.endereco} · CNPJ PIX: {ATELIER_INFO.cnpj_pix}
                  </p>
                </div>
                <div className="font-mono text-right">
                  <div>WhatsApp: {settings.telefone_exibicao}</div>
                  <div className="font-bold text-[#9E586F]">{report.periodRangeLabel}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#EFE2E6] p-3">
                  <span className="text-[#7D6F74]">Faturamento Bruto</span>
                  <div className="mt-1 font-mono text-base font-bold">
                    {formatCurrencyBRL(report.faturamentoBruto)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFE2E6] p-3">
                  <span className="text-[#7D6F74]">Caixa Recebido</span>
                  <div className="mt-1 font-mono text-base font-bold text-emerald-800">
                    {formatCurrencyBRL(report.receitaRecebida)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFE2E6] p-3">
                  <span className="text-[#7D6F74]">Saldo a Receber</span>
                  <div className="mt-1 font-mono text-base font-bold text-amber-800">
                    {formatCurrencyBRL(report.saldoAReceber)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFE2E6] p-3">
                  <span className="text-[#7D6F74]">Ticket Médio</span>
                  <div className="mt-1 font-mono text-base font-bold">
                    {formatCurrencyBRL(report.ticketMedio)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-lg font-semibold">
                  Desempenho de Produtos no Período
                </h4>
                <table className="w-full text-left border-collapse border border-[#EFE2E6]">
                  <thead>
                    <tr className="bg-[#FDF8FA] border-b border-[#EFE2E6] text-[11px] font-semibold text-[#7D6F74]">
                      <th className="p-2.5">Produto</th>
                      <th className="p-2.5 text-right">Preço Base</th>
                      <th className="p-2.5 text-right">Preço Praticado</th>
                      <th className="p-2.5 text-center">Vendas</th>
                      <th className="p-2.5 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E6EA]">
                    {report.productAnalytics.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-semibold">{p.nome_produto}</td>
                        <td className="p-2.5 text-right font-mono">
                          {formatCurrencyBRL(p.preco_base_catalogo)}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {formatCurrencyBRL(p.preco_medio_praticado)}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {p.quantidade_vendida} un.
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {formatCurrencyBRL(p.faturamento_gerado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

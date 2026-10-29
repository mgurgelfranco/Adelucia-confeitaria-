import { jsPDF } from 'jspdf';
import {
  AtelierSettings,
  PaymentMethod,
  PaymentStatus,
  Pedido,
  ProductCategory,
  Produto,
} from '../types';
import { addDaysISO, formatCurrencyBRL, formatDateBR } from './schedulingEngine';
import { ATELIER_INFO } from '../data/seedData';

export type ReportPeriod = 'dia' | 'semana' | 'mes' | 'geral';

export interface DailyFinancialPoint {
  dateISO: string;
  dateShort: string;
  faturamento: number;
  recebido: number;
  pedidosCount: number;
  itensCount: number;
}

export interface PaymentMethodBreakdown {
  metodo: PaymentMethod;
  valor: number;
  pedidosCount: number;
  percentual: number;
}

export interface PaymentStatusBreakdown {
  status: PaymentStatus;
  label: string;
  valorTotalPedidos: number;
  valorRecebidoCaixa: number;
  valorPendente: number;
  pedidosCount: number;
  percentual: number;
}

export interface ProductPerformanceRow {
  produto_id: string;
  nome_produto: string;
  categoria: ProductCategory;
  subcategoria: string;
  preco_base_catalogo: number;
  preco_medio_praticado: number;
  quantidade_vendida: number;
  pedidos_presenca: number;
  faturamento_gerado: number;
  percentual_receita: number;
}

export interface CategoryPerformanceRow {
  categoria: ProductCategory;
  label: string;
  quantidade_vendida: number;
  faturamento_gerado: number;
  preco_medio_item: number;
  percentual_receita: number;
  produtos_ativos_catalogo: number;
  preco_medio_catalogo: number;
}

export interface FinancialReportData {
  period: ReportPeriod;
  referenceDateISO: string;
  startDateISO: string;
  endDateISO: string;
  periodTitle: string;
  periodRangeLabel: string;
  ordersInPeriod: Pedido[];
  validOrders: Pedido[];
  cancelledOrdersCount: number;
  faturamentoBruto: number;
  receitaRecebida: number;
  saldoAReceber: number;
  receitaProdutos: number;
  receitaEntregas: number;
  totalPedidosValidos: number;
  totalItensVendidos: number;
  ticketMedio: number;
  dailySeries: DailyFinancialPoint[];
  paymentMethods: PaymentMethodBreakdown[];
  paymentStatuses: PaymentStatusBreakdown[];
  productAnalytics: ProductPerformanceRow[];
  categoryAnalytics: CategoryPerformanceRow[];
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bolos: 'Bolos Comemorativos & Afetivos',
  doces: 'Brigadeiros, Bombons & Sobremesas',
  kits: 'Kits Festa, Fatias & Personalizados',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pago_integral: '100% Quitado',
  sinal_50_pago: 'Sinal 50% Pago',
  aguardando_sinal_50: 'Aguardando Sinal 50%',
};

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function getOrderCashAmounts(pedido: Pedido): {
  recebido: number;
  pendente: number;
} {
  if (pedido.status === 'cancelado') {
    return { recebido: 0, pendente: 0 };
  }
  if (pedido.status_pagamento === 'pago_integral') {
    return { recebido: pedido.valor_total, pendente: 0 };
  }
  if (pedido.status_pagamento === 'sinal_50_pago') {
    const metade = Math.round(pedido.valor_total * 50) / 100;
    return { recebido: metade, pendente: Math.max(0, pedido.valor_total - metade) };
  }
  return { recebido: 0, pendente: pedido.valor_total };
}

export function resolvePeriodBounds(
  period: ReportPeriod,
  referenceDateISO: string,
  allPedidos: Pedido[]
): {
  startDateISO: string;
  endDateISO: string;
  periodTitle: string;
  periodRangeLabel: string;
} {
  const [y, m, d] = referenceDateISO.split('-').map(Number);

  if (period === 'dia') {
    return {
      startDateISO: referenceDateISO,
      endDateISO: referenceDateISO,
      periodTitle: 'Relatório Financeiro Diário',
      periodRangeLabel: `Dia ${formatDateBR(referenceDateISO)}`,
    };
  }

  if (period === 'semana') {
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay();
    const startISO = addDaysISO(referenceDateISO, -dayOfWeek);
    const endISO = addDaysISO(startISO, 6);
    return {
      startDateISO: startISO,
      endDateISO: endISO,
      periodTitle: 'Relatório Financeiro Semanal',
      periodRangeLabel: `Semana de ${formatDateBR(startISO)} a ${formatDateBR(endISO)}`,
    };
  }

  if (period === 'mes') {
    const lastDay = new Date(y, m, 0).getDate();
    const startISO = `${y}-${String(m).padStart(2, '0')}-01`;
    const endISO = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const monthName = MONTH_NAMES_PT[(m - 1 + 12) % 12] || String(m);
    return {
      startDateISO: startISO,
      endDateISO: endISO,
      periodTitle: 'Relatório Financeiro Mensal',
      periodRangeLabel: `${monthName} de ${y} (${formatDateBR(startISO)} a ${formatDateBR(endISO)})`,
    };
  }

  // 'geral'
  const sortedDates = allPedidos
    .map((p) => p.data_agendamento)
    .filter(Boolean)
    .sort();
  const minDate = sortedDates[0] || referenceDateISO;
  const maxDate = sortedDates[sortedDates.length - 1] || referenceDateISO;

  return {
    startDateISO: minDate,
    endDateISO: maxDate,
    periodTitle: 'Relatório Financeiro Consolidado Geral',
    periodRangeLabel: `Período Completo (${formatDateBR(minDate)} a ${formatDateBR(maxDate)})`,
  };
}

export function computeFinancialReport(params: {
  pedidos: Pedido[];
  produtos: Produto[];
  period: ReportPeriod;
  referenceDateISO: string;
}): FinancialReportData {
  const { pedidos, produtos, period, referenceDateISO } = params;
  const bounds = resolvePeriodBounds(period, referenceDateISO, pedidos);

  const ordersInPeriod = pedidos
    .filter((p) => {
      if (period === 'geral') return true;
      return (
        p.data_agendamento >= bounds.startDateISO &&
        p.data_agendamento <= bounds.endDateISO
      );
    })
    .sort((a, b) => {
      if (a.data_agendamento !== b.data_agendamento) {
        return a.data_agendamento.localeCompare(b.data_agendamento);
      }
      return a.hora_slot.localeCompare(b.hora_slot);
    });

  const validOrders = ordersInPeriod.filter((p) => p.status !== 'cancelado');
  const cancelledOrdersCount = ordersInPeriod.length - validOrders.length;

  let faturamentoBruto = 0;
  let receitaRecebida = 0;
  let saldoAReceber = 0;
  let receitaEntregas = 0;
  let receitaProdutos = 0;
  let totalItensVendidos = 0;

  validOrders.forEach((pedido) => {
    faturamentoBruto += pedido.valor_total;
    receitaEntregas += pedido.taxa_entrega || 0;
    const cash = getOrderCashAmounts(pedido);
    receitaRecebida += cash.recebido;
    saldoAReceber += cash.pendente;

    pedido.itens.forEach((item) => {
      totalItensVendidos += item.quantidade;
      receitaProdutos += item.quantidade * item.valor_unitario;
    });
  });

  const totalPedidosValidos = validOrders.length;
  const ticketMedio =
    totalPedidosValidos > 0 ? faturamentoBruto / totalPedidosValidos : 0;

  // Build daily timeline series
  const dailyMap = new Map<string, DailyFinancialPoint>();

  if (period === 'dia') {
    dailyMap.set(referenceDateISO, {
      dateISO: referenceDateISO,
      dateShort: `${referenceDateISO.slice(8, 10)}/${referenceDateISO.slice(5, 7)}`,
      faturamento: 0,
      recebido: 0,
      pedidosCount: 0,
      itensCount: 0,
    });
  } else if (period === 'semana') {
    for (let i = 0; i < 7; i++) {
      const dt = addDaysISO(bounds.startDateISO, i);
      dailyMap.set(dt, {
        dateISO: dt,
        dateShort: `${dt.slice(8, 10)}/${dt.slice(5, 7)}`,
        faturamento: 0,
        recebido: 0,
        pedidosCount: 0,
        itensCount: 0,
      });
    }
  }

  validOrders.forEach((pedido) => {
    const dt = pedido.data_agendamento;
    const existing = dailyMap.get(dt) || {
      dateISO: dt,
      dateShort: `${dt.slice(8, 10)}/${dt.slice(5, 7)}`,
      faturamento: 0,
      recebido: 0,
      pedidosCount: 0,
      itensCount: 0,
    };
    const cash = getOrderCashAmounts(pedido);
    const itemsQty = pedido.itens.reduce((acc, i) => acc + i.quantidade, 0);

    existing.faturamento += pedido.valor_total;
    existing.recebido += cash.recebido;
    existing.pedidosCount += 1;
    existing.itensCount += itemsQty;
    dailyMap.set(dt, existing);
  });

  const dailySeries = Array.from(dailyMap.values()).sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO)
  );

  // Payment Methods Breakdown
  const methodsOrder: PaymentMethod[] = ['PIX', 'Crédito (Até 3x)', 'Dinheiro'];
  const paymentMethods: PaymentMethodBreakdown[] = methodsOrder.map((metodo) => {
    const matching = validOrders.filter((p) => p.forma_pagamento === metodo);
    const valor = matching.reduce((acc, p) => acc + p.valor_total, 0);
    const percentual =
      faturamentoBruto > 0 ? Math.round((valor / faturamentoBruto) * 100) : 0;
    return {
      metodo,
      valor,
      pedidosCount: matching.length,
      percentual,
    };
  });

  // Payment Status Breakdown
  const statusOrder: PaymentStatus[] = [
    'pago_integral',
    'sinal_50_pago',
    'aguardando_sinal_50',
  ];
  const paymentStatuses: PaymentStatusBreakdown[] = statusOrder.map((st) => {
    const matching = validOrders.filter((p) => p.status_pagamento === st);
    let valorTotalPedidos = 0;
    let valorRecebidoCaixa = 0;
    let valorPendente = 0;
    matching.forEach((p) => {
      valorTotalPedidos += p.valor_total;
      const cash = getOrderCashAmounts(p);
      valorRecebidoCaixa += cash.recebido;
      valorPendente += cash.pendente;
    });
    const percentual =
      faturamentoBruto > 0
        ? Math.round((valorTotalPedidos / faturamentoBruto) * 100)
        : 0;
    return {
      status: st,
      label: PAYMENT_STATUS_LABELS[st],
      valorTotalPedidos,
      valorRecebidoCaixa,
      valorPendente,
      pedidosCount: matching.length,
      percentual,
    };
  });

  // Product Performance Analytics
  const catalogMap = new Map<string, Produto>();
  produtos.forEach((prod) => catalogMap.set(prod.id, prod));

  const prodStatsMap = new Map<
    string,
    {
      produto_id: string;
      nome_produto: string;
      categoria: ProductCategory;
      subcategoria: string;
      preco_base_catalogo: number;
      quantidade_vendida: number;
      pedidosSet: Set<string>;
      faturamento_gerado: number;
    }
  >();

  validOrders.forEach((pedido) => {
    pedido.itens.forEach((item) => {
      const catalogProd = catalogMap.get(item.produto_id);
      const categoria: ProductCategory =
        catalogProd?.categoria ||
        (item.produto_id.startsWith('doces') || item.produto_id.startsWith('sobremesa')
          ? 'doces'
          : item.produto_id.startsWith('kit')
          ? 'kits'
          : 'bolos');
      const subcategoria =
        catalogProd?.subcategoria ||
        (item.produto_id.startsWith('custom-cake')
          ? 'Monte seu Bolo (Personalizado)'
          : 'Cardápio Autoral');
      const precoBase = catalogProd?.preco_base ?? item.valor_unitario;

      const key = item.produto_id.startsWith('custom-cake')
        ? `custom::${item.nome_produto}`
        : item.produto_id;

      const current = prodStatsMap.get(key) || {
        produto_id: item.produto_id,
        nome_produto: catalogProd?.nome || item.nome_produto,
        categoria,
        subcategoria,
        preco_base_catalogo: precoBase,
        quantidade_vendida: 0,
        pedidosSet: new Set<string>(),
        faturamento_gerado: 0,
      };

      current.quantidade_vendida += item.quantidade;
      current.pedidosSet.add(pedido.id_pedido);
      current.faturamento_gerado += item.quantidade * item.valor_unitario;
      prodStatsMap.set(key, current);
    });
  });

  const productAnalytics: ProductPerformanceRow[] = Array.from(
    prodStatsMap.values()
  )
    .map((entry) => {
      const precoMedio =
        entry.quantidade_vendida > 0
          ? entry.faturamento_gerado / entry.quantidade_vendida
          : entry.preco_base_catalogo;
      const pct =
        receitaProdutos > 0
          ? Math.round((entry.faturamento_gerado / receitaProdutos) * 100)
          : 0;
      return {
        produto_id: entry.produto_id,
        nome_produto: entry.nome_produto,
        categoria: entry.categoria,
        subcategoria: entry.subcategoria,
        preco_base_catalogo: entry.preco_base_catalogo,
        preco_medio_praticado: precoMedio,
        quantidade_vendida: entry.quantidade_vendida,
        pedidos_presenca: entry.pedidosSet.size,
        faturamento_gerado: entry.faturamento_gerado,
        percentual_receita: pct,
      };
    })
    .sort((a, b) => b.faturamento_gerado - a.faturamento_gerado);

  // Category Performance Analytics
  const categoriesOrder: ProductCategory[] = ['bolos', 'doces', 'kits'];
  const categoryAnalytics: CategoryPerformanceRow[] = categoriesOrder.map(
    (cat) => {
      const catProdsInCatalog = produtos.filter((p) => p.categoria === cat);
      const activeInCatalog = catProdsInCatalog.filter((p) => p.ativo).length;
      const avgCatalogPrice =
        catProdsInCatalog.length > 0
          ? catProdsInCatalog.reduce((acc, p) => acc + p.preco_base, 0) /
            catProdsInCatalog.length
          : 0;

      const matchingSold = productAnalytics.filter((p) => p.categoria === cat);
      const qtdVendida = matchingSold.reduce(
        (acc, p) => acc + p.quantidade_vendida,
        0
      );
      const fatGerado = matchingSold.reduce(
        (acc, p) => acc + p.faturamento_gerado,
        0
      );
      const precoMedioItem = qtdVendida > 0 ? fatGerado / qtdVendida : avgCatalogPrice;
      const pct =
        receitaProdutos > 0
          ? Math.round((fatGerado / receitaProdutos) * 100)
          : 0;

      return {
        categoria: cat,
        label: CATEGORY_LABELS[cat],
        quantidade_vendida: qtdVendida,
        faturamento_gerado: fatGerado,
        preco_medio_item: precoMedioItem,
        percentual_receita: pct,
        produtos_ativos_catalogo: activeInCatalog,
        preco_medio_catalogo: avgCatalogPrice,
      };
    }
  );

  return {
    period,
    referenceDateISO,
    startDateISO: bounds.startDateISO,
    endDateISO: bounds.endDateISO,
    periodTitle: bounds.periodTitle,
    periodRangeLabel: bounds.periodRangeLabel,
    ordersInPeriod,
    validOrders,
    cancelledOrdersCount,
    faturamentoBruto,
    receitaRecebida,
    saldoAReceber,
    receitaProdutos,
    receitaEntregas,
    totalPedidosValidos,
    totalItensVendidos,
    ticketMedio,
    dailySeries,
    paymentMethods,
    paymentStatuses,
    productAnalytics,
    categoryAnalytics,
  };
}

export function exportFinancialReportToPdf(
  report: FinancialReportData,
  settings: AtelierSettings
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // Header Banner
  doc.setFillColor(253, 244, 247);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(35, 31, 32);
  doc.text(ATELIER_INFO.nome.toUpperCase(), margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 96, 100);
  doc.text(
    `${ATELIER_INFO.endereco}  |  CNPJ PIX: ${ATELIER_INFO.cnpj_pix}  |  WhatsApp: ${settings.telefone_exibicao}`,
    margin + 5,
    y + 14
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(158, 88, 111);
  doc.text(
    `${report.periodTitle} — ${report.periodRangeLabel}`,
    margin + 5,
    y + 21
  );

  y += 33;

  // Section 1: Resumo Executivo de Faturamento & Caixa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 31, 32);
  doc.text('1. RESUMO EXECUTIVO DE FATURAMENTO E CAIXA', margin, y);
  y += 5;

  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpis = [
    {
      title: 'Faturamento Bruto',
      value: formatCurrencyBRL(report.faturamentoBruto),
      sub: `${report.totalPedidosValidos} pedido(s) válido(s)`,
    },
    {
      title: 'Caixa Recebido',
      value: formatCurrencyBRL(report.receitaRecebida),
      sub: 'Sinais 50% + Quitados',
    },
    {
      title: 'Saldo a Receber',
      value: formatCurrencyBRL(report.saldoAReceber),
      sub: 'Restante na entrega/sinal',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrencyBRL(report.ticketMedio),
      sub: `${report.totalItensVendidos} un. vendidas`,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = margin + idx * (cardWidth + 3);
    doc.setDrawColor(234, 216, 223);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xPos, y, cardWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(125, 111, 116);
    doc.text(kpi.title, xPos + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(35, 31, 32);
    doc.text(kpi.value, xPos + 3, y + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 122, 128);
    doc.text(kpi.sub, xPos + 3, y + 17.5);
  });

  y += 27;

  // Section 2: Desempenho por Categoria & Meios de Pagamento
  ensureSpace(42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 31, 32);
  doc.text('2. ANÁLISE POR CATEGORIA DE PRODUTO & MEIOS DE PAGAMENTO', margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(248, 238, 242);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setTextColor(92, 80, 84);
  doc.text('Categoria', margin + 2, y + 4.5);
  doc.text('Qtd. Vendida', margin + 78, y + 4.5);
  doc.text('Preço Médio Item', margin + 108, y + 4.5);
  doc.text('Faturamento', margin + 142, y + 4.5);
  doc.text('% Share', margin + 168, y + 4.5);
  y += 6.5;

  report.categoryAnalytics.forEach((cat) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 31, 32);
    doc.text(cat.label, margin + 2, y + 4.8);
    doc.text(`${cat.quantidade_vendida} un.`, margin + 78, y + 4.8);
    doc.text(formatCurrencyBRL(cat.preco_medio_item), margin + 108, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyBRL(cat.faturamento_gerado), margin + 142, y + 4.8);
    doc.text(`${cat.percentual_receita}%`, margin + 168, y + 4.8);

    doc.setDrawColor(242, 230, 234);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
    y += 6.5;
  });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 80, 84);
  const paymentSummaryLine = report.paymentMethods
    .map(
      (pm) =>
        `${pm.metodo}: ${formatCurrencyBRL(pm.valor)} (${pm.pedidosCount} ped. · ${pm.percentual}%)`
    )
    .join('   |   ');
  doc.text(`Meios de Pagamento: ${paymentSummaryLine}`, margin, y);
  y += 8;

  // Section 3: Desempenho de Produtos (Vendas, Preço e Faturamento)
  ensureSpace(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 31, 32);
  doc.text('3. DESEMPENHO DE PRODUTOS (VENDAS, PREÇO E FATURAMENTO)', margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(248, 238, 242);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setTextColor(92, 80, 84);
  doc.text('Produto', margin + 2, y + 4.5);
  doc.text('Preço Base', margin + 88, y + 4.5);
  doc.text('Preço Praticado', margin + 114, y + 4.5);
  doc.text('Vendas', margin + 142, y + 4.5);
  doc.text('Faturamento', margin + 158, y + 4.5);
  y += 6.5;

  if (report.productAnalytics.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(125, 111, 116);
    doc.text('Nenhum produto comercializado neste período.', margin + 2, y + 5);
    y += 8;
  } else {
    report.productAnalytics.forEach((prod) => {
      ensureSpace(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(35, 31, 32);
      const shortName =
        prod.nome_produto.length > 44
          ? `${prod.nome_produto.slice(0, 41)}...`
          : prod.nome_produto;
      doc.text(shortName, margin + 2, y + 4.8);
      doc.text(formatCurrencyBRL(prod.preco_base_catalogo), margin + 88, y + 4.8);
      doc.text(formatCurrencyBRL(prod.preco_medio_praticado), margin + 114, y + 4.8);
      doc.text(`${prod.quantidade_vendida} un.`, margin + 142, y + 4.8);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyBRL(prod.faturamento_gerado), margin + 158, y + 4.8);

      doc.setDrawColor(242, 230, 234);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 6.5;
    });
  }

  y += 8;

  // Section 4: Extrato Detalhado de Pedidos do Período
  ensureSpace(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 31, 32);
  doc.text(
    `4. EXTRATO DE PEDIDOS DO PERÍODO (${report.validOrders.length} PEDIDOS ATIVOS)`,
    margin,
    y
  );
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(248, 238, 242);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setTextColor(92, 80, 84);
  doc.text('Código / Data', margin + 2, y + 4.5);
  doc.text('Cliente', margin + 42, y + 4.5);
  doc.text('Pagamento / Status Caixa', margin + 92, y + 4.5);
  doc.text('Recebido', margin + 138, y + 4.5);
  doc.text('Total Pedido', margin + 162, y + 4.5);
  y += 6.5;

  if (report.validOrders.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(125, 111, 116);
    doc.text('Nenhum pedido registrado para o filtro selecionado.', margin + 2, y + 5);
    y += 8;
  } else {
    report.validOrders.forEach((pedido) => {
      ensureSpace(8);
      const cash = getOrderCashAmounts(pedido);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(35, 31, 32);
      doc.text(
        `#${pedido.id_pedido} (${formatDateBR(pedido.data_agendamento)} ${pedido.hora_slot})`,
        margin + 2,
        y + 4.8
      );
      const clientShort =
        pedido.cliente_nome.length > 25
          ? `${pedido.cliente_nome.slice(0, 22)}...`
          : pedido.cliente_nome;
      doc.text(clientShort, margin + 42, y + 4.8);
      doc.text(
        `${pedido.forma_pagamento} · ${PAYMENT_STATUS_LABELS[pedido.status_pagamento]}`,
        margin + 92,
        y + 4.8
      );
      doc.text(formatCurrencyBRL(cash.recebido), margin + 138, y + 4.8);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyBRL(pedido.valor_total), margin + 162, y + 4.8);

      doc.setDrawColor(242, 230, 234);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 6.5;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 122, 128);
    doc.text(
      `${ATELIER_INFO.nome} — Relatório Financeiro Gerencial · Página ${p} de ${totalPages}`,
      margin,
      pageHeight - 8
    );
  }

  const fileName = `relatorio-financeiro-ade-andrade-${report.period}-${report.referenceDateISO}.pdf`;
  doc.save(fileName);
  return fileName;
}

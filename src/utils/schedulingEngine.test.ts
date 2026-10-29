import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  buildDoubtWhatsAppUrl,
  calculateDashboardMetrics,
  evaluateDayAvailability,
  generateHourlySlots,
  getNextOrderStatus,
  getRequiredLeadDays,
  normalizeWhatsAppDigits,
  validateOrderSchedule,
  validatePasswordChange,
} from './schedulingEngine';
import { computeFinancialReport, getOrderCashAmounts } from './financialAnalytics';
import { INITIAL_PRODUTOS } from '../data/seedData';
import { BloqueioAgenda, DisponibilidadeConfig, Pedido } from '../types';

const mockConfigs: DisponibilidadeConfig[] = [
  {
    dia_semana: 0, // Domingo
    nome_dia: 'Domingo',
    ativo: false,
    horario_inicio: '09:00',
    horario_fim: '13:00',
    limite_pedidos_por_slot: 1,
    pedidos_max_dia: 3,
  },
  {
    dia_semana: 4, // Quinta-feira (2026-10-29 is Thursday)
    nome_dia: 'Quinta-feira',
    ativo: true,
    horario_inicio: '09:00',
    horario_fim: '12:00',
    limite_pedidos_por_slot: 2,
    pedidos_max_dia: 4,
  },
  {
    dia_semana: 5, // Sexta-feira (2026-10-30)
    nome_dia: 'Sexta-feira',
    ativo: true,
    horario_inicio: '10:00',
    horario_fim: '13:00',
    limite_pedidos_por_slot: 2,
    pedidos_max_dia: 3,
  },
  {
    dia_semana: 6, // Sábado (2026-10-31)
    nome_dia: 'Sábado',
    ativo: true,
    horario_inicio: '09:00',
    horario_fim: '12:00',
    limite_pedidos_por_slot: 1,
    pedidos_max_dia: 2,
  },
];

function createMockPedido(overrides: Partial<Pedido>): Pedido {
  return {
    id_pedido: 'ADE-001',
    cliente_nome: 'Maria Clara',
    cliente_telefone: '79999990000',
    tipo: 'retirada',
    data_agendamento: '2026-10-30',
    hora_slot: '10:00',
    status: 'confirmado',
    itens: [
      {
        id_item: '1',
        produto_id: 'p1',
        nome_produto: 'Bolo Vintage 15cm',
        quantidade: 1,
        valor_unitario: 230,
        tempo_preparo_dias: 2,
      },
    ],
    valor_total: 230,
    taxa_entrega: 0,
    forma_pagamento: 'PIX',
    status_pagamento: 'sinal_50_pago',
    criado_em: '2026-10-28T10:00:00Z',
    ...overrides,
  };
}

test('getRequiredLeadDays returns the maximum tempo_preparo_dias in the cart', () => {
  assert.equal(
    getRequiredLeadDays([
      { tempo_preparo_dias: 1 },
      { tempo_preparo_dias: 3 },
      { tempo_preparo_dias: 2 },
    ]),
    3
  );
  assert.equal(getRequiredLeadDays([]), 1);
});

test('generateHourlySlots builds hourly slots correctly', () => {
  assert.deepEqual(generateHourlySlots('09:00', '12:00'), ['09:00', '10:00', '11:00']);
});

test('evaluateDayAvailability blocks dates before required lead time', () => {
  const todayISO = '2026-10-29'; // Thursday
  // Cart requires 2 days -> earliest date is 2026-10-31 (Saturday)
  const fridayEval = evaluateDayAvailability({
    targetDateISO: '2026-10-30', // Friday (+1 day)
    todayISO,
    requiredLeadDays: 2,
    configs: mockConfigs,
    pedidos: [],
    bloqueios: [],
  });
  assert.equal(fridayEval.disponivel, false);
  assert.match(fridayEval.motivo_bloqueio || '', /Antecedência mínima de 2 dia/);

  const saturdayEval = evaluateDayAvailability({
    targetDateISO: '2026-10-31', // Saturday (+2 days)
    todayISO,
    requiredLeadDays: 2,
    configs: mockConfigs,
    pedidos: [],
    bloqueios: [],
  });
  assert.equal(saturdayEval.disponivel, true);
});

test('evaluateDayAvailability blocks slots and days when capacity limits are reached', () => {
  const todayISO = '2026-10-29';
  // Saturday 2026-10-31 has limite_pedidos_por_slot: 1, pedidos_max_dia: 2
  const pedidos: Pedido[] = [
    createMockPedido({ id_pedido: '1', data_agendamento: '2026-10-31', hora_slot: '09:00' }),
  ];

  const evalWith1 = evaluateDayAvailability({
    targetDateISO: '2026-10-31',
    todayISO,
    requiredLeadDays: 1,
    configs: mockConfigs,
    pedidos,
    bloqueios: [],
  });

  assert.equal(evalWith1.disponivel, true);
  const slot09 = evalWith1.slots.find((s) => s.hora === '09:00');
  const slot10 = evalWith1.slots.find((s) => s.hora === '10:00');
  assert.equal(slot09?.disponivel, false); // 1/1 occupied
  assert.equal(slot10?.disponivel, true); // 0/1 occupied

  // Now add a second order at 10:00 -> hits pedidos_max_dia (2)
  pedidos.push(
    createMockPedido({ id_pedido: '2', data_agendamento: '2026-10-31', hora_slot: '10:00' })
  );

  const evalWith2 = evaluateDayAvailability({
    targetDateISO: '2026-10-31',
    todayISO,
    requiredLeadDays: 1,
    configs: mockConfigs,
    pedidos,
    bloqueios: [],
  });

  assert.equal(evalWith2.disponivel, false);
  assert.match(evalWith2.motivo_bloqueio || '', /Capacidade máxima do dia atingida/);
  assert.equal(evalWith2.slots.every((s) => !s.disponivel), true);
});

test('validateOrderSchedule rejects manual blockouts and conflicting slots', () => {
  const todayISO = '2026-10-29';
  const bloqueios: BloqueioAgenda[] = [
    {
      id: 'b1',
      data: '2026-10-30',
      motivo: 'feriado',
      descricao: 'Feriado Municipal',
    },
  ];

  const resBlocked = validateOrderSchedule({
    targetDateISO: '2026-10-30',
    targetSlot: '10:00',
    todayISO,
    itens: [{ tempo_preparo_dias: 1 }],
    configs: mockConfigs,
    pedidos: [],
    bloqueios,
  });
  assert.equal(resBlocked.valid, false);
  assert.match(resBlocked.error || '', /Feriado Municipal/);
});

test('getNextOrderStatus progresses through production stages accurately', () => {
  assert.equal(getNextOrderStatus('pendente'), 'confirmado');
  assert.equal(getNextOrderStatus('confirmado'), 'em produção');
  assert.equal(getNextOrderStatus('em produção'), 'pronto');
  assert.equal(getNextOrderStatus('pronto'), 'entregue');
  assert.equal(getNextOrderStatus('entregue'), null);
  assert.equal(getNextOrderStatus('cancelado'), null);
});

test('calculateDashboardMetrics computes revenue and today deliveries accurately', () => {
  const todayISO = '2026-10-29';
  const pedidos: Pedido[] = [
    createMockPedido({
      id_pedido: '1',
      data_agendamento: '2026-10-29',
      valor_total: 250,
      status: 'pronto',
    }),
    createMockPedido({
      id_pedido: '2',
      data_agendamento: '2026-10-30',
      valor_total: 150,
      status: 'em produção',
    }),
    createMockPedido({
      id_pedido: '3',
      data_agendamento: '2026-10-28',
      valor_total: 100,
      status: 'confirmado', // atrasado
    }),
    createMockPedido({
      id_pedido: '4',
      data_agendamento: '2026-10-30',
      valor_total: 500,
      status: 'cancelado', // ignored in revenue
    }),
  ];

  const metrics = calculateDashboardMetrics({
    pedidos,
    configs: mockConfigs,
    bloqueios: [],
    todayISO,
  });

  assert.equal(metrics.faturamentoMes, 500);
  assert.equal(metrics.pedidosHoje, 1);
  assert.equal(metrics.pedidosAtrasados, 1);
  assert.equal(metrics.pedidosEmProducao, 1);
  assert.equal(addDaysISO('2026-10-29', 2), '2026-10-31');
});

test('normalizeWhatsAppDigits and buildDoubtWhatsAppUrl format phone numbers accurately', () => {
  const res1 = normalizeWhatsAppDigits('(79) 99812-3456');
  assert.equal(res1.valid, true);
  assert.equal(res1.digits, '5579998123456');

  const resInvalid = normalizeWhatsAppDigits('12345');
  assert.equal(resInvalid.valid, false);

  const url = buildDoubtWhatsAppUrl('5579998123456', 'Olá Adê!');
  assert.equal(url, 'https://wa.me/5579998123456?text=Ol%C3%A1%20Ad%C3%AA!');
});

test('validatePasswordChange enforces current password, minimum length, and confirmation match', () => {
  assert.equal(
    validatePasswordChange({
      storedPassword: 'ade2026',
      currentPasswordInput: 'wrong',
      newPasswordInput: 'nova123',
      confirmPasswordInput: 'nova123',
    }).valid,
    false
  );

  assert.equal(
    validatePasswordChange({
      storedPassword: 'ade2026',
      currentPasswordInput: 'ade2026',
      newPasswordInput: '123',
      confirmPasswordInput: '123',
    }).valid,
    false
  );

  assert.equal(
    validatePasswordChange({
      storedPassword: 'ade2026',
      currentPasswordInput: 'ade2026',
      newPasswordInput: 'novaSenha2026',
      confirmPasswordInput: 'outraSenha',
    }).valid,
    false
  );

  assert.equal(
    validatePasswordChange({
      storedPassword: 'ade2026',
      currentPasswordInput: 'ade2026',
      newPasswordInput: 'novaSenha2026',
      confirmPasswordInput: 'novaSenha2026',
    }).valid,
    true
  );
});

test('computeFinancialReport calculates billing, cash received, pending balance, and product analytics', () => {
  const pedidos: Pedido[] = [
    createMockPedido({
      id_pedido: 'ADE-1001',
      data_agendamento: '2026-10-29',
      valor_total: 230,
      status: 'confirmado',
      status_pagamento: 'pago_integral',
      forma_pagamento: 'PIX',
      itens: [
        {
          id_item: '1',
          produto_id: 'bolo-vintage-15',
          nome_produto: 'Bolo Vintage Lambeth (15cm)',
          quantidade: 1,
          valor_unitario: 230,
          tempo_preparo_dias: 3,
        },
      ],
    }),
    createMockPedido({
      id_pedido: 'ADE-1002',
      data_agendamento: '2026-10-30',
      valor_total: 100,
      status: 'em produção',
      status_pagamento: 'sinal_50_pago',
      forma_pagamento: 'Crédito (Até 3x)',
      itens: [
        {
          id_item: '2',
          produto_id: 'doces-brig-trad-20',
          nome_produto: 'Kit 20 Brigadeiros Tradicionais',
          quantidade: 2,
          valor_unitario: 50,
          tempo_preparo_dias: 1,
        },
      ],
    }),
  ];

  const cashPartial = getOrderCashAmounts(pedidos[1]);
  assert.equal(cashPartial.recebido, 50);
  assert.equal(cashPartial.pendente, 50);

  const monthReport = computeFinancialReport({
    pedidos,
    produtos: INITIAL_PRODUTOS,
    period: 'mes',
    referenceDateISO: '2026-10-29',
  });

  assert.equal(monthReport.faturamentoBruto, 330);
  assert.equal(monthReport.receitaRecebida, 280);
  assert.equal(monthReport.saldoAReceber, 50);
  assert.equal(monthReport.totalPedidosValidos, 2);
  assert.equal(monthReport.totalItensVendidos, 3);
  assert.equal(monthReport.productAnalytics[0].produto_id, 'bolo-vintage-15');
  assert.equal(monthReport.productAnalytics[0].faturamento_gerado, 230);

  const dayReport = computeFinancialReport({
    pedidos,
    produtos: INITIAL_PRODUTOS,
    period: 'dia',
    referenceDateISO: '2026-10-29',
  });
  assert.equal(dayReport.faturamentoBruto, 230);
  assert.equal(dayReport.totalPedidosValidos, 1);
});



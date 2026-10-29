import {
  BloqueioAgenda,
  DayAvailability,
  DisponibilidadeConfig,
  ItemPedido,
  OrderStatus,
  Pedido,
  SlotAvailability,
} from '../types';

export function getTodayISO(referenceDate?: Date): string {
  const d = referenceDate ? new Date(referenceDate) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(baseDateISO: string, days: number): string {
  const [y, m, d] = baseDateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayOfWeekFromISO(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getDay();
}

export function formatDateBR(dateISO: string): string {
  if (!dateISO || !dateISO.includes('-')) return dateISO;
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Calcula a antecedência mínima exigida pelo carrinho com base no maior tempo_preparo_dias dos itens.
 */
export function getRequiredLeadDays(itens: Pick<ItemPedido, 'tempo_preparo_dias'>[]): number {
  if (!itens || itens.length === 0) return 1;
  return Math.max(0, ...itens.map((item) => Number(item.tempo_preparo_dias) || 0));
}

/**
 * Gera os slots horários de 1 em 1 hora entre horario_inicio e horario_fim.
 * Ex: "09:00" até "18:00" gera ["09:00", "10:00", ..., "17:00"]
 */
export function generateHourlySlots(horarioInicio: string, horarioFim: string): string[] {
  const startHour = parseInt(horarioInicio.split(':')[0], 10);
  const endHour = parseInt(horarioFim.split(':')[0], 10);
  if (isNaN(startHour) || isNaN(endHour) || endHour <= startHour) {
    return [];
  }
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

/**
 * Avalia a disponibilidade completa de uma data específica considerando:
 * 1. Antecedência mínima baseada no tempo_preparo_dias dos itens.
 * 2. Configuração do dia da semana (ativo, horário início/fim, limites).
 * 3. Bloqueios manuais de agenda (feriado, recesso, capacidade esgotada).
 * 4. Pedidos ativos agendados para a data e para cada slot.
 */
export function evaluateDayAvailability(params: {
  targetDateISO: string;
  todayISO: string;
  requiredLeadDays: number;
  configs: DisponibilidadeConfig[];
  pedidos: Pedido[];
  bloqueios: BloqueioAgenda[];
}): DayAvailability {
  const { targetDateISO, todayISO, requiredLeadDays, configs, pedidos, bloqueios } = params;
  const diaSemana = getDayOfWeekFromISO(targetDateISO);
  const config = configs.find((c) => c.dia_semana === diaSemana);

  // Pedidos ativos no dia (exclui cancelados)
  const pedidosAtivosNoDia = pedidos.filter(
    (p) => p.data_agendamento === targetDateISO && p.status !== 'cancelado'
  );
  const totalPedidosDia = pedidosAtivosNoDia.length;

  if (!config || !config.ativo) {
    return {
      data: targetDateISO,
      dia_semana: diaSemana,
      disponivel: false,
      motivo_bloqueio: 'Ateliê fechado neste dia',
      total_pedidos_dia: totalPedidosDia,
      limite_max_dia: config?.pedidos_max_dia ?? 0,
      taxa_ocupacao: 0,
      slots: [],
    };
  }

  const limiteMaxDia = config.pedidos_max_dia;
  const taxaOcupacao =
    limiteMaxDia > 0 ? Math.min(100, Math.round((totalPedidosDia / limiteMaxDia) * 100)) : 100;

  // Verifica bloqueios manuais de dia inteiro
  const bloqueiosDoDia = bloqueios.filter((b) => b.data === targetDateISO);
  const bloqueioDiaInteiro = bloqueiosDoDia.find(
    (b) => !b.horarios_bloqueados || b.horarios_bloqueados.length === 0
  );

  // Verifica antecedência mínima
  const minAllowedDateISO = addDaysISO(todayISO, requiredLeadDays);
  const antecedenciaInsuficiente = targetDateISO < minAllowedDateISO;
  const dataPassada = targetDateISO < todayISO;

  const rawSlots = generateHourlySlots(config.horario_inicio, config.horario_fim);
  const capacidadeDiariaEsgotada = totalPedidosDia >= limiteMaxDia;

  const slots: SlotAvailability[] = rawSlots.map((hora) => {
    const ocupadosNoSlot = pedidosAtivosNoDia.filter((p) => p.hora_slot === hora).length;
    const bloqueioDeSlot = bloqueiosDoDia.find(
      (b) => b.horarios_bloqueados && b.horarios_bloqueados.includes(hora)
    );

    if (dataPassada) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: 'Data encerrada',
      };
    }

    if (bloqueioDiaInteiro) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: `Bloqueado (${bloqueioDiaInteiro.motivo})`,
      };
    }

    if (bloqueioDeSlot) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: `Horário bloqueado (${bloqueioDeSlot.motivo})`,
      };
    }

    if (antecedenciaInsuficiente) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: `Requer ${requiredLeadDays} dia(s) de preparo`,
      };
    }

    if (capacidadeDiariaEsgotada) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: 'Limite diário atingido',
      };
    }

    if (ocupadosNoSlot >= config.limite_pedidos_por_slot) {
      return {
        hora,
        ocupados: ocupadosNoSlot,
        limite: config.limite_pedidos_por_slot,
        disponivel: false,
        motivo_indisponivel: 'Slot esgotado',
      };
    }

    return {
      hora,
      ocupados: ocupadosNoSlot,
      limite: config.limite_pedidos_por_slot,
      disponivel: true,
    };
  });

  const temSlotDisponivel = slots.some((s) => s.disponivel);

  let motivoBloqueio: string | undefined;
  if (dataPassada) {
    motivoBloqueio = 'Data passada';
  } else if (bloqueioDiaInteiro) {
    motivoBloqueio =
      bloqueioDiaInteiro.descricao ||
      `Agenda bloqueada: ${bloqueioDiaInteiro.motivo}`;
  } else if (antecedenciaInsuficiente) {
    motivoBloqueio = `Antecedência mínima de ${requiredLeadDays} dia(s) para preparo`;
  } else if (capacidadeDiariaEsgotada) {
    motivoBloqueio = 'Capacidade máxima do dia atingida';
  } else if (!temSlotDisponivel) {
    motivoBloqueio = 'Todos os horários esgotados';
  }

  return {
    data: targetDateISO,
    dia_semana: diaSemana,
    disponivel: temSlotDisponivel && !bloqueioDiaInteiro && !antecedenciaInsuficiente && !capacidadeDiariaEsgotada && !dataPassada,
    motivo_bloqueio: motivoBloqueio,
    total_pedidos_dia: totalPedidosDia,
    limite_max_dia: limiteMaxDia,
    taxa_ocupacao: taxaOcupacao,
    slots,
  };
}

/**
 * Valida se um novo pedido pode ser agendado na data e hora selecionadas sem conflito de capacidade.
 */
export function validateOrderSchedule(params: {
  targetDateISO: string;
  targetSlot: string;
  todayISO: string;
  itens: Pick<ItemPedido, 'tempo_preparo_dias'>[];
  configs: DisponibilidadeConfig[];
  pedidos: Pedido[];
  bloqueios: BloqueioAgenda[];
}): { valid: boolean; error?: string } {
  const requiredLeadDays = getRequiredLeadDays(params.itens);
  const dayEval = evaluateDayAvailability({
    targetDateISO: params.targetDateISO,
    todayISO: params.todayISO,
    requiredLeadDays,
    configs: params.configs,
    pedidos: params.pedidos,
    bloqueios: params.bloqueios,
  });

  if (!dayEval.disponivel) {
    return {
      valid: false,
      error: dayEval.motivo_bloqueio || 'Data indisponível para agendamento.',
    };
  }

  const slotEval = dayEval.slots.find((s) => s.hora === params.targetSlot);
  if (!slotEval) {
    return {
      valid: false,
      error: 'Horário selecionado não existe na grade de atendimento.',
    };
  }

  if (!slotEval.disponivel) {
    return {
      valid: false,
      error: slotEval.motivo_indisponivel || 'Este horário acabou de atingir a capacidade máxima.',
    };
  }

  return { valid: true };
}

const STATUS_FLOW: OrderStatus[] = [
  'pendente',
  'confirmado',
  'em produção',
  'pronto',
  'entregue',
];

export function getNextOrderStatus(current: OrderStatus): OrderStatus | null {
  if (current === 'cancelado' || current === 'entregue') return null;
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx + 1 >= STATUS_FLOW.length) return null;
  return STATUS_FLOW[idx + 1];
}

export function calculateDashboardMetrics(params: {
  pedidos: Pedido[];
  configs: DisponibilidadeConfig[];
  bloqueios: BloqueioAgenda[];
  todayISO: string;
}) {
  const { pedidos, configs, bloqueios, todayISO } = params;
  const currentMonthPrefix = todayISO.slice(0, 7); // "YYYY-MM"

  const pedidosValidos = pedidos.filter((p) => p.status !== 'cancelado');

  const faturamentoMes = pedidosValidos
    .filter((p) => p.data_agendamento.startsWith(currentMonthPrefix))
    .reduce((acc, p) => acc + p.valor_total, 0);

  const pedidosHoje = pedidosValidos.filter(
    (p) => p.data_agendamento === todayISO && p.status !== 'entregue'
  ).length;

  const totalPedidosHoje = pedidosValidos.filter(
    (p) => p.data_agendamento === todayISO
  ).length;

  const pedidosAtrasados = pedidosValidos.filter(
    (p) =>
      p.data_agendamento < todayISO &&
      p.status !== 'entregue'
  ).length;

  const pedidosEmProducao = pedidosValidos.filter(
    (p) => p.status === 'em produção'
  ).length;

  // Taxa de ocupação dos próximos 7 dias úteis
  let capacidadeTotal7Dias = 0;
  let ocupados7Dias = 0;

  for (let i = 0; i < 7; i++) {
    const dt = addDaysISO(todayISO, i);
    const dayEval = evaluateDayAvailability({
      targetDateISO: dt,
      todayISO,
      requiredLeadDays: 0,
      configs,
      pedidos,
      bloqueios,
    });
    const configDia = configs.find((c) => c.dia_semana === dayEval.dia_semana);
    const bloqueioInteiro = bloqueios.some(
      (b) => b.data === dt && (!b.horarios_bloqueados || b.horarios_bloqueados.length === 0)
    );
    if (configDia && configDia.ativo && !bloqueioInteiro) {
      capacidadeTotal7Dias += configDia.pedidos_max_dia;
      ocupados7Dias += dayEval.total_pedidos_dia;
    }
  }

  const taxaOcupacaoSemanal =
    capacidadeTotal7Dias > 0
      ? Math.min(100, Math.round((ocupados7Dias / capacidadeTotal7Dias) * 100))
      : 0;

  return {
    faturamentoMes,
    pedidosHoje,
    totalPedidosHoje,
    pedidosAtrasados,
    pedidosEmProducao,
    taxaOcupacaoSemanal,
    ocupados7Dias,
    capacidadeTotal7Dias,
  };
}

/**
 * Extrai e normaliza os dígitos de um número de telefone/WhatsApp brasileiro,
 * adicionando o DDI 55 caso o usuário informe apenas DDD + número (10 ou 11 dígitos).
 */
export function normalizeWhatsAppDigits(rawInput: string): {
  valid: boolean;
  digits: string;
  error?: string;
} {
  const digits = (rawInput || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 14) {
    return {
      valid: false,
      digits,
      error: 'Informe um número válido com DDD (ex: 79 99999-9999).',
    };
  }
  const withCountryCode =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return { valid: true, digits: withCountryCode };
}

export function buildDoubtWhatsAppUrl(whatsappDigits: string, mensagem: string): string {
  const cleanDigits = (whatsappDigits || '').replace(/\D/g, '') || '5579999999999';
  const text =
    (mensagem || '').trim() ||
    'Olá, Adê Andrade Confeitaria! Gostaria de tirar uma dúvida sobre o cardápio.';
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
}

/**
 * Valida a troca de senha administrativa exigindo a senha atual correta,
 * nova senha com pelo menos 6 caracteres e confirmação idêntica.
 */
export function validatePasswordChange(params: {
  storedPassword: string;
  currentPasswordInput: string;
  newPasswordInput: string;
  confirmPasswordInput: string;
}): { valid: boolean; error?: string } {
  const {
    storedPassword,
    currentPasswordInput,
    newPasswordInput,
    confirmPasswordInput,
  } = params;

  if (!currentPasswordInput.trim()) {
    return { valid: false, error: 'Informe a senha atual para autorizar a alteração.' };
  }

  if (currentPasswordInput.trim() !== storedPassword) {
    return { valid: false, error: 'A senha atual informada está incorreta.' };
  }

  const cleanNew = newPasswordInput.trim();
  if (cleanNew.length < 6) {
    return {
      valid: false,
      error: 'A nova senha deve ter no mínimo 6 caracteres.',
    };
  }

  if (cleanNew !== confirmPasswordInput.trim()) {
    return {
      valid: false,
      error: 'A confirmação da nova senha não coincide.',
    };
  }

  if (cleanNew === storedPassword) {
    return {
      valid: false,
      error: 'A nova senha deve ser diferente da senha atual.',
    };
  }

  return { valid: true };
}


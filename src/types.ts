export type ProductCategory = 'bolos' | 'doces' | 'kits';

export type OrderStatus =
  | 'pendente'
  | 'confirmado'
  | 'em produção'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type DeliveryType = 'retirada' | 'entrega';

export type PaymentMethod = 'PIX' | 'Crédito (Até 3x)' | 'Dinheiro';

export type PaymentStatus = 'aguardando_sinal_50' | 'sinal_50_pago' | 'pago_integral';

export type BlockReason = 'feriado' | 'recesso' | 'capacidade esgotada' | 'manutenção';

export interface Produto {
  id: string;
  nome: string;
  categoria: ProductCategory;
  subcategoria: string;
  preco_base: number;
  descricao: string;
  foto_url: string;
  tempo_preparo_dias: number;
  ativo: boolean;
  rendimento?: string;
  unidade_venda?: string;
}

export interface DisponibilidadeConfig {
  dia_semana: number; // 0 (Dom) a 6 (Sáb)
  nome_dia: string;
  ativo: boolean;
  horario_inicio: string; // "09:00"
  horario_fim: string; // "18:00"
  limite_pedidos_por_slot: number;
  pedidos_max_dia: number;
}

export interface ItemPedido {
  id_item: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  observacoes?: string;
  tempo_preparo_dias: number;
}

export interface Pedido {
  id_pedido: string;
  cliente_nome: string;
  cliente_telefone: string;
  endereco_entrega?: string;
  tipo: DeliveryType;
  data_agendamento: string; // "YYYY-MM-DD"
  hora_slot: string; // "HH:00"
  status: OrderStatus;
  itens: ItemPedido[];
  valor_total: number;
  taxa_entrega: number;
  forma_pagamento: PaymentMethod;
  status_pagamento: PaymentStatus;
  criado_em: string;
  observacoes_gerais?: string;
}

export interface BloqueioAgenda {
  id: string;
  data: string; // "YYYY-MM-DD"
  motivo: BlockReason;
  descricao?: string;
  horarios_bloqueados?: string[]; // Se vazio ou undefined, bloqueia o dia inteiro
}

export interface SlotAvailability {
  hora: string;
  ocupados: number;
  limite: number;
  disponivel: boolean;
  motivo_indisponivel?: string;
}

export interface DayAvailability {
  data: string; // "YYYY-MM-DD"
  dia_semana: number;
  disponivel: boolean;
  motivo_bloqueio?: string;
  total_pedidos_dia: number;
  limite_max_dia: number;
  taxa_ocupacao: number; // 0 a 100
  slots: SlotAvailability[];
}

export interface AtelierSettings {
  telefone_exibicao: string; // Ex: "(79) 99999-9999"
  whatsapp_numero: string; // Ex: "5579999999999"
  mensagem_duvidas: string;
}


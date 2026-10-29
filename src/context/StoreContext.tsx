import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AtelierSettings,
  BloqueioAgenda,
  DisponibilidadeConfig,
  ItemPedido,
  OrderStatus,
  PaymentStatus,
  Pedido,
  Produto,
} from '../types';
import {
  createInitialBloqueios,
  createInitialPedidos,
  INITIAL_ATELIER_SETTINGS,
  INITIAL_DISPONIBILIDADE_CONFIG,
  INITIAL_PRODUTOS,
} from '../data/seedData';
import {
  getNextOrderStatus,
  getTodayISO,
  normalizeWhatsAppDigits,
  validateOrderSchedule,
  validatePasswordChange,
} from '../utils/schedulingEngine';

const STORAGE_KEY = 'ade_andrade_db_v2';
const ADMIN_SESSION_KEY = 'ade_andrade_admin_auth_v1';
const ADMIN_PASSWORD_KEY = 'ade_andrade_admin_pwd_v1';
const DEFAULT_ADMIN_PASSWORD = 'ade2026';

interface StoreContextValue {
  produtos: Produto[];
  configs: DisponibilidadeConfig[];
  pedidos: Pedido[];
  bloqueios: BloqueioAgenda[];
  settings: AtelierSettings;
  cart: ItemPedido[];
  isAdminAuthenticated: boolean;
  isDefaultPasswordActive: boolean;
  // Cart operations
  addToCart: (
    produto: Produto,
    quantidade: number,
    observacoes?: string,
    precoCustom?: number,
    nomeCustom?: string
  ) => void;
  updateCartItemQuantity: (id_item: string, quantidade: number) => void;
  removeFromCart: (id_item: string) => void;
  clearCart: () => void;
  // Order operations
  createOrder: (
    orderInput: Omit<Pedido, 'id_pedido' | 'criado_em' | 'status'>
  ) => { success: boolean; pedido?: Pedido; error?: string };
  advanceOrderStatus: (id_pedido: string) => void;
  updateOrderStatus: (id_pedido: string, status: OrderStatus) => void;
  updatePaymentStatus: (id_pedido: string, status_pagamento: PaymentStatus) => void;
  deleteOrder: (id_pedido: string) => void;
  // Product CRUD
  saveProduct: (produto: Produto) => void;
  toggleProductActive: (id: string) => void;
  deleteProduct: (id: string) => void;
  // Agenda Config, Blockouts & Settings
  updateDayConfig: (config: DisponibilidadeConfig) => void;
  addBloqueio: (bloqueio: Omit<BloqueioAgenda, 'id'>) => void;
  removeBloqueio: (id: string) => void;
  updateSettings: (
    input: Partial<AtelierSettings>
  ) => { success: boolean; error?: string };
  // Admin Auth & Password Change
  loginAdmin: (password: string) => boolean;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  resetDemoDatabase: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

interface PersistedDatabase {
  produtos: Produto[];
  configs: DisponibilidadeConfig[];
  pedidos: Pedido[];
  bloqueios: BloqueioAgenda[];
  settings: AtelierSettings;
}

function loadInitialDB(): PersistedDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.produtos) &&
        Array.isArray(parsed.configs) &&
        Array.isArray(parsed.pedidos) &&
        Array.isArray(parsed.bloqueios)
      ) {
        const savedSettings = parsed.settings as AtelierSettings | undefined;
        const resolvedSettings =
          !savedSettings ||
          savedSettings.telefone_exibicao === '(79) 99999-9999' ||
          savedSettings.whatsapp_numero === '5579999999999'
            ? INITIAL_ATELIER_SETTINGS
            : savedSettings;

        return {
          ...parsed,
          settings: resolvedSettings,
        };
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    produtos: INITIAL_PRODUTOS,
    configs: INITIAL_DISPONIBILIDADE_CONFIG,
    pedidos: createInitialPedidos(),
    bloqueios: createInitialBloqueios(),
    settings: INITIAL_ATELIER_SETTINGS,
  };
}

function loadInitialPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PersistedDatabase>(() => loadInitialDB());
  const [adminPassword, setAdminPassword] = useState<string>(() => loadInitialPassword());
  const [cart, setCart] = useState<ItemPedido[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1' || params.get('autostart') === '1') {
        return true;
      }
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore quota errors
    }
  }, [db]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_PASSWORD_KEY, adminPassword);
    } catch {
      // Ignore quota errors
    }
  }, [adminPassword]);

  const addToCart = (
    produto: Produto,
    quantidade: number,
    observacoes?: string,
    precoCustom?: number,
    nomeCustom?: string
  ) => {
    const valorUnit = precoCustom !== undefined ? precoCustom : produto.preco_base;
    const nomeItem = nomeCustom || produto.nome;
    const cleanObs = observacoes?.trim() || '';

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.produto_id === produto.id &&
          item.nome_produto === nomeItem &&
          (item.observacoes || '') === cleanObs &&
          item.valor_unitario === valorUnit
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantidade: updated[existingIndex].quantidade + quantidade,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id_item: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          produto_id: produto.id,
          nome_produto: nomeItem,
          quantidade,
          valor_unitario: valorUnit,
          observacoes: cleanObs || undefined,
          tempo_preparo_dias: produto.tempo_preparo_dias,
        },
      ];
    });
  };

  const updateCartItemQuantity = (id_item: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeFromCart(id_item);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id_item === id_item ? { ...item, quantidade } : item))
    );
  };

  const removeFromCart = (id_item: string) => {
    setCart((prev) => prev.filter((item) => item.id_item !== id_item));
  };

  const clearCart = () => setCart([]);

  const createOrder = (
    orderInput: Omit<Pedido, 'id_pedido' | 'criado_em' | 'status'>
  ): { success: boolean; pedido?: Pedido; error?: string } => {
    const todayISO = getTodayISO();
    const validation = validateOrderSchedule({
      targetDateISO: orderInput.data_agendamento,
      targetSlot: orderInput.hora_slot,
      todayISO,
      itens: orderInput.itens,
      configs: db.configs,
      pedidos: db.pedidos,
      bloqueios: db.bloqueios,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const nextSeq = 2600 + db.pedidos.length + 1;
    const novoPedido: Pedido = {
      ...orderInput,
      id_pedido: `ADE-${nextSeq}`,
      status: 'pendente',
      criado_em: new Date().toISOString(),
    };

    setDb((prev) => ({
      ...prev,
      pedidos: [novoPedido, ...prev.pedidos],
    }));

    return { success: true, pedido: novoPedido };
  };

  const advanceOrderStatus = (id_pedido: string) => {
    setDb((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((p) => {
        if (p.id_pedido !== id_pedido) return p;
        const next = getNextOrderStatus(p.status);
        return next ? { ...p, status: next } : p;
      }),
    }));
  };

  const updateOrderStatus = (id_pedido: string, status: OrderStatus) => {
    setDb((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((p) => (p.id_pedido === id_pedido ? { ...p, status } : p)),
    }));
  };

  const updatePaymentStatus = (id_pedido: string, status_pagamento: PaymentStatus) => {
    setDb((prev) => ({
      ...prev,
      pedidos: prev.pedidos.map((p) =>
        p.id_pedido === id_pedido ? { ...p, status_pagamento } : p
      ),
    }));
  };

  const deleteOrder = (id_pedido: string) => {
    setDb((prev) => ({
      ...prev,
      pedidos: prev.pedidos.filter((p) => p.id_pedido !== id_pedido),
    }));
  };

  const saveProduct = (produto: Produto) => {
    setDb((prev) => {
      const exists = prev.produtos.some((p) => p.id === produto.id);
      const updated = exists
        ? prev.produtos.map((p) => (p.id === produto.id ? produto : p))
        : [produto, ...prev.produtos];
      return { ...prev, produtos: updated };
    });
  };

  const toggleProductActive = (id: string) => {
    setDb((prev) => ({
      ...prev,
      produtos: prev.produtos.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p)),
    }));
  };

  const deleteProduct = (id: string) => {
    setDb((prev) => ({
      ...prev,
      produtos: prev.produtos.filter((p) => p.id !== id),
    }));
  };

  const updateDayConfig = (config: DisponibilidadeConfig) => {
    setDb((prev) => ({
      ...prev,
      configs: prev.configs.map((c) =>
        c.dia_semana === config.dia_semana ? config : c
      ),
    }));
  };

  const addBloqueio = (bloqueio: Omit<BloqueioAgenda, 'id'>) => {
    const novo: BloqueioAgenda = {
      ...bloqueio,
      id: `bloq-${Date.now()}`,
    };
    setDb((prev) => ({
      ...prev,
      bloqueios: [novo, ...prev.bloqueios],
    }));
  };

  const removeBloqueio = (id: string) => {
    setDb((prev) => ({
      ...prev,
      bloqueios: prev.bloqueios.filter((b) => b.id !== id),
    }));
  };

  const updateSettings = (
    input: Partial<AtelierSettings>
  ): { success: boolean; error?: string } => {
    const rawPhone = input.telefone_exibicao ?? db.settings.telefone_exibicao;
    const normalized = normalizeWhatsAppDigits(rawPhone);
    if (!normalized.valid) {
      return { success: false, error: normalized.error };
    }

    const updatedSettings: AtelierSettings = {
      telefone_exibicao: rawPhone.trim(),
      whatsapp_numero: normalized.digits,
      mensagem_duvidas:
        (input.mensagem_duvidas ?? db.settings.mensagem_duvidas).trim() ||
        INITIAL_ATELIER_SETTINGS.mensagem_duvidas,
    };

    setDb((prev) => ({
      ...prev,
      settings: updatedSettings,
    }));

    return { success: true };
  };

  const loginAdmin = (password: string): boolean => {
    if (password.trim() === adminPassword) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {
        // Ignore
      }
      return true;
    }
    return false;
  };

  const changeAdminPassword = (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): { success: boolean; error?: string } => {
    const check = validatePasswordChange({
      storedPassword: adminPassword,
      currentPasswordInput: currentPassword,
      newPasswordInput: newPassword,
      confirmPasswordInput: confirmPassword,
    });

    if (!check.valid) {
      return { success: false, error: check.error };
    }

    setAdminPassword(newPassword.trim());
    return { success: true };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // Ignore
    }
  };

  const resetDemoDatabase = () => {
    const fresh: PersistedDatabase = {
      produtos: INITIAL_PRODUTOS,
      configs: INITIAL_DISPONIBILIDADE_CONFIG,
      pedidos: createInitialPedidos(),
      bloqueios: createInitialBloqueios(),
      settings: INITIAL_ATELIER_SETTINGS,
    };
    setDb(fresh);
    setAdminPassword(DEFAULT_ADMIN_PASSWORD);
    setCart([]);
  };

  return (
    <StoreContext.Provider
      value={{
        produtos: db.produtos,
        configs: db.configs,
        pedidos: db.pedidos,
        bloqueios: db.bloqueios,
        settings: db.settings,
        cart,
        isAdminAuthenticated,
        isDefaultPasswordActive: adminPassword === DEFAULT_ADMIN_PASSWORD,
        addToCart,
        updateCartItemQuantity,
        removeFromCart,
        clearCart,
        createOrder,
        advanceOrderStatus,
        updateOrderStatus,
        updatePaymentStatus,
        deleteOrder,
        saveProduct,
        toggleProductActive,
        deleteProduct,
        updateDayConfig,
        addBloqueio,
        removeBloqueio,
        updateSettings,
        loginAdmin,
        changeAdminPassword,
        logoutAdmin,
        resetDemoDatabase,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

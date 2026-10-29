import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ClipboardList,
  Package,
  Settings,
  Lock,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  X,
  Ban,
  KeyRound,
  Phone,
  Image as ImageIcon,
  Upload,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { FinancialAnalyticsViews } from './FinancialAnalyticsViews';
import {
  addDaysISO,
  calculateDashboardMetrics,
  evaluateDayAvailability,
  formatCurrencyBRL,
  formatDateBR,
  getNextOrderStatus,
  getTodayISO,
} from '../utils/schedulingEngine';
import {
  BlockReason,
  OrderStatus,
  PaymentStatus,
  ProductCategory,
  Produto,
} from '../types';
import { createPatisserieSvgUrl, ArtTheme } from '../utils/patisserieArt';

const ATELIER_PHOTO_GALLERY: Array<{ label: string; url: string }> = [
  { label: 'Bolo Tradicional', url: '/assets/produtos/bolo-tradicional.jpg' },
  { label: 'Bolo Vintage Lambeth', url: '/assets/produtos/bolo-vintage.jpg' },
  { label: 'Bolo Mil Folhas', url: '/assets/produtos/bolo-milfolhas.jpg' },
  { label: 'Bolo Pintado à Mão', url: '/assets/produtos/bolo-pintado.jpg' },
  { label: 'Bolo Coração', url: '/assets/produtos/bolo-coracao.jpg' },
  { label: 'Baby Cake', url: '/assets/produtos/bolo-baby.jpg' },
  { label: 'Bolo de Andar', url: '/assets/produtos/bolo-andar.jpg' },
  { label: 'Bolo Chocolate Belga', url: '/assets/produtos/bolo-chocolate-belga.jpg' },
  { label: 'Torta Búlgara', url: '/assets/produtos/torta-bulgara.jpg' },
  { label: 'Bolo Afetivo Vulcão', url: '/assets/produtos/bolo-afetivo.jpg' },
  { label: 'Cake Brownie Letra/Número', url: '/assets/produtos/cake-brownie-letra.jpg' },
  { label: 'Cake Brownie Especial', url: '/assets/produtos/cake-brownie-esp.jpg' },
  { label: 'Cake Brownie Tradicional', url: '/assets/produtos/cake-brownie-trad.jpg' },
  { label: 'Caixa de Brigadeiros', url: '/assets/produtos/caixa-brigadeiros.jpg' },
  { label: 'Brownie Supreme Travessa', url: '/assets/produtos/brownie-supreme.jpg' },
  { label: 'Brownie na Taça', url: '/assets/produtos/brownie-taca.jpg' },
  { label: 'Torta Italiana', url: '/assets/produtos/torta-italiana.jpg' },
  { label: 'Cheesecake Autoral', url: '/assets/produtos/cheesecake.jpg' },
  { label: 'Kit Altura Dupla + Corte', url: '/assets/produtos/kit-altura-dupla.jpg' },
  { label: 'Bolo de Corte (Copa)', url: '/assets/produtos/bolo-copa.jpg' },
  { label: 'Fatia Caixa Personalizada', url: '/assets/produtos/fatia-personalizada.jpg' },
  { label: 'Fatia Caixinha', url: '/assets/produtos/fatia-caixinha.jpg' },
  { label: 'Fatia no Celofane', url: '/assets/produtos/fatia-celofane.jpg' },
  { label: 'Bem-Casados', url: '/assets/produtos/bem-casado.jpg' },
  { label: 'Doces em Scrap', url: '/assets/produtos/doces-scrap.jpg' },
];

const STATUS_STYLE: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pendente: {
    label: 'Pendente (Sinal)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  'em produção': {
    label: 'Em Produção',
    bg: 'bg-[#FDF2F6]',
    text: 'text-[#9E4765]',
    border: 'border-[#E8C5D1]',
  },
  pronto: {
    label: 'Pronto p/ Retirada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  entregue: {
    label: 'Entregue',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-200',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  aguardando_sinal_50: 'Aguardando 50%',
  sinal_50_pago: 'Sinal 50% Pago',
  pago_integral: '100% Quitado',
};

export const AdminDashboard: React.FC = () => {
  const {
    produtos,
    configs,
    pedidos,
    bloqueios,
    settings,
    isAdminAuthenticated,
    isDefaultPasswordActive,
    loginAdmin,
    logoutAdmin,
    updateSettings,
    changeAdminPassword,
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
    resetDemoDatabase,
  } = useStore();

  // Login state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    'agenda' | 'pedidos' | 'catalogo' | 'faturamento' | 'relatorios' | 'config'
  >('agenda');

  // Agenda Visual states
  const todayISO = useMemo(() => getTodayISO(), []);
  const [calendarView, setCalendarView] = useState<'mensal' | 'semanal' | 'diaria'>('semanal');
  const [focusedDateISO, setFocusedDateISO] = useState<string>(todayISO);

  // Gestão de Pedidos states
  const [orderFilter, setOrderFilter] = useState<
    'todos' | 'hoje' | 'atrasados' | 'em_producao' | 'pendentes' | 'prontos'
  >('todos');
  const [orderSearch, setOrderSearch] = useState('');

  // Catálogo CRUD states
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [prodNome, setProdNome] = useState('');
  const [prodCategoria, setProdCategoria] = useState<ProductCategory>('bolos');
  const [prodSubcategoria, setProdSubcategoria] = useState('Bolos Tradicionais');
  const [prodPreco, setProdPreco] = useState('');
  const [prodPreparoDias, setProdPreparoDias] = useState('2');
  const [prodRendimento, setProdRendimento] = useState('');
  const [prodDescricao, setProdDescricao] = useState('');
  const [prodFotoUrl, setProdFotoUrl] = useState('/assets/produtos/bolo-vintage.jpg');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [prodTemaArte, setProdTemaArte] = useState<ArtTheme>('bolo-vintage');
  const [prodError, setProdError] = useState('');

  // Bloqueio Agenda form state
  const [bloqData, setBloqData] = useState(addDaysISO(todayISO, 4));
  const [bloqMotivo, setBloqMotivo] = useState<BlockReason>('feriado');
  const [bloqDescricao, setBloqDescricao] = useState('');
  const [bloqError, setBloqError] = useState('');

  // Contact / WhatsApp form state
  const [contactPhone, setContactPhone] = useState(settings.telefone_exibicao);
  const [contactMsg, setContactMsg] = useState(settings.mensagem_duvidas);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  useEffect(() => {
    setContactPhone(settings.telefone_exibicao);
    setContactMsg(settings.mensagem_duvidas);
  }, [settings.telefone_exibicao, settings.mensagem_duvidas]);

  // Password Change form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics({
        pedidos,
        configs,
        bloqueios,
        todayISO,
      }),
    [pedidos, configs, bloqueios, todayISO]
  );

  // Filtered Orders for Operational Table
  const filteredOrders = useMemo(() => {
    return pedidos.filter((p) => {
      if (orderFilter === 'hoje' && p.data_agendamento !== todayISO) return false;
      if (
        orderFilter === 'atrasados' &&
        !(p.data_agendamento < todayISO && p.status !== 'entregue' && p.status !== 'cancelado')
      ) {
        return false;
      }
      if (orderFilter === 'em_producao' && p.status !== 'em produção') return false;
      if (orderFilter === 'pendentes' && p.status !== 'pendente') return false;
      if (orderFilter === 'prontos' && p.status !== 'pronto') return false;

      const q = orderSearch.trim().toLowerCase();
      if (
        q &&
        !p.cliente_nome.toLowerCase().includes(q) &&
        !p.id_pedido.toLowerCase().includes(q) &&
        !p.cliente_telefone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [pedidos, orderFilter, orderSearch, todayISO]);

  // Calendar dates computation
  const weekDaysISO = useMemo(() => {
    const [y, m, d] = focusedDateISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay(); // 0..6
    const sundayISO = addDaysISO(focusedDateISO, -dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => addDaysISO(sundayISO, i));
  }, [focusedDateISO]);

  const monthDaysGrid = useMemo(() => {
    const [y, m] = focusedDateISO.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const cells: Array<{ dateISO: string; inCurrentMonth: boolean }> = [];
    const firstMonthISO = `${y}-${String(m).padStart(2, '0')}-01`;

    for (let i = startWeekday; i > 0; i--) {
      cells.push({
        dateISO: addDaysISO(firstMonthISO, -i),
        inCurrentMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateISO: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        inCurrentMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const lastISO = cells[cells.length - 1].dateISO;
      cells.push({
        dateISO: addDaysISO(lastISO, 1),
        inCurrentMonth: false,
      });
    }
    return cells;
  }, [focusedDateISO]);

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!passwordInput.trim()) {
      setLoginError('Informe a senha administrativa.');
      return;
    }
    const ok = loginAdmin(passwordInput);
    if (!ok) {
      setLoginError(
        isDefaultPasswordActive
          ? 'Senha incorreta. Utilize a senha padrão: ade2026'
          : 'Senha incorreta. Digite a nova senha cadastrada no painel.'
      );
    } else {
      setPasswordInput('');
    }
  };

  // Contact Settings Handler
  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');
    const res = updateSettings({
      telefone_exibicao: contactPhone,
      mensagem_duvidas: contactMsg,
    });
    if (!res.success) {
      setContactError(res.error || 'Erro ao atualizar telefone.');
    } else {
      setContactSuccess('Número de celular/WhatsApp e mensagem atualizados com sucesso!');
    }
  };

  // Password Change Handler
  const handleChangePasswordForm = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    const res = changeAdminPassword(currentPwd, newPwd, confirmPwd);
    if (!res.success) {
      setPwdError(res.error || 'Não foi possível alterar a senha.');
    } else {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess('Senha do Painel Administrativo alterada com sucesso!');
    }
  };

  // Open Product Modal (Create or Edit)
  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProdNome('');
    setProdCategoria('bolos');
    setProdSubcategoria('Bolos Tradicionais');
    setProdPreco('');
    setProdPreparoDias('2');
    setProdRendimento('12 a 15 fatias');
    setProdDescricao('');
    setProdFotoUrl('/assets/produtos/bolo-vintage.jpg');
    setShowPhotoGallery(false);
    setProdTemaArte('bolo-vintage');
    setProdError('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Produto, openGalleryImmediately = false) => {
    setEditingProduct(prod);
    setProdNome(prod.nome);
    setProdCategoria(prod.categoria);
    setProdSubcategoria(prod.subcategoria);
    setProdPreco(String(prod.preco_base));
    setProdPreparoDias(String(prod.tempo_preparo_dias));
    setProdRendimento(prod.rendimento || '');
    setProdDescricao(prod.descricao);
    setProdFotoUrl(prod.foto_url);
    setShowPhotoGallery(openGalleryImmediately);
    setProdError('');
    setIsProductModalOpen(true);
  };

  // Handle Photo File Upload from Device (with Canvas compression for localStorage)
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProdError('');

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 720;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setProdFotoUrl(compressedDataUrl);
            setShowPhotoGallery(false);
          } else {
            setProdFotoUrl(resultStr);
          }
        } catch {
          setProdFotoUrl(resultStr);
        }
      };
      img.onerror = () => {
        setProdError('Não foi possível processar o arquivo de imagem selecionado.');
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');
    if (!prodNome.trim()) {
      setProdError('Informe o nome do produto.');
      return;
    }
    const precoNum = parseFloat(prodPreco.replace(',', '.'));
    if (isNaN(precoNum) || precoNum <= 0) {
      setProdError('Informe um preço base válido maior que zero.');
      return;
    }
    const diasNum = parseInt(prodPreparoDias, 10);
    if (isNaN(diasNum) || diasNum < 0) {
      setProdError('Informe o tempo de preparo em dias.');
      return;
    }
    if (!prodDescricao.trim()) {
      setProdError('Informe a descrição detalhada do produto.');
      return;
    }

    const finalFotoUrl =
      prodFotoUrl.trim() ||
      (editingProduct
        ? editingProduct.foto_url
        : createPatisserieSvgUrl(prodTemaArte, prodNome.trim().slice(0, 22)));

    const saved: Produto = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      nome: prodNome.trim(),
      categoria: prodCategoria,
      subcategoria: prodSubcategoria.trim() || 'Autoral',
      preco_base: precoNum,
      descricao: prodDescricao.trim(),
      foto_url: finalFotoUrl,
      tempo_preparo_dias: diasNum,
      ativo: editingProduct ? editingProduct.ativo : true,
      rendimento: prodRendimento.trim() || undefined,
    };

    saveProduct(saved);
    setIsProductModalOpen(false);
  };

  const handleAddBloqueioForm = (e: React.FormEvent) => {
    e.preventDefault();
    setBloqError('');
    if (!bloqData) {
      setBloqError('Selecione a data que deseja bloquear.');
      return;
    }
    if (bloqueios.some((b) => b.data === bloqData)) {
      setBloqError('Esta data já possui um bloqueio ativo.');
      return;
    }
    addBloqueio({
      data: bloqData,
      motivo: bloqMotivo,
      descricao: bloqDescricao.trim() || `Bloqueio manual (${bloqMotivo})`,
    });
    setBloqDescricao('');
  };

  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  if (!isAdminAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-2xl border border-[#EAD8DF] bg-white p-8 shadow-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FDF3F6] text-[#9E586F]">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-[#231F20]">
              Painel Administrativo
            </h1>
            <p className="text-xs text-[#6E6064]">
              Acesso restrito à gestão de agenda, capacidade produtiva e pedidos da Adê Andrade Confeitaria.
            </p>
          </div>

          {loginError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#231F20] mb-1.5"
              >
                Senha de Acesso *
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha do ateliê"
                className="w-full rounded-xl border border-[#DFD2D6] px-3.5 py-2.5 text-sm text-[#231F20] focus:border-[#C4708B] focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-[#8C7A80]">
                {isDefaultPasswordActive ? (
                  <>
                    Credencial padrão de demonstração:{' '}
                    <strong className="font-mono text-[#231F20]">ade2026</strong>
                  </>
                ) : (
                  <span>Senha personalizada ativa neste navegador.</span>
                )}
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#231F20] py-3 text-sm font-semibold text-white hover:bg-[#9E586F] transition-colors"
            >
              Entrar no Painel de Controle
            </button>
          </form>
        </div>
      </div>
    );
  }

  const focusedDayEval = evaluateDayAvailability({
    targetDateISO: focusedDateISO,
    todayISO,
    requiredLeadDays: 0,
    configs,
    pedidos,
    bloqueios,
  });

  const focusedDayOrders = pedidos.filter(
    (p) => p.data_agendamento === focusedDateISO
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      {/* Top Bar: Admin Title & Session Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE3E7] pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
            Gestão de Produção & Capacidade · Adê Andrade
          </span>
          <h1 className="font-display text-3xl font-semibold text-[#231F20]">
            Controle Operacional do Ateliê
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D2D7] bg-white px-3.5 py-2 text-xs font-semibold text-[#9E586F] hover:bg-[#FAF2F5] whitespace-nowrap shrink-0"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Senha & Contato
          </button>
          <button
            type="button"
            onClick={logoutAdmin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D2D7] bg-white px-3.5 py-2 text-xs font-semibold text-[#231F20] hover:bg-[#FAF2F5] whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            Encerrar Sessão
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <span className="text-xs font-medium text-[#7D6F74]">Total Faturado no Mês</span>
          <div className="mt-2 font-mono text-2xl font-bold text-[#231F20] tabular-nums">
            {formatCurrencyBRL(metrics.faturamentoMes)}
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            Pedidos confirmados e em andamento
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <span className="text-xs font-medium text-[#7D6F74]">Pedidos a Entregar Hoje</span>
          <div className="mt-2 font-mono text-2xl font-bold text-[#231F20] tabular-nums">
            {metrics.pedidosHoje}{' '}
            <span className="text-sm font-normal text-[#8C7A80]">
              / {metrics.totalPedidosHoje} agendados
            </span>
          </div>
          <div className="mt-1 text-xs text-[#8C7A80]">
            Data atual: {formatDateBR(todayISO)}
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <span className="text-xs font-medium text-[#7D6F74]">Taxa de Ocupação da Agenda</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#9E586F] tabular-nums">
              {metrics.taxaOcupacaoSemanal}%
            </span>
            <span className="text-xs text-[#8C7A80] font-mono tabular-nums">
              ({metrics.ocupados7Dias}/{metrics.capacidadeTotal7Dias} vagas · 7d)
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F4E8EC]">
            <div
              className="h-full bg-[#9E586F]"
              style={{ width: `${metrics.taxaOcupacaoSemanal}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#EAD8DF] bg-white p-5">
          <span className="text-xs font-medium text-[#7D6F74]">Fila de Produção & Alertas</span>
          <div className="mt-2 font-mono text-2xl font-bold text-[#231F20] tabular-nums whitespace-nowrap">
            {metrics.pedidosEmProducao}{' '}
            <span className="text-sm font-normal text-[#8C7A80]">em produção</span>
          </div>
          <div className="mt-1 text-xs">
            {metrics.pedidosAtrasados > 0 ? (
              <span className="font-semibold text-red-700">
                Atenção: {metrics.pedidosAtrasados} pedido(s) atrasado(s)
              </span>
            ) : (
              <span className="text-[#8C7A80]">Produção rigorosamente em dia</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Seções do painel administrativo"
        className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#F3E6EA] p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'agenda'}
          onClick={() => setActiveTab('agenda')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'agenda'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <CalendarIcon className="h-4 w-4 text-[#9E586F]" />
          Agenda Visual
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pedidos'}
          onClick={() => setActiveTab('pedidos')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'pedidos'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <ClipboardList className="h-4 w-4 text-[#9E586F]" />
          Gestão de Pedidos ({pedidos.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'catalogo'}
          onClick={() => setActiveTab('catalogo')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'catalogo'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <Package className="h-4 w-4 text-[#9E586F]" />
          Catálogo & Preços ({produtos.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'faturamento'}
          onClick={() => setActiveTab('faturamento')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'faturamento'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <Wallet className="h-4 w-4 text-[#9E586F]" />
          Faturamento
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'relatorios'}
          onClick={() => setActiveTab('relatorios')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'relatorios'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-[#9E586F]" />
          Relatórios Financeiros
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'config'
              ? 'bg-white text-[#231F20] shadow-xs'
              : 'text-[#6E5E63] hover:text-[#231F20]'
          }`}
        >
          <Settings className="h-4 w-4 text-[#9E586F]" />
          Agenda, Contato & Senha
        </button>
      </div>

      {/* ================= TABS FINANCEIRAS: FATURAMENTO & RELATÓRIOS ================= */}
      {(activeTab === 'faturamento' || activeTab === 'relatorios') && (
        <FinancialAnalyticsViews
          mode={activeTab}
          pedidos={pedidos}
          produtos={produtos}
          settings={settings}
          todayISO={todayISO}
          onUpdatePaymentStatus={updatePaymentStatus}
        />
      )}

      {/* ================= TAB 1: AGENDA VISUAL ================= */}
      {activeTab === 'agenda' && (
        <div className="space-y-6">
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#EAD8DF] bg-white p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFocusedDateISO((curr) =>
                    addDaysISO(
                      curr,
                      calendarView === 'diaria' ? -1 : calendarView === 'semanal' ? -7 : -30
                    )
                  )
                }
                aria-label="Período anterior"
                className="rounded-lg border border-[#E2D2D7] p-2 text-[#5C5054] hover:bg-[#FAF2F5]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setFocusedDateISO(todayISO)}
                className="rounded-lg border border-[#E2D2D7] px-3 py-1.5 text-xs font-semibold text-[#231F20] hover:bg-[#FAF2F5]"
              >
                Hoje ({formatDateBR(todayISO)})
              </button>

              <button
                type="button"
                onClick={() =>
                  setFocusedDateISO((curr) =>
                    addDaysISO(
                      curr,
                      calendarView === 'diaria' ? 1 : calendarView === 'semanal' ? 7 : 30
                    )
                  )
                }
                aria-label="Próximo período"
                className="rounded-lg border border-[#E2D2D7] p-2 text-[#5C5054] hover:bg-[#FAF2F5]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span className="ml-2 font-display text-xl font-semibold text-[#231F20]">
                Data em foco: {formatDateBR(focusedDateISO)}
              </span>
            </div>

            {/* View Switcher: Mensal | Semanal | Diária */}
            <div className="flex items-center gap-1 rounded-lg bg-[#F4E9ED] p-1">
              {(
                [
                  { id: 'mensal', label: 'Visão Mensal' },
                  { id: 'semanal', label: 'Visão Semanal' },
                  { id: 'diaria', label: 'Visão Diária' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCalendarView(v.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    calendarView === v.id
                      ? 'bg-white text-[#231F20] shadow-xs'
                      : 'text-[#6E5E63] hover:text-[#231F20]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* VISÃO SEMANAL */}
          {calendarView === 'semanal' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDaysISO.map((dtISO) => {
                const dayEval = evaluateDayAvailability({
                  targetDateISO: dtISO,
                  todayISO,
                  requiredLeadDays: 0,
                  configs,
                  pedidos,
                  bloqueios,
                });
                const dayOrders = pedidos.filter((p) => p.data_agendamento === dtISO);
                const shortDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const isSelected = dtISO === focusedDateISO;
                const isToday = dtISO === todayISO;

                return (
                  <div
                    key={dtISO}
                    onClick={() => setFocusedDateISO(dtISO)}
                    className={`flex flex-col rounded-xl border p-3 transition-all cursor-pointer min-h-[220px] ${
                      isSelected
                        ? 'border-[#C4708B] bg-[#FDF7F9] shadow-xs'
                        : 'border-[#EAD8DF] bg-white hover:border-[#D4B2BF]'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#F2E6EA] pb-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold text-[#7D6F74]">
                          {shortDias[dayEval.dia_semana]}
                        </span>
                        <div className="font-mono text-sm font-bold text-[#231F20] tabular-nums">
                          {dtISO.slice(8, 10)}/{dtISO.slice(5, 7)}
                          {isToday && (
                            <span className="ml-1 text-[10px] font-sans font-semibold text-[#9E586F]">
                              · Hoje
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="font-mono text-xs text-[#6E5E63] tabular-nums">
                        {dayEval.total_pedidos_dia}/{dayEval.limite_max_dia}
                      </span>
                    </div>

                    {dayEval.motivo_bloqueio && dayOrders.length === 0 && (
                      <div className="mb-2 rounded-lg bg-[#F7EFF2] p-2 text-[11px] text-[#8C6D77]">
                        {dayEval.motivo_bloqueio}
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      {dayOrders.length === 0 ? (
                        <p className="text-[11px] text-[#A6989D] pt-2">Sem pedidos</p>
                      ) : (
                        dayOrders.map((ord) => {
                          const st = STATUS_STYLE[ord.status];
                          return (
                            <div
                              key={ord.id_pedido}
                              className={`rounded-lg border p-2 text-xs ${st.bg} ${st.border} ${st.text}`}
                            >
                              <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                                <span>{ord.hora_slot}</span>
                                <span>{ord.id_pedido}</span>
                              </div>
                              <div className="mt-0.5 font-semibold truncate">
                                {ord.cliente_nome}
                              </div>
                              <div className="mt-0.5 text-[10px] opacity-85">
                                {st.label}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISÃO MENSAL */}
          {calendarView === 'mensal' && (
            <div className="rounded-xl border border-[#EAD8DF] bg-white p-4">
              <div className="grid grid-cols-7 gap-2 border-b border-[#F2E6EA] pb-2 text-center text-xs font-semibold text-[#7D6F74]">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthDaysGrid.map((cell) => {
                  const dayOrders = pedidos.filter(
                    (p) => p.data_agendamento === cell.dateISO && p.status !== 'cancelado'
                  );
                  const isBlocked = bloqueios.some((b) => b.data === cell.dateISO);
                  const isSelected = cell.dateISO === focusedDateISO;

                  return (
                    <button
                      key={cell.dateISO}
                      type="button"
                      onClick={() => {
                        setFocusedDateISO(cell.dateISO);
                        setCalendarView('diaria');
                      }}
                      className={`flex min-h-[84px] flex-col items-start justify-between rounded-xl border p-2 text-left transition-all ${
                        !cell.inCurrentMonth
                          ? 'border-transparent bg-[#FAF7F8] text-[#B8ACB0]'
                          : isSelected
                          ? 'border-[#C4708B] bg-[#FDF4F7] text-[#231F20]'
                          : isBlocked
                          ? 'border-red-200 bg-red-50/40 text-[#7D6F74]'
                          : 'border-[#EFE3E7] bg-white text-[#231F20] hover:border-[#C4708B]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between text-xs font-mono">
                        <span className="font-bold">{cell.dateISO.slice(8, 10)}</span>
                        {isBlocked && (
                          <span className="text-[10px] text-red-700 font-sans">Bloqueado</span>
                        )}
                      </div>

                      {dayOrders.length > 0 && (
                        <div className="w-full space-y-1">
                          <div className="text-[11px] font-semibold text-[#9E586F]">
                            {dayOrders.length} pedido(s)
                          </div>
                          <div className="truncate text-[10px] text-[#5C5054]">
                            {dayOrders[0].hora_slot} · {dayOrders[0].cliente_nome}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISÃO DIÁRIA E DETALHAMENTO DE SLOTS DO DIA EM FOCO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-xl border border-[#EAD8DF] bg-white p-6">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                  Capacidade de Slots por Hora
                </span>
                <h3 className="font-display text-2xl font-semibold text-[#231F20]">
                  Grade do Dia {formatDateBR(focusedDateISO)}
                </h3>
                <p className="text-xs text-[#6E6064]">
                  Ocupação diária:{' '}
                  <strong className="font-mono">
                    {focusedDayEval.total_pedidos_dia} / {focusedDayEval.limite_max_dia} pedidos
                  </strong>{' '}
                  ({focusedDayEval.taxa_ocupacao}%)
                </p>
              </div>

              {focusedDayEval.slots.length === 0 ? (
                <div className="rounded-xl border border-[#EFE2E6] bg-[#FAF6F7] p-4 text-xs text-[#7D6F74]">
                  {focusedDayEval.motivo_bloqueio || 'Ateliê fechado neste dia da semana.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {focusedDayEval.slots.map((slot) => (
                    <div
                      key={slot.hora}
                      className={`rounded-xl border p-3 ${
                        slot.ocupados >= slot.limite
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-[#EFE2E6] bg-[#FDF9FA]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs font-bold text-[#231F20]">
                        <span>{slot.hora}</span>
                        <span>
                          {slot.ocupados}/{slot.limite}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#6E6064]">
                        {slot.ocupados >= slot.limite ? 'Slot Lotado' : 'Disponível'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-semibold text-[#231F20]">
                  Pedidos Agendados em {formatDateBR(focusedDateISO)} ({focusedDayOrders.length})
                </h3>
              </div>

              {focusedDayOrders.length === 0 ? (
                <div className="rounded-xl border border-[#EFE2E6] bg-[#FAF6F7] p-8 text-center text-xs text-[#6E6064]">
                  Nenhuma encomenda agendada para esta data.
                </div>
              ) : (
                <div className="space-y-3">
                  {focusedDayOrders.map((ord) => {
                    const st = STATUS_STYLE[ord.status];
                    const nextSt = getNextOrderStatus(ord.status);
                    return (
                      <div
                        key={ord.id_pedido}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#EAD8DF] bg-[#FDFBFC] p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-[#231F20]">
                              {ord.hora_slot} · #{ord.id_pedido}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${st.text}`}>{st.label}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize text-[#6E6064]">{ord.tipo}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#231F20]">
                            {ord.cliente_nome}{' '}
                            <span className="font-mono text-xs font-normal text-[#7D6F74]">
                              ({ord.cliente_telefone})
                            </span>
                          </div>
                          <div className="text-xs text-[#5C5054]">
                            {ord.itens
                              .map((i) => `${i.quantidade}x ${i.nome_produto}`)
                              .join(', ')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-sm font-bold text-[#231F20] tabular-nums mr-2">
                            {formatCurrencyBRL(ord.valor_total)}
                          </span>
                          {nextSt && (
                            <button
                              type="button"
                              onClick={() => advanceOrderStatus(ord.id_pedido)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F20] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
                            >
                              Avançar p/ {STATUS_STYLE[nextSt].label}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: GESTÃO DE PEDIDOS ================= */}
      {activeTab === 'pedidos' && (
        <div className="space-y-5">
          {/* Quick Filters & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-[#EAD8DF] bg-white p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'atrasados', label: `Atrasados (${metrics.pedidosAtrasados})` },
                  { id: 'em_producao', label: `Em Produção (${metrics.pedidosEmProducao})` },
                  { id: 'pendentes', label: 'Pendentes' },
                  { id: 'prontos', label: 'Prontos' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    orderFilter === f.id
                      ? 'bg-[#231F20] text-white'
                      : 'bg-[#F5ECEF] text-[#5C5054] hover:text-[#231F20]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[250px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A80]" />
              <input
                type="search"
                aria-label="Buscar pedido por cliente ou código"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar cliente, código ou telefone..."
                className="w-full rounded-xl border border-[#DFCFD5] pl-9 pr-3 py-2 text-xs text-[#231F20] focus:border-[#C4708B] focus:outline-none"
              />
            </div>
          </div>

          {/* Orders Operational Table */}
          <div className="overflow-x-auto rounded-xl border border-[#EAD8DF] bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EFE3E7] bg-[#FDF8FA] text-[11px] font-semibold uppercase tracking-wider text-[#7D6F74]">
                  <th className="py-3.5 px-4">Pedido / Data & Slot</th>
                  <th className="py-3.5 px-4">Cliente & Modalidade</th>
                  <th className="py-3.5 px-4">Itens & Observações</th>
                  <th className="py-3.5 px-4 text-right">Valor & Pagamento</th>
                  <th className="py-3.5 px-4">Status Atual</th>
                  <th className="py-3.5 px-4 text-right">Ação Rápida (1 Clique)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E6EA] text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#7D6F74]">
                      Nenhum pedido encontrado para este filtro operacional.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((pedido) => {
                    const st = STATUS_STYLE[pedido.status];
                    const nextSt = getNextOrderStatus(pedido.status);
                    const isLate =
                      pedido.data_agendamento < todayISO &&
                      pedido.status !== 'entregue' &&
                      pedido.status !== 'cancelado';

                    return (
                      <tr key={pedido.id_pedido} className="hover:bg-[#FDF9FA]">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-bold text-[#231F20]">
                            #{pedido.id_pedido}
                          </div>
                          <div className="mt-0.5 font-mono text-[#5C5054] tabular-nums">
                            {formatDateBR(pedido.data_agendamento)} · {pedido.hora_slot}
                          </div>
                          {isLate && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Atrasado
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-[#231F20]">
                            {pedido.cliente_nome}
                          </div>
                          <div className="font-mono text-[#6E6064]">
                            {pedido.cliente_telefone}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#8C7A80] capitalize">
                            {pedido.tipo}
                            {pedido.endereco_entrega ? ` — ${pedido.endereco_entrega}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <ul className="space-y-1">
                            {pedido.itens.map((item) => (
                              <li key={item.id_item}>
                                <span className="font-semibold text-[#231F20]">
                                  {item.quantidade}x {item.nome_produto}
                                </span>
                                {item.observacoes && (
                                  <span className="block text-[11px] text-[#6E6064]">
                                    Obs: {item.observacoes}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="font-mono text-sm font-bold text-[#231F20] tabular-nums">
                            {formatCurrencyBRL(pedido.valor_total)}
                          </div>
                          <div className="text-[11px] text-[#6E6064]">
                            {pedido.forma_pagamento}
                          </div>
                          <select
                            aria-label={`Status de pagamento do pedido ${pedido.id_pedido}`}
                            value={pedido.status_pagamento}
                            onChange={(e) =>
                              updatePaymentStatus(
                                pedido.id_pedido,
                                e.target.value as PaymentStatus
                              )
                            }
                            className="mt-1 rounded-lg border border-[#E2D2D7] bg-white px-2 py-1 text-[11px] font-medium text-[#231F20]"
                          >
                            {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <select
                            aria-label={`Alterar status do pedido ${pedido.id_pedido}`}
                            value={pedido.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                pedido.id_pedido,
                                e.target.value as OrderStatus
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${st.bg} ${st.text} ${st.border}`}
                          >
                            <option value="pendente">Pendente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="em produção">Em Produção</option>
                            <option value="pronto">Pronto</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            {nextSt ? (
                              <button
                                type="button"
                                onClick={() => advanceOrderStatus(pedido.id_pedido)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F20] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
                              >
                                Avançar: {STATUS_STYLE[nextSt].label}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-[#8C7A80]">
                                Fluxo Concluído
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteOrder(pedido.id_pedido)}
                              aria-label={`Excluir pedido ${pedido.id_pedido}`}
                              className="rounded-lg p-1.5 text-[#9C8D92] hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CATÁLOGO & PREÇOS (CRUD) ================= */}
      {activeTab === 'catalogo' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#EAD8DF] bg-white p-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                Gestão de Produtos, Preços e Antecedência
              </h2>
              <p className="text-xs text-[#6E6064]">
                Adicione novos itens ao cardápio, atualize preços ou ative/desative a disponibilidade imediata.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateProductModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#231F20] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Novo Produto no Catálogo
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#EAD8DF] bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EFE3E7] bg-[#FDF8FA] text-[11px] font-semibold uppercase tracking-wider text-[#7D6F74]">
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Categoria / Subcategoria</th>
                  <th className="py-3.5 px-4 text-right">Preço Base</th>
                  <th className="py-3.5 px-4 text-center">Preparo (Dias)</th>
                  <th className="py-3.5 px-4 text-center">Status no Catálogo</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E6EA] text-xs">
                {produtos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#FDF9FA]">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod, true)}
                          title={`Clique para trocar a foto de ${prod.nome}`}
                          className="group relative h-12 w-16 overflow-hidden rounded-lg border border-[#EFE2E6] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#9E586F]"
                        >
                          <img
                            src={prod.foto_url}
                            alt={prod.nome}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                            <ImageIcon className="h-4 w-4 text-white" />
                          </span>
                        </button>
                        <div>
                          <div className="font-semibold text-[#231F20]">{prod.nome}</div>
                          {prod.rendimento && (
                            <div className="text-[11px] text-[#7D6F74]">{prod.rendimento}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize font-medium text-[#231F20]">
                        {prod.categoria}
                      </span>
                      <span className="block text-[11px] text-[#7D6F74]">
                        {prod.subcategoria}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#231F20] tabular-nums">
                      {formatCurrencyBRL(prod.preco_base)}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                      {prod.tempo_preparo_dias} dia(s)
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleProductActive(prod.id)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                          prod.ativo
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {prod.ativo ? 'Ativo no Catálogo' : 'Pausado / Inativo'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod, true)}
                          aria-label={`Trocar foto de ${prod.nome}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D2D7] bg-[#FDF8FA] px-2.5 py-1.5 text-xs font-semibold text-[#9E586F] hover:bg-[#FAF0F4] whitespace-nowrap shrink-0"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Trocar Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod, false)}
                          aria-label={`Editar ${prod.nome}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D2D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#231F20] hover:bg-[#FAF2F5] whitespace-nowrap shrink-0"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(prod.id)}
                          aria-label={`Excluir ${prod.nome}`}
                          className="rounded-lg p-1.5 text-[#9C8D92] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CONFIGURAÇÃO DE AGENDA, CONTATO & SENHA ================= */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Row 1: Contact / WhatsApp Shortcut & Admin Password Change */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1: Celular / WhatsApp da Confeitaria */}
            <div className="lg:col-span-6 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                  Atendimento ao Cliente · WhatsApp
                </span>
                <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                  Celular & Atalho para Sanar Dúvidas
                </h2>
                <p className="text-xs text-[#6E6064]">
                  Este número é exibido no botão flutuante de dúvidas, no topo/rodapé do catálogo e recebe os pedidos finalizados.
                </p>
              </div>

              {contactError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
                >
                  {contactError}
                </div>
              )}

              {contactSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{contactSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveContactForm} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="admin-contact-phone"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Celular / WhatsApp da Confeitaria (com DDD) *
                  </label>
                  <input
                    id="admin-contact-phone"
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ex: (79) 99988-7766"
                    className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3.5 py-2 text-xs font-mono text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#8C7A80]">
                    Link ativo: <strong className="font-mono text-[#231F20]">wa.me/{settings.whatsapp_numero}</strong>
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="admin-contact-msg"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Mensagem Automática ao Clicar em "Tirar Dúvidas" *
                  </label>
                  <textarea
                    id="admin-contact-msg"
                    rows={2}
                    required
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Olá, Adê Andrade! Gostaria de tirar uma dúvida sobre o cardápio..."
                    className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3.5 py-2 text-xs text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#231F20] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Salvar Número e Atalho de Dúvidas
                </button>
              </form>
            </div>

            {/* Card 2: Trocar Senha do Painel Administrativo */}
            <div className="lg:col-span-6 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                  Segurança de Acesso · Painel Admin
                </span>
                <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                  Trocar Senha Administrativa
                </h2>
                <p className="text-xs text-[#6E6064]">
                  Altere a senha de acesso ao painel operacional. Exige confirmação da senha atual para maior segurança.
                </p>
              </div>

              {pwdError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
                >
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordForm} className="space-y-3">
                <div>
                  <label
                    htmlFor="admin-current-pwd"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Senha Atual *
                  </label>
                  <input
                    id="admin-current-pwd"
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Digite sua senha atual"
                    className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3.5 py-2 text-xs text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="admin-new-pwd"
                      className="block text-xs font-semibold text-[#231F20] mb-1"
                    >
                      Nova Senha (mín. 6 caracteres) *
                    </label>
                    <input
                      id="admin-new-pwd"
                      type="password"
                      required
                      minLength={6}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Nova senha"
                      className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3.5 py-2 text-xs text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-confirm-pwd"
                      className="block text-xs font-semibold text-[#231F20] mb-1"
                    >
                      Confirmar Nova Senha *
                    </label>
                    <input
                      id="admin-confirm-pwd"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3.5 py-2 text-xs text-[#231F20] focus:border-[#C4708B] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#231F20] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Atualizar Senha do Painel
                </button>
              </form>
            </div>
          </div>

          {/* Row 2: Weekly Capacity Table & Manual Date Blockouts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Weekly Capacity Table */}
            <div className="lg:col-span-7 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                  Parâmetros de Capacidade (`disponibilidade_config`)
                </span>
                <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                  Limites Diários e Horários por Dia da Semana
                </h2>
                <p className="text-xs text-[#6E6064]">
                  O motor de agendamento bloqueia automaticamente qualquer slot ou dia que atingir estes limites.
                </p>
              </div>

            <div className="space-y-3">
              {configs.map((cfg) => (
                <div
                  key={cfg.dia_semana}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#EFE2E6] bg-[#FDF9FA] p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <input
                      type="checkbox"
                      id={`dia-ativo-${cfg.dia_semana}`}
                      checked={cfg.ativo}
                      onChange={(e) =>
                        updateDayConfig({ ...cfg, ativo: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-[#C4708B] text-[#9E586F]"
                    />
                    <label
                      htmlFor={`dia-ativo-${cfg.dia_semana}`}
                      className="text-sm font-semibold text-[#231F20]"
                    >
                      {cfg.nome_dia}
                    </label>
                  </div>

                  {cfg.ativo ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[#7D6F74]">Início:</span>
                        <input
                          type="time"
                          aria-label={`Horário início ${cfg.nome_dia}`}
                          value={cfg.horario_inicio}
                          onChange={(e) =>
                            updateDayConfig({ ...cfg, horario_inicio: e.target.value })
                          }
                          className="rounded-lg border border-[#DFCFD5] bg-white px-2 py-1 font-mono text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[#7D6F74]">Fim:</span>
                        <input
                          type="time"
                          aria-label={`Horário fim ${cfg.nome_dia}`}
                          value={cfg.horario_fim}
                          onChange={(e) =>
                            updateDayConfig({ ...cfg, horario_fim: e.target.value })
                          }
                          className="rounded-lg border border-[#DFCFD5] bg-white px-2 py-1 font-mono text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[#7D6F74]">Máx/Slot:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          aria-label={`Limite por slot ${cfg.nome_dia}`}
                          value={cfg.limite_pedidos_por_slot}
                          onChange={(e) =>
                            updateDayConfig({
                              ...cfg,
                              limite_pedidos_por_slot: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="w-14 rounded-lg border border-[#DFCFD5] bg-white px-2 py-1 font-mono text-xs text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[#7D6F74]">Máx/Dia:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          aria-label={`Limite máximo no dia ${cfg.nome_dia}`}
                          value={cfg.pedidos_max_dia}
                          onChange={(e) =>
                            updateDayConfig({
                              ...cfg,
                              pedidos_max_dia: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="w-16 rounded-lg border border-[#DFCFD5] bg-white px-2 py-1 font-mono text-xs text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs italic text-[#9C8D92]">
                      Ateliê fechado para entregas/retiradas
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Manual Date Blockouts (`bloqueios_agenda`) */}
          <div className="lg:col-span-5 rounded-xl border border-[#EAD8DF] bg-white p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9E586F]">
                Exceções e Feriados (`bloqueios_agenda`)
              </span>
              <h2 className="font-display text-2xl font-semibold text-[#231F20]">
                Bloqueio Manual de Datas
              </h2>
              <p className="text-xs text-[#6E6064]">
                Feche datas específicas por motivo de feriado, recesso ou capacidade esgotada.
              </p>
            </div>

            {bloqError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
              >
                {bloqError}
              </div>
            )}

            <form onSubmit={handleAddBloqueioForm} className="space-y-3 rounded-xl border border-[#EFE2E6] bg-[#FDF9FA] p-4">
              <div>
                <label
                  htmlFor="bloq-data-input"
                  className="block text-xs font-semibold text-[#231F20] mb-1"
                >
                  Data do Bloqueio *
                </label>
                <input
                  id="bloq-data-input"
                  type="date"
                  required
                  value={bloqData}
                  onChange={(e) => setBloqData(e.target.value)}
                  className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="bloq-motivo-select"
                  className="block text-xs font-semibold text-[#231F20] mb-1"
                >
                  Motivo *
                </label>
                <select
                  id="bloq-motivo-select"
                  value={bloqMotivo}
                  onChange={(e) => setBloqMotivo(e.target.value as BlockReason)}
                  className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3 py-2 text-xs"
                >
                  <option value="feriado">Feriado</option>
                  <option value="recesso">Recesso do Ateliê</option>
                  <option value="capacidade esgotada">Capacidade Esgotada</option>
                  <option value="manutenção">Manutenção / Inventário</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="bloq-desc-input"
                  className="block text-xs font-semibold text-[#231F20] mb-1"
                >
                  Observação / Motivo Visível
                </label>
                <input
                  id="bloq-desc-input"
                  type="text"
                  value={bloqDescricao}
                  onChange={(e) => setBloqDescricao(e.target.value)}
                  placeholder="Ex: Feriado Nacional / Recesso Pós-Festa"
                  className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#231F20] py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors"
              >
                <Ban className="h-3.5 w-3.5" />
                Bloquear Data na Agenda
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7D6F74]">
                Datas Bloqueadas Atualmente ({bloqueios.length})
              </h3>
              {bloqueios.length === 0 ? (
                <p className="text-xs text-[#8C7A80]">Nenhuma data bloqueada manualmente.</p>
              ) : (
                <div className="space-y-2">
                  {bloqueios.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-[#EFE2E6] bg-white px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-[#231F20]">
                          {formatDateBR(b.data)} ·{' '}
                          <span className="font-sans font-semibold text-[#9E586F] uppercase">
                            {b.motivo}
                          </span>
                        </div>
                        {b.descricao && (
                          <div className="text-[11px] text-[#6E6064]">{b.descricao}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBloqueio(b.id)}
                        aria-label={`Remover bloqueio da data ${b.data}`}
                        className="rounded-lg p-1.5 text-[#9C8D92] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Produto */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-crud-modal-title"
        >
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl border border-[#EFE2E6]">
            <div className="flex items-center justify-between border-b border-[#F2E6EA] bg-[#FDF8FA] px-6 py-4 shrink-0">
              <h3
                id="product-crud-modal-title"
                className="font-display text-2xl font-semibold text-[#231F20]"
              >
                {editingProduct ? 'Editar Produto & Foto' : 'Novo Produto no Catálogo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label="Fechar formulário de produto"
                className="rounded-lg p-1.5 text-[#6E6266] hover:bg-[#F5E6EB]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-6 space-y-4 overflow-y-auto">
              {prodError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {prodError}
                </div>
              )}

              {/* Seção de Edição / Troca da Foto do Produto */}
              <div className="rounded-xl border border-[#EAD8DF] bg-[#FDF9FA] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-24 w-32 overflow-hidden rounded-xl border border-[#DFCFD5] bg-white shrink-0">
                    <img
                      src={prodFotoUrl}
                      alt={prodNome || 'Pré-visualização da foto'}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-semibold text-[#231F20]">
                      Foto do Produto no Catálogo
                    </div>
                    <p className="text-[11px] text-[#6E6064]">
                      Envie uma foto do seu celular/computador, escolha uma imagem da galeria do ateliê ou cole um link.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#231F20] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9E586F] transition-colors whitespace-nowrap shrink-0">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Enviar do Dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileUpload}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowPhotoGallery((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9C4CC] bg-white px-3 py-2 text-xs font-semibold text-[#231F20] hover:bg-[#FAF0F4] transition-colors whitespace-nowrap shrink-0"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-[#9E586F]" />
                        <span>
                          {showPhotoGallery
                            ? 'Ocultar Galeria do Ateliê'
                            : 'Escolher da Galeria (25 Fotos)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Galeria Interativa com as 25 Fotos Reais */}
                {showPhotoGallery && (
                  <div className="space-y-2 border-t border-[#EFE2E6] pt-3">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#9E586F]">
                      Selecione uma foto oficial do cardápio Adê Andrade:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                      {ATELIER_PHOTO_GALLERY.map((item) => {
                        const isSelected = prodFotoUrl === item.url;
                        return (
                          <button
                            key={item.url}
                            type="button"
                            onClick={() => setProdFotoUrl(item.url)}
                            className={`group flex flex-col overflow-hidden rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'border-[#9E586F] ring-2 ring-[#9E586F] bg-white'
                                : 'border-[#E5D5DC] bg-white hover:border-[#9E586F]'
                            }`}
                          >
                            <img
                              src={item.url}
                              alt={item.label}
                              className="h-14 w-full object-cover"
                            />
                            <span className="truncate px-1.5 py-1 text-[10px] font-medium text-[#231F20]">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="crud-prod-foto-url"
                    className="block text-[11px] font-semibold text-[#5C5054] mb-1"
                  >
                    Ou informe a URL / Caminho da Imagem
                  </label>
                  <input
                    id="crud-prod-foto-url"
                    type="text"
                    value={prodFotoUrl}
                    onChange={(e) => setProdFotoUrl(e.target.value)}
                    placeholder="/assets/produtos/bolo-vintage.jpg ou https://..."
                    className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3 py-1.5 text-xs font-mono text-[#231F20]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="crud-prod-nome"
                  className="block text-xs font-semibold text-[#231F20] mb-1"
                >
                  Nome do Produto *
                </label>
                <input
                  id="crud-prod-nome"
                  type="text"
                  required
                  value={prodNome}
                  onChange={(e) => setProdNome(e.target.value)}
                  placeholder="Ex: Bolo Vintage Red Velvet (18cm)"
                  className="w-full rounded-xl border border-[#DFCFD5] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="crud-prod-cat"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Categoria Principal *
                  </label>
                  <select
                    id="crud-prod-cat"
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value as ProductCategory)}
                    className="w-full rounded-xl border border-[#DFCFD5] bg-white px-3 py-2 text-sm"
                  >
                    <option value="bolos">Bolos</option>
                    <option value="doces">Doces & Sobremesas</option>
                    <option value="kits">Kits & Personalizados</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="crud-prod-subcat"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Subcategoria
                  </label>
                  <input
                    id="crud-prod-subcat"
                    type="text"
                    value={prodSubcategoria}
                    onChange={(e) => setProdSubcategoria(e.target.value)}
                    placeholder="Ex: Bolos Vintage"
                    className="w-full rounded-xl border border-[#DFCFD5] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="crud-prod-preco"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Preço Base (R$) *
                  </label>
                  <input
                    id="crud-prod-preco"
                    type="number"
                    step="0.01"
                    required
                    value={prodPreco}
                    onChange={(e) => setProdPreco(e.target.value)}
                    placeholder="250.00"
                    className="w-full rounded-xl border border-[#DFCFD5] px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="crud-prod-preparo"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Preparo (Dias) *
                  </label>
                  <input
                    id="crud-prod-preparo"
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={prodPreparoDias}
                    onChange={(e) => setProdPreparoDias(e.target.value)}
                    className="w-full rounded-xl border border-[#DFCFD5] px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="crud-prod-rendimento"
                    className="block text-xs font-semibold text-[#231F20] mb-1"
                  >
                    Rendimento
                  </label>
                  <input
                    id="crud-prod-rendimento"
                    type="text"
                    value={prodRendimento}
                    onChange={(e) => setProdRendimento(e.target.value)}
                    placeholder="18 a 20 fatias"
                    className="w-full rounded-xl border border-[#DFCFD5] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="crud-prod-desc"
                  className="block text-xs font-semibold text-[#231F20] mb-1"
                >
                  Descrição Detalhada *
                </label>
                <textarea
                  id="crud-prod-desc"
                  rows={3}
                  required
                  value={prodDescricao}
                  onChange={(e) => setProdDescricao(e.target.value)}
                  placeholder="Ingredientes, camadas de recheio e detalhes de acabamento..."
                  className="w-full rounded-xl border border-[#DFCFD5] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="rounded-xl border border-[#DFCFD5] px-4 py-2.5 text-xs font-semibold text-[#5C5054]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#231F20] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#9E586F]"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

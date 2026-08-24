import React, { useState, useReducer, useMemo } from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  CalendarDays,
  Target,
  TrendingUp,
  Plus,
  Trash2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  LogOut,
  Edit2,
  Trophy,
  PlusCircle,
  CheckCircle2,
  CheckSquare,
  BookOpen,
  Sparkles,
  Receipt,
  X,
  CheckCircle
} from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    title: "Bem-vindo ao No Azul! 👋",
    description: "Estamos muito felizes em ter você por aqui. O No Azul foi criado para te ajudar a ter controle total sobre o seu dinheiro, de forma simples e visual. Vamos fazer um tour\u00A0rápido?",
    icon: <Sparkles className="w-10 h-10 text-[#011640]" />
  },
  {
    title: "Análise",
    description: "Sua visão detalhada! Descubra de onde vem o dinheiro, para onde ele vai, identifique os maiores gastos e projete seu saldo final do\u00A0mês.",
    icon: <PieChartIcon className="w-10 h-10 text-[#011640]" />
  },
  {
    title: "Transações Inteligentes",
    description: "Cadastre despesas e receitas. Você pode adicionar lançamentos pontuais, parcelados ou criar Mensais Fixas (que se repetem automaticamente todos os\u00A0meses!).",
    icon: <Receipt className="w-10 h-10 text-[#011640]" />
  },
  {
    title: "Orçamentos e Metas",
    description: "Defina limites de gastos por categoria para não estourar o orçamento e crie metas para economizar dinheiro para seus grandes\u00A0sonhos.",
    icon: <Target className="w-10 h-10 text-[#011640]" />
  },
  {
    title: "Tudo Pronto!",
    description: "Você já está pronto para organizar sua vida financeira e ficar sempre No Azul. Se tiver dúvidas depois, consulte o Manual no menu\u00A0lateral.",
    icon: <CheckCircle className="w-10 h-10 text-[#10B981]" />
  }
];
import { supabase } from './supabaseClient';
import { toast, Toaster } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts';

// --- Utilitários e Constantes ---
const CATEGORY_COLORS = {
  'Alimentação': '#E08E79', // Salmão
  'Moradia': '#01256B',    // Azul Escuro
  'Transporte': '#D9A05B',  // Ouro
  'Saúde': '#6B8E23',      // Verde Oliva
  'Lazer': '#4E8D9C',      // Azul Médio
  'Educação': '#A0522D',   // Marrom
  'Salário': '#011640',    // Verde Água/Azul Mar
  'Freelance': '#7FB5C2',  // Azul Claro
  'Investimentos': '#8B5CF6', // Roxo
  'Trabalho': '#F59E0B',      // Âmbar
  'Outros': '#B4D2D9'      // Azul Pálido
};

const getCategoryColor = (category) => CATEGORY_COLORS[category] || '#94a3b8';

const COLORS = Object.values(CATEGORY_COLORS);

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCompactCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact'
  }).format(value);
};

const formatInputCurrency = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
};

const parseCurrencyToFloat = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const CATEGORIAS = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Salário', 'Freelance', 'Investimentos', 'Trabalho', 'Outros'];
const TIPOS_INVESTIMENTO = ['Renda Fixa', 'Ações', 'FII', 'Cripto', 'Internacional'];

const getValidDayForMonth = (year, month, targetDay) => {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  return Math.min(targetDay, lastDayOfMonth);
};

const TooltipIcon = ({ icon: Icon, text, colorClass, position = "bottom" }) => {
  const [show, setShow] = React.useState(false);
  const isTop = position === "top";

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
      tabIndex="0"
      onBlur={() => setShow(false)}
    >
      <Icon className={`${colorClass} w-5 h-5 transition-transform ${show ? 'scale-110' : ''}`} />
      <div className={`absolute ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 lg:-translate-x-1/2 lg:right-auto lg:left-1/2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl transition-all z-50 text-center font-normal tracking-wide ${show ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        {text}
        <div className={`absolute ${isTop ? 'top-full border-t-gray-800' : 'bottom-full border-b-gray-800'} right-2 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 border-4 border-transparent`}></div>
      </div>
    </div>
  );
};

// --- Dados Iniciais de Exemplo ---
const generateMockData = () => {
  const transactions = [];
  const hoje = new Date();

  // Gerar 20 transações nos últimos 3 meses
  for (let i = 0; i < 20; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
    const isEntrada = Math.random() > 0.7;
    const categoria = isEntrada ? (Math.random() > 0.5 ? 'Salário' : 'Freelance') : CATEGORIAS[Math.floor(Math.random() * 6)];

    transactions.push({
      id: i + 1,
      descricao: `Transação de ${categoria}`,
      valor: isEntrada ? Math.random() * 5000 + 1000 : Math.random() * 500 + 50,
      tipo: isEntrada ? 'Entrada' : 'Saída',
      categoria: categoria,
      data: data.toISOString().split('T')[0]
    });
  }

  return {
    transactions: transactions.sort((a, b) => b.data.localeCompare(a.data)),
    budgets: [
      { id: 1, categoria: 'Alimentação', valor: 1500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 2, categoria: 'Moradia', valor: 2500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 3, categoria: 'Transporte', valor: 800, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 4, categoria: 'Lazer', valor: 500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 5, categoria: 'Saúde', valor: 400, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }
    ]
  };
};

const initialState = { transactions: [], budgets: [], goals: [] };

// --- Reducer ---
function financeReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions].sort((a, b) => b.data.localeCompare(a.data)) };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t).sort((a, b) => b.data.localeCompare(a.data))
      };
    case 'DELETE_FUTURE_RECURRING':
      return {
        ...state,
        transactions: state.transactions.filter(t => !(t.frequencia === 'recorrente' && t.descricao === action.payload.descricao && t.data >= action.payload.data))
      };
    case 'UPDATE_FUTURE_RECURRING':
      {
        const updatedIds = new Set(action.payload.map(t => t.id));
        return {
          ...state,
          transactions: state.transactions.map(t => {
            if (updatedIds.has(t.id)) {
              return action.payload.find(ut => ut.id === t.id);
            }
            return t;
          }).sort((a, b) => b.data.localeCompare(a.data))
        };
      }
    case 'ADD_BUDGET':
      // Atualiza se já existir, senão adiciona
      const existingBudgetIdx = state.budgets.findIndex(b => b.categoria === action.payload.categoria && b.mes === action.payload.mes && b.ano === action.payload.ano);
      if (existingBudgetIdx >= 0) {
        const newBudgets = [...state.budgets];
        newBudgets[existingBudgetIdx] = action.payload;
        return { ...state, budgets: newBudgets };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };
    default:
      return state;
  }
}

// --- Componente Principal ---
export default function FinanceApp({ session }) {
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  React.useEffect(() => {
    if (session?.user) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding_noazul');
      const hasSeenUpdate = localStorage.getItem('hasSeenUpdate_v1');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      } else if (!hasSeenUpdate) {
        setShowUpdateModal(true);
      }
    }
  }, [session]);
  const [deleteOptions, setDeleteOptions] = useState({ transacoes: true, orcamentos: true, metas: true });

  React.useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transRes, budRes, goalsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', session.user.id).order('data', { ascending: false }),
        supabase.from('budgets').select('*').eq('user_id', session.user.id),
        supabase.from('goals').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
      ]);

      dispatch({
        type: 'SET_DATA',
        payload: {
          transactions: transRes.data || [],
          budgets: budRes.data || [],
          goals: goalsRes.data || []
        }
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getDefaultDateForSelectedMonth = React.useCallback(() => {
    const hoje = new Date();
    let dia = hoje.getDate();
    if (selectedMonth !== hoje.getMonth() + 1 || selectedYear !== hoje.getFullYear()) {
      dia = 1;
    }
    return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
  }, [selectedMonth, selectedYear]);

  React.useEffect(() => {
    setNovaTransacao(prev => ({ ...prev, data: getDefaultDateForSelectedMonth() }));
  }, [getDefaultDateForSelectedMonth]);

  // State dos formulários das abas
  const [novaTransacao, setNovaTransacao] = useState({
    descricao: '', valor: '', tipo: 'Saída', categoria: 'Alimentação',
    data: new Date().toISOString().split('T')[0],
    frequencia: 'pontual', pagamento: 'a vista', parcelas: 1, metodo_pagamento: 'Pix'
  });
  const [novoOrcamento, setNovoOrcamento] = useState({ categoria: CATEGORIAS[0], valor: '' });
  const [novaMeta, setNovaMeta] = useState({ nome: '', valor_alvo: '' });
  const [addValorMeta, setAddValorMeta] = useState({ metaId: null, valor: '' });
  const [selectedDay, setSelectedDay] = useState(null);

  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [originalTxDesc, setOriginalTxDesc] = useState('');
  const [originalTxDate, setOriginalTxDate] = useState('');
  const [updateFuture, setUpdateFuture] = useState(false);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!transactionToEdit) return;

    if (transactionToEdit.frequencia === 'recorrente' && updateFuture) {
      // Buscar todos os lançamentos futuros desta recorrência para atualizar a data no mesmo dia do mês
      const { data: recurringTxs, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('frequencia', 'recorrente')
        .eq('descricao', originalTxDesc)
        .gte('data', originalTxDate);

      if (fetchError) {
        console.error("Erro ao buscar recorrências:", fetchError);
        alert("Erro ao buscar recorrências: " + fetchError.message);
        return;
      }

      const targetDay = parseInt(transactionToEdit.data.split('-')[2], 10);
      const updatedTxs = recurringTxs.map(tx => {
        if (tx.id === transactionToEdit.id) {
          return {
            ...tx,
            descricao: transactionToEdit.descricao,
            valor: parseCurrencyToFloat(transactionToEdit.valor),
            tipo: transactionToEdit.tipo,
            categoria: transactionToEdit.categoria,
            metodo_pagamento: transactionToEdit.metodo_pagamento,
            data: transactionToEdit.data
          };
        } else {
          const [yStr, mStr, dStr] = tx.data.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          const validDay = getValidDayForMonth(y, m, targetDay);
          const newData = `${y}-${m.toString().padStart(2, '0')}-${validDay.toString().padStart(2, '0')}`;
          return {
            ...tx,
            descricao: transactionToEdit.descricao,
            valor: parseCurrencyToFloat(transactionToEdit.valor),
            tipo: transactionToEdit.tipo,
            categoria: transactionToEdit.categoria,
            metodo_pagamento: transactionToEdit.metodo_pagamento,
            data: newData
          };
        }
      });

      const { error: upsertError } = await supabase
        .from('transactions')
        .upsert(updatedTxs);

      if (upsertError) {
        console.error("Erro ao atualizar lote:", upsertError);
        alert("Erro ao editar em lote: " + upsertError.message);
      } else {
        dispatch({
          type: 'UPDATE_FUTURE_RECURRING',
          payload: updatedTxs
        });
        setTransactionToEdit(null);
      }
    } else {
      const { error } = await supabase.from('transactions').update({
        descricao: transactionToEdit.descricao,
        valor: parseCurrencyToFloat(transactionToEdit.valor),
        data: transactionToEdit.data,
        tipo: transactionToEdit.tipo,
        categoria: transactionToEdit.categoria,
        metodo_pagamento: transactionToEdit.metodo_pagamento
      }).eq('id', transactionToEdit.id).eq('user_id', session.user.id);

      if (error) {
        console.error("Erro ao atualizar:", error);
        alert("Erro ao editar: " + error.message);
      } else {
        const updatedTx = { ...transactionToEdit, valor: parseCurrencyToFloat(transactionToEdit.valor) };
        dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTx });
        setTransactionToEdit(null);
      }
    }
  };

  const handleTogglePago = async (tx) => {
    const novoStatus = !tx.pago;
    const { data, error } = await supabase
      .from('transactions')
      .update({ pago: novoStatus })
      .eq('id', tx.id)
      .eq('user_id', session.user.id)
      .select();

    if (error) {
      console.error("Erro ao atualizar status de pagamento:", error);
      alert("Erro ao marcar como pago. Você já executou o comando SQL no Supabase para adicionar a coluna 'pago'?\n\nExecute no SQL Editor do Supabase:\nALTER TABLE transactions ADD COLUMN pago BOOLEAN DEFAULT false;");
    } else if (data && data[0]) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: data[0] });
    }
  };

  const confirmDelete = async (future = false) => {
    if (!transactionToDelete) return;

    if (future) {
      const { error } = await supabase.from('transactions')
        .delete()
        .eq('user_id', session.user.id)
        .eq('frequencia', 'recorrente')
        .eq('descricao', transactionToDelete.descricao)
        .gte('data', transactionToDelete.data);

      if (error) {
        console.error("Erro ao deletar lote:", error);
        alert("Erro ao apagar: " + error.message);
      } else {
        dispatch({ type: 'DELETE_FUTURE_RECURRING', payload: { descricao: transactionToDelete.descricao, data: transactionToDelete.data } });
        setTransactionToDelete(null);
        toast.success('Transação excluída com sucesso!');
      }
    } else {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id).eq('user_id', session.user.id);
      if (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao apagar: " + error.message);
      } else {
        dispatch({ type: 'DELETE_TRANSACTION', payload: transactionToDelete.id });
        setTransactionToDelete(null);
        toast.success('Transação excluída com sucesso!');
      }
    }
    setTransactionToDelete(null);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    const { error } = await supabase.from('goals').delete().eq('id', goalToDelete.id).eq('user_id', session.user.id);
    if (error) {
      console.error("Erro ao excluir meta:", error);
      alert("Erro ao excluir meta.");
    } else {
      dispatch({ type: 'DELETE_GOAL', payload: goalToDelete.id });
      setGoalToDelete(null);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const promises = [];
      const newTransactions = deleteOptions.transacoes ? [] : state.transactions;
      const newBudgets = deleteOptions.orcamentos ? [] : state.budgets;
      const newGoals = deleteOptions.metas ? [] : state.goals;

      if (deleteOptions.transacoes) {
        promises.push(supabase.from('transactions').delete().eq('user_id', session.user.id));
      }
      if (deleteOptions.orcamentos) {
        promises.push(supabase.from('budgets').delete().eq('user_id', session.user.id));
      }
      if (deleteOptions.metas) {
        promises.push(supabase.from('goals').delete().eq('user_id', session.user.id));
      }
      
      await Promise.all(promises);
      
      dispatch({
        type: 'SET_DATA',
        payload: {
          transactions: newTransactions,
          budgets: newBudgets,
          goals: newGoals
        }
      });
      setIsDeleteModalOpen(false);
      setDeleteStep(1);
      setDeleteOptions({ transacoes: true, orcamentos: true, metas: true });
      toast.success("Informações apagadas com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar dados:", error);
      toast.error("Erro ao apagar informações.");
    }
  };
  // Cálculos Globais Filtrados
  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mes] = t.data.split('-');
      return parseInt(mes, 10) === selectedMonth && parseInt(ano, 10) === selectedYear;
    });
  }, [state.transactions, selectedMonth, selectedYear]);

  const totaisMes = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      if (curr.tipo === 'Entrada') acc.entradas += curr.valor;
      else acc.saidas += curr.valor;
      return acc;
    }, { entradas: 0, saidas: 0 });
  }, [filteredTransactions]);

  const saldoTotal = React.useMemo(() => {
    return state.transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mes] = t.data.split('-');
      const tDate = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
      const limitDate = new Date(selectedYear, selectedMonth - 1, 1);
      return tDate <= limitDate;
    }).reduce((acc, curr) => curr.tipo === 'Entrada' ? acc + curr.valor : acc - curr.valor, 0);
  }, [state.transactions, selectedMonth, selectedYear]);

  const saldoAtualMes = totaisMes.entradas - totaisMes.saidas;

  // --- Sub-componentes (Abas) ---
  const renderDashboard = () => {
    // Dados para gráficos
    const gastosPorCategoria = filteredTransactions
      .filter(t => t.tipo === 'Saída')
      .reduce((acc, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
        return acc;
      }, {});

    const pieData = Object.keys(gastosPorCategoria).map(key => ({ name: key, value: gastosPorCategoria[key] }));

    // Previsões e Faturas
    const previsaoAnualRecorrente = filteredTransactions
      .filter(t => t.tipo === 'Saída' && t.frequencia === 'recorrente')
      .reduce((acc, curr) => acc + curr.valor, 0) * 12;

    const dataAtual = new Date(selectedYear, selectedMonth, 1);
    const faturasFuturas = state.transactions
      .filter(t => t.tipo === 'Saída' && t.forma_pagamento === 'parcelado')
      .filter(t => {
        if (!t.data) return false;
        const [ano, mes] = t.data.split('-').map(Number);
        return (ano > selectedYear) || (ano === selectedYear && mes > selectedMonth);
      })
      .reduce((acc, curr) => acc + curr.valor, 0);

    // Gráfico de Barras - Últimos 6 meses
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
      last6Months.push({ mes: d.getMonth() + 1, ano: d.getFullYear(), label: `${d.getMonth() + 1}/${d.getFullYear()}` });
    }

    const barData = last6Months.map(m => {
      const transMes = state.transactions.filter(t => {
        if (!t.data) return false;
        const [ano, mes] = t.data.split('-').map(Number);
        return mes === m.mes && ano === m.ano;
      });
      const ent = transMes.filter(t => t.tipo === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
      const sai = transMes.filter(t => t.tipo === 'Saída').reduce((sum, t) => sum + t.valor, 0);
      return { name: m.label, Entradas: ent, Saídas: sai };
    });

    return (
      <div className="space-y-6">
        {/* Cards Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-[#FDFAF4] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <span className="text-[11px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Saldo do Mês</span>
              <TooltipIcon icon={Activity} colorClass="text-[#E08E79]" text="Resultado de entradas menos saídas apenas do mês selecionado." />
            </div>
            <div className={`text-lg md:text-2xl font-playfair font-bold truncate ${saldoAtualMes >= 0 ? 'text-[#01256B]' : 'text-red-700'}`}>{formatCurrency(saldoAtualMes)}</div>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500 uppercase font-semibold">Acumulado Total:</span>
              <span className="text-base font-extrabold text-[#011640]">{formatCurrency(saldoTotal)}</span>
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <span className="text-[11px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Entradas</span>
              <TooltipIcon icon={ArrowUpCircle} colorClass="text-green-600" text="Total de receitas cadastradas no mês selecionado." />
            </div>
            <div className="text-lg md:text-2xl font-playfair font-bold text-green-700 truncate">{formatCurrency(totaisMes.entradas)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <span className="text-[11px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">Saídas</span>
              <TooltipIcon icon={ArrowDownCircle} colorClass="text-red-600" text="Total de despesas cadastradas no mês selecionado." />
            </div>
            <div className="text-lg md:text-2xl font-playfair font-bold text-red-700 truncate">{formatCurrency(totaisMes.saidas)}</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="font-playfair font-bold text-lg mb-4 text-[#011640]">Fluxo de Caixa (6 meses)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={80} tickFormatter={(val) => formatCompactCurrency(val)} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="Entradas" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-playfair font-bold text-lg mb-4 text-[#011640]">Despesas por Categoria</h3>
            <div className="h-80">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={false}
                    >
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const total = pieData.reduce((acc, d) => acc + d.value, 0);
                        const percent = ((value / total) * 100).toFixed(1);
                        return [`${formatCurrency(value)} (${percent}%)`, name];
                      }}
                    />
                    <Legend 
                      iconType="circle" 
                      formatter={(value) => {
                        const total = pieData.reduce((acc, d) => acc + d.value, 0);
                        const item = pieData.find(d => d.name === value);
                        const percent = item ? (item.value / total) * 100 : 0;
                        return <span className="text-xs font-medium text-gray-700">{value} ({percent.toFixed(0)}%)</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Nenhuma despesa no mês</div>
              )}
            </div>
          </div>
        </div>

        {/* Previsões Futuras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-playfair font-bold text-lg text-[#011640] mb-1">Custo Fixo Anual (Previsão)</h3>
              <p className="text-sm text-gray-500">Baseado nas despesas recorrentes atuais (x12)</p>
            </div>
            <div className="text-2xl font-playfair font-bold text-[#F59E0B]">{formatCurrency(previsaoAnualRecorrente)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-playfair font-bold text-lg text-[#011640] mb-1">Dívida Futura (Parcelamentos)</h3>
              <p className="text-sm text-gray-500">Soma de todas as parcelas dos próximos meses</p>
            </div>
            <div className="text-2xl font-playfair font-bold text-red-700">{formatCurrency(faturasFuturas)}</div>
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-playfair font-bold text-lg text-[#011640]">Transações Recentes</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {state.transactions.slice(0, 5).map(t => (
              <div key={t.id} className="p-4 px-6 flex items-center justify-between hover:bg-[#fcf9f2] transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${t.tipo === 'Entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {t.tipo === 'Entrada' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-[#011640]">{t.descricao}</p>
                    <p className="text-xs text-gray-500">{t.data ? t.data.split('-').reverse().join('/') : ''} • {t.categoria}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`font-medium ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                  </div>
                  <button onClick={() => { setTransactionToEdit(t); setOriginalTxDesc(t.descricao); setOriginalTxDate(t.data); setUpdateFuture(false); }} className="text-gray-400 hover:text-blue-500 transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setTransactionToDelete(t)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTransacoes = () => {
    const handleAdd = async (e) => {
      e.preventDefault();
      if (!novaTransacao.descricao || !novaTransacao.valor) return;

      let numParcelas = 1;
      const valorTotal = parseCurrencyToFloat(novaTransacao.valor);
      let valorParcela = valorTotal;
      const isParcelado = novaTransacao.pagamento === 'parcelado';

      if (isParcelado) {
        numParcelas = parseInt(novaTransacao.parcelas, 10);
        valorParcela = parseFloat((valorTotal / numParcelas).toFixed(2));
      } else if (novaTransacao.frequencia === 'recorrente') {
        numParcelas = 12; // Replicar por 12 meses para garantir um ano de contas
      }

      const transactionsToInsert = [];
      const [anoStr, mesStr, diaStr] = novaTransacao.data.split('-');
      const ano = parseInt(anoStr, 10);
      const mes = parseInt(mesStr, 10);
      const dia = parseInt(diaStr, 10);

      for (let i = 0; i < numParcelas; i++) {
        let m = mes + i;
        let y = ano;
        if (m > 12) {
          y += Math.floor((m - 1) / 12);
          m = ((m - 1) % 12) + 1;
        }
        const dataStr = `${y}-${m.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

        let valorFinal = valorParcela;
        if (isParcelado && i === numParcelas - 1 && numParcelas > 1) {
          valorFinal = parseFloat((valorTotal - (valorParcela * (numParcelas - 1))).toFixed(2));
        }

        transactionsToInsert.push({
          descricao: isParcelado ? `${novaTransacao.descricao} (${i + 1}/${numParcelas})` : novaTransacao.descricao,
          valor: valorFinal,
          tipo: novaTransacao.tipo,
          categoria: novaTransacao.categoria,
          data: dataStr,
          frequencia: novaTransacao.frequencia,
          forma_pagamento: novaTransacao.pagamento,
          metodo_pagamento: novaTransacao.metodo_pagamento,
          total_parcelas: isParcelado ? numParcelas : 1,
          parcela_atual: isParcelado ? i + 1 : 1,
          user_id: session.user.id
        });
      }

      const { data, error } = await supabase.from('transactions').insert(transactionsToInsert).select();

      if (error) {
        console.error("Erro do Supabase:", error);
        alert("Erro ao salvar transação: " + error.message + " (Você já rodou o script SQL das novas colunas?)");
      } else if (data) {
        data.forEach(t => {
          dispatch({ type: 'ADD_TRANSACTION', payload: t });
        });
        setNovaTransacao({ descricao: '', valor: '', tipo: 'Saída', categoria: 'Alimentação', data: getDefaultDateForSelectedMonth(), frequencia: 'pontual', pagamento: 'a vista', parcelas: 1, metodo_pagamento: 'Pix' });
        toast.success('Transação adicionada com sucesso!');
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#011640]">Nova Transação</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" required value={novaTransacao.descricao} onChange={e => setNovaTransacao({ ...novaTransacao, descricao: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="Ex: Supermercado" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da 1ª Parcela</label>
                <input type="date" required value={novaTransacao.data} onChange={e => setNovaTransacao({ ...novaTransacao, data: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                <input type="text" required value={novaTransacao.valor} onChange={e => setNovaTransacao({ ...novaTransacao, valor: formatInputCurrency(e.target.value) })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={novaTransacao.tipo} onChange={e => setNovaTransacao({ ...novaTransacao, tipo: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]">
                  <option value="Saída">Saída</option>
                  <option value="Entrada">Entrada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={novaTransacao.categoria} onChange={e => setNovaTransacao({ ...novaTransacao, categoria: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                <select disabled={novaTransacao.pagamento === 'parcelado'} value={novaTransacao.frequencia} onChange={e => setNovaTransacao({ ...novaTransacao, frequencia: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640] disabled:bg-gray-100">
                  <option value="pontual">Pontual</option>
                  <option value="recorrente">Mensal Fixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select value={novaTransacao.metodo_pagamento} onChange={e => setNovaTransacao({ ...novaTransacao, metodo_pagamento: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]">
                  <option value="Pix">Pix</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
                <select value={novaTransacao.pagamento} onChange={e => setNovaTransacao({ ...novaTransacao, pagamento: e.target.value, frequencia: e.target.value === 'parcelado' ? 'pontual' : novaTransacao.frequencia })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]">
                  <option value="a vista">À vista</option>
                  <option value="parcelado">Parcelado</option>
                </select>
              </div>
              {novaTransacao.pagamento === 'parcelado' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Parcelas</label>
                  <input type="number" min="2" max="120" required value={novaTransacao.parcelas} onChange={e => setNovaTransacao({ ...novaTransacao, parcelas: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="10" />
                </div>
              ) : <div></div>}
              <div className="w-full">
                <button type="submit" className="w-full bg-[#011640] text-white p-2 rounded-lg hover:bg-[#01256B] transition-colors flex items-center justify-center h-[42px]">
                  <Plus className="w-5 h-5 mr-1" /> Adicionar
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-500">Data</th>
                  <th className="p-4 font-medium text-gray-500">Descrição</th>
                  <th className="p-4 font-medium text-gray-500">Categoria</th>
                  <th className="p-4 font-medium text-gray-500">Método</th>
                  <th className="p-4 font-medium text-gray-500">Tipo</th>
                  <th className="p-4 font-medium text-gray-500">Valor</th>
                  <th className="p-4 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#fcf9f2]">
                    <td className="p-4 text-gray-600">{t.data ? t.data.split('-').reverse().join('/') : ''}</td>
                    <td className="p-4 font-medium text-[#011640]">{t.descricao}</td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getCategoryColor(t.categoria) }}></span>
                        {t.categoria}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{t.metodo_pagamento || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className={`p-4 font-medium ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(t.valor)}
                    </td>
                    <td className="p-4 flex space-x-2">
                      <button onClick={() => { setTransactionToEdit(t); setOriginalTxDesc(t.descricao); setOriginalTxDate(t.data); setUpdateFuture(false); }} className="text-gray-400 hover:text-blue-500 transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => setTransactionToDelete(t)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && (
              <div className="p-8 text-center text-gray-500">Nenhuma transação encontrada neste mês.</div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredTransactions.map(t => (
              <div key={t.id} className="p-4 flex justify-between items-center bg-[#FDFAF4]">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t.data ? t.data.split('-').reverse().join('/') : ''}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.tipo}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#011640] truncate">{t.descricao}</h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: getCategoryColor(t.categoria) }}></span>
                    {t.categoria} {t.metodo_pagamento ? ` • ${t.metodo_pagamento}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(t.valor)}
                  </div>
                  <div className="flex justify-end space-x-3 mt-2">
                    <button onClick={() => { setTransactionToEdit(t); setOriginalTxDesc(t.descricao); setOriginalTxDate(t.data); setUpdateFuture(false); }} className="text-gray-400 hover:text-blue-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTransactionToDelete(t)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalise = () => {
    // Bloco 1: Projeção de Fechamento
    const saldoAtualMes = totaisMes.entradas - totaisMes.saidas;
    
    // Contas fixas pendentes
    const despesasRecorrentes = state.transactions.filter(t => {
      if (!t.data || t.tipo !== 'Saída' || t.frequencia !== 'recorrente') return false;
      const [ano, mes] = t.data.split('-');
      return parseInt(mes, 10) === selectedMonth && parseInt(ano, 10) === selectedYear;
    });
    const contasFixasPendentes = despesasRecorrentes.filter(t => !t.pago).reduce((acc, curr) => acc + curr.valor, 0);
    
    const saldoProjetado = saldoAtualMes - contasFixasPendentes;

    // Bloco 2: Top 5 Maiores Despesas (Vilões)
    const topDespesas = [...filteredTransactions]
      .filter(t => t.tipo === 'Saída')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Bloco 3: Essencial vs Flexível
    const categoriasEssenciais = ['Moradia', 'Saúde', 'Alimentação', 'Educação', 'Transporte'];
    let gastoEssencial = 0;
    let gastoFlexivel = 0;
    
    filteredTransactions.filter(t => t.tipo === 'Saída').forEach(t => {
      if (categoriasEssenciais.includes(t.categoria)) {
        gastoEssencial += t.valor;
      } else {
        gastoFlexivel += t.valor;
      }
    });
    
    const totalSaidasAnalise = gastoEssencial + gastoFlexivel;
    const percEssencial = totalSaidasAnalise > 0 ? (gastoEssencial / totalSaidasAnalise) * 100 : 0;
    const percFlexivel = totalSaidasAnalise > 0 ? (gastoFlexivel / totalSaidasAnalise) * 100 : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Saldo Atual do Mês</span>
            <div className={`text-3xl font-playfair font-bold ${saldoAtualMes >= 0 ? 'text-[#011640]' : 'text-red-600'}`}>
              {formatCurrency(saldoAtualMes)}
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Contas Fixas Pendentes</span>
            <div className={`text-3xl font-playfair font-bold ${contasFixasPendentes > 0 ? 'text-[#E08E79]' : 'text-green-600'}`}>
              {formatCurrency(contasFixasPendentes)}
            </div>
            <span className="text-xs text-gray-400 mt-2">Valores não marcados no Checklist</span>
          </div>
          <div className="bg-gradient-to-br from-[#011640] to-[#01256B] p-6 rounded-2xl shadow-sm border border-[#011640] flex flex-col text-white">
            <span className="text-sm font-medium text-blue-200 mb-1">Saldo Livre Projetado</span>
            <div className={`text-3xl font-playfair font-bold ${saldoProjetado >= 0 ? 'text-white' : 'text-red-300'}`}>
              {formatCurrency(saldoProjetado)}
            </div>
            <span className="text-xs text-blue-200 mt-2">O que sobra após pagar as contas fixas</span>
          </div>
        </div>

        {/* Blocos Inferiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Top 5 */}
          <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="font-playfair font-bold text-xl mb-6 text-[#011640] flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#F59E0B]" />
              Top 5 Maiores Despesas
            </h3>
            {topDespesas.length > 0 ? (
              <div className="space-y-4">
                {topDespesas.map((t, idx) => (
                  <div key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                        {idx + 1}º
                      </div>
                      <div>
                        <div className="font-medium text-[#011640]">{t.descricao}</div>
                        <div className="text-xs text-gray-500">{t.categoria} • {t.data?.split('-').reverse().join('/')}</div>
                      </div>
                    </div>
                    <div className="font-bold text-[#E08E79]">
                      {formatCurrency(t.valor)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Nenhuma despesa registrada neste mês.</div>
            )}
          </div>

          {/* Essencial vs Flexivel */}
          <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="font-playfair font-bold text-xl mb-6 text-[#011640] flex items-center gap-2">
              <PieChartIcon className="w-6 h-6 text-[#4E8D9C]" />
              Essencial vs Estilo de Vida
            </h3>
            <div className="flex-1 flex flex-col justify-center space-y-8">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="font-medium text-[#011640] flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#011640]"></div> Essencial</span>
                    <p className="text-xs text-gray-500 mt-1">Moradia, Saúde, Alimentação, Transporte, Educação</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-[#011640]">{formatCurrency(gastoEssencial)}</div>
                    <div className="text-sm text-gray-500">{percEssencial.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-[#011640] h-3 rounded-full" style={{ width: `${percEssencial}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="font-medium text-[#011640] flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div> Estilo de Vida</span>
                    <p className="text-xs text-gray-500 mt-1">Lazer, Outros e despesas flexíveis</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-[#F59E0B]">{formatCurrency(gastoFlexivel)}</div>
                    <div className="text-sm text-gray-500">{percFlexivel.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-[#F59E0B] h-3 rounded-full" style={{ width: `${percFlexivel}%` }}></div>
                </div>
              </div>
              
              <div className="bg-[#011640]/5 p-4 rounded-xl mt-4 border border-[#011640]/10">
                <p className="text-sm text-gray-700 italic">
                  <strong>Dica:</strong> Uma regra popular de finanças recomenda destinar cerca de 50% da sua renda para essenciais, 30% para estilo de vida e 20% para metas/investimentos.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  };

  const renderOrcamento = () => {
    const handleAddBudget = async (e) => {
      e.preventDefault();
      if (!novoOrcamento.valor) return;

      const newBudget = {
        categoria: novoOrcamento.categoria,
        valor: parseFloat(novoOrcamento.valor),
        mes: selectedMonth,
        ano: selectedYear,
        user_id: session.user.id
      };

      // Tenta atualizar se já existir
      const { data: existing } = await supabase.from('budgets')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('categoria', newBudget.categoria)
        .eq('mes', newBudget.mes)
        .eq('ano', newBudget.ano)
        .single();

      let result;
      if (existing) {
        result = await supabase.from('budgets').update({ valor: newBudget.valor }).eq('id', existing.id).eq('user_id', session.user.id).select();
      } else {
        result = await supabase.from('budgets').insert([newBudget]).select();
      }

      if (result.error) {
        console.error("Erro do Supabase:", result.error);
        alert("Erro ao salvar orçamento: " + result.error.message);
      } else if (result.data) {
        dispatch({
          type: 'ADD_BUDGET',
          payload: result.data[0]
        });
        setNovoOrcamento({ categoria: CATEGORIAS[0], valor: '' });
      }
    };

    const budgetsDoMes = state.budgets.filter(b => b.mes === selectedMonth && b.ano === selectedYear);

    const gastosPorCategoria = filteredTransactions.filter(t => t.tipo === 'Saída').reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#011640]">Definir Orçamento</h3>
          <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={novoOrcamento.categoria} onChange={e => setNovoOrcamento({ ...novoOrcamento, categoria: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Limite (R$)</label>
              <input type="number" step="0.01" required value={novoOrcamento.valor} onChange={e => setNovoOrcamento({ ...novoOrcamento, valor: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="0.00" />
            </div>
            <button type="submit" className="bg-[#011640] text-white p-2 px-6 rounded-lg hover:bg-[#01256B] transition-colors h-[42px]">
              Salvar
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetsDoMes.map(budget => {
            const gasto = gastosPorCategoria[budget.categoria] || 0;
            const percentual = (gasto / budget.valor) * 100;
            const isOver = percentual > 100;
            const isWarning = percentual > 80 && !isOver;

            return (
              <div key={budget.id} className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getCategoryColor(budget.categoria) }}></span>
                    <h4 className="font-bold text-[#011640]">{budget.categoria}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-gray-500'}`}>{percentual.toFixed(0)}%</span>
                    {isOver && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Estourou</span>}
                    {isWarning && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">Atenção</span>}
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500`}
                    style={{
                      width: `${Math.min(100, percentual)}%`,
                      backgroundColor: isOver ? '#ef4444' : isWarning ? '#f59e0b' : getCategoryColor(budget.categoria)
                    }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm text-gray-600 mt-3">
                  <span>Gasto: {formatCurrency(gasto)}</span>
                  <span>Orçado: {formatCurrency(budget.valor)}</span>
                </div>
                <div className={`text-right text-sm font-medium mt-1 ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                  Restante: {formatCurrency(budget.valor - gasto)}
                </div>
              </div>
            );
          })}
          {budgetsDoMes.length === 0 && (
            <div className="col-span-2 p-8 text-center text-gray-500 bg-[#FDFAF4] rounded-2xl border border-gray-100">
              Nenhum orçamento definido para este mês.
            </div>
          )}
        </div>
      </div>
    );
  };



  const renderCalendario = () => {
    const diasNoMes = new Date(selectedYear, selectedMonth, 0).getDate();
    const primeiroDiaSemana = new Date(selectedYear, selectedMonth - 1, 1).getDay();

    const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
    const blanks = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

    return (
      <div className="flex gap-6">
        <div className="flex-1 bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-7 gap-2 text-center mb-4 text-sm font-medium text-gray-500">
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {blanks.map(b => <div key={`blank-${b}`} className="p-4 border border-transparent"></div>)}
            {dias.map(dia => {
              const transDoDia = filteredTransactions.filter(t => t.data && parseInt(t.data.split('-')[2], 10) === dia);
              const ent = transDoDia.filter(t => t.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
              const sai = transDoDia.filter(t => t.tipo === 'Saída').reduce((a, b) => a + b.valor, 0);
              const saldo = ent - sai;
              const hasTrans = transDoDia.length > 0;

              return (
                <div
                  key={dia}
                  onClick={() => hasTrans && setSelectedDay({ dia, transacoes: transDoDia })}
                  className={`p-2 border rounded-xl min-h-[80px] flex flex-col justify-between transition-all ${hasTrans ? 'cursor-pointer hover:border-[#011640] bg-white border-gray-200' : 'border-gray-100 bg-gray-50 opacity-50'}`}
                >
                  <div className="text-right font-medium text-gray-700">{dia}</div>
                  {hasTrans && (
                    <div className="text-center mt-2">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${saldo >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className={`text-sm font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {saldo > 0 ? '+' : ''}{formatCurrency(saldo)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="w-80 bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-[#011640]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-playfair font-bold text-lg text-[#011640]">Dia {selectedDay.dia}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {selectedDay.transacoes.map(t => (
                <div key={t.id} className="p-3 border border-gray-100 rounded-lg bg-white">
                  <div className="text-sm font-medium text-[#011640]">{t.descricao}</div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-gray-500">{t.categoria}</span>
                    <span className={`font-bold ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChecklist = () => {
    const despesasRecorrentes = state.transactions.filter(t => {
      if (!t.data || t.tipo !== 'Saída' || t.frequencia !== 'recorrente') return false;
      const [ano, mes] = t.data.split('-');
      return parseInt(mes, 10) === selectedMonth && parseInt(ano, 10) === selectedYear;
    });

    const totalDespesas = despesasRecorrentes.length;
    const pagas = despesasRecorrentes.filter(t => t.pago).length;
    const percentual = totalDespesas > 0 ? (pagas / totalDespesas) * 100 : 0;

    const valorTotalRecorrente = despesasRecorrentes.reduce((acc, curr) => acc + curr.valor, 0);
    const valorPagoRecorrente = despesasRecorrentes.filter(t => t.pago).reduce((acc, curr) => acc + curr.valor, 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Progresso do Mês */}
        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-playfair font-bold text-xl text-[#011640]">Checklist de Despesas Fixas</h3>
              <p className="text-sm text-gray-500 mt-1">Acompanhe o pagamento das suas contas mensais recorrentes.</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-500 uppercase">Progresso de Contas</span>
              <div className="text-2xl font-playfair font-bold text-[#011640]">
                {pagas} de {totalDespesas} pagas ({percentual.toFixed(0)}%)
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-3 rounded-full bg-[#011640] transition-all duration-500"
              style={{ width: `${percentual}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Agendado:</span>
              <span className="font-semibold text-gray-800">{formatCurrency(valorTotalRecorrente)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Pago:</span>
              <span className="font-semibold text-green-700">{formatCurrency(valorPagoRecorrente)}</span>
            </div>
          </div>
        </div>

        {/* Lista de Contas */}
        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h4 className="font-playfair font-bold text-lg text-[#011640]">Contas do Mês</h4>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
              Apenas Contas Mensais Fixas
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {despesasRecorrentes.map(t => {
              const diaVencimento = t.data.split('-')[2];
              return (
                <div
                  key={t.id}
                  onClick={() => handleTogglePago(t)}
                  className={`p-4 px-6 flex items-center justify-between hover:bg-[#fcf9f2] transition-colors cursor-pointer select-none ${t.pago ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={!!t.pago}
                      readOnly
                      className="w-5 h-5 rounded text-[#011640] focus:ring-[#011640] cursor-pointer"
                    />
                    <div>
                      <p className={`font-medium ${t.pago ? 'line-through text-gray-400' : 'text-[#011640]'}`}>
                        {t.descricao}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(t.categoria) }}></span>
                        {t.categoria} • Vence dia {diaVencimento}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`font-bold ${t.pago ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                      {formatCurrency(t.valor)}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              );
            })}

            {despesasRecorrentes.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhuma despesa fixa mensal cadastrada para este mês.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMetas = () => {
    const handleAddGoal = async (e) => {
      e.preventDefault();
      if (!novaMeta.nome || !novaMeta.valor_alvo) return;
      const newGoal = {
        nome: novaMeta.nome,
        valor_alvo: parseFloat(novaMeta.valor_alvo),
        valor_atual: 0,
        user_id: session.user.id
      };
      const { data, error } = await supabase.from('goals').insert([newGoal]).select();
      if (error) {
        console.error("Erro ao adicionar meta:", error);
        alert("Erro ao salvar meta. Você criou a tabela 'goals' no Supabase?");
      } else if (data) {
        dispatch({ type: 'ADD_GOAL', payload: data[0] });
        setNovaMeta({ nome: '', valor_alvo: '' });
      }
    };

    const handleAddValue = async (e, goal) => {
      e.preventDefault();
      const valorAdicional = parseFloat(addValorMeta.valor);
      if (!valorAdicional || addValorMeta.metaId !== goal.id) return;
      const novoValorAtual = goal.valor_atual + valorAdicional;
      
      const { data, error } = await supabase.from('goals').update({ valor_atual: novoValorAtual }).eq('id', goal.id).eq('user_id', session.user.id).select();
      if (error) {
        console.error("Erro ao atualizar meta:", error);
        alert("Erro ao adicionar valor à meta.");
      } else if (data) {
        dispatch({ type: 'UPDATE_GOAL', payload: data[0] });
        setAddValorMeta({ metaId: null, valor: '' });
      }
    };

    const handleCompleteGoal = async (id) => {
      const { data, error } = await supabase.from('goals').update({ concluida: true }).eq('id', id).eq('user_id', session.user.id).select();
      if (error) {
        console.error("Erro ao concluir meta:", error);
        alert("Erro. Você executou o comando SQL no Supabase para adicionar a coluna 'concluida'?");
      } else {
        dispatch({ type: 'UPDATE_GOAL', payload: data[0] });
      }
    };

    const metasEmAndamento = state.goals.filter(goal => !goal.concluida);
    const metasConcluidas = state.goals.filter(goal => goal.concluida);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metasEmAndamento.map(goal => {
            const percentage = Math.min(100, (goal.valor_atual / goal.valor_alvo) * 100);
            let color = '#ef4444'; // Red for < 50%
            if (percentage >= 100) color = '#10b981'; // Green for 100%
            else if (percentage >= 50) color = '#f59e0b'; // Yellow for 50-99%

            const pieData = [
              { name: 'Concluído', value: percentage },
              { name: 'Restante', value: 100 - percentage }
            ];

            return (
              <div key={goal.id} className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                <h4 className="font-playfair font-bold text-[#011640] text-lg mb-2">{goal.nome}</h4>
                <div className="w-32 h-32 mb-2 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={40} outerRadius={55} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                        <Cell fill={color} />
                        <Cell fill="#f3f4f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-lg" style={{ color }}>
                    {percentage.toFixed(0)}%
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-500 mb-1">{formatCurrency(goal.valor_atual)} / {formatCurrency(goal.valor_alvo)}</div>
              </div>
            );
          })}
          {metasEmAndamento.length === 0 && (
            <div className="col-span-full p-8 text-center text-gray-500 bg-[#FDFAF4] rounded-2xl border border-gray-100">
              Nenhuma meta em andamento no momento.
            </div>
          )}
        </div>

        {metasConcluidas.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-playfair font-bold text-lg text-[#011640] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Metas Conquistadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {metasConcluidas.map(goal => (
                <div key={`concluida-${goal.id}`} className="bg-gradient-to-br from-yellow-50 to-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-yellow-200 flex flex-col items-center relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 p-3 opacity-10">
                    <Trophy className="w-24 h-24 text-yellow-600" />
                  </div>
                  <h4 className="font-playfair font-bold text-[#011640] text-lg mb-2 relative z-10 text-center">{goal.nome}</h4>
                  <div className="w-32 h-32 mb-2 relative z-10 flex items-center justify-center">
                     <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center border-4 border-yellow-400 shadow-inner">
                       <span className="text-xl font-bold text-yellow-600">100%</span>
                     </div>
                  </div>
                  <div className="text-sm font-medium text-gray-500 mb-1 relative z-10">Conquistada: {formatCurrency(goal.valor_alvo)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#011640]">Nova Meta</h3>
          <form onSubmit={handleAddGoal} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Meta</label>
              <input type="text" required value={novaMeta.nome} onChange={e => setNovaMeta({ ...novaMeta, nome: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="Ex: Viagem, Carro Novo" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total Necessário (R$)</label>
              <input type="number" step="0.01" required value={novaMeta.valor_alvo} onChange={e => setNovaMeta({ ...novaMeta, valor_alvo: e.target.value })} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#011640]" placeholder="0.00" />
            </div>
            <button type="submit" className="bg-[#011640] text-white p-2 px-6 rounded-lg hover:bg-[#01256B] transition-colors h-[42px] flex items-center">
              <PlusCircle className="w-5 h-5 mr-1" /> Criar Meta
            </button>
          </form>
        </div>

        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-playfair font-bold text-lg text-[#011640]">Acompanhamento de Metas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-500">Meta</th>
                  <th className="p-4 font-medium text-gray-500">Valor Atual</th>
                  <th className="p-4 font-medium text-gray-500">Valor Total (Objetivo)</th>
                  <th className="p-4 font-medium text-gray-500">Falta</th>
                  <th className="p-4 font-medium text-gray-500 w-1/3">Adicionar Valor</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.goals.map(goal => (
                  <tr key={goal.id} className="hover:bg-[#fcf9f2]">
                    <td className="p-4 font-medium text-[#011640]">{goal.nome}</td>
                    <td className="p-4 text-gray-600">{formatCurrency(goal.valor_atual)}</td>
                    <td className="p-4 text-gray-600">{formatCurrency(goal.valor_alvo)}</td>
                    <td className="p-4 text-red-600 font-medium">{formatCurrency(goal.valor_alvo - goal.valor_atual)}</td>
                    <td className="p-4">
                      {!goal.concluida ? (
                        <form onSubmit={(e) => handleAddValue(e, goal)} className="flex items-center space-x-2">
                          <input
                            type="number" step="0.01" required placeholder="0.00"
                            value={addValorMeta.metaId === goal.id ? addValorMeta.valor : ''}
                            onChange={(e) => setAddValorMeta({ metaId: goal.id, valor: e.target.value })}
                            className="w-24 rounded-lg border-gray-300 border p-1 text-sm focus:ring-[#011640]"
                          />
                          <button type="submit" className="text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-lg transition-colors">
                            Adicionar
                          </button>
                        </form>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex justify-center space-x-3">
                      {!goal.concluida && (
                        <button onClick={() => handleCompleteGoal(goal.id)} title="Marcar como Concluída" className="text-gray-400 hover:text-green-600 transition-colors">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => setGoalToDelete(goal)} title="Excluir" className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  const renderManual = () => {
    return (
      <div className="bg-[#FDFAF4] p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl mx-auto space-y-6 text-[#011640] animate-in fade-in duration-200">
        <h3 className="font-playfair font-bold text-3xl mb-2 text-[#011640]">Manual de Uso — No Azul</h3>
        <p className="text-gray-600 border-b border-gray-100 pb-4">
          O <strong>No Azul</strong> é um sistema completo e intuitivo para controle de finanças pessoais, projetado para ajudar você a gerenciar suas receitas, despesas, orçamentos, metas financeiras e compromissos recorrentes de forma organizada e segura.
        </p>

        <div className="space-y-6">
          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Dashboard
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sua visão geral sobre a saúde financeira do mês selecionado. Ele exibe o saldo do mês, saldo acumulado total histórico, entradas, saídas, gráficos do fluxo de caixa dos últimos 6 meses, gráfico de pizza com as despesas por categoria, previsão de custo fixo anual e dívidas futuras em parcelamento.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Transações
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Permite cadastrar e gerenciar toda a movimentação financeira. Você pode lançar despesas/receitas pontuais ou <strong>Mensais Fixas</strong> (que são replicadas por 12 meses). Também suporta parcelamento, dividindo o valor total nas parcelas correspondentes.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ao editar uma transação recorrente, você pode propagar as alterações (incluindo o dia de vencimento da data) para todos os meses futuros de forma automática.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Checklist (Despesas Fixas)
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Um checklist automático contendo todas as suas despesas Mensais Fixas.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Análise Avançada
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed text-balance">
              Uma ferramenta de "Raio-X" da sua vida financeira. Projeta qual será o seu Saldo Livre no fim do mês após pagar as contas fixas, identifica o "Top 5" dos maiores gastos e cruza suas despesas entre Essenciais e de Estilo de Vida.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Controle Mensal
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Exibe um gráfico de linha interativo com a evolução diária do saldo e uma listagem proporcional de saídas por categoria em porcentagem e valor absoluto.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Orçamento
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Defina limites de gastos mensais por categoria. O sistema exibe um alerta visual: verde para consumo controlado, amarelo se passar de 80% do limite, e vermelho com aviso de "Estourou" caso o limite seja ultrapassado.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Metas
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Planeje economizar dinheiro com objetivos específicos. Acompanhe a evolução percentual em gráficos circulares interativos, adicione fundos conforme economiza e marque-as como concluídas ao finalizar.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-playfair font-bold text-xl text-[#011640] flex items-center gap-2">
              Calendário
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Exibição visual dos seus lançamentos dispostos nos dias do mês com cores indicativas (saldo diário positivo ou negativo). Clique em qualquer dia ativo para visualizar em detalhes todas as transações ocorridas.
            </p>
          </section>
        </div>
      </div>
    );
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transacoes', label: 'Transações', icon: <ArrowRightLeft className="w-5 h-5" /> },
    { id: 'checklist', label: 'Checklist Fixas', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'analise', label: 'Análise', icon: <PieChartIcon className="w-5 h-5" /> },
    { id: 'orcamento', label: 'Orçamentos', icon: <Target className="w-5 h-5" /> },
    { id: 'metas', label: 'Metas', icon: <Trophy className="w-5 h-5" /> },
    { id: 'calendario', label: 'Calendário', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'manual', label: 'Manual', icon: <BookOpen className="w-5 h-5" /> }
  ];

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-dm bg-[#F5F0E8]">
      <Toaster position="top-right" />
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#1B344A] to-[#011640] text-white flex-col z-20">
        <div className="p-6">
          <h1 className="font-playfair text-2xl font-bold flex items-center text-[#FDFAF4]">
            <Wallet className="mr-2 text-[#011640]" /> No Azul
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#011640] text-white shadow-lg' : 'text-gray-400 hover:bg-[#01256B] hover:text-white'}`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-2">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium border border-red-400/20"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
          <button
            onClick={() => {
              setDeleteStep(1);
              setDeleteOptions({ transacoes: true, orcamentos: true, metas: true });
              setIsDeleteModalOpen(true);
            }}
            className="w-full flex items-center justify-center space-x-2 p-3 text-red-600 hover:bg-red-600/10 rounded-xl transition-all font-medium border border-red-600/20"
          >
            <Trash2 className="w-5 h-5" />
            <span>Apagar Tudo</span>
          </button>
        </div>
      </aside>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#1B344A] to-[#011640] text-white flex justify-around p-2 pb-safe z-50 rounded-t-2xl shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive ? 'text-white' : 'text-gray-400'}`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#011640]' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F5F0E8] pb-20 md:pb-0">
        {/* Header Fix */}
        <header className="bg-[#FDFAF4] border-b border-gray-200 p-4 px-8 flex justify-between items-center shadow-sm z-10">
          <h2 className="font-playfair text-2xl font-bold text-[#011640]">
            {navItems.find(i => i.id === activeTab)?.label}
          </h2>

          <div className="flex items-center space-x-4 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => {
              if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-medium text-[#011640] w-32 text-center select-none flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-[#011640]" />
              {meses[selectedMonth - 1]} {selectedYear}
            </div>
            <button onClick={() => {
              if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto pb-12">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'transacoes' && renderTransacoes()}
            {activeTab === 'checklist' && renderChecklist()}
            {activeTab === 'analise' && renderAnalise()}
            {activeTab === 'orcamento' && renderOrcamento()}
            {activeTab === 'metas' && renderMetas()}
            {activeTab === 'calendario' && renderCalendario()}
            {activeTab === 'manual' && renderManual()}
          </div>
        </div>

        {transactionToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-96 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-red-500">
                <AlertCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-playfair font-bold text-center text-[#011640] mb-2">Excluir Transação</h3>
              <p className="text-center text-gray-500 mb-6">
                {transactionToDelete.frequencia === 'recorrente'
                  ? 'Esta é uma transação Mensal Fixa. Deseja excluir apenas este lançamento ou todas as futuras cobranças também?'
                  : 'Tem certeza que deseja apagar? Esta ação não pode ser desfeita.'}
              </p>

              {transactionToDelete.frequencia === 'recorrente' ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => confirmDelete(true)} className="w-full py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 font-medium transition-colors">
                    Excluir Esta e Próximas
                  </button>
                  <button onClick={() => confirmDelete(false)} className="w-full py-2 rounded-xl text-white bg-red-400 hover:bg-red-500 font-medium transition-colors">
                    Excluir Somente Esta
                  </button>
                  <button onClick={() => setTransactionToDelete(null)} className="w-full py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors mt-2">
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => confirmDelete(false)} className="flex-1 py-2 rounded-xl text-white bg-red-500 hover:bg-red-600 font-medium transition-colors">
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {goalToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-96 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-red-500">
                <AlertCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-playfair font-bold text-center text-[#011640] mb-2">Excluir Meta</h3>
              <p className="text-center text-gray-500 mb-6">
                Tem certeza que deseja apagar a meta "{goalToDelete.nome}"? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setGoalToDelete(null)} className="flex-1 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDeleteGoal} className="flex-1 py-2 rounded-xl text-white bg-red-500 hover:bg-red-600 font-medium transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {transactionToEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-playfair font-bold text-[#011640]">Editar Transação</h3>
                <button onClick={() => setTransactionToEdit(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input type="text" required value={transactionToEdit.descricao} onChange={e => setTransactionToEdit({ ...transactionToEdit, descricao: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] focus:border-transparent outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                    <input type="text" required value={formatInputCurrency(transactionToEdit.valor)} onChange={e => setTransactionToEdit({ ...transactionToEdit, valor: formatInputCurrency(e.target.value) })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" required value={transactionToEdit.data} onChange={e => setTransactionToEdit({ ...transactionToEdit, data: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={transactionToEdit.tipo} onChange={e => setTransactionToEdit({ ...transactionToEdit, tipo: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] outline-none">
                      <option value="Saída">Saída</option>
                      <option value="Entrada">Entrada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select value={transactionToEdit.categoria} onChange={e => setTransactionToEdit({ ...transactionToEdit, categoria: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] outline-none">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                  <select value={transactionToEdit.metodo_pagamento || 'Pix'} onChange={e => setTransactionToEdit({ ...transactionToEdit, metodo_pagamento: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#011640] outline-none">
                    <option value="Pix">Pix</option>
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>

                {transactionToEdit.frequencia === 'recorrente' && (
                  <div className="mt-4 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="updateFuture"
                      checked={updateFuture}
                      onChange={(e) => setUpdateFuture(e.target.checked)}
                      className="mt-1 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="updateFuture" className="text-sm font-medium cursor-pointer">
                      Aplicar as alterações desta transação (Valor, Categoria, Nome, Data) para todas as futuras cobranças desta recorrência.
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setTransactionToEdit(null)} className="flex-1 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl text-white bg-[#011640] hover:bg-[#01256B] font-medium transition-colors">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#FDFAF4] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              
              {deleteStep === 1 ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="font-playfair text-2xl font-bold text-[#011640] mb-2">Apagar Informações?</h3>
                  <p className="text-gray-600 mb-6 text-balance">
                    ATENÇÃO: Esta ação de apagar suas informações é <span className="font-bold text-red-600">irreversível</span>. Tem certeza de que deseja&nbsp;continuar?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setIsDeleteModalOpen(false)} 
                      className="flex-1 py-3 rounded-xl text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => setDeleteStep(2)} 
                      className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-700 font-medium transition-colors"
                    >
                      Avançar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col text-left">
                  <h3 className="font-playfair text-2xl font-bold text-[#011640] mb-2">O que deseja apagar?</h3>
                  <p className="text-sm text-gray-500 mb-6">Selecione os dados que você deseja excluir permanentemente da sua conta:</p>
                  
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center space-x-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-[#011640] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={deleteOptions.transacoes} 
                        onChange={(e) => setDeleteOptions({...deleteOptions, transacoes: e.target.checked})}
                        className="w-5 h-5 rounded text-[#011640] focus:ring-[#011640]" 
                      />
                      <span className="font-medium text-[#011640]">Todas as Transações</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-[#011640] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={deleteOptions.orcamentos} 
                        onChange={(e) => setDeleteOptions({...deleteOptions, orcamentos: e.target.checked})}
                        className="w-5 h-5 rounded text-[#011640] focus:ring-[#011640]" 
                      />
                      <span className="font-medium text-[#011640]">Todos os Orçamentos</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-[#011640] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={deleteOptions.metas} 
                        onChange={(e) => setDeleteOptions({...deleteOptions, metas: e.target.checked})}
                        className="w-5 h-5 rounded text-[#011640] focus:ring-[#011640]" 
                      />
                      <span className="font-medium text-[#011640]">Todas as Metas</span>
                    </label>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setDeleteStep(1)} 
                      className="flex-1 py-3 rounded-xl text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={handleDeleteAllData}
                      disabled={!deleteOptions.transacoes && !deleteOptions.orcamentos && !deleteOptions.metas}
                      className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showOnboarding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#FDFAF4] rounded-3xl w-full max-w-md p-8 shadow-2xl relative flex flex-col items-center text-center">
              <h3 className="font-playfair text-2xl font-bold text-[#011640] mb-4 text-balance">
                {ONBOARDING_STEPS[onboardingStep].title}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-balance">
                {ONBOARDING_STEPS[onboardingStep].description}
              </p>
              
              <div className="flex items-center gap-2 mb-8">
                {ONBOARDING_STEPS.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-8 bg-[#011640]' : 'w-2 bg-gray-200'}`}
                  />
                ))}
              </div>

              <div className="flex gap-4 w-full">
                {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
                  <button
                    onClick={() => setOnboardingStep(prev => prev + 1)}
                    className="flex-1 bg-[#011640] text-white py-3 rounded-xl font-medium hover:bg-[#01256B] transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      localStorage.setItem('hasSeenOnboarding_noazul', 'true');
                      setShowOnboarding(false);
                      // Se fechou onboarding, garante que o update não aparece por cima logo depois
                      localStorage.setItem('hasSeenUpdate_v1', 'true');
                    }}
                    className="flex-1 bg-[#10B981] text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                  >
                    Começar
                  </button>
                )}
                
                {onboardingStep < ONBOARDING_STEPS.length - 1 && (
                  <button
                    onClick={() => {
                      localStorage.setItem('hasSeenOnboarding_noazul', 'true');
                      setShowOnboarding(false);
                      localStorage.setItem('hasSeenUpdate_v1', 'true');
                    }}
                    className="px-6 text-gray-400 font-medium hover:text-gray-600 transition-colors"
                  >
                    Pular
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showUpdateModal && !showOnboarding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#FDFAF4] rounded-3xl w-full max-w-lg p-8 shadow-2xl relative flex flex-col">
              
              <div className="flex items-center justify-center mb-6">
                <div className="bg-[#10B981]/10 text-[#10B981] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                  Novidades da Versão
                </div>
              </div>

              <h3 className="font-playfair text-2xl font-bold text-[#011640] text-center mb-2">
                O No Azul ficou ainda melhor!
              </h3>
              <p className="text-gray-500 text-center text-sm mb-6 text-balance">
                Implementamos várias melhorias que você pediu. Confira o que há de novo:
              </p>

              <div className="space-y-4 mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-inner overflow-y-auto max-h-[40vh]">
                
                <div className="flex gap-4 items-start">
                  <div className="mt-1 bg-[#011640]/10 p-2 rounded-xl text-[#011640] shrink-0">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#011640]">Nova aba "Análise"</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Substituímos o Controle Mensal por um painel avançado! Agora você pode projetar seu saldo livre, ver o Top 5 maiores despesas e comparar gastos Essenciais vs Estilo de Vida.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="mt-1 bg-[#F59E0B]/10 p-2 rounded-xl text-[#F59E0B] shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#011640]">Metas Conquistadas</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Agora, quando você atingir 100% de uma meta, ela aparecerá de forma destacada e comemorativa na nova seção "Metas Conquistadas".</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="mt-1 bg-red-100 p-2 rounded-xl text-red-500 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#011640]">Apagar Dados Específicos</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Você ganhou mais controle: ao tentar resetar sua conta, agora pode escolher exatamente quais blocos limpar (ex: só transações, ou só metas).</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="mt-1 bg-green-100 p-2 rounded-xl text-green-500 shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#011640]">Novo Visual e Cores</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">O sistema inteiro ganhou uma paleta atualizada (Azul Marinho `#011640`), gráficos mais precisos e melhor espaçamento em textos para facilitar a leitura diária.</p>
                  </div>
                </div>

              </div>

              <button
                onClick={() => {
                  localStorage.setItem('hasSeenUpdate_v1', 'true');
                  setShowUpdateModal(false);
                }}
                className="w-full bg-[#011640] text-white py-3 rounded-xl font-medium hover:bg-[#01256B] transition-colors"
              >
                Entendi, vamos lá!
              </button>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

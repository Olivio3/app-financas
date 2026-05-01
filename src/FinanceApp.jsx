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
  Edit2
} from 'lucide-react';
import { supabase } from './supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

// --- Utilitários e Constantes ---
const COLORS = ['#2C6E7F', '#1A4A57', '#4E8D9C', '#7FB5C2', '#B4D2D9', '#E08E79', '#D9A05B', '#6B8E23', '#A0522D'];

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

const CATEGORIAS = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Salário', 'Freelance', 'Outros'];
const TIPOS_INVESTIMENTO = ['Renda Fixa', 'Ações', 'FII', 'Cripto', 'Internacional'];

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
    transactions: transactions.sort((a, b) => new Date(b.data) - new Date(a.data)),
    budgets: [
      { id: 1, categoria: 'Alimentação', valor: 1500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 2, categoria: 'Moradia', valor: 2500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 3, categoria: 'Transporte', valor: 800, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 4, categoria: 'Lazer', valor: 500, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() },
      { id: 5, categoria: 'Saúde', valor: 400, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }
    ],
    investments: [
      { id: 1, nome: 'Tesouro Selic', tipo: 'Renda Fixa', valorInvestido: 10000, rentabilidade: 10.5, dataInicio: '2023-01-15' },
      { id: 2, nome: 'Fundo Imobiliário ABC', tipo: 'FII', valorInvestido: 5000, rentabilidade: 8.2, dataInicio: '2023-06-10' },
      { id: 3, nome: 'Ações Empresa XYZ', tipo: 'Ações', valorInvestido: 3000, rentabilidade: -2.5, dataInicio: '2023-08-20' }
    ]
  };
};

const initialState = { transactions: [], budgets: [], investments: [] };

// --- Reducer ---
function financeReducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions].sort((a, b) => new Date(b.data) - new Date(a.data)) };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'UPDATE_TRANSACTION':
      return { 
        ...state, 
        transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t).sort((a, b) => new Date(b.data) - new Date(a.data))
      };
    case 'DELETE_FUTURE_RECURRING':
      return { 
        ...state, 
        transactions: state.transactions.filter(t => !(t.frequencia === 'recorrente' && t.descricao === action.payload.descricao && new Date(t.data) >= new Date(action.payload.data)))
      };
    case 'UPDATE_FUTURE_RECURRING':
      return {
        ...state,
        transactions: state.transactions.map(t => {
          if (t.frequencia === 'recorrente' && t.descricao === action.payload.originalDescricao && new Date(t.data) >= new Date(action.payload.data)) {
            return { ...t, descricao: action.payload.newDescricao, valor: action.payload.newValor, categoria: action.payload.newCategoria, tipo: action.payload.newTipo };
          }
          return t;
        })
      };
    case 'ADD_BUDGET':
      // Atualiza se já existir, senão adiciona
      const existingBudgetIdx = state.budgets.findIndex(b => b.categoria === action.payload.categoria && b.mes === action.payload.mes && b.ano === action.payload.ano);
      if (existingBudgetIdx >= 0) {
        const newBudgets = [...state.budgets];
        newBudgets[existingBudgetIdx] = action.payload;
        return { ...state, budgets: newBudgets };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    case 'ADD_INVESTMENT':
      return { ...state, investments: [...state.investments, action.payload] };
    default:
      return state;
  }
}

// --- Componente Principal ---
export default function FinanceApp({ session }) {
  const [state, dispatch] = useReducer(financeReducer, initialState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transRes, budRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', session.user.id).order('data', { ascending: false }),
        supabase.from('budgets').select('*').eq('user_id', session.user.id),
        supabase.from('investments').select('*').eq('user_id', session.user.id)
      ]);

      dispatch({
        type: 'SET_DATA',
        payload: {
          transactions: transRes.data || [],
          budgets: budRes.data || [],
          investments: invRes.data || []
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
  
  // State dos formulários das abas
  const [novaTransacao, setNovaTransacao] = useState({ 
    descricao: '', valor: '', tipo: 'Saída', categoria: 'Alimentação', 
    data: new Date().toISOString().split('T')[0],
    frequencia: 'pontual', pagamento: 'a vista', parcelas: 1
  });
  const [novoOrcamento, setNovoOrcamento] = useState({ categoria: CATEGORIAS[0], valor: '' });
  const [novoInvest, setNovoInvest] = useState({ nome: '', tipo: TIPOS_INVESTIMENTO[0], valorInvestido: '', rentabilidade: '', dataInicio: new Date().toISOString().split('T')[0] });
  const [selectedDay, setSelectedDay] = useState(null);
  
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [originalTxDesc, setOriginalTxDesc] = useState('');
  const [updateFuture, setUpdateFuture] = useState(false);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!transactionToEdit) return;
    
    if (transactionToEdit.frequencia === 'recorrente' && updateFuture) {
      const { error } = await supabase.from('transactions').update({
        descricao: transactionToEdit.descricao,
        valor: parseFloat(transactionToEdit.valor),
        tipo: transactionToEdit.tipo,
        categoria: transactionToEdit.categoria
      }).eq('frequencia', 'recorrente').eq('descricao', originalTxDesc).gte('data', transactionToEdit.data);
      
      if (error) {
        console.error("Erro ao atualizar lote:", error);
        alert("Erro ao editar em lote: " + error.message);
      } else {
        dispatch({ type: 'UPDATE_FUTURE_RECURRING', payload: {
          originalDescricao: originalTxDesc,
          data: transactionToEdit.data,
          newDescricao: transactionToEdit.descricao,
          newValor: parseFloat(transactionToEdit.valor),
          newCategoria: transactionToEdit.categoria,
          newTipo: transactionToEdit.tipo
        }});
        setTransactionToEdit(null);
      }
    } else {
      const { error } = await supabase.from('transactions').update({
        descricao: transactionToEdit.descricao,
        valor: parseFloat(transactionToEdit.valor),
        data: transactionToEdit.data,
        tipo: transactionToEdit.tipo,
        categoria: transactionToEdit.categoria
      }).eq('id', transactionToEdit.id);

      if (error) {
        console.error("Erro ao atualizar:", error);
        alert("Erro ao editar: " + error.message);
      } else {
        const updatedTx = { ...transactionToEdit, valor: parseFloat(transactionToEdit.valor) };
        dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTx });
        setTransactionToEdit(null);
      }
    }
  };

  const confirmDelete = async (future = false) => {
    if (!transactionToDelete) return;
    
    if (future) {
      const { error } = await supabase.from('transactions')
        .delete()
        .eq('frequencia', 'recorrente')
        .eq('descricao', transactionToDelete.descricao)
        .gte('data', transactionToDelete.data);
        
      if (error) {
        console.error("Erro ao deletar lote:", error);
        alert("Erro ao apagar: " + error.message);
      } else {
        dispatch({ type: 'DELETE_FUTURE_RECURRING', payload: { descricao: transactionToDelete.descricao, data: transactionToDelete.data } });
        setTransactionToDelete(null);
      }
    } else {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.id);
      if (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao apagar: " + error.message);
      } else {
        dispatch({ type: 'DELETE_TRANSACTION', payload: transactionToDelete.id });
        setTransactionToDelete(null);
      }
    }
    setTransactionToDelete(null);
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

  const saldoTotal = state.transactions.reduce((acc, curr) => curr.tipo === 'Entrada' ? acc + curr.valor : acc - curr.valor, 0);
  const patrimonioInvestimentos = state.investments.reduce((acc, curr) => acc + (curr.valorInvestido * (1 + curr.rentabilidade / 100)), 0);

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
         const [ano, mes] = t.data.split('-');
         const tDate = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
         return tDate > dataAtual;
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
        const d = new Date(t.data);
        return (d.getMonth() + 1) === m.mes && d.getFullYear() === m.ano;
      });
      const ent = transMes.filter(t => t.tipo === 'Entrada').reduce((sum, t) => sum + t.valor, 0);
      const sai = transMes.filter(t => t.tipo === 'Saída').reduce((sum, t) => sum + t.valor, 0);
      return { name: m.label, Entradas: ent, Saídas: sai };
    });

    return (
      <div className="space-y-6">
        {/* Cards Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Saldo Total</span>
              <Wallet className="text-[#2C6E7F] w-5 h-5" />
            </div>
            <div className="text-2xl font-playfair font-bold text-[#1C2B2D]">{formatCurrency(saldoTotal)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Entradas (Mês)</span>
              <ArrowUpCircle className="text-green-600 w-5 h-5" />
            </div>
            <div className="text-2xl font-playfair font-bold text-green-700">{formatCurrency(totaisMes.entradas)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Saídas (Mês)</span>
              <ArrowDownCircle className="text-red-600 w-5 h-5" />
            </div>
            <div className="text-2xl font-playfair font-bold text-red-700">{formatCurrency(totaisMes.saidas)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Patrimônio Investido</span>
              <TrendingUp className="text-[#1A4A57] w-5 h-5" />
            </div>
            <div className="text-2xl font-playfair font-bold text-[#1A4A57]">{formatCurrency(patrimonioInvestimentos)}</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Fluxo de Caixa (6 meses)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={80} tickFormatter={(val) => formatCompactCurrency(val)} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="Entradas" fill="#2C6E7F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#E08E79" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Despesas por Categoria</h3>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
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
              <h3 className="font-playfair font-bold text-lg text-[#1C2B2D] mb-1">Custo Fixo Anual (Previsão)</h3>
              <p className="text-sm text-gray-500">Baseado nas despesas recorrentes atuais (x12)</p>
            </div>
            <div className="text-2xl font-playfair font-bold text-[#E08E79]">{formatCurrency(previsaoAnualRecorrente)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-playfair font-bold text-lg text-[#1C2B2D] mb-1">Dívida Futura (Parcelamentos)</h3>
              <p className="text-sm text-gray-500">Soma de todas as parcelas dos próximos meses</p>
            </div>
            <div className="text-2xl font-playfair font-bold text-red-700">{formatCurrency(faturasFuturas)}</div>
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-playfair font-bold text-lg text-[#1C2B2D]">Transações Recentes</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {state.transactions.slice(0, 5).map(t => (
              <div key={t.id} className="p-4 px-6 flex items-center justify-between hover:bg-[#fcf9f2] transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${t.tipo === 'Entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {t.tipo === 'Entrada' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-[#1C2B2D]">{t.descricao}</p>
                    <p className="text-xs text-gray-500">{t.data ? t.data.split('-').reverse().join('/') : ''} • {t.categoria}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`font-medium ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                  </div>
                  <button onClick={() => { setTransactionToEdit(t); setOriginalTxDesc(t.descricao); setUpdateFuture(false); }} className="text-gray-400 hover:text-blue-500 transition-colors">
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
      const valorTotal = parseFloat(novaTransacao.valor);
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
          descricao: isParcelado ? `${novaTransacao.descricao} (${i+1}/${numParcelas})` : novaTransacao.descricao,
          valor: valorFinal,
          tipo: novaTransacao.tipo,
          categoria: novaTransacao.categoria,
          data: dataStr,
          frequencia: novaTransacao.frequencia,
          forma_pagamento: novaTransacao.pagamento,
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
        setNovaTransacao({ descricao: '', valor: '', tipo: 'Saída', categoria: 'Alimentação', data: new Date().toISOString().split('T')[0], frequencia: 'pontual', pagamento: 'a vista', parcelas: 1 });
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Nova Transação</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" required value={novaTransacao.descricao} onChange={e => setNovaTransacao({...novaTransacao, descricao: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]" placeholder="Ex: Supermercado" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da 1ª Parcela</label>
                <input type="date" required value={novaTransacao.data} onChange={e => setNovaTransacao({...novaTransacao, data: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" required value={novaTransacao.valor} onChange={e => setNovaTransacao({...novaTransacao, valor: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]" placeholder="0.00" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={novaTransacao.tipo} onChange={e => setNovaTransacao({...novaTransacao, tipo: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]">
                  <option value="Saída">Saída</option>
                  <option value="Entrada">Entrada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={novaTransacao.categoria} onChange={e => setNovaTransacao({...novaTransacao, categoria: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                <select disabled={novaTransacao.pagamento === 'parcelado'} value={novaTransacao.frequencia} onChange={e => setNovaTransacao({...novaTransacao, frequencia: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F] disabled:bg-gray-100">
                  <option value="pontual">Pontual</option>
                  <option value="recorrente">Mensal Fixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
                <select value={novaTransacao.pagamento} onChange={e => setNovaTransacao({...novaTransacao, pagamento: e.target.value, frequencia: e.target.value === 'parcelado' ? 'pontual' : novaTransacao.frequencia})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]">
                  <option value="a vista">À vista</option>
                  <option value="parcelado">Parcelado</option>
                </select>
              </div>
              {novaTransacao.pagamento === 'parcelado' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Parcelas</label>
                  <input type="number" min="2" max="120" required value={novaTransacao.parcelas} onChange={e => setNovaTransacao({...novaTransacao, parcelas: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]" placeholder="10" />
                </div>
              ) : <div></div>}
              <div className="w-full">
                <button type="submit" className="w-full bg-[#2C6E7F] text-white p-2 rounded-lg hover:bg-[#1A4A57] transition-colors flex items-center justify-center h-[42px]">
                  <Plus className="w-5 h-5 mr-1" /> Adicionar
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-500">Data</th>
                  <th className="p-4 font-medium text-gray-500">Descrição</th>
                  <th className="p-4 font-medium text-gray-500">Categoria</th>
                  <th className="p-4 font-medium text-gray-500">Tipo</th>
                  <th className="p-4 font-medium text-gray-500">Valor</th>
                  <th className="p-4 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#fcf9f2]">
                    <td className="p-4 text-gray-600">{t.data ? t.data.split('-').reverse().join('/') : ''}</td>
                    <td className="p-4 font-medium text-[#1C2B2D]">{t.descricao}</td>
                    <td className="p-4 text-gray-600">{t.categoria}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className={`p-4 font-medium ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(t.valor)}
                    </td>
                    <td className="p-4 flex space-x-2">
                      <button onClick={() => { setTransactionToEdit(t); setOriginalTxDesc(t.descricao); setUpdateFuture(false); }} className="text-gray-400 hover:text-blue-500 transition-colors">
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
        </div>
      </div>
    );
  };

  const renderControleMensal = () => {
    // Evolução diária do saldo no mês
    const diasNoMes = new Date(selectedYear, selectedMonth, 0).getDate();
    let saldoAcumulado = 0;
    
    // Calcula saldo anterior ao mês selecionado para o acumulado
    saldoAcumulado = state.transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mes] = t.data.split('-');
      const d = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
      return d < new Date(selectedYear, selectedMonth - 1, 1);
    }).reduce((acc, t) => t.tipo === 'Entrada' ? acc + t.valor : acc - t.valor, 0);

    const hoje = new Date();
    const isMesAtual = selectedYear === hoje.getFullYear() && selectedMonth === hoje.getMonth() + 1;
    const isMesFuturo = new Date(selectedYear, selectedMonth - 1, 1) > hoje;

    const lineData = [];
    for (let i = 1; i <= diasNoMes; i++) {
      const transDia = filteredTransactions.filter(t => t.data && parseInt(t.data.split('-')[2], 10) === i);
      const valDia = transDia.reduce((acc, t) => t.tipo === 'Entrada' ? acc + t.valor : acc - t.valor, 0);
      
      const isFutureDay = isMesFuturo || (isMesAtual && i > hoje.getDate());

      if (!isFutureDay) {
        saldoAcumulado += valDia;
        lineData.push({ dia: i, saldo: saldoAcumulado });
      } else {
        lineData.push({ dia: i, saldo: null });
      }
    }

    // Resumo por categoria
    const gastosCat = filteredTransactions.filter(t => t.tipo === 'Saída').reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {});
    
    const arrayCat = Object.keys(gastosCat).map(k => ({ categoria: k, total: gastosCat[k] })).sort((a,b) => b.total - a.total);
    const maiorGasto = arrayCat.length > 0 ? arrayCat[0] : null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-500">Total Entradas</span>
            <div className="text-2xl font-playfair font-bold text-green-700 mt-2">{formatCurrency(totaisMes.entradas)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-500">Total Saídas</span>
            <div className="text-2xl font-playfair font-bold text-red-700 mt-2">{formatCurrency(totaisMes.saidas)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-500">Saldo do Mês</span>
            <div className={`text-2xl font-playfair font-bold mt-2 ${totaisMes.entradas - totaisMes.saidas >= 0 ? 'text-[#2C6E7F]' : 'text-red-600'}`}>
              {formatCurrency(totaisMes.entradas - totaisMes.saidas)}
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-500">Maior Gasto</span>
            <div className="text-xl font-playfair font-bold text-[#1C2B2D] mt-2 truncate">
              {maiorGasto ? maiorGasto.categoria : '-'}
            </div>
            <div className="text-sm text-gray-500">{maiorGasto ? formatCurrency(maiorGasto.total) : ''}</div>
          </div>
        </div>

        <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Evolução do Saldo</h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={80} interval={0} domain={[0, 6000]} ticks={[100, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000]} tickFormatter={(val) => formatCompactCurrency(val)} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Dia ${label}`} />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#2C6E7F" 
                  strokeWidth={3} 
                  dot={(props) => {
                    if (isMesAtual && props.payload.dia === hoje.getDate()) {
                      return <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#2C6E7F" stroke="white" strokeWidth={2} />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#FDFAF4] rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Resumo por Categoria (Saídas)</h3>
          <div className="space-y-4">
            {arrayCat.map(cat => (
              <div key={cat.categoria} className="flex items-center">
                <div className="w-1/3 font-medium text-gray-700">{cat.categoria}</div>
                <div className="w-2/3 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-4">
                    <div className="bg-[#E08E79] h-2.5 rounded-full" style={{ width: `${Math.min(100, (cat.total / totaisMes.saidas) * 100)}%` }}></div>
                  </div>
                  <div className="w-24 text-right text-sm font-medium">{formatCurrency(cat.total)}</div>
                  <div className="w-16 text-right text-xs text-gray-500">{((cat.total / totaisMes.saidas) * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
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
        result = await supabase.from('budgets').update({ valor: newBudget.valor }).eq('id', existing.id).select();
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
          <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Definir Orçamento</h3>
          <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={novoOrcamento.categoria} onChange={e => setNovoOrcamento({...novoOrcamento, categoria: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Limite (R$)</label>
              <input type="number" step="0.01" required value={novoOrcamento.valor} onChange={e => setNovoOrcamento({...novoOrcamento, valor: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-[#2C6E7F]" placeholder="0.00" />
            </div>
            <button type="submit" className="bg-[#2C6E7F] text-white p-2 px-6 rounded-lg hover:bg-[#1A4A57] transition-colors h-[42px]">
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
                  <h4 className="font-bold text-[#1C2B2D]">{budget.categoria}</h4>
                  {isOver && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Estourou</span>}
                  {isWarning && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">Atenção</span>}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-[#2C6E7F]'}`} 
                    style={{ width: `${Math.min(100, percentual)}%` }}
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

  const renderInvestimentos = () => {
    const handleAddInvest = async (e) => {
      e.preventDefault();
      if (!novoInvest.nome || !novoInvest.valorInvestido) return;
      
      const newInvestment = {
        ...novoInvest,
        valorInvestido: parseFloat(novoInvest.valorInvestido),
        rentabilidade: parseFloat(novoInvest.rentabilidade) || 0,
        user_id: session.user.id
      };

      const { data, error } = await supabase.from('investments').insert([newInvestment]).select();

      if (error) {
        console.error("Erro do Supabase:", error);
        alert("Erro ao salvar investimento: " + error.message);
      } else if (data) {
        dispatch({
          type: 'ADD_INVESTMENT',
          payload: data[0]
        });
        setNovoInvest({ nome: '', tipo: TIPOS_INVESTIMENTO[0], valorInvestido: '', rentabilidade: '', dataInicio: new Date().toISOString().split('T')[0] });
      }
    };

    const totalInvestido = state.investments.reduce((acc, curr) => acc + curr.valorInvestido, 0);
    const rentabilidadeMedia = state.investments.reduce((acc, curr) => acc + curr.rentabilidade, 0) / (state.investments.length || 1);

    const pieData = state.investments.reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.tipo);
      if (existing) {
        existing.value += (curr.valorInvestido * (1 + curr.rentabilidade / 100));
      } else {
        acc.push({ name: curr.tipo, value: (curr.valorInvestido * (1 + curr.rentabilidade / 100)) });
      }
      return acc;
    }, []);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <span className="text-sm font-medium text-gray-500">Total Investido</span>
            <div className="text-2xl font-playfair font-bold text-[#1C2B2D] mt-2">{formatCurrency(totalInvestido)}</div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <span className="text-sm font-medium text-gray-500">Rentabilidade Média</span>
            <div className={`text-2xl font-playfair font-bold mt-2 ${rentabilidadeMedia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rentabilidadeMedia.toFixed(2)}%
            </div>
          </div>
          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <span className="text-sm font-medium text-gray-500">Patrimônio Atual</span>
            <div className="text-2xl font-playfair font-bold text-[#2C6E7F] mt-2">{formatCurrency(patrimonioInvestimentos)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Novo Investimento</h3>
              <form onSubmit={handleAddInvest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Ativo</label>
                  <input type="text" required value={novoInvest.nome} onChange={e => setNovoInvest({...novoInvest, nome: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={novoInvest.tipo} onChange={e => setNovoInvest({...novoInvest, tipo: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2">
                    {TIPOS_INVESTIMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Investido (R$)</label>
                  <input type="number" step="0.01" required value={novoInvest.valorInvestido} onChange={e => setNovoInvest({...novoInvest, valorInvestido: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rentabilidade Atual (%)</label>
                  <input type="number" step="0.01" value={novoInvest.rentabilidade} onChange={e => setNovoInvest({...novoInvest, rentabilidade: e.target.value})} className="w-full rounded-lg border-gray-300 border p-2" />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-[#1A4A57] text-white p-2 rounded-lg hover:bg-[#2C6E7F] transition-colors">
                    Adicionar Investimento
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              {state.investments.map(inv => {
                const valorAtual = inv.valorInvestido * (1 + inv.rentabilidade / 100);
                return (
                  <div key={inv.id} className="bg-[#FDFAF4] p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-[#1C2B2D]">{inv.nome}</h4>
                      <span className="bg-blue-100 text-[#2C6E7F] text-xs px-2 py-1 rounded-full mt-1 inline-block">{inv.tipo}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Investido: {formatCurrency(inv.valorInvestido)}</div>
                      <div className="font-bold text-[#1C2B2D]">{formatCurrency(valorAtual)}</div>
                      <div className={`text-xs font-medium ${inv.rentabilidade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {inv.rentabilidade >= 0 ? '+' : ''}{inv.rentabilidade}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-playfair font-bold text-lg mb-4 text-[#1C2B2D]">Distribuição</h3>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Sem investimentos</div>
              )}
            </div>
          </div>
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
                  className={`p-2 border rounded-xl min-h-[80px] flex flex-col justify-between transition-all ${hasTrans ? 'cursor-pointer hover:border-[#2C6E7F] bg-white border-gray-200' : 'border-gray-100 bg-gray-50 opacity-50'}`}
                >
                  <div className="text-right font-medium text-gray-700">{dia}</div>
                  {hasTrans && (
                    <div className="text-center mt-2">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${saldo >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className={`text-[10px] font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {saldo > 0 ? '+' : ''}{Math.round(saldo)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="w-80 bg-[#FDFAF4] p-6 rounded-2xl shadow-sm border border-[#2C6E7F]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-playfair font-bold text-lg text-[#1C2B2D]">Dia {selectedDay.dia}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {selectedDay.transacoes.map(t => (
                <div key={t.id} className="p-3 border border-gray-100 rounded-lg bg-white">
                  <div className="text-sm font-medium text-[#1C2B2D]">{t.descricao}</div>
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transacoes', label: 'Transações', icon: <ArrowRightLeft className="w-5 h-5" /> },
    { id: 'mensal', label: 'Controle Mensal', icon: <Activity className="w-5 h-5" /> },
    { id: 'orcamento', label: 'Orçamento', icon: <Target className="w-5 h-5" /> },
    { id: 'investimentos', label: 'Investimentos', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'calendario', label: 'Calendário', icon: <CalendarDays className="w-5 h-5" /> }
  ];

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="flex h-screen overflow-hidden font-dm">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1C2B2D] text-white flex flex-col">
        <div className="p-6">
          <h1 className="font-playfair text-2xl font-bold flex items-center text-[#FDFAF4]">
            <Wallet className="mr-2 text-[#7FB5C2]" /> No Azul
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#2C6E7F] text-white shadow-lg' : 'text-gray-400 hover:bg-[#1A4A57] hover:text-white'}`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F5F0E8]">
        {/* Header Fix */}
        <header className="bg-[#FDFAF4] border-b border-gray-200 p-4 px-8 flex justify-between items-center shadow-sm z-10">
          <h2 className="font-playfair text-2xl font-bold text-[#1C2B2D]">
            {navItems.find(i => i.id === activeTab)?.label}
          </h2>
          
          <div className="flex items-center space-x-4 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => {
              if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-medium text-[#1C2B2D] w-32 text-center select-none flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-[#2C6E7F]" />
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
            {activeTab === 'mensal' && renderControleMensal()}
            {activeTab === 'orcamento' && renderOrcamento()}
            {activeTab === 'investimentos' && renderInvestimentos()}
            {activeTab === 'calendario' && renderCalendario()}
          </div>
        </div>

        {transactionToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-96 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-center mb-4 text-red-500">
                <AlertCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-playfair font-bold text-center text-[#1C2B2D] mb-2">Excluir Transação</h3>
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

        {transactionToEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-playfair font-bold text-[#1C2B2D]">Editar Transação</h3>
                <button onClick={() => setTransactionToEdit(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input type="text" required value={transactionToEdit.descricao} onChange={e => setTransactionToEdit({...transactionToEdit, descricao: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2C6E7F] focus:border-transparent outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                    <input type="number" step="0.01" required value={transactionToEdit.valor} onChange={e => setTransactionToEdit({...transactionToEdit, valor: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2C6E7F] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" disabled={transactionToEdit.frequencia === 'recorrente' && updateFuture} required value={transactionToEdit.data} onChange={e => setTransactionToEdit({...transactionToEdit, data: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2C6E7F] outline-none disabled:opacity-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={transactionToEdit.tipo} onChange={e => setTransactionToEdit({...transactionToEdit, tipo: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2C6E7F] outline-none">
                      <option value="Saída">Saída</option>
                      <option value="Entrada">Entrada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select value={transactionToEdit.categoria} onChange={e => setTransactionToEdit({...transactionToEdit, categoria: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2C6E7F] outline-none">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
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
                      Aplicar as alterações desta transação (Valor, Categoria, Nome) para todas as futuras cobranças desta recorrência.
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setTransactionToEdit(null)} className="flex-1 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl text-white bg-[#2C6E7F] hover:bg-[#1A4A57] font-medium transition-colors">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

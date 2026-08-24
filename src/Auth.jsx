import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Wallet, Mail, Lock } from 'lucide-react';

export default function Auth({ isRecovery, onPasswordUpdated }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login'); // 'login', 'signup', 'reset', 'update'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  React.useEffect(() => {
    if (isRecovery) {
      setView('update');
    }
  }, [isRecovery]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('confirmation email')) {
            throw new Error('Erro ao enviar e-mail de confirmação. Desabilite "Confirm email" no dashboard do Supabase para permitir o cadastro direto.');
          }
          throw error;
        }
        
        if (data?.session) {
          setMessage('Cadastro realizado com sucesso! Entrando...');
        } else {
          setMessage('Cadastro realizado! Verifique seu email para confirmar a conta.');
        }
      } else if (view === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } else if (view === 'update') {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        if (error) throw error;
        setMessage('Senha atualizada com sucesso!');
        if (onPasswordUpdated) {
          setTimeout(() => onPasswordUpdated(), 2000);
        }
      }
    } catch (error) {
      setError(error.message || 'Ocorreu um erro durante a operação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F5F0E8] font-dm">
      <div className="w-full max-w-md bg-[#FDFAF4] p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[#011640] rounded-2xl mb-4 shadow-lg shadow-[#011640]/20">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-[#1C2B2D]">
            No Azul
          </h1>
          <p className="text-gray-500 mt-2 text-center">
            {view === 'login' && 'Faça login para acessar seu painel'}
            {view === 'signup' && 'Crie sua conta para começar a gerenciar seu dinheiro'}
            {view === 'reset' && 'Recupere o acesso à sua conta'}
            {view === 'update' && 'Crie uma nova senha para sua conta'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {view !== 'update' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2.5 focus:ring-[#011640] focus:border-[#011640] outline-none transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
          )}
          
          {view !== 'reset' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  {view === 'update' ? 'Nova Senha' : 'Senha'}
                </label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setView('reset'); setError(null); setMessage(null); }}
                    className="text-xs text-[#011640] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2.5 focus:ring-[#011640] focus:border-[#011640] outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#011640] text-white p-3 rounded-xl hover:bg-[#01256B] transition-all font-medium mt-6 shadow-md disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              view === 'login' ? 'Entrar' : 
              view === 'signup' ? 'Cadastrar' : 
              view === 'reset' ? 'Enviar link de recuperação' : 'Atualizar senha'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {view === 'reset' ? (
            <button
              onClick={() => { setView('login'); setError(null); setMessage(null); }}
              className="text-sm text-[#011640] hover:underline font-medium block w-full"
            >
              Voltar para o login
            </button>
          ) : view === 'update' ? null : (
            <button
              onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
              className="text-sm text-[#011640] hover:underline font-medium"
            >
              {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

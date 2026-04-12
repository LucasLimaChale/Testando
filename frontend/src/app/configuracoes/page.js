'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function ConfiguracoesPage() {
  const [user, setUser]           = useState(null);
  const [logs, setLogs]           = useState([]);
  const [users, setUsers]         = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Formulário de email
  const [emailForm, setEmailForm]       = useState({ email: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg]         = useState(null); // { type: 'ok'|'err', text }

  // Formulário de senha
  const [senhaForm, setSenhaForm]       = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [senhaMsg, setSenhaMsg]         = useState(null);

  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    setEmailForm({ email: parsed.email || '' });
    if (parsed.tipo === 'admin') {
      loadLogs();
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, [router]);

  async function loadLogs(userId = '') {
    setLoadingLogs(true);
    try {
      const data = await api.getLogs(userId ? { user_id: userId } : {});
      setLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  }

  function handleFilterUser(id) {
    setFilterUser(id);
    loadLogs(id);
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!emailForm.email.trim()) return;
    setEmailMsg(null);
    setEmailLoading(true);
    try {
      const { user: updated, token } = await api.updateMe({ email: emailForm.email.trim() });
      // Atualiza localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = { ...stored, email: updated.email };
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', token);
      setUser(newUser);
      setEmailMsg({ type: 'ok', text: 'Email atualizado com sucesso!' });
    } catch (err) {
      setEmailMsg({ type: 'err', text: err.message });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleSenhaSubmit(e) {
    e.preventDefault();
    setSenhaMsg(null);
    if (senhaForm.nova_senha !== senhaForm.confirmar) {
      setSenhaMsg({ type: 'err', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }
    setSenhaLoading(true);
    try {
      const { token } = await api.updateMe({
        senha_atual: senhaForm.senha_atual,
        nova_senha:  senhaForm.nova_senha,
      });
      localStorage.setItem('token', token);
      setSenhaForm({ senha_atual: '', nova_senha: '', confirmar: '' });
      setSenhaMsg({ type: 'ok', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setSenhaMsg({ type: 'err', text: err.message });
    } finally {
      setSenhaLoading(false);
    }
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Perfil, acesso e auditoria</p>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

          {/* Perfil */}
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center shrink-0">
                <span className="text-indigo-600 text-xl font-bold uppercase">{user?.nome?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{user?.nome}</p>
                <p className="text-slate-500 text-sm">{user?.email}</p>
                <span className="badge badge-blue mt-1 capitalize">{user?.tipo}</span>
              </div>
            </div>
          </div>

          {/* Trocar Email */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-1">Alterar e-mail de login</h2>
            <p className="text-sm text-slate-500 mb-5">Este é o e-mail usado para entrar no sistema.</p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Novo e-mail</label>
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={e => setEmailForm({ email: e.target.value })}
                  className="input max-w-sm"
                  required
                  placeholder="novo@email.com"
                />
              </div>

              {emailMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm max-w-sm ${
                  emailMsg.type === 'ok'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {emailMsg.type === 'ok'
                    ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                  {emailMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading || emailForm.email === user?.email}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {emailLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                Salvar e-mail
              </button>
            </form>
          </div>

          {/* Trocar Senha */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-1">Alterar senha</h2>
            <p className="text-sm text-slate-500 mb-5">Mínimo de 6 caracteres.</p>

            <form onSubmit={handleSenhaSubmit} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha atual</label>
                <input
                  type="password"
                  value={senhaForm.senha_atual}
                  onChange={e => setSenhaForm(f => ({ ...f, senha_atual: e.target.value }))}
                  className="input"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={senhaForm.nova_senha}
                  onChange={e => setSenhaForm(f => ({ ...f, nova_senha: e.target.value }))}
                  className="input"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={senhaForm.confirmar}
                  onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))}
                  className="input"
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              {senhaMsg && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  senhaMsg.type === 'ok'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {senhaMsg.type === 'ok'
                    ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                  {senhaMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={senhaLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {senhaLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                Alterar senha
              </button>
            </form>
          </div>

          {/* Logs — somente admin */}
          {user?.tipo === 'admin' && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Logs de Acesso</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Histórico de logins no sistema (GMT-3)</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={filterUser}
                    onChange={e => handleFilterUser(e.target.value)}
                    className="input w-auto text-sm py-2"
                  >
                    <option value="">Todos os usuários</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.tipo})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadLogs(filterUser)}
                    className="btn-ghost flex items-center gap-1.5 py-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar
                  </button>
                </div>
              </div>

              {loadingLogs ? (
                <div className="text-center py-12 text-slate-400 text-sm">Carregando logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-400 text-sm">Nenhum log encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hora</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {logs.map(l => {
                        const dt = new Date(l.data_hora_login);
                        const ROLE_CLS = { admin: 'badge-purple', editor: 'badge-blue', cliente: 'badge-gray' };
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                  <span className="text-indigo-600 text-xs font-bold uppercase">
                                    {(l.usuario || '?').charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800">{l.usuario || 'Usuário removido'}</p>
                                  <p className="text-xs text-slate-400">{l.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`badge ${ROLE_CLS[l.tipo] || 'badge-gray'} capitalize`}>{l.tipo}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">
                              {dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                              {dt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{l.ip || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

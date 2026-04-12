'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function ConfiguracoesPage() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('logs');
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    if (parsed.tipo === 'admin') {
      loadLogs();
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, [router]);

  async function loadLogs(userId = '') {
    setLoading(true);
    try {
      const data = await api.getLogs(userId ? { user_id: userId } : {});
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterUser(id) {
    setFilterUser(id);
    loadLogs(id);
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        <div className="bg-white border-b border-slate-200 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Preferências e auditoria do sistema</p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Perfil */}
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">Meu Perfil</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center">
                <span className="text-indigo-600 text-xl font-bold uppercase">{user?.nome?.charAt(0)}</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{user?.nome}</p>
                <p className="text-slate-500 text-sm">{user?.email}</p>
                <span className="badge badge-blue mt-1 capitalize">{user?.tipo}</span>
              </div>
            </div>
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

              {loading ? (
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
                        const ROLE_CLS = {
                          admin: 'badge-purple',
                          editor: 'badge-blue',
                          cliente: 'badge-gray',
                        };
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
                              <span className={`badge ${ROLE_CLS[l.tipo] || 'badge-gray'} capitalize`}>
                                {l.tipo}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">
                              {dt.toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                              {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                              {l.ip || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Para não-admin */}
          {user?.tipo !== 'admin' && (
            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Configurações avançadas disponíveis apenas para administradores.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

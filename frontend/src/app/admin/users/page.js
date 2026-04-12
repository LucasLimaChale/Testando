'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const ROLE = {
  admin:   { label: 'Admin',   cls: 'bg-violet-100 text-violet-700' },
  editor:  { label: 'Editor',  cls: 'bg-blue-100 text-blue-700' },
  cliente: { label: 'Cliente', cls: 'bg-slate-100 text-slate-600' },
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', tipo: 'cliente' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    if (parsed.tipo !== 'admin') { router.replace('/dashboard'); return; }
    setCurrentUser(parsed);
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try { setUsers(await api.getUsers()); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(form);
      setForm({ nome: '', email: '', senha: '', tipo: 'cliente' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id, nome) {
    if (id === currentUser?.id) { alert('Não é possível excluir seu próprio usuário.'); return; }
    if (!confirm(`Excluir o usuário "${nome}"?`)) return;
    try { await api.deleteUser(id); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
            <p className="text-sm text-slate-500 mt-0.5">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setShowForm(s => !s); setError(''); }} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo Usuário
          </button>
        </div>

        <div className="px-6 py-6 max-w-3xl space-y-5">

          {showForm && (
            <div className="card p-6 animate-fadeIn">
              <h2 className="font-semibold text-slate-900 mb-4">Novo Usuário</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome *</label>
                    <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha *</label>
                    <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="input" required minLength={6} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input">
                      <option value="cliente">Cliente</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{error}</div>}
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary">Criar usuário</button>
                  <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="btn-ghost">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-400">Carregando...</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cadastro</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => {
                    const r = ROLE[u.tipo] || { label: u.tipo, cls: 'badge-gray' };
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-indigo-600 text-xs font-bold uppercase">{u.nome?.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{u.nome}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${r.cls}`}>{r.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                          {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(u.id, u.nome)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Excluir
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

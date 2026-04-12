'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nome: '', telefone: '', empresa: '', user_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    if (JSON.parse(u).tipo !== 'admin') { router.replace('/dashboard'); return; }
    loadData();
    api.getUsers().then(users => setClientUsers(users.filter(u => u.tipo === 'cliente'))).catch(() => {});
  }, [router]);

  async function loadData(q = '') {
    setLoading(true);
    try {
      const data = await api.getClients(q ? { q } : {});
      setClients(data);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadData(search);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nome: '', telefone: '', empresa: '', user_id: '' });
    setError('');
    setShowForm(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({ nome: c.nome, telefone: c.telefone || '', empresa: c.empresa || '', user_id: c.user_id || '' });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || undefined,
        empresa: form.empresa.trim() || undefined,
        user_id: form.user_id || undefined,
      };
      if (editingId) {
        await api.updateClient(editingId, payload);
      } else {
        await api.createClient(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadData(search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Excluir o cliente "${nome}"? Os vídeos vinculados também serão excluídos.`)) return;
    try {
      await api.deleteClient(id);
      loadData(search);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
            <p className="text-sm text-slate-500 mt-0.5">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Cadastrar Cliente
          </button>
        </div>

        <div className="px-6 py-6 space-y-5 max-w-4xl">

          {/* Busca */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
                placeholder="Buscar por nome..."
              />
            </div>
            <button type="submit" className="btn-primary">Buscar</button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); loadData(); }} className="btn-ghost">
                Limpar
              </button>
            )}
          </form>

          {/* Modal Form */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      className="input"
                      required
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Empresa / Imobiliária</label>
                    <input
                      type="text"
                      value={form.empresa}
                      onChange={e => setForm({ ...form, empresa: e.target.value })}
                      className="input"
                      placeholder="Ex: Imobiliária Limas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone (WhatsApp)</label>
                    <input
                      type="text"
                      value={form.telefone}
                      onChange={e => setForm({ ...form, telefone: e.target.value })}
                      className="input"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Vincular conta de login
                      <span className="text-slate-400 font-normal ml-1 text-xs">(opcional)</span>
                    </label>
                    <select
                      value={form.user_id}
                      onChange={e => setForm({ ...form, user_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Nenhum</option>
                      {clientUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.nome} — {u.email}</option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1">
                      {editingId ? 'Salvar alterações' : 'Cadastrar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="btn-ghost flex-1 justify-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">Nenhum cliente encontrado.</p>
              <button onClick={openCreate} className="btn-primary mt-4">Cadastrar primeiro cliente</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Login</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800">{c.nome}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{c.empresa || '—'}</td>
                      <td className="px-5 py-3.5">
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            {c.telefone}
                          </a>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.email ? (
                          <span className="badge badge-blue">{c.email}</span>
                        ) : (
                          <span className="badge badge-gray">Sem login</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Editar
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            onClick={() => handleDelete(c.id, c.nome)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

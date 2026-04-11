'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const ROLE_LABEL = { admin: 'Admin', cliente: 'Cliente', editor: 'Editor' };
const ROLE_COLOR = {
  admin:   'bg-purple-100 text-purple-800',
  editor:  'bg-green-100  text-green-800',
  cliente: 'bg-blue-100   text-blue-800',
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
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.replace('/'); return; }
    const u = JSON.parse(userStr);
    if (u.tipo !== 'admin') { router.replace('/dashboard'); return; }
    setCurrentUser(u);
    loadUsers();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(form);
      setForm({ nome: '', email: '', senha: '', tipo: 'cliente' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (id === currentUser?.id) { alert('Não é possível excluir seu próprio usuário.'); return; }
    if (!confirm('Excluir este usuário?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <h1 className="text-base font-bold text-gray-900">Usuários</h1>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            + Novo Usuário
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Novo Usuário</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className={input}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className={input}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    className={input}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className={input}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {users.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">Nenhum usuário.</p>
          ) : users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{u.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[u.tipo]}`}>
                  {ROLE_LABEL[u.tipo]}
                </span>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

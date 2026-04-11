'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', user_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.replace('/'); return; }
    const u = JSON.parse(userStr);
    if (u.tipo !== 'admin') { router.replace('/dashboard'); return; }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([api.getClients(), api.getUsers()]);
      setClients(c);
      setClientUsers(u.filter(u => u.tipo === 'cliente'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createClient({
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || undefined,
        user_id: form.user_id || undefined,
      });
      setForm({ nome: '', telefone: '', user_id: '' });
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este cliente? Os vídeos vinculados também serão excluídos.')) return;
    try {
      await api.deleteClient(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <h1 className="text-base font-bold text-gray-900">Clientes</h1>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            + Novo Cliente
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Novo Cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome *" required>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className={inputCls}
                    required
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className={inputCls}
                    placeholder="(11) 99999-9999"
                  />
                </Field>
              </div>
              <Field label="Vincular conta de login (tipo: cliente)">
                <select
                  value={form.user_id}
                  onChange={e => setForm({ ...form, user_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Nenhum</option>
                  {clientUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.nome} — {u.email}</option>
                  ))}
                </select>
              </Field>
              {error && <ErrorBox>{error}</ErrorBox>}
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Criar</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">Nenhum cliente cadastrado.</p>
          ) : clients.map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{c.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.telefone || 'Sem telefone'}
                  {c.email ? ` · ${c.email}` : ' · Sem login vinculado'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  );
}

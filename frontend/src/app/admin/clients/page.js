'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nome: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    if (JSON.parse(u).tipo !== 'admin') { router.replace('/dashboard'); return; }
    loadEmpresas();
  }, [router]);

  async function loadEmpresas() {
    setLoading(true);
    try {
      const data = await api.getEmpresas();
      setEmpresas(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nome: '' });
    setError('');
    setShowForm(true);
  }

  function openEdit(e) {
    setEditingId(e.id);
    setForm({ nome: e.nome });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateEmpresa(editingId, form);
      } else {
        await api.createEmpresa(form);
      }
      setShowForm(false);
      loadEmpresas();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Excluir a empresa "${nome}"?\nTodos os colaboradores e vídeos vinculados serão excluídos.`)) return;
    setDeleting(id);
    try {
      await api.deleteEmpresa(id);
      setEmpresas(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Empresas</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Cadastrar Empresa
          </button>
        </div>

        <div className="px-6 py-6 max-w-5xl">

          {/* Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">
                    {editingId ? 'Editar Empresa' : 'Nova Empresa'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nome da empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => setForm({ nome: e.target.value })}
                      className="input"
                      required
                      placeholder="Ex: Imobiliária Limas"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{error}</div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="submit" className="btn-primary flex-1">
                      {editingId ? 'Salvar' : 'Cadastrar'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Carregando...</div>
          ) : empresas.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium mb-1">Nenhuma empresa cadastrada</p>
              <p className="text-slate-400 text-sm mb-6">Comece criando a primeira empresa e adicione colaboradores.</p>
              <button onClick={openCreate} className="btn-primary">Cadastrar primeira empresa</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {empresas.map(emp => (
                <div key={emp.id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group">
                  {/* Header do card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{emp.nome}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {emp.total_colaboradores} colaborador{emp.total_colaboradores != 1 ? 'es' : ''}
                          {emp.colaboradores_ativos > 0 && ` · ${emp.colaboradores_ativos} ativo${emp.colaboradores_ativos != 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <Link
                      href={`/admin/clients/${emp.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ver Colaboradores
                    </Link>
                    <button
                      onClick={() => openEdit(emp)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar empresa"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id, emp.nome)}
                      disabled={deleting === emp.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Excluir empresa"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

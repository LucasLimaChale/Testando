'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const CARGO_PLACEHOLDER = 'Ex: Gerente de Marketing';

export default function EmpresaDetailPage() {
  const [empresa, setEmpresa] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal colaborador
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '', cargo: '', ativo: true });
  const [formError, setFormError] = useState('');

  // Edit empresa inline
  const [editingEmpresa, setEditingEmpresa] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');

  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    if (JSON.parse(u).tipo !== 'admin') { router.replace('/dashboard'); return; }
    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [emp, cols] = await Promise.all([
        api.getEmpresa(id),
        api.getColaboradores(id),
      ]);
      setEmpresa(emp);
      setEmpresaNome(emp.nome);
      setColaboradores(cols);
    } catch {
      router.replace('/admin/clients');
    } finally {
      setLoading(false);
    }
  }

  async function saveEmpresaNome() {
    if (!empresaNome.trim()) return;
    try {
      const updated = await api.updateEmpresa(id, { nome: empresaNome.trim() });
      setEmpresa(updated);
      setEditingEmpresa(false);
    } catch (err) {
      alert(err.message);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nome: '', telefone: '', cargo: '', ativo: true });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(col) {
    setEditingId(col.id);
    setForm({ nome: col.nome, telefone: col.telefone || '', cargo: col.cargo || '', ativo: col.ativo });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setFormError('');
    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || undefined,
        cargo: form.cargo.trim() || undefined,
        ativo: form.ativo,
      };
      if (editingId) {
        const updated = await api.updateColaborador(id, editingId, payload);
        setColaboradores(prev => prev.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await api.createColaborador(id, payload);
        setColaboradores(prev => [...prev, created]);
        setEmpresa(e => ({ ...e, total_colaboradores: Number(e.total_colaboradores) + 1 }));
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete(colId, nome) {
    if (!confirm(`Excluir o colaborador "${nome}"?`)) return;
    try {
      await api.deleteColaborador(id, colId);
      setColaboradores(prev => prev.filter(c => c.id !== colId));
      setEmpresa(e => ({ ...e, total_colaboradores: Math.max(0, Number(e.total_colaboradores) - 1) }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleAtivo(col) {
    try {
      const updated = await api.updateColaborador(id, col.id, {
        nome: col.nome,
        telefone: col.telefone,
        cargo: col.cargo,
        ativo: !col.ativo,
      });
      setColaboradores(prev => prev.map(c => c.id === col.id ? updated : c));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="lg:pl-60">
        <Sidebar />
        <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const ativos   = colaboradores.filter(c => c.ativo);
  const inativos = colaboradores.filter(c => !c.ativo);

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <Link href="/admin/clients" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1 flex items-center gap-3">
            {editingEmpresa ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={empresaNome}
                  onChange={e => setEmpresaNome(e.target.value)}
                  className="input text-lg font-bold flex-1 max-w-xs"
                  onKeyDown={e => { if (e.key === 'Enter') saveEmpresaNome(); if (e.key === 'Escape') setEditingEmpresa(false); }}
                  autoFocus
                />
                <button onClick={saveEmpresaNome} className="btn-primary text-sm py-1.5">Salvar</button>
                <button onClick={() => setEditingEmpresa(false)} className="btn-ghost text-sm py-1.5">Cancelar</button>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{empresa?.nome}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {empresa?.total_colaboradores} colaborador{empresa?.total_colaboradores != 1 ? 'es' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setEditingEmpresa(true)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Editar nome da empresa"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Colaborador
          </button>
        </div>

        <div className="px-6 py-6 max-w-3xl space-y-6">

          {/* Modal colaborador */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">
                    {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
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
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      className="input"
                      required
                      placeholder="Nome completo"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={form.telefone}
                      onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                      className="input"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Cargo <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.cargo}
                      onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                      className="input"
                      placeholder={CARGO_PLACEHOLDER}
                    />
                  </div>
                  {editingId && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700">Status</label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-sm font-medium ${form.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {form.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  )}
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{formError}</div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="submit" className="btn-primary flex-1">
                      {editingId ? 'Salvar alterações' : 'Adicionar'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Empty state */}
          {colaboradores.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium mb-1">Nenhum colaborador ainda</p>
              <p className="text-slate-400 text-sm mb-6">Adicione os colaboradores que vão aprovar os vídeos.</p>
              <button onClick={openCreate} className="btn-primary">Adicionar primeiro colaborador</button>
            </div>
          )}

          {/* Colaboradores ativos */}
          {ativos.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Ativos — {ativos.length}
              </h2>
              <div className="card overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {ativos.map(col => (
                    <ColaboradorRow
                      key={col.id}
                      col={col}
                      onEdit={() => openEdit(col)}
                      onDelete={() => handleDelete(col.id, col.nome)}
                      onToggle={() => toggleAtivo(col)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Colaboradores inativos */}
          {inativos.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Inativos — {inativos.length}
              </h2>
              <div className="card overflow-hidden opacity-70">
                <div className="divide-y divide-slate-50">
                  {inativos.map(col => (
                    <ColaboradorRow
                      key={col.id}
                      col={col}
                      onEdit={() => openEdit(col)}
                      onDelete={() => handleDelete(col.id, col.nome)}
                      onToggle={() => toggleAtivo(col)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColaboradorRow({ col, onEdit, onDelete, onToggle }) {
  const initials = col.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const phone    = col.telefone?.replace(/\D/g, '');

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <span className="text-indigo-600 text-xs font-bold">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 text-sm">{col.nome}</span>
          {col.cargo && (
            <span className="text-xs text-slate-400 font-normal">{col.cargo}</span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${col.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${col.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {col.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {col.telefone ? (
          <a
            href={`https://wa.me/55${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mt-0.5 w-fit"
            onClick={e => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {col.telefone}
          </a>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">Sem telefone</p>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onToggle}
          title={col.ativo ? 'Desativar' : 'Ativar'}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {col.ativo
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          </svg>
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Excluir"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

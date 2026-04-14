'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function UploadsPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [files, setFiles]       = useState([]);
  const [label, setLabel]       = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u || JSON.parse(u).tipo !== 'admin') { router.replace('/'); return; }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getUploadRequests();
      setRequests(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const req = await api.createUploadRequest(label.trim());
      setRequests(prev => [req, ...prev]);
      setLabel('');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id) {
    if (!confirm('Remover este link e todos os arquivos?')) return;
    await api.deleteUploadRequest(id);
    setRequests(prev => prev.filter(r => r.id !== id));
    if (selected?.id === id) { setSelected(null); setFiles([]); }
  }

  async function openFiles(req) {
    if (selected?.id === req.id) { setSelected(null); setFiles([]); return; }
    setSelected(req);
    try {
      const data = await api.getUploadRequestFiles(req.id);
      setFiles(data);
    } catch { setFiles([]); }
  }

  function copyLink(token) {
    const url = `${window.location.origin}/enviar/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-bold text-slate-900">Links de Envio</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crie links para seus clientes enviarem imagens</p>
        </div>

        <div className="p-6 max-w-3xl">
          {/* Criar novo link */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">Novo link de envio</p>
            <div className="flex gap-2">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="Ex: Artes para campanha de Março — Cliente X"
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
              />
              <button
                onClick={create}
                disabled={creating || !label.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                {creating ? 'Criando...' : '+ Criar link'}
              </button>
            </div>
          </div>

          {/* Lista de links */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum link criado ainda.</div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{req.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        <span className="text-indigo-600 font-medium">{req.total_arquivos} arquivo{req.total_arquivos !== 1 ? 's' : ''}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => copyLink(req.token)}
                      title="Copiar link"
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${copied === req.token ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'}`}
                    >
                      {copied === req.token ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Copiado!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar link
                        </>
                      )}
                    </button>

                    {req.total_arquivos > 0 && (
                      <button
                        onClick={() => openFiles(req)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${selected?.id === req.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        Ver arquivos
                      </button>
                    )}

                    <button
                      onClick={() => remove(req.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Arquivos enviados */}
                  {selected?.id === req.id && (
                    <div className="border-t border-slate-100 px-4 py-4">
                      {files.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum arquivo enviado ainda.</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {files.map(f => (
                            <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-square block">
                              <img src={f.url} alt={f.original_name} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              <p className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-xs text-white bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                {f.original_name}
                              </p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

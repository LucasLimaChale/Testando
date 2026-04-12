'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function UrgenciaPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    if (JSON.parse(u).tipo !== 'admin') { router.replace('/dashboard'); return; }
    load();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getUrgent();
      setVideos(data);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(id) {
    setPublishing(id);
    try {
      await api.publishVideo(id);
      setVideos(v => v.filter(x => x.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(null);
    }
  }

  function daysSince(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header vermelho */}
        <div className="bg-red-600 px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Urgência</h1>
                <p className="text-red-200 text-sm">Vídeos aprovados sem publicação</p>
              </div>
              {videos.length > 0 && (
                <span className="ml-auto bg-white text-red-600 font-bold text-lg px-4 py-1.5 rounded-xl">
                  {videos.length} pendente{videos.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {videos.length > 0 && (
              <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-3 mt-4">
                <p className="text-white text-sm font-medium">
                  ⚠️ ATENÇÃO: Você tem vídeos aprovados há mais de 2 dias sem concluir. Finalize isso o quanto antes.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Carregando...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Tudo em dia!</h2>
              <p className="text-slate-500 text-sm mt-1">Nenhum vídeo aprovado pendente de publicação.</p>
              <Link href="/dashboard" className="btn-primary mt-6 inline-flex">← Voltar ao Dashboard</Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map(v => {
                const days = daysSince(v.atualizado_em);
                return (
                  <div
                    key={v.id}
                    className="card p-5 border-l-4 border-red-500 animate-fadeIn hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Link
                        href={`/videos/${v.id}`}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-600 line-clamp-2 flex-1"
                      >
                        {v.titulo}
                      </Link>
                      <span className="badge bg-red-100 text-red-700 shrink-0">
                        {days}d atraso
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {v.cliente_nome}
                      </div>
                      {v.cliente_telefone && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {v.cliente_telefone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Aprovado: {new Date(v.atualizado_em).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePublish(v.id)}
                      disabled={publishing === v.id}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {publishing === v.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Publicando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Marcar como Publicado
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

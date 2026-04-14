'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const STATUS_META = {
  LISTA:                { label: 'Lista',            cls: 'badge-gray'   },
  EM_EDICAO:            { label: 'Em Edição',         cls: 'badge-blue'   },
  AGUARDANDO_APROVACAO: { label: 'Para Aprovação',    cls: 'badge-yellow' },
  REPROVADO:            { label: 'Reprovado',         cls: 'badge-red'    },
  APROVADO:             { label: 'Pronto para Subir', cls: 'badge-purple' },
  PUBLICADO:            { label: 'Finalizado',        cls: 'badge-green'  },
};

export default function VideoPage() {
  const [user, setUser] = useState(null);
  const [video, setVideo] = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    setUser(JSON.parse(u));
    loadVideo();
  }, [id]);

  async function loadVideo() {
    setLoading(true);
    try {
      const data = await api.getVideo(id);
      setVideo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!confirm('Confirmar aprovação deste vídeo?')) return;
    setError(''); setSuccess('');
    setActionLoading(true);
    try {
      const updated = await api.approveVideo(id);
      setVideo(v => ({ ...v, ...updated }));
      setSuccess('Vídeo aprovado com sucesso!');
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!comentario.trim()) { setError('Informe o motivo da reprovação.'); return; }
    if (!confirm('Confirmar reprovação?')) return;
    setError(''); setSuccess('');
    setActionLoading(true);
    try {
      const updated = await api.rejectVideo(id, comentario.trim());
      setVideo(v => ({ ...v, ...updated }));
      setComentario('');
      setSuccess('Vídeo reprovado. O editor será notificado.');
      await loadVideo();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  async function handlePublish() {
    if (!confirm('Marcar como Publicado?')) return;
    setError(''); setSuccess('');
    setActionLoading(true);
    try {
      const updated = await api.publishVideo(id);
      setVideo(v => ({ ...v, ...updated }));
      setSuccess('Vídeo marcado como publicado!');
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  }

  async function handleDelete() {
    if (!confirm('Excluir este vídeo permanentemente?')) return;
    try {
      await api.deleteVideo(id);
      router.push('/dashboard');
    } catch (err) { setError(err.message); }
  }

  function getWhatsAppLink() {
    if (!video?.cliente_telefone) return null;
    const phone = video.cliente_telefone.replace(/\D/g, '');
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${appUrl}/videos/${id}`;
    const msg = encodeURIComponent(
      `Olá ${video.cliente_nome}! Seu vídeo está pronto 🎬\n\nPor favor, acesse o link abaixo para visualizar e aprovar:\n\n${link}\n\nCaso precise de ajustes, você pode reprovar e comentar diretamente na plataforma.`
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  }

  const isClient = user?.tipo === 'cliente';
  const canAct   = ['cliente', 'admin'].includes(user?.tipo) && video?.status === 'AGUARDANDO_APROVACAO';
  const canPublish = user?.tipo === 'admin' && video?.status === 'APROVADO';
  const sm = STATUS_META[video?.status] || { label: video?.status, cls: 'badge-gray' };

  if (loading) return (
    <div className={isClient ? '' : 'lg:pl-60'}>
      {!isClient && <Sidebar />}
      <div className="flex items-center justify-center h-screen">
        <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    </div>
  );

  return (
    <div className={isClient ? '' : 'lg:pl-60'}>
      {!isClient && <Sidebar />}
      <div className={`${!isClient ? 'pt-14 lg:pt-0' : ''} min-h-screen bg-slate-50`}>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
          <Link href={isClient ? '#' : '/videos'} className="text-slate-400 hover:text-slate-600" onClick={e => { if (isClient) e.preventDefault(); }}>
            {!isClient && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-slate-900 truncate text-lg">{video?.titulo}</h1>
              {video?.status && <span className={sm.cls}>{sm.label}</span>}
              <span className="badge badge-gray">v{video?.versao}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{video?.cliente_nome}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

          {/* Player */}
          <div className="bg-black rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
            {video?.url ? (
              <video src={video.url} controls preload="metadata" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                </svg>
                <p className="text-sm">Arquivo removido do storage após aprovação</p>
              </div>
            )}
          </div>

          {/* Alertas */}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {/* Ações aprovação */}
          {canAct && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Avaliação do Vídeo</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Comentário{' '}
                  <span className="text-slate-400 font-normal text-xs">(obrigatório para reprovar)</span>
                </label>
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Descreva o que precisa ser ajustado..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Aprovar
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 btn-danger flex items-center justify-center gap-2 py-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reprovar
                </button>
              </div>
            </div>
          )}

          {/* Admin actions */}
          {!canAct && (canPublish || ['admin', 'editor'].includes(user?.tipo)) && (
            <div className="card p-6 space-y-3">
              {canPublish && (
                <>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={actionLoading}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Marcar como Publicado
                  </button>
                </>
              )}

              {/* WhatsApp button — para status aguardando */}
              {video?.status === 'AGUARDANDO_APROVACAO' && getWhatsAppLink() && (
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Reenviar via WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Feedbacks */}
          {video?.feedbacks?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Histórico de Feedbacks</h2>
              <div className="space-y-3">
                {video.feedbacks.map(f => (
                  <div key={f.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-sm text-slate-700">{f.comentario}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(f.criado_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Informações</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {[
                ['Empresa',    video?.empresa_nome],
                ['Colaborador', video?.colaborador_nome || video?.cliente_nome],
                ['Editor',     video?.editor_nome || '—'],
                ['Versão',     `v${video?.versao}`],
                ['Status',     sm.label],
                ['Upload',     video?.upload_em ? new Date(video.upload_em).toLocaleString('pt-BR') : new Date(video?.criado_em).toLocaleString('pt-BR')],
                ['Aprovado em', video?.aprovado_em ? new Date(video.aprovado_em).toLocaleString('pt-BR') : null],
                ['Reprovado em', video?.reprovado_em ? new Date(video.reprovado_em).toLocaleString('pt-BR') : null],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</dt>
                  <dd className="text-sm font-semibold text-slate-800 mt-0.5">{value}</dd>
                </div>
              ) : null)}
            </dl>

            {user?.tipo === 'admin' && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Excluir vídeo permanentemente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

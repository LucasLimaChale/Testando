'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const STATUS_LABEL = {
  EM_EDICAO:             'Em Edição',
  AGUARDANDO_APROVACAO:  'Aguardando Aprovação',
  REPROVADO:             'Reprovado',
  APROVADO:              'Aprovado',
  PUBLICADO:             'Publicado',
};

const STATUS_COLOR = {
  EM_EDICAO:             'bg-gray-100 text-gray-700',
  AGUARDANDO_APROVACAO:  'bg-yellow-100 text-yellow-800',
  REPROVADO:             'bg-red-100 text-red-800',
  APROVADO:              'bg-green-100 text-green-800',
  PUBLICADO:             'bg-blue-100 text-blue-800',
};

export default function VideoPage() {
  const [user, setUser] = useState(null);
  const [video, setVideo] = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { router.replace('/'); return; }
    setUser(JSON.parse(userStr));
    loadVideo();
  }, [id, router]);

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
    setError('');
    setActionLoading(true);
    try {
      const updated = await api.approveVideo(id);
      setVideo(prev => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!comentario.trim()) {
      setError('Informe o motivo da reprovação antes de reprovar.');
      return;
    }
    if (!confirm('Confirmar reprovação?')) return;
    setError('');
    setActionLoading(true);
    try {
      const updated = await api.rejectVideo(id, comentario.trim());
      setVideo(prev => ({ ...prev, ...updated }));
      setComentario('');
      await loadVideo(); // recarrega feedbacks
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Marcar este vídeo como Publicado?')) return;
    setError('');
    setActionLoading(true);
    try {
      const updated = await api.publishVideo(id);
      setVideo(prev => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir este vídeo permanentemente?')) return;
    try {
      await api.deleteVideo(id);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  if (error && !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <Link href="/dashboard" className="text-blue-600 text-sm">← Voltar</Link>
        </div>
      </div>
    );
  }

  const canAct    = ['cliente', 'admin'].includes(user?.tipo) && video?.status === 'AGUARDANDO_APROVACAO';
  const canPublish = user?.tipo === 'admin' && video?.status === 'APROVADO';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
              ← Dashboard
            </Link>
            <h1 className="text-sm font-bold text-gray-900 truncate">{video?.titulo}</h1>
            {video?.status && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[video.status]}`}>
                {STATUS_LABEL[video.status]}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
            v{video?.versao} · {video?.cliente_nome}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Player */}
        <div className="bg-black rounded-xl overflow-hidden aspect-video shadow-md">
          {video?.url ? (
            <video
              src={video.url}
              controls
              preload="metadata"
              className="w-full h-full"
            >
              Seu navegador não suporta o player de vídeo.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
              Arquivo removido do storage (vídeo aprovado há mais de 15 dias)
            </div>
          )}
        </div>

        {/* Ações de aprovação */}
        {(canAct || canPublish) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              {canPublish ? 'Ação do Admin' : 'Avaliação'}
            </h2>

            {canAct && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comentário{' '}
                    <span className="text-gray-400 font-normal">(obrigatório para reprovar)</span>
                  </label>
                  <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Descreva o que precisa ser ajustado..."
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Reprovar
                  </button>
                </div>
              </>
            )}

            {canPublish && (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                    {error}
                  </div>
                )}
                <button
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  Marcar como Publicado
                </button>
              </>
            )}
          </div>
        )}

        {/* Feedbacks */}
        {video?.feedbacks?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Histórico de Feedbacks</h2>
            <div className="space-y-3">
              {video.feedbacks.map(f => (
                <div key={f.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm text-gray-800">{f.comentario}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(f.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Informações</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <InfoItem label="Cliente"      value={video?.cliente_nome} />
            <InfoItem label="Editor"       value={video?.editor_nome || '—'} />
            <InfoItem label="Versão"       value={`v${video?.versao}`} />
            <InfoItem label="Status"       value={STATUS_LABEL[video?.status]} />
            <InfoItem label="Criado em"    value={new Date(video?.criado_em).toLocaleDateString('pt-BR')} />
            <InfoItem label="Atualizado"   value={new Date(video?.atualizado_em).toLocaleDateString('pt-BR')} />
          </dl>

          {user?.tipo === 'admin' && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Excluir vídeo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

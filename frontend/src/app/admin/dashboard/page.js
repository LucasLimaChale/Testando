'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const STATUS_LABEL = {
  LISTA:                'Lista',
  EM_EDICAO:            'Em Edição',
  AGUARDANDO_APROVACAO: 'Para Aprovação',
  REPROVADO:            'Reprovado',
  APROVADO:             'Aprovado',
  PUBLICADO:            'Publicado',
};

const STATUS_COLOR = {
  LISTA:                'bg-slate-100 text-slate-600',
  EM_EDICAO:            'bg-blue-100 text-blue-700',
  AGUARDANDO_APROVACAO: 'bg-amber-100 text-amber-700',
  REPROVADO:            'bg-red-100 text-red-700',
  APROVADO:             'bg-purple-100 text-purple-700',
  PUBLICADO:            'bg-emerald-100 text-emerald-700',
};

function fmtHoras(h) {
  if (h === null || h === undefined || isNaN(parseFloat(h))) return '—';
  const n = parseFloat(h);
  if (n < 1) return `${Math.round(n * 60)} min`;
  if (n < 24) return `${n.toFixed(1)} h`;
  return `${(n / 24).toFixed(1)} dias`;
}

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    slate:  'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// Mini bar chart sem biblioteca
function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => Number(d.total)), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-xs text-slate-500 font-medium">{d.total}</span>
          <div
            className="w-full rounded-t-md bg-indigo-500 transition-all"
            style={{ height: `${Math.max(4, (Number(d.total) / max) * 72)}px` }}
          />
          <span className="text-[10px] text-slate-400 leading-none">{d.semana}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    if (JSON.parse(u).tipo !== 'admin') { router.replace('/dashboard'); return; }
    api.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const totalVideos = stats?.totais?.reduce((s, t) => s + Number(t.total), 0) ?? 0;
  const totalPublicados = stats?.totais?.find(t => t.status === 'PUBLICADO')?.total ?? 0;
  const totalFila = Number(stats?.fila?.total_na_fila ?? 0);

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Desempenho dos editores e métricas do sistema</p>
          </div>
          <button
            onClick={() => { setLoading(true); api.getStats().then(setStats).finally(() => setLoading(false)); }}
            className="btn-ghost flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32 text-slate-400">Carregando...</div>
        ) : (
          <div className="px-6 py-6 max-w-6xl space-y-8">

            {/* Cards de totais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total de vídeos" value={totalVideos} color="slate" />
              <StatCard label="Publicados" value={totalPublicados} color="emerald" />
              <StatCard
                label="Em edição / fila"
                value={totalFila}
                sub={totalFila > 0 ? `Média ${fmtHoras(stats?.fila?.media_horas_fila)} parados` : 'Fila limpa'}
                color={totalFila > 5 ? 'red' : 'amber'}
              />
              <StatCard
                label="Urgentes"
                value={stats?.em_edicao?.filter(v => parseFloat(v.horas_na_fila) > 48).length ?? 0}
                sub="> 48h na fila"
                color="red"
              />
            </div>

            {/* Distribuição por status + gráfico semanal */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Status */}
              <div className="card p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Distribuição por Status</h2>
                <div className="space-y-2.5">
                  {stats?.totais?.map(t => {
                    const pct = totalVideos > 0 ? Math.round((Number(t.total) / totalVideos) * 100) : 0;
                    return (
                      <div key={t.status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABEL[t.status] || t.status}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{t.total} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico semanal */}
              <div className="card p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Vídeos criados por semana</h2>
                {stats?.semanal?.length ? (
                  <BarChart data={stats.semanal} />
                ) : (
                  <p className="text-slate-400 text-sm text-center py-8">Sem dados ainda</p>
                )}
              </div>
            </div>

            {/* Desempenho por editor */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Desempenho por Editor</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tempo de edição = criação do vídeo até saída da fase de edição
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Editor</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Concluídos</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reprovados</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Média edição</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mediana</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mais rápido</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mais lento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats?.editores?.map(e => {
                      const taxa = e.concluidos > 0
                        ? Math.round((Number(e.concluidos) / Number(e.total_videos)) * 100)
                        : 0;
                      return (
                        <tr key={e.editor_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <span className="text-indigo-600 text-xs font-bold">
                                  {e.editor_nome?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{e.editor_nome}</p>
                                {e.total_videos > 0 && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-16 bg-slate-100 rounded-full h-1">
                                      <div
                                        className="h-1 rounded-full bg-emerald-500"
                                        style={{ width: `${taxa}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-400">{taxa}% concluídos</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-slate-700">{e.total_videos}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-emerald-700">{e.concluidos}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {Number(e.reprovados) > 0
                              ? <span className="font-bold text-red-600">{e.reprovados}</span>
                              : <span className="text-slate-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-4 text-center font-semibold text-slate-700">
                            {fmtHoras(e.media_horas_edicao)}
                          </td>
                          <td className="px-4 py-4 text-center text-slate-600">
                            {fmtHoras(e.mediana_horas_edicao)}
                          </td>
                          <td className="px-4 py-4 text-center text-emerald-600 font-medium">
                            {fmtHoras(e.min_horas_edicao)}
                          </td>
                          <td className="px-4 py-4 text-center text-red-500 font-medium">
                            {fmtHoras(e.max_horas_edicao)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vídeos parados na fila */}
            {stats?.em_edicao?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">Vídeos aguardando edição</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Tempo que cada vídeo está parado desde a criação</p>
                  </div>
                  <span className="badge badge-gray">{stats.em_edicao.length} vídeo{stats.em_edicao.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vídeo</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Editor</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parado há</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.em_edicao.map(v => {
                        const urgente = parseFloat(v.horas_na_fila) > 48;
                        return (
                          <tr key={v.id} className={`hover:bg-slate-50/60 transition-colors ${urgente ? 'bg-red-50/30' : ''}`}>
                            <td className="px-5 py-3.5">
                              <a
                                href={`/videos/${v.id}`}
                                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline truncate block max-w-[200px]"
                              >
                                {v.titulo}
                              </a>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">
                              <p className="font-medium">{v.colaborador_nome || '—'}</p>
                              {v.empresa_nome && <p className="text-xs text-slate-400">{v.empresa_nome}</p>}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">{v.editor_nome || <span className="text-slate-300 italic">sem editor</span>}</td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[v.status] || 'bg-slate-100 text-slate-600'}`}>
                                {STATUS_LABEL[v.status]}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={`font-bold text-sm ${urgente ? 'text-red-600' : 'text-slate-700'}`}>
                                {fmtHoras(v.horas_na_fila)}
                              </span>
                              {urgente && (
                                <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">urgente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Nota explicativa */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-700 flex items-start gap-3">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold mb-0.5">Como interpretar os tempos</p>
                <p className="opacity-80">
                  O "tempo de edição" é calculado do momento em que o vídeo foi criado até a última atualização de status.
                  Para comparar editores com vídeos de durações diferentes, observe a <strong>mediana</strong> — ela é menos afetada por vídeos muito longos ou muito rápidos.
                  Um editor com média alta mas mediana baixa pode ter poucos projetos grandes que distorcem a média.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

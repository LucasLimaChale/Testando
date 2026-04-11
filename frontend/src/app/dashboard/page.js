'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const STATUS_LABEL = {
  EM_EDICAO:             'Em Edição',
  AGUARDANDO_APROVACAO:  'Aguardando',
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

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { router.replace('/'); return; }
    setUser(JSON.parse(userStr));
    loadVideos();
  }, [router]);

  async function loadVideos(status = '') {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const data = await api.getVideos(params);
      setVideos(data);
    } catch (err) {
      if (err.message.includes('401')) {
        localStorage.clear();
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(s) {
    setFilterStatus(s);
    loadVideos(s);
  }

  function handleLogout() {
    localStorage.clear();
    router.replace('/');
  }

  const counts = {
    AGUARDANDO_APROVACAO: videos.filter(v => v.status === 'AGUARDANDO_APROVACAO').length,
    REPROVADO:            videos.filter(v => v.status === 'REPROVADO').length,
    APROVADO:             videos.filter(v => v.status === 'APROVADO').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900">Aprovação de Vídeos</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.nome}{' '}
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                  {user.tipo}
                </span>
              </span>
            )}
            {['admin', 'editor'].includes(user?.tipo) && (
              <Link
                href="/videos/upload"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                + Upload
              </Link>
            )}
            {user?.tipo === 'admin' && (
              <>
                <Link href="/admin/clients" className="text-sm text-gray-500 hover:text-gray-800">Clientes</Link>
                <Link href="/admin/users"   className="text-sm text-gray-500 hover:text-gray-800">Usuários</Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats — só para admin e editor */}
        {user?.tipo !== 'cliente' && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Aguardando"
              value={counts.AGUARDANDO_APROVACAO}
              color="yellow"
              onClick={() => handleFilter(filterStatus === 'AGUARDANDO_APROVACAO' ? '' : 'AGUARDANDO_APROVACAO')}
              active={filterStatus === 'AGUARDANDO_APROVACAO'}
            />
            <StatCard
              label="Reprovados"
              value={counts.REPROVADO}
              color="red"
              onClick={() => handleFilter(filterStatus === 'REPROVADO' ? '' : 'REPROVADO')}
              active={filterStatus === 'REPROVADO'}
            />
            <StatCard
              label="Aprovados"
              value={counts.APROVADO}
              color="green"
              onClick={() => handleFilter(filterStatus === 'APROVADO' ? '' : 'APROVADO')}
              active={filterStatus === 'APROVADO'}
            />
          </div>
        )}

        {/* Filtro por status */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            {user?.tipo === 'cliente' ? 'Seus Vídeos' : 'Todos os Vídeos'}
            {filterStatus && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                — {STATUS_LABEL[filterStatus]}
              </span>
            )}
          </h2>
          {filterStatus && (
            <button
              onClick={() => handleFilter('')}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {/* Lista de vídeos */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {user?.tipo === 'cliente'
              ? 'Nenhum vídeo disponível para revisão.'
              : 'Nenhum vídeo encontrado.'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {videos.map(v => (
              <div
                key={v.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{v.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.cliente_nome}
                    {v.editor_nome ? ` · ${v.editor_nome}` : ''}
                    {' · '}v{v.versao}
                    {' · '}{new Date(v.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[v.status]}`}
                  >
                    {STATUS_LABEL[v.status]}
                  </span>
                  <Link
                    href={`/videos/${v.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, onClick, active }) {
  const base = {
    yellow: 'border-yellow-200 text-yellow-900',
    red:    'border-red-200   text-red-900',
    green:  'border-green-200 text-green-900',
  };
  const bg = {
    yellow: active ? 'bg-yellow-200' : 'bg-yellow-50 hover:bg-yellow-100',
    red:    active ? 'bg-red-200'    : 'bg-red-50    hover:bg-red-100',
    green:  active ? 'bg-green-200'  : 'bg-green-50  hover:bg-green-100',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors cursor-pointer w-full ${base[color]} ${bg[color]}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </button>
  );
}

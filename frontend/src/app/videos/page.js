'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const STATUS_META = {
  LISTA:               { label: 'Lista',             cls: 'badge-gray'   },
  EM_EDICAO:           { label: 'Em Edição',          cls: 'badge-blue'   },
  AGUARDANDO_APROVACAO:{ label: 'Para Aprovação',     cls: 'badge-yellow' },
  REPROVADO:           { label: 'Reprovado',          cls: 'badge-red'    },
  APROVADO:            { label: 'Pronto para Subir',  cls: 'badge-purple' },
  PUBLICADO:           { label: 'Finalizado',         cls: 'badge-green'  },
};

export default function VideosPage() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [sort, setSort] = useState('desc');
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    setUser(JSON.parse(u));
    load();
    api.getClients().then(setClients).catch(() => {});
  }, [router]);

  async function load(params = {}) {
    setLoading(true);
    try {
      const data = await api.getVideos(params);
      setVideos(data);
    } finally {
      setLoading(false);
    }
  }

  function handleFilter() {
    const p = {};
    if (filterStatus) p.status = filterStatus;
    if (filterClient) p.cliente_id = filterClient;
    if (search)       p.q = search;
    load(p);
  }

  useEffect(() => { handleFilter(); }, [filterStatus, filterClient]);

  function handleSearch(e) {
    e.preventDefault();
    handleFilter();
  }

  const sorted = [...videos].sort((a, b) => {
    const d = new Date(a.criado_em) - new Date(b.criado_em);
    return sort === 'asc' ? d : -d;
  });

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Vídeos</h1>
            <p className="text-sm text-slate-500 mt-0.5">{videos.length} vídeo{videos.length !== 1 ? 's' : ''} encontrado{videos.length !== 1 ? 's' : ''}</p>
          </div>
          {['admin', 'editor'].includes(user?.tipo) && (
            <Link href="/videos/upload" className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo Vídeo
            </Link>
          )}
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Filtros */}
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-9"
                  placeholder="Buscar por título..."
                />
              </div>
              <button type="submit" className="btn-primary px-4">Buscar</button>
            </form>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {['admin', 'editor'].includes(user?.tipo) && (
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="input w-auto min-w-[160px]"
              >
                <option value="">Todos os clientes</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setSort(s => s === 'asc' ? 'desc' : 'asc')}
              className="btn-ghost flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              {sort === 'desc' ? 'Mais novos' : 'Mais antigos'}
            </button>

            {(filterStatus || filterClient || search) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterClient(''); setSearch(''); load(); }}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Carregando...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400">Nenhum vídeo encontrado.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                    {['admin', 'editor'].includes(user?.tipo) && (
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    )}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Versão</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sorted.map(v => {
                    const sm = STATUS_META[v.status] || { label: v.status, cls: 'badge-gray' };
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-800 line-clamp-1">{v.titulo}</span>
                        </td>
                        {['admin', 'editor'].includes(user?.tipo) && (
                          <td className="px-5 py-3.5 text-slate-500">{v.cliente_nome}</td>
                        )}
                        <td className="px-5 py-3.5">
                          <span className={sm.cls}>{sm.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">v{v.versao}</td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                          {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/videos/${v.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const COLUMNS = [
  { id: 'LISTA',               label: 'Lista de Vídeos',    color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  { id: 'EM_EDICAO',           label: 'Em Edição',          color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'AGUARDANDO_APROVACAO',label: 'Para Aprovação',     color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'REPROVADO',           label: 'Reprovado',          color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  { id: 'APROVADO',            label: 'Pronto para Subir',  color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'PUBLICADO',           label: 'Finalizados',        color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [urgent, setUrgent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragCard, setDragCard] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!token || !u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    if (parsed.tipo === 'cliente') { router.replace('/videos'); return; }
    loadData(parsed);
  }, [router]);

  async function loadData(u) {
    setLoading(true);
    try {
      const [vids, urg] = await Promise.all([
        api.getVideos(),
        u?.tipo === 'admin' ? api.getUrgent() : Promise.resolve([]),
      ]);
      setVideos(vids);
      setUrgent(urg);
    } catch (err) {
      if (err.message.includes('401')) { localStorage.clear(); router.replace('/'); }
    } finally {
      setLoading(false);
    }
  }

  // ── Drag and Drop ────────────────────────────────────────────
  function handleDragStart(e, video) {
    setDragCard(video);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, colId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }

  function handleDragLeave() { setDragOverCol(null); }

  async function handleDrop(e, colId) {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragCard || dragCard.status === colId) { setDragCard(null); return; }

    // Optimistic update
    setVideos(prev =>
      prev.map(v => v.id === dragCard.id ? { ...v, status: colId } : v)
    );
    const prev = dragCard.status;
    setDragCard(null);

    try {
      await api.updateVideoStatus(dragCard.id, colId);
    } catch {
      // Revert on error
      setVideos(vids =>
        vids.map(v => v.id === dragCard.id ? { ...v, status: prev } : v)
      );
    }
  }

  // ── Group videos by column ───────────────────────────────────
  const grouped = {};
  COLUMNS.forEach(c => { grouped[c.id] = []; });
  videos.forEach(v => {
    if (grouped[v.status] !== undefined) grouped[v.status].push(v);
  });

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Banner urgência */}
        {user?.tipo === 'admin' && urgent.length > 0 && (
          <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">
                <strong>{urgent.length} vídeo{urgent.length > 1 ? 's' : ''}</strong> aprovado{urgent.length > 1 ? 's' : ''} há mais de 2 dias aguardando publicação.
              </span>
            </div>
            <Link href="/urgencia" className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors">
              Ver urgências →
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lista de Vídeos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Arraste os cards para mover entre etapas</p>
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

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8 px-4 pt-6">
            <div className="flex gap-4 min-w-max">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  cards={grouped[col.id] || []}
                  isDragOver={dragOverCol === col.id}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col.id)}
                  onDragStart={handleDragStart}
                  draggingId={dragCard?.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ col, cards, isDragOver, onDragOver, onDragLeave, onDrop, onDragStart, draggingId }) {
  return (
    <div
      style={{ width: 280 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div
        className={`rounded-2xl p-3 border-2 transition-all duration-150 ${
          isDragOver ? 'kanban-col-dragover' : 'border-transparent'
        }`}
        style={{ background: isDragOver ? undefined : col.bg }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              {col.label}
            </span>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: col.color }}
          >
            {cards.length}
          </span>
        </div>

        {/* Cards */}
        <div className="space-y-2 min-h-[80px]">
          {cards.map(v => (
            <KanbanCard
              key={v.id}
              video={v}
              colColor={col.color}
              isDragging={draggingId === v.id}
              onDragStart={onDragStart}
            />
          ))}
          {cards.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400">Nenhum vídeo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ video, colColor, isDragging, onDragStart }) {
  const router = useRouter();

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, video)}
      onClick={() => router.push(`/videos/${video.id}`)}
      className={`bg-white rounded-xl border border-slate-100 p-3.5 cursor-grab active:cursor-grabbing
                  hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group
                  ${isDragging ? 'kanban-card-dragging' : ''}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 flex-1">
          {video.titulo}
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0"
          style={{ background: colColor }}
        >
          v{video.versao}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-xs text-slate-500 truncate">{video.cliente_nome}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {new Date(video.criado_em).toLocaleDateString('pt-BR')}
        </span>
        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

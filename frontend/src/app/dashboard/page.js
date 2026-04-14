'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
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

// ── Afazeres (localStorage) ──────────────────────────────────
// Estrutura: { id, clientName, task, notes, done, images:[{url,name}], uploadToken }
function useTodos() {
  const [todos, setTodos]           = useState([]);
  const [open, setOpen]             = useState(false);
  const [clientName, setClientName] = useState('');
  const [task, setTask]             = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [creatingLinkId, setCreatingLinkId] = useState(null);
  const [copiedId, setCopiedId]     = useState(null);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [linkDraft, setLinkDraft]   = useState('');
  const [showUrlConfig, setShowUrlConfig] = useState(false);
  const [clientBaseUrl, setClientBaseUrlState] = useState('');
  const clientRef  = useRef(null);
  const fileInputRef   = useRef(null);
  const uploadTargetRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vf_todos') || '[]');
      setTodos(saved);
    } catch {}
    const savedUrl = localStorage.getItem('vf_client_url') || '';
    setClientBaseUrlState(savedUrl);
  }, []);

  function getBaseUrl() {
    const saved = localStorage.getItem('vf_client_url');
    if (saved?.trim()) return saved.trim().replace(/\/$/, '');
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  function saveClientBaseUrl(url) {
    const clean = url.trim().replace(/\/$/, '');
    setClientBaseUrlState(clean);
    localStorage.setItem('vf_client_url', clean);
  }

  function save(list) {
    setTodos(list);
    localStorage.setItem('vf_todos', JSON.stringify(list));
  }

  function add() {
    if (!clientName.trim() && !task.trim()) return;
    save([
      { id: Date.now(), clientName: clientName.trim(), task: task.trim(), notes: '', done: false, images: [], uploadToken: null },
      ...todos,
    ]);
    setClientName('');
    setTask('');
    clientRef.current?.focus();
  }

  function toggle(id) {
    save(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id) {
    save(todos.filter(t => t.id !== id));
  }

  function clearDone() {
    save(todos.filter(t => !t.done));
  }

  function removeImage(todoId, imgUrl) {
    save(todos.map(t => t.id === todoId
      ? { ...t, images: (t.images || []).filter(i => i.url !== imgUrl) }
      : t
    ));
  }

  function triggerImageUpload(todoId) {
    uploadTargetRef.current = todoId;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetRef.current) return;
    e.target.value = '';
    const todoId = uploadTargetRef.current;
    setUploadingId(todoId);
    try {
      const { url, name } = await api.uploadTodoImage(file);
      save(todos.map(t => t.id === todoId
        ? { ...t, images: [...(t.images || []), { url, name }] }
        : t
      ));
    } catch (err) {
      alert('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploadingId(null);
      uploadTargetRef.current = null;
    }
  }

  function updateNotes(todoId, notes) {
    save(todos.map(t => t.id === todoId ? { ...t, notes } : t));
  }

  async function generateLink(todoId) {
    const t = todos.find(x => x.id === todoId);
    if (!t) return;
    setCreatingLinkId(todoId);
    try {
      const label = [t.clientName, t.task].filter(Boolean).join(' — ');
      const req = await api.createUploadRequest(label || 'Envio de imagens');
      const token = req.token;
      const url = `${getBaseUrl()}/enviar/${token}`;
      save(todos.map(x => x.id === todoId ? { ...x, uploadToken: token } : x));
      setLinkDraft(url);
      setEditingLinkId(todoId);
    } catch (err) {
      alert('Erro ao gerar link: ' + err.message);
    } finally {
      setCreatingLinkId(null);
    }
  }

  function openLinkEditor(todoId, token) {
    const url = `${getBaseUrl()}/enviar/${token}`;
    setLinkDraft(url);
    setEditingLinkId(todoId);
  }

  function copyLinkDraft(todoId) {
    navigator.clipboard.writeText(linkDraft);
    setCopiedId(todoId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return {
    todos, open, setOpen,
    clientName, setClientName,
    task, setTask,
    clientRef, fileInputRef, uploadingId, creatingLinkId, copiedId,
    editingLinkId, linkDraft, setLinkDraft,
    showUrlConfig, setShowUrlConfig,
    clientBaseUrl, setClientBaseUrlState, saveClientBaseUrl,
    add, toggle, remove, clearDone,
    updateNotes, removeImage, triggerImageUpload, handleFileChange,
    generateLink, openLinkEditor, copyLinkDraft,
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [urgent, setUrgent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragCard, setDragCard] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const router = useRouter();
  // ── Adicionar vídeo rápido (só nome) ────────────────────────
  const [addingVideo, setAddingVideo]     = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [empresas, setEmpresas]           = useState([]);
  const [colaboradores, setColabs]        = useState([]);
  const [newEmpresaId, setNewEmpresaId]   = useState('');
  const [newColabId, setNewColabId]       = useState('');
  const [savingVideo, setSavingVideo]     = useState(false);

  // ── Modal upload ao arrastar para APROVAÇÃO ──────────────────
  const [uploadModal, setUploadModal]     = useState(null); // { videoId, prevStatus }
  const [uploadFile, setUploadFile]       = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading]         = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!token || !u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    setUser(parsed);
    if (parsed.tipo === 'cliente') { router.replace('/videos'); return; }
    loadData(parsed);
    api.getEmpresas().then(setEmpresas).catch(() => {});
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

    // Se arrastou para PARA APROVAÇÃO e não tem vídeo ainda, pede upload
    if (colId === 'AGUARDANDO_APROVACAO' && !dragCard.url) {
      setUploadModal({ videoId: dragCard.id, prevStatus: dragCard.status });
      setDragCard(null);
      return;
    }

    // Optimistic update
    setVideos(prev =>
      prev.map(v => v.id === dragCard.id ? { ...v, status: colId } : v)
    );
    const prev = dragCard.status;
    setDragCard(null);

    try {
      await api.updateVideoStatus(dragCard.id, colId);
    } catch {
      setVideos(vids =>
        vids.map(v => v.id === dragCard.id ? { ...v, status: prev } : v)
      );
    }
  }

  // ── Criar vídeo rápido (só nome + colaborador) ───────────────
  async function handleEmpresaChange(id) {
    setNewEmpresaId(id);
    setNewColabId('');
    setColabs([]);
    if (!id) return;
    try {
      const data = await api.getColaboradores(id);
      setColabs(data.filter(c => c.ativo));
    } catch {}
  }

  async function handleSaveQuickVideo(e) {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newColabId) return;
    setSavingVideo(true);
    try {
      const video = await api.createVideo({
        colaborador_id: newColabId,
        titulo: newVideoTitle.trim(),
        status: 'LISTA',
      });
      setVideos(prev => [video, ...prev]);
      setNewVideoTitle('');
      setNewEmpresaId('');
      setNewColabId('');
      setColabs([]);
      setAddingVideo(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingVideo(false);
    }
  }

  // ── Upload ao mover para PARA APROVAÇÃO ──────────────────────
  async function handleUploadAndMove() {
    if (!uploadFile || !uploadModal) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const { publicUrl, storagePath } = await api.uploadVideo(uploadFile, pct => {
        setUploadProgress(Math.round(pct * 0.85));
      });
      setUploadProgress(90);
      // Atualiza url + status no backend
      await api.request(`/videos/${uploadModal.videoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ url: publicUrl, storage_path: storagePath }),
      }).catch(() => {});
      await api.updateVideoStatus(uploadModal.videoId, 'AGUARDANDO_APROVACAO');
      setUploadProgress(100);
      setVideos(prev => prev.map(v =>
        v.id === uploadModal.videoId
          ? { ...v, url: publicUrl, storage_path: storagePath, status: 'AGUARDANDO_APROVACAO' }
          : v
      ));
      setUploadModal(null);
      setUploadFile(null);
      setUploadProgress(0);
    } catch (err) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function cancelUploadModal() {
    setUploadModal(null);
    setUploadFile(null);
    setUploadProgress(0);
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

        {/* Afazeres removido — agora em /admin/afazeres */}
        {false && (
          <>
            <button
              onClick={() => todo.setOpen(o => !o)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-3 rounded-2xl shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Afazeres
              {todo.todos.filter(t => !t.done).length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                  {todo.todos.filter(t => !t.done).length}
                </span>
              )}
            </button>

            {/* Input oculto para upload de imagem */}
            <input
              ref={todo.fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={todo.handleFileChange}
            />

            {/* Painel Afazeres */}
            {todo.open && (
              <div className="fixed bottom-20 right-6 z-40 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden" style={{ maxHeight: '80vh', width: '26rem' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">Afazeres</span>
                    {todo.todos.filter(t => !t.done).length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {todo.todos.filter(t => !t.done).length} pendente{todo.todos.filter(t => !t.done).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {todo.todos.some(t => t.done) && (
                      <button onClick={todo.clearDone} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Limpar feitos</button>
                    )}
                    {/* Botão config URL */}
                    <button
                      onClick={() => todo.setShowUrlConfig(v => !v)}
                      title="Configurar URL dos links"
                      className={`transition-colors ${todo.showUrlConfig ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button onClick={() => todo.setOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Config URL base dos links */}
                {todo.showUrlConfig && (
                  <div className="px-4 py-3 border-b border-slate-100 bg-amber-50 shrink-0">
                    <p className="text-xs font-semibold text-amber-700 mb-1.5">URL base dos links para clientes</p>
                    <div className="flex gap-2">
                      <input
                        value={todo.clientBaseUrl}
                        onChange={e => todo.setClientBaseUrlState(e.target.value)}
                        placeholder="http://limasmidiascrm.com.br"
                        className="flex-1 text-xs border border-amber-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <button
                        onClick={() => { todo.saveClientBaseUrl(todo.clientBaseUrl); todo.setShowUrlConfig(false); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Exemplo: <span className="font-mono">http://limasmidiascrm.com.br</span></p>
                  </div>
                )}

                {/* Formulário novo afazer */}
                <div className="px-4 py-3 border-b border-slate-100 shrink-0 space-y-2">
                  <input
                    ref={todo.clientRef}
                    value={todo.clientName}
                    onChange={e => todo.setClientName(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    placeholder="Nome do cliente"
                  />
                  <div className="flex gap-2">
                    <input
                      value={todo.task}
                      onChange={e => todo.setTask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && todo.add()}
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      placeholder="O que precisa fazer? (Enter)"
                    />
                    <button
                      onClick={todo.add}
                      disabled={!todo.clientName.trim() && !todo.task.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl px-3 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Lista de afazeres */}
                <div className="overflow-y-auto flex-1">
                  {todo.todos.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Nenhum afazer ainda.</p>
                  )}
                  {todo.todos.map(t => (
                    <div key={t.id} className={`px-4 py-3 border-b border-slate-50 transition-colors ${t.done ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50'}`}>

                      {/* Linha principal: checkbox + info + delete */}
                      <div className="flex items-start gap-2.5">
                        <button onClick={() => todo.toggle(t.id)} className="mt-0.5 shrink-0">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-400'}`}>
                            {t.done && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          {t.clientName && (
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${t.done ? 'text-slate-400' : 'text-indigo-600'}`}>{t.clientName}</p>
                          )}
                          {t.task && (
                            <p className={`text-sm leading-snug ${t.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.task}</p>
                          )}
                        </div>
                        <button onClick={() => todo.remove(t.id)} className="text-slate-200 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {!t.done && (
                        <div className="ml-6 mt-2.5 space-y-2">

                          {/* Observações do admin */}
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">Minhas observações</span>
                            <textarea
                              value={t.notes || ''}
                              onChange={e => todo.updateNotes(t.id, e.target.value)}
                              placeholder="Anotações, referências, detalhes..."
                              rows={2}
                              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
                            />
                          </div>

                          {/* Minhas imagens (para usar no FB Ads) */}
                          <div className="pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-slate-500">Minhas imagens</span>
                              <button
                                onClick={() => todo.triggerImageUpload(t.id)}
                                disabled={todo.uploadingId === t.id}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors disabled:opacity-40"
                              >
                                {todo.uploadingId === t.id ? (
                                  <><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Enviando...</>
                                ) : (
                                  <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Adicionar</>
                                )}
                              </button>
                            </div>
                            {(t.images || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(t.images || []).map((img, idx) => (
                                  <div key={idx} className="relative group/img">
                                    <a href={img.url} target="_blank" rel="noreferrer">
                                      <img src={img.url} alt={img.name} className="w-14 h-14 object-cover rounded-lg border border-slate-100 hover:opacity-80 transition-opacity" />
                                    </a>
                                    <button
                                      onClick={() => todo.removeImage(t.id, img.url)}
                                      className="absolute -top-1 -right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center transition-opacity"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-300 italic">Nenhuma imagem adicionada</p>
                            )}
                          </div>

                          {/* Link para cliente enviar imagem */}
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-xs font-medium text-slate-500 block mb-1.5">Link para o cliente enviar imagens</span>
                            {t.uploadToken ? (
                              todo.editingLinkId === t.id ? (
                                /* Campo editável — troque localhost pelo IP antes de copiar */
                                <div className="space-y-1.5">
                                  <p className="text-xs text-amber-600 font-medium">Troque "localhost" pelo seu IP se for enviar fora da rede local:</p>
                                  <input
                                    value={todo.linkDraft}
                                    onChange={e => todo.setLinkDraft(e.target.value)}
                                    className="w-full text-xs border border-indigo-300 rounded-xl px-2.5 py-2 bg-indigo-50 outline-none focus:ring-2 focus:ring-indigo-300"
                                  />
                                  <button
                                    onClick={() => todo.copyLinkDraft(t.id)}
                                    className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors ${todo.copiedId === t.id ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                  >
                                    {todo.copiedId === t.id ? (
                                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Copiado!</>
                                    ) : (
                                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar link</>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => todo.openLinkEditor(t.id, t.uploadToken)}
                                  className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                  Ver / copiar link do cliente
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => todo.generateLink(t.id)}
                                disabled={todo.creatingLinkId === t.id}
                                className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors disabled:opacity-40"
                              >
                                {todo.creatingLinkId === t.id ? (
                                  <><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Gerando...</>
                                ) : (
                                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Gerar link para cliente</>
                                )}
                              </button>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

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
                  canAdd={col.id === 'LISTA' && ['admin','editor'].includes(user?.tipo)}
                  addingVideo={col.id === 'LISTA' ? addingVideo : false}
                  setAddingVideo={setAddingVideo}
                  newVideoTitle={newVideoTitle}
                  setNewVideoTitle={setNewVideoTitle}
                  empresas={empresas}
                  colaboradores={colaboradores}
                  newEmpresaId={newEmpresaId}
                  newColabId={newColabId}
                  onEmpresaChange={handleEmpresaChange}
                  setNewColabId={setNewColabId}
                  onSaveVideo={handleSaveQuickVideo}
                  savingVideo={savingVideo}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal upload ao mover para PARA APROVAÇÃO */}
        {uploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Upload do Vídeo</h2>
              <p className="text-sm text-slate-500 mb-4">Para mover para "Para Aprovação", faça o upload do arquivo de vídeo.</p>

              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) setUploadFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('upload-modal-input').click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer mb-4"
              >
                <input
                  id="upload-modal-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files[0] || null)}
                />
                {uploadFile ? (
                  <>
                    <p className="font-semibold text-slate-800 text-sm">{uploadFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(uploadFile.size/1024/1024).toFixed(1)} MB — clique para trocar</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 text-sm font-medium">Arraste o vídeo ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — até 2 GB</p>
                  </>
                )}
              </div>

              {uploading && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Enviando...</span>
                    <span className="font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={cancelUploadModal}
                  disabled={uploading}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadAndMove}
                  disabled={!uploadFile || uploading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {uploading ? 'Enviando...' : 'Fazer Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* AfazeresDashboard removido — agora em /admin/afazeres */
function _unused_AfazeresDashboard({ user }) {
  const [tarefas, setTarefas] = useState([]);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.getTarefas().then(setTarefas).catch(() => {});
  }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setAdding(true);
    try {
      const nova = await api.createTarefa(novoTitulo.trim());
      setTarefas(prev => [nova, ...prev]);
      setNovoTitulo('');
      inputRef.current?.focus();
    } catch {}
    setAdding(false);
  }

  async function handleToggle(id, done) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    try {
      await api.toggleTarefa(id, done);
    } catch {
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
    }
  }

  async function handleDelete(id) {
    setTarefas(prev => prev.filter(t => t.id !== id));
    try { await api.deleteTarefa(id); } catch {}
  }

  const pendentes = tarefas.filter(t => !t.done);
  const feitas    = tarefas.filter(t => t.done);

  return (
    <div className="mx-4 mt-4 mb-2 border border-slate-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-sm font-semibold text-slate-700">AFAZERES</span>
          {pendentes.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendentes.length}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-4">
          {/* Form adicionar */}
          <form onSubmit={handleAdd} className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="submit"
              disabled={adding || !novoTitulo.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {adding ? '...' : 'Adicionar'}
            </button>
          </form>

          {/* Lista pendentes */}
          {pendentes.length === 0 && feitas.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Nenhuma tarefa ainda</p>
          )}
          <div className="space-y-1">
            {pendentes.map(t => (
              <TarefaRow
                key={t.id}
                tarefa={t}
                user={user}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Feitas (colapsado) */}
          {feitas.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600 mb-1">
                {feitas.length} concluída{feitas.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-1">
                {feitas.map(t => (
                  <TarefaRow
                    key={t.id}
                    tarefa={t}
                    user={user}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function _unused_TarefaRow({ tarefa, user, onToggle, onDelete }) {
  const canDelete = user?.tipo === 'admin' || tarefa.user_id === user?.id;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg group ${tarefa.done ? 'opacity-50' : 'hover:bg-slate-50'}`}>
      <input
        type="checkbox"
        checked={tarefa.done}
        onChange={() => onToggle(tarefa.id, !tarefa.done)}
        className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
      />
      <span className={`flex-1 text-sm ${tarefa.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
        {tarefa.titulo}
      </span>
      {tarefa.criado_por && (
        <span className="text-xs text-slate-400 shrink-0">{tarefa.criado_por}</span>
      )}
      {canDelete && (
        <button
          onClick={() => onDelete(tarefa.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function KanbanColumn({
  col, cards, isDragOver, onDragOver, onDragLeave, onDrop, onDragStart, draggingId,
  canAdd, addingVideo, setAddingVideo,
  newVideoTitle, setNewVideoTitle,
  empresas, colaboradores, newEmpresaId, newColabId,
  onEmpresaChange, setNewColabId,
  onSaveVideo, savingVideo,
}) {
  return (
    <div
      style={{ width: 280 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
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
          <div className="flex items-center gap-1">
            {canAdd && (
              <button
                onClick={() => setAddingVideo(v => !v)}
                title="Adicionar vídeo"
                className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: col.color }}
            >
              {cards.length}
            </span>
          </div>
        </div>

        {/* Formulário rápido (só na coluna LISTA) */}
        {canAdd && addingVideo && (
          <form onSubmit={onSaveVideo} className="mb-3 bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <input
              autoFocus
              value={newVideoTitle}
              onChange={e => setNewVideoTitle(e.target.value)}
              placeholder="Nome do vídeo..."
              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
            <select
              value={newEmpresaId}
              onChange={e => onEmpresaChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            >
              <option value="">Empresa...</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            {newEmpresaId && (
              <select
                value={newColabId}
                onChange={e => setNewColabId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              >
                <option value="">Colaborador...</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddingVideo(false)}
                className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingVideo || !newVideoTitle.trim() || !newColabId}
                className="flex-1 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-40 hover:bg-indigo-700"
              >
                {savingVideo ? '...' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}

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
          {cards.length === 0 && !addingVideo && (
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

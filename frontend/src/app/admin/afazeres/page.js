'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const COLS = [
  { id: 'NOVO',          label: 'Novo',        color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'EM_ANDAMENTO',  label: 'Em andamento', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'CONCLUIDO',     label: 'Concluído',    color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
];

export default function AfazeresPage() {
  const [tab, setTab]             = useState('tarefas');
  const [demandas, setDemandas]   = useState([]);
  const [links, setLinks]         = useState([]);
  const [tarefas, setTarefas]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newLabel, setNewLabel]   = useState('');
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState(null);
  const [expanded, setExpanded]   = useState(null);
  const [clientUrl, setClientUrl] = useState('');
  const [dragging, setDragging]   = useState(null);
  const [dragOver, setDragOver]   = useState(null);
  const [newTarefa, setNewTarefa] = useState('');
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [expandedTarefa, setExpandedTarefa] = useState(null);
  const [savingDesc, setSavingDesc] = useState(null);
  // Timer
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotal, setTimerTotal] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState('25');
  const timerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u || JSON.parse(u).tipo !== 'admin') { router.replace('/'); return; }
    const saved = localStorage.getItem('vf_client_url') || '';
    setClientUrl(saved || `http://187.127.3.19`);
    loadAll();
  }, [router]);

  async function loadAll() {
    setLoading(true);
    try {
      const [d, l, t] = await Promise.all([api.getDemandas(), api.getDemandaLinks(), api.getTarefas()]);
      setDemandas(d);
      setLinks(l);
      setTarefas(t);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function addTarefa() {
    if (!newTarefa.trim()) return;
    setAddingTarefa(true);
    try {
      const t = await api.createTarefa(newTarefa.trim());
      setTarefas(prev => [t, ...prev]);
      setNewTarefa('');
    } catch (err) { alert(err.message); }
    finally { setAddingTarefa(false); }
  }

  async function toggleTarefa(id, done) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, done } : t));
    await api.toggleTarefa(id, done);
    // reordenar: pendentes primeiro
    setTarefas(prev => [...prev.filter(t => !t.done), ...prev.filter(t => t.done)]);
  }

  async function deleteTarefa(id) {
    await api.deleteTarefa(id);
    setTarefas(prev => prev.filter(t => t.id !== id));
  }

  async function saveDescricao(id, descricao) {
    setSavingDesc(id);
    try {
      await api.updateTarefaDescricao(id, descricao);
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, descricao } : t));
    } catch {}
    finally { setSavingDesc(null); }
  }

  // Timer logic — usa ref para o tempo restante e só atualiza state 1x/seg
  const timerRemaining = useRef(25 * 60);

  useEffect(() => {
    if (!timerRunning) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      timerRemaining.current -= 1;
      if (timerRemaining.current <= 0) {
        timerRemaining.current = 0;
        clearInterval(timerRef.current);
        setTimerRunning(false);
        setTimerMinutes(0);
        setTimerSeconds(0);
        setTimeout(() => alert('⏰ Tempo esgotado!'), 100);
      } else {
        setTimerMinutes(Math.floor(timerRemaining.current / 60));
        setTimerSeconds(timerRemaining.current % 60);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  function timerStart() {
    if (timerRemaining.current <= 0) return;
    setTimerRunning(true);
  }
  function timerPause() { setTimerRunning(false); }
  function timerReset() {
    setTimerRunning(false);
    const mins = parseInt(timerInput) || 25;
    timerRemaining.current = mins * 60;
    setTimerMinutes(mins);
    setTimerSeconds(0);
    setTimerTotal(mins * 60);
  }
  function timerSetCustom(val) {
    setTimerInput(val);
    const mins = parseInt(val) || 0;
    if (!timerRunning) {
      timerRemaining.current = mins * 60;
      setTimerMinutes(mins);
      setTimerSeconds(0);
      setTimerTotal(mins * 60);
    }
  }

  const timerElapsed = timerTotal - (timerMinutes * 60 + timerSeconds);
  const timerProgress = timerTotal > 0 ? timerElapsed / timerTotal : 0;
  const timerCircumference = 2 * Math.PI * 54;
  const timerDash = timerCircumference * (1 - timerProgress);

  async function createLink() {
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const l = await api.createDemandaLink(newLabel.trim());
      setLinks(prev => [l, ...prev]);
      setNewLabel('');
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  async function deleteLink(id) {
    if (!confirm('Remover este link e todas as demandas vinculadas?')) return;
    await api.deleteDemandaLink(id);
    setLinks(prev => prev.filter(l => l.id !== id));
    setDemandas(prev => prev.filter(d => d.link_id !== id));
  }

  function copyLink(token, id) {
    const base = (clientUrl || window.location.origin).replace(/\/$/, '');
    navigator.clipboard.writeText(`${base}/corretor/${token}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function changeStatus(id, status) {
    setDemandas(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    await api.updateDemandaStatus(id, status);
  }

  async function deleteDemanda(id) {
    await api.deleteDemanda(id);
    setDemandas(prev => prev.filter(d => d.id !== id));
  }

  function handleDragStart(d) { setDragging(d); }

  async function handleDrop(colId) {
    if (!dragging || dragging.status === colId) { setDragging(null); setDragOver(null); return; }
    await changeStatus(dragging.id, colId);
    setDragging(null); setDragOver(null);
  }

  const grouped = {};
  COLS.forEach(c => { grouped[c.id] = []; });
  demandas.forEach(d => { if (grouped[d.status]) grouped[d.status].push(d); });

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Afazeres</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gerencie demandas de corretores e imobiliárias</p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[['tarefas','Tarefas'],['kanban','Kanban'],['links','Links']].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===v ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >{l}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Carregando...</div>
        ) : tab === 'tarefas' ? (

          /* ─── TAREFAS PESSOAIS ───────────────────────────────────── */
          <div className="p-6 max-w-xl">

            {/* Timer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-6">
                {/* Círculo SVG */}
                <div className="relative shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke={timerMinutes === 0 && timerSeconds <= 10 && timerRunning ? '#ef4444' : '#6366f1'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={timerCircumference}
                      strokeDashoffset={timerDash}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold tabular-nums ${timerMinutes === 0 && timerSeconds <= 10 && timerRunning ? 'text-red-500' : 'text-slate-800'}`}>
                      {String(timerMinutes).padStart(2,'0')}:{String(timerSeconds).padStart(2,'0')}
                    </span>
                  </div>
                </div>

                {/* Controles */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Duração (minutos)</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[5,10,15,25,30,45,60].map(m => (
                        <button key={m} onClick={() => timerSetCustom(String(m))}
                          disabled={timerRunning}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${timerInput===String(m) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-40`}
                        >{m}</button>
                      ))}
                      <input
                        type="number" min="1" max="120"
                        value={timerInput}
                        onChange={e => timerSetCustom(e.target.value)}
                        disabled={timerRunning}
                        className="w-14 px-2 py-1 rounded-lg text-xs border border-slate-200 text-center outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-40"
                        placeholder="min"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!timerRunning ? (
                      <button onClick={timerStart}
                        disabled={timerMinutes === 0 && timerSeconds === 0}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Iniciar
                      </button>
                    ) : (
                      <button onClick={timerPause}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        Pausar
                      </button>
                    )}
                    <button onClick={timerReset}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Adicionar */}
            <div className="flex gap-2 mb-6">
              <input
                value={newTarefa}
                onChange={e => setNewTarefa(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTarefa()}
                placeholder="Nova tarefa..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
              />
              <button
                onClick={addTarefa}
                disabled={addingTarefa || !newTarefa.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                {addingTarefa ? '...' : '+ Adicionar'}
              </button>
            </div>

            {/* Contadores */}
            {tarefas.length > 0 && (
              <div className="flex gap-4 mb-4">
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-700">{tarefas.filter(t => !t.done).length}</strong> pendente{tarefas.filter(t=>!t.done).length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-slate-400">
                  <strong className="text-slate-500">{tarefas.filter(t => t.done).length}</strong> concluída{tarefas.filter(t=>t.done).length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Lista */}
            {tarefas.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">Nenhuma tarefa. Adicione algo acima.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tarefas.map(t => (
                  <div key={t.id} className={`bg-white rounded-xl border transition-all ${t.done ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm'}`}>
                    {/* Linha principal */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleTarefa(t.id, !t.done)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-400'}`}
                      >
                        {t.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`flex-1 text-sm font-medium ${t.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.titulo}</span>
                      {/* Expandir observação */}
                      <button
                        onClick={() => setExpandedTarefa(expandedTarefa === t.id ? null : t.id)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors shrink-0 ${expandedTarefa === t.id ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-50'}`}
                        title="Observações"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => deleteTarefa(t.id)}
                        className="text-slate-200 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    {/* Campo de observação */}
                    {expandedTarefa === t.id && (
                      <div className="px-4 pb-3 border-t border-slate-50 pt-2">
                        <textarea
                          defaultValue={t.descricao || ''}
                          onBlur={e => saveDescricao(t.id, e.target.value)}
                          placeholder="Escreva observações, detalhes, links..."
                          rows={3}
                          className="w-full text-sm text-slate-600 placeholder-slate-300 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none bg-slate-50"
                        />
                        {savingDesc === t.id && <p className="text-xs text-slate-400 mt-1">Salvando...</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : tab === 'kanban' ? (

          /* ─── KANBAN ─────────────────────────────────────────── */
          <div className="overflow-x-auto pb-8 px-4 pt-6">
            {demandas.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm">Nenhuma demanda ainda. Crie um link e envie para corretores.</p>
                <button onClick={() => setTab('links')} className="mt-3 text-sm text-indigo-600 hover:underline">Criar link →</button>
              </div>
            ) : (
              <div className="flex gap-4 min-w-max">
                {COLS.map(col => (
                  <div
                    key={col.id}
                    style={{ width: 300 }}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(col.id)}
                    className={`rounded-2xl border-2 transition-colors ${dragOver === col.id ? 'border-indigo-300 bg-indigo-50' : 'border-transparent'}`}
                  >
                    {/* Col header */}
                    <div className="flex items-center justify-between px-3 py-3" style={{ background: col.bg, borderRadius: '1rem 1rem 0 0', borderBottom: `2px solid ${col.border}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                        <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full">{grouped[col.id].length}</span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[100px]">
                      {grouped[col.id].map(d => (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={() => handleDragStart(d)}
                          className="bg-white rounded-xl border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <div className="px-3 py-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide truncate">{d.link_label}</p>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5">{d.sender_name}</p>
                                {d.message && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.message}</p>}
                              </div>
                              <button onClick={() => deleteDemanda(d.id)} className="text-slate-200 hover:text-red-500 transition-colors shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>

                            {/* Arquivos */}
                            {(d.files || []).length > 0 && (
                              <div className="mt-2">
                                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                                  {(d.files||[]).length} arquivo{d.files.length>1?'s':''} {expanded===d.id ? '▲' : '▼'}
                                </button>
                                {expanded === d.id && (
                                  <div className="mt-2 space-y-1.5">
                                    {(d.files||[]).map(f => (
                                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 hover:bg-indigo-50 transition-colors group"
                                      >
                                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${f.file_type==='video' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                          {f.file_type==='video' ? (
                                            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /></svg>
                                          ) : (
                                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg>
                                          )}
                                        </div>
                                        <span className="text-xs text-slate-600 truncate group-hover:text-indigo-700">{f.original_name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Mover */}
                            <div className="mt-2 flex gap-1">
                              {COLS.filter(c => c.id !== d.status).map(c => (
                                <button key={c.id} onClick={() => changeStatus(d.id, c.id)}
                                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                                  style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                                >
                                  → {c.label}
                                </button>
                              ))}
                            </div>

                            <p className="text-xs text-slate-300 mt-2">{new Date(d.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          /* ─── LINKS ──────────────────────────────────────────── */
          <div className="p-6 max-w-2xl">

            {/* URL base */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">URL base dos links</p>
              <div className="flex gap-2">
                <input
                  value={clientUrl}
                  onChange={e => setClientUrl(e.target.value)}
                  className="flex-1 text-sm border border-amber-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="http://limasmidiascrm.com.br"
                />
                <button
                  onClick={() => { localStorage.setItem('vf_client_url', clientUrl.trim().replace(/\/$/,'')); alert('Salvo!'); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >Salvar</button>
              </div>
            </div>

            {/* Criar link */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">Novo link para corretor / imobiliária</p>
              <div className="flex gap-2">
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createLink()}
                  placeholder="Ex: Imobiliária Alpha — Março 2026"
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
                <button
                  onClick={createLink}
                  disabled={creating || !newLabel.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                >
                  {creating ? 'Criando...' : '+ Criar'}
                </button>
              </div>
            </div>

            {/* Lista */}
            {links.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Nenhum link criado ainda.</p>
            ) : (
              <div className="space-y-3">
                {links.map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{l.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(l.created_at).toLocaleDateString('pt-BR')}
                        {' · '}
                        <span className="text-indigo-600 font-medium">{l.total_demandas} demanda{l.total_demandas !== 1 ? 's' : ''}</span>
                        {l.novas > 0 && <span className="ml-1 bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full text-xs">{l.novas} nova{l.novas>1?'s':''}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => copyLink(l.token, l.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${copied===l.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'}`}
                    >
                      {copied===l.id ? (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Copiado!</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar link</>
                      )}
                    </button>
                    <button onClick={() => deleteLink(l.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

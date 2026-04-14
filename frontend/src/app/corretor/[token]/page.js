'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CorretorPage() {
  const { token } = useParams();
  const [info, setInfo]         = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName]         = useState('');
  const [message, setMessage]   = useState('');
  const [files, setFiles]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const apiBase = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

  useEffect(() => {
    fetch(`${apiBase}/demandas/public/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [token, apiBase]);

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...valid.filter(f => !existing.has(f.name + f.size))];
    });
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Por favor, informe seu nome.'); return; }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('sender_name', name.trim());
      fd.append('message', message.trim());
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`${apiBase}/demandas/public/${token}`, { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erro ao enviar'); }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Link não encontrado</h1>
        <p className="text-slate-500 text-sm">Este link pode ter expirado ou sido removido.</p>
      </div>
    </div>
  );

  if (!info) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Demanda enviada!</h1>
        <p className="text-slate-500 text-sm">Obrigado, <strong>{name}</strong>! Sua solicitação foi recebida.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">LIMAS CRM</p>
              <h1 className="text-lg font-bold">{info.label}</h1>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seu nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo ou imobiliária"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição da demanda</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Descreva o que você precisa, detalhes do imóvel, formato desejado..."
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Imagens e vídeos</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
            >
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M21 12V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75v10.5" /></svg>
              <p className="text-sm text-slate-500">Clique ou arraste arquivos aqui</p>
              <p className="text-xs text-slate-400 mt-1">Imagens (JPG, PNG) e vídeos (MP4, MOV) até 500MB</p>
              <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => addFiles(e.target.files)} />
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.type.startsWith('video/') ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {f.type.startsWith('video/') ? (
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <span className="flex-1 text-sm text-slate-600 truncate">{f.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Enviar demanda</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EnviarPage() {
  const { token } = useParams();
  const [info, setInfo]       = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [files, setFiles]     = useState([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/uploads/public/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [token]);

  function handleFiles(newFiles) {
    const imgs = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...imgs.filter(f => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      if (message.trim()) fd.append('message', message.trim());
      const res = await fetch(`${API_URL}/uploads/public/${token}`, { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erro ao enviar');
      }
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
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
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
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Enviado com sucesso!</h1>
        <p className="text-slate-500 text-sm">{files.length} imagem{files.length > 1 ? 'ns' : ''} enviada{files.length > 1 ? 's' : ''} para <strong>{info.label}</strong>.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{info.label}</h1>
          <p className="text-sm text-slate-500 mt-1">Selecione ou arraste as imagens abaixo</p>
        </div>

        {/* Campo de mensagem */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Escreva uma observação, referência ou qualquer recado para a equipe... (opcional)"
          rows={3}
          className="w-full mb-4 text-sm border border-slate-200 rounded-2xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
        />

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-100'}`}
        >
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M21 12V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75v10.5" />
          </svg>
          <p className="text-sm text-slate-500">Clique ou arraste imagens aqui</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP, GIF até 30MB cada</p>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Preview */}
        {files.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                <button
                  onClick={e => { e.stopPropagation(); removeFile(i); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!files.length || uploading}
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Enviar {files.length > 0 ? `${files.length} imagem${files.length > 1 ? 'ns' : ''}` : 'imagens'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

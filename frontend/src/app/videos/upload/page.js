'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function UploadPage() {
  const [clients, setClients] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [createdVideo, setCreatedVideo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const user = JSON.parse(u);
    if (!['admin', 'editor'].includes(user.tipo)) { router.replace('/dashboard'); return; }
    api.getClients().then(setClients).catch(console.error);
  }, [router]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) setFile(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !titulo.trim() || !clienteId) {
      setError('Preencha todos os campos');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(10);

    try {
      // Upload via backend (sem CORS) com progresso real
      const { publicUrl, storagePath } = await api.uploadVideo(file, (pct) => {
        setProgress(Math.round(pct * 0.85)); // 0–85% = upload
      });
      setProgress(90);

      const video = await api.createVideo({
        cliente_id: clienteId,
        titulo: titulo.trim(),
        url: publicUrl,
        storage_path: storagePath,
        status: 'AGUARDANDO_APROVACAO',
      });
      setProgress(100);
      setCreatedVideo(video);
      setDone(true);
    } catch (err) {
      setError(err.message);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  function getWhatsAppLink() {
    const client = clients.find(c => c.id === clienteId);
    if (!client?.telefone) return null;
    const phone = client.telefone.replace(/\D/g, '');
    const appUrl = process.env.NEXT_PUBLIC_API_URL?.replace(':3001', ':3100') || 'http://localhost:3000';
    const link = `${appUrl}/videos/${createdVideo?.id}`;
    const msg = encodeURIComponent(
      `Olá ${client.nome}! Seu vídeo está pronto 🎬\n\nPor favor, acesse o link abaixo para visualizar e aprovar:\n\n${link}\n\nCaso precise de ajustes, você pode reprovar e comentar diretamente na plataforma.`
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  }

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upload de Vídeo</h1>
            <p className="text-sm text-slate-500">Envie um novo vídeo para aprovação do cliente</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          {done ? (
            <div className="card p-8 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Vídeo enviado!</h2>
              <p className="text-slate-500 text-sm mb-8">O vídeo está aguardando aprovação do cliente.</p>

              <div className="space-y-3">
                {getWhatsAppLink() ? (
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar para aprovação via WhatsApp
                  </a>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cliente sem telefone cadastrado. Cadastre o telefone para enviar via WhatsApp.
                  </div>
                )}

                {createdVideo && (
                  <Link href={`/videos/${createdVideo.id}`} className="btn-ghost w-full justify-center flex">
                    Ver detalhes do vídeo
                  </Link>
                )}
                <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 block text-center">
                  Voltar ao Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <form onSubmit={handleUpload} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Título do vídeo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="input"
                    placeholder="Ex: Vídeo Campanha Junho 2025"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome}{c.empresa ? ` — ${c.empresa}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Arquivo de vídeo <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer"
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file ? (
                      <>
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB — clique para trocar</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-slate-600 text-sm font-medium">Arraste o vídeo ou clique para selecionar</p>
                        <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI, MKV até 500 MB</p>
                      </>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Enviando para o storage...</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Fazer Upload
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

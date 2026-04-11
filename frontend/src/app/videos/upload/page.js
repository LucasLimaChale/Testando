'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { router.replace('/'); return; }
    const u = JSON.parse(userStr);
    if (!['admin', 'editor'].includes(u.tipo)) { router.replace('/dashboard'); return; }
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
      // 1. Obter URL assinada do backend
      const { signedUrl, storagePath, publicUrl } = await api.getUploadUrl(
        file.name,
        file.type
      );
      setProgress(30);

      // 2. Upload direto para o Supabase Storage (sem passar pelo backend)
      await api.uploadToStorage(signedUrl, file);
      setProgress(80);

      // 3. Registrar vídeo no banco
      await api.createVideo({
        cliente_id: clienteId,
        titulo: titulo.trim(),
        url: publicUrl,
        storage_path: storagePath,
      });
      setProgress(100);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err.message);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-base font-bold text-gray-900">Upload de Vídeo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {done ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4 text-green-500">✓</div>
              <p className="font-semibold text-gray-800">Vídeo enviado com sucesso!</p>
              <p className="text-sm text-gray-400 mt-1">Redirecionando...</p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título do vídeo
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Vídeo Campanha Junho 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arquivo de vídeo
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
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
                      <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(file.size / 1024 / 1024).toFixed(1)} MB — clique para trocar
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm">
                        Arraste o vídeo aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, MKV...</p>
                    </>
                  )}
                </div>
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Enviando para o storage...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {uploading ? 'Enviando...' : 'Fazer Upload'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

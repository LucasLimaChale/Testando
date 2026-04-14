'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const TABS = [
  { id: 'metricas',      label: 'Métricas' },
  { id: 'alertas',       label: 'Alertas' },
  { id: 'relatorios',    label: 'Relatórios' },
  { id: 'configuracoes', label: 'Configurações' },
];

const STATUS_COLOR = { ACTIVE: 'text-emerald-600', PAUSED: 'text-amber-500', ARCHIVED: 'text-slate-400' };
const STATUS_LABEL = { ACTIVE: 'Ativa', PAUSED: 'Pausada', ARCHIVED: 'Arquivada' };

function fmt(n, decimals = 2) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-slate-900' }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

// ─── Tab: Métricas ───────────────────────────────────────────────────────────

function MetricasTab({ connections }) {
  const [accountId, setAccountId] = useState('');
  const [since, setSince] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [until, setUntil] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connections.length) setAccountId(connections[0].ad_account_id);
  }, [connections]);

  async function load() {
    if (!accountId) return;
    setLoading(true); setError('');
    try {
      const d = await api.metaMetrics(accountId, since, until);
      setData(d);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (accountId) load(); }, [accountId]);

  if (!connections.length) return (
    <div className="card p-10 text-center text-slate-400">
      Nenhuma conta conectada. Configure em <strong>Configurações</strong>.
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Conta</label>
          <select className="input w-auto" value={accountId} onChange={e => setAccountId(e.target.value)}>
            {connections.map(c => (
              <option key={c.id} value={c.ad_account_id}>{c.account_name || c.ad_account_id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">De</label>
          <input type="date" className="input" value={since} onChange={e => setSince(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Até</label>
          <input type="date" className="input" value={until} onChange={e => setUntil(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} className="btn-primary px-5">
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {data && (
        <>
          {/* Saldo */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Saldo disponível</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">
                R$ {fmt(data.account.balance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">{data.account.name} · {data.account.currency}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard label="Investimento" value={`R$ ${fmt(data.summary.spend)}`} color="text-indigo-700" />
            <KpiCard label="Impressões"   value={parseInt(data.summary.impressions).toLocaleString('pt-BR')} />
            <KpiCard label="Cliques"      value={parseInt(data.summary.clicks).toLocaleString('pt-BR')} />
            <KpiCard label="CPM"          value={`R$ ${fmt(data.summary.cpm)}`} sub="por mil impressões" />
            <KpiCard label="Leads"        value={data.summary.leads} color="text-emerald-700" />
          </div>

          {/* Campanhas */}
          {data.campaigns.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Campanhas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Campanha', 'Status', 'Investido', 'Impressões', 'Cliques', 'CPC', 'Leads'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.campaigns.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate">{c.name}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold ${STATUS_COLOR[c.status] || 'text-slate-400'}`}>
                            {STATUS_LABEL[c.status] || c.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">R$ {fmt(c.spend)}</td>
                        <td className="px-5 py-3 text-slate-500">{parseInt(c.impressions).toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3 text-slate-500">{parseInt(c.clicks).toLocaleString('pt-BR')}</td>
                        <td className="px-5 py-3 text-slate-500">R$ {fmt(c.cpc)}</td>
                        <td className="px-5 py-3 font-semibold text-emerald-700">{c.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

function AlertasTab({ connections }) {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'saldo_minimo', ad_account_id: '', min_balance: '',
    message_template: 'O saldo da conta <CA> está em <SALDO>', whatsapp_phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setAlerts(await api.metaGetAlerts()); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (connections.length && !form.ad_account_id)
      setForm(f => ({ ...f, ad_account_id: connections[0].ad_account_id }));
  }, [connections]);

  async function save() {
    setSaving(true); setError('');
    try {
      await api.metaCreateAlert(form);
      setShowModal(false);
      setForm({ name: '', type: 'saldo_minimo', ad_account_id: connections[0]?.ad_account_id || '', min_balance: '', message_template: 'O saldo da conta <CA> está em <SALDO>', whatsapp_phone: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function toggle(alert) {
    try {
      const updated = await api.metaUpdateAlert(alert.id, { active: !alert.active });
      setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
    } catch {}
  }

  async function remove(id) {
    if (!confirm('Excluir este alerta?')) return;
    await api.metaDeleteAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{alerts.length} alerta(s)</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Criar alerta
        </button>
      </div>

      {!alerts.length && (
        <div className="card p-10 text-center text-slate-400">Nenhum alerta criado ainda.</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map(alert => {
          const conn = connections.find(c => c.ad_account_id === alert.ad_account_id);
          const balanceLow = alert.last_balance !== null && alert.last_balance <= alert.min_balance;
          return (
            <div key={alert.id} className={`card p-5 border-l-4 ${balanceLow ? 'border-l-red-500' : alert.active ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{alert.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{conn?.account_name || alert.ad_account_id}</p>
                </div>
                {alert.last_balance !== null && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ml-2 ${balanceLow ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    R$ {fmt(alert.last_balance)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Saldo mínimo: <strong>R$ {fmt(alert.min_balance)}</strong>
              </p>

              {alert.last_triggered_at && (
                <p className="text-xs text-amber-600 mb-3">
                  Último disparo: {new Date(alert.last_triggered_at).toLocaleString('pt-BR')}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Toggle value={alert.active} onChange={() => toggle(alert)} />
                <div className="flex gap-2">
                  <span className="text-xs text-slate-400">{alert.whatsapp_phone}</span>
                  <button onClick={() => remove(alert.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Criar alerta</h2>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Conta principal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Conta Meta Ads</label>
                <select className="input" value={form.ad_account_id} onChange={e => setForm(f => ({ ...f, ad_account_id: e.target.value }))}>
                  {connections.map(c => <option key={c.id} value={c.ad_account_id}>{c.account_name || c.ad_account_id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Saldo mínimo (R$)</label>
                <input className="input" type="number" min="0" step="0.01" value={form.min_balance} onChange={e => setForm(f => ({ ...f, min_balance: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mensagem</label>
                <textarea className="input resize-none" rows={3} value={form.message_template} onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))} />
                <p className="text-xs text-slate-400 mt-1">Variáveis: {'<CA>'} {'<SALDO>'} {'<TARGET>'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp (com DDI)</label>
                <input className="input" value={form.whatsapp_phone} onChange={e => setForm(f => ({ ...f, whatsapp_phone: e.target.value }))} placeholder="+55 11 99999-9999" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-ghost py-2.5">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary py-2.5">
                {saving ? 'Salvando...' : 'Criar alerta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Relatórios ──────────────────────────────────────────────────────────

function RelatoriosTab({ connections }) {
  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(null);
  const [form, setForm] = useState({
    name: '', ad_account_id: '', frequency: 'diario', period_days: '7', whatsapp_phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setReports(await api.metaGetReports()); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (connections.length && !form.ad_account_id)
      setForm(f => ({ ...f, ad_account_id: connections[0].ad_account_id }));
  }, [connections]);

  async function save() {
    setSaving(true); setError('');
    try {
      await api.metaCreateReport({ ...form, period_days: parseInt(form.period_days) });
      setShowModal(false);
      setForm({ name: '', ad_account_id: connections[0]?.ad_account_id || '', frequency: 'diario', period_days: '7', whatsapp_phone: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function sendNow(report) {
    setSending(report.id);
    try {
      await api.metaSendReport(report.id);
      alert('Relatório enviado!');
      load();
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setSending(null); }
  }

  async function toggle(report) {
    try {
      const updated = await api.metaUpdateReport(report.id, { active: !report.active });
      setReports(prev => prev.map(r => r.id === report.id ? updated : r));
    } catch {}
  }

  async function remove(id) {
    if (!confirm('Excluir este relatório?')) return;
    await api.metaDeleteReport(id);
    setReports(prev => prev.filter(r => r.id !== id));
  }

  const freqLabel = { diario: 'Diário', semanal: 'Semanal' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{reports.length} relatório(s)</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Criar relatório
        </button>
      </div>

      {!reports.length && (
        <div className="card p-10 text-center text-slate-400">Nenhum relatório criado ainda.</div>
      )}

      <div className="card overflow-hidden">
        {reports.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['', 'Nome', 'Conta', 'Frequência', 'Período', 'Último envio', 'Ações'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reports.map(r => {
                const conn = connections.find(c => c.ad_account_id === r.ad_account_id);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <Toggle value={r.active} onChange={() => toggle(r)} />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{conn?.account_name || r.ad_account_id}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-gray">{freqLabel[r.frequency] || r.frequency}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">Últimos {r.period_days} dias</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {r.last_sent_at ? new Date(r.last_sent_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendNow(r)}
                          disabled={sending === r.id}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                        >
                          {sending === r.id ? 'Enviando...' : 'Enviar agora'}
                        </button>
                        <button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">Criar relatório</h2>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Relatório semanal geral" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Conta Meta Ads</label>
                <select className="input" value={form.ad_account_id} onChange={e => setForm(f => ({ ...f, ad_account_id: e.target.value }))}>
                  {connections.map(c => <option key={c.id} value={c.ad_account_id}>{c.account_name || c.ad_account_id}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frequência</label>
                  <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Período (dias)</label>
                  <select className="input" value={form.period_days} onChange={e => setForm(f => ({ ...f, period_days: e.target.value }))}>
                    <option value="1">Último 1 dia</option>
                    <option value="3">Últimos 3 dias</option>
                    <option value="7">Últimos 7 dias</option>
                    <option value="14">Últimos 14 dias</option>
                    <option value="30">Últimos 30 dias</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp (com DDI)</label>
                <input className="input" value={form.whatsapp_phone} onChange={e => setForm(f => ({ ...f, whatsapp_phone: e.target.value }))} placeholder="+55 11 99999-9999" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-ghost py-2.5">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary py-2.5">
                {saving ? 'Salvando...' : 'Criar relatório'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Configurações ───────────────────────────────────────────────────────

function ConfiguracoesTab({ connections, onReload }) {
  const [form, setForm] = useState({ business_id: '', access_token: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function connectBM() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await api.metaConnectBM(form.business_id, form.access_token);
      setForm({ business_id: '', access_token: '' });
      setSuccess(`✅ ${result.imported} contas importadas da BM "${result.bm_name}"!`);
      onReload();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function disconnect(id, name) {
    if (!confirm(`Desconectar "${name}"?`)) return;
    await api.metaDisconnect(id);
    onReload();
  }

  async function disconnectAll() {
    if (!confirm(`Remover TODAS as ${connections.length} contas conectadas?`)) return;
    await api.metaDisconnectAll();
    onReload();
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Conectar via BM */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">Conectar via Business Manager</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 ml-9">
          Cole o ID da sua BM e um token — todas as contas de anúncios serão importadas automaticamente.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ID da Business Manager</label>
            <input
              className="input"
              value={form.business_id}
              onChange={e => setForm(f => ({ ...f, business_id: e.target.value }))}
              placeholder="Ex: 395404941100497"
            />
            <p className="text-xs text-slate-400 mt-1">
              <strong>business.facebook.com/settings</strong> → Informações do negócio → ID do negócio
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Token de acesso do sistema</label>
            <input
              className="input font-mono text-xs"
              value={form.access_token}
              onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
              placeholder="EAAxxxxxx..."
            />
            <p className="text-xs text-slate-400 mt-1">
              <strong>business.facebook.com/settings</strong> → Usuários → Usuários do sistema → Gerar token
            </p>
          </div>
          <button
            onClick={connectBM}
            disabled={saving || !form.business_id || !form.access_token}
            className="btn-primary w-full py-2.5"
          >
            {saving ? 'Importando contas...' : '⚡ Importar todas as contas da BM'}
          </button>
        </div>
      </div>

      {/* Contas conectadas */}
      {connections.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{connections.length} conta(s) conectada(s)</h3>
            <button onClick={disconnectAll} className="text-xs text-red-400 hover:text-red-600 font-medium">
              Remover todas
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {connections.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.account_name}</p>
                  <p className="text-xs text-slate-400">{c.ad_account_id}</p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ativa
                  </span>
                  <button onClick={() => disconnect(c.id, c.account_name)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook N8N */}
      <div className="card p-5 bg-slate-50">
        <h3 className="font-semibold text-slate-700 mb-2 text-sm">Webhook N8N — verificar alertas de saldo</h3>
        <p className="text-xs text-slate-500 mb-3">Configure no N8N para rodar a cada hora:</p>
        <code className="block bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono break-all">
          POST http://localhost:3101/meta/alerts/check
        </code>
        <p className="text-xs text-slate-400 mt-2">Header: <code>Authorization: Bearer [seu_token_admin]</code></p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MetaPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('metricas');
  const [connections, setConnections] = useState([]);
  const router = useRouter();

  const loadConnections = useCallback(async () => {
    try { setConnections(await api.metaGetConnections()); } catch {}
  }, []);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const parsed = JSON.parse(u);
    if (parsed.tipo !== 'admin') { router.replace('/dashboard'); return; }
    setUser(parsed);
    loadConnections();
  }, [router, loadConnections]);

  if (!user) return null;

  return (
    <div className="lg:pl-60">
      <Sidebar />
      <div className="pt-14 lg:pt-0 min-h-screen bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Meta Ads</h1>
              <p className="text-xs text-slate-400">Métricas, alertas e relatórios das suas campanhas</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-slate-100 -mb-4">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {tab === 'metricas'      && <MetricasTab   connections={connections} />}
          {tab === 'alertas'       && <AlertasTab    connections={connections} />}
          {tab === 'relatorios'    && <RelatoriosTab connections={connections} />}
          {tab === 'configuracoes' && <ConfiguracoesTab connections={connections} onReload={loadConnections} />}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Settings as SettingsIcon, Copy, Trash2, UploadCloud, X, Check, ChevronLeft, Table as TableIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { cn } from './lib/utils';

const API_BASE = "http://localhost:8787/api";

interface Person {
  id: number;
  person_name: string;
  company_name: string;
  email_id: string;
  raw_data: Record<string, string>;
  source_file: string;
}

interface Mapping {
  name: string;
  company: string;
  email: string;
  linkedin: string;
}

const App: React.FC = () => {
  const [view, setView] = useState<'search' | 'ingest' | 'mapping'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({ total_records: 0 });
  
  // Mapping Wizard State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{headers: string[], samples: any[]}>({headers: [], samples: []});
  const [mapping, setMapping] = useState<Mapping>({ name: '', company: '', email: '', linkedin: '' });
  const [ingestStatus, setIngestStatus] = useState<{ingested: number, skipped: number, errors: string[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async (q: string) => {
    try {
      const resp = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      const data = await resp.json();
      setResults(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchStats = async () => {
    try {
      const resp = await fetch(`${API_BASE}/ingest/stats`);
      const data = await resp.json();
      setStats(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    fetchStats();
  }, [results, view]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLoading(true);
    setPendingFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE}/ingest/peek`, { method: 'POST', body: formData });
      const data = await resp.json();
      setPreviewData(data);
      
      // Try to auto-suggest mapping
      const autoMap: Mapping = { name: '', company: '', email: '', linkedin: '' };
      data.headers.forEach((h: string) => {
        const lower = h.toLowerCase().trim();
        if (['name', 'person', 'full name'].includes(lower)) autoMap.name = h;
        if (['company', 'org', 'organization'].includes(lower)) autoMap.company = h;
        if (['email', 'email id', 'email address'].includes(lower)) autoMap.email = h;
        if (['linkedin', 'linkedin profile', 'linkedin url'].includes(lower)) autoMap.linkedin = h;
      });
      setMapping(autoMap);
      setView('mapping');
    } catch (err) { alert("Failed to read file"); }
    setLoading(false);
  };

  const handleIngest = async () => {
    if (!pendingFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('files', pendingFile);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const resp = await fetch(`${API_BASE}/ingest`, { method: 'POST', body: formData });
      const data = await resp.json();
      setIngestStatus(data);
      if (data.ingested > 0) {
        setTimeout(() => setView('search'), 2000);
      }
    } catch (err) { alert("Ingestion failed"); }
    setLoading(false);
  };

  const clearDb = async () => {
    if (!confirm("Clear all records?")) return;
    await fetch(`${API_BASE}/ingest/clear`, { method: 'POST' });
    fetchResults('');
    setShowSettings(false);
  };

  // --- RENDERING ---

  if (view === 'ingest' || view === 'mapping') {
    return (
      <div className="min-h-screen bg-white text-slate-900 p-8 flex flex-col items-center animate-in fade-in duration-500">
        <div className="w-full max-w-6xl">
          <Button variant="ghost" onClick={() => { setView('search'); setIngestStatus(null); }} className="mb-8 text-slate-500">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Search
          </Button>

          {view === 'ingest' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Step 1: Upload Data</h1>
                <p className="text-slate-500">Select your HR sheet to start mapping.</p>
                <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100 flex gap-4">
                  <div className="bg-sky-600 text-white p-2 rounded-lg"><TableIcon /></div>
                  <div>
                    <h3 className="font-bold">Next: Data Mapping</h3>
                    <p className="text-sm text-slate-600 mt-1">You'll choose which columns map to Name, Company, and Email in the next step.</p>
                  </div>
                </div>
              </div>
              <label className={cn(
                "border-4 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer h-[300px]",
                loading ? "opacity-50 border-slate-200" : "border-slate-100 hover:border-sky-500 hover:bg-sky-50"
              )}>
                {loading ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" /> : (
                  <>
                    <UploadCloud className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="font-bold text-lg">Drop Sheet to Preview</p>
                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleFileSelect} />
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold">Step 2: Map Your Columns</h1>
                  <p className="text-slate-500 mt-1">Confirm which columns represent the core fields.</p>
                </div>
                <Button onClick={handleIngest} disabled={loading} className="bg-sky-600 hover:bg-sky-700 px-8 h-12 text-lg">
                  {loading ? 'Processing...' : 'Confirm & Ingest'}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mapping Controls */}
                <Card className="lg:col-span-1 border-slate-200">
                  <CardHeader><CardTitle>Assign Fields</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {['name', 'company', 'email', 'linkedin'].map(field => (
                      <div key={field}>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{field}</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                          value={(mapping as any)[field]}
                          onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                        >
                          <option value="">-- Optional --</option>
                          {previewData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Data Preview */}
                <div className="lg:col-span-2 space-y-6">
                   <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 overflow-x-auto">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4">Sample Rows from your file</p>
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {previewData.headers.map(h => (
                            <th key={h} className={cn(
                              "pb-2 font-bold px-2",
                              Object.values(mapping).includes(h) ? "text-sky-600" : "text-slate-400"
                            )}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.samples.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            {previewData.headers.map(h => <td key={h} className="py-2 px-2 text-slate-600">{row[h] || '-'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Result Preview Card */}
                  <div className="pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4">Live Result Preview</p>
                    <div className="p-6 border border-sky-100 rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5 max-w-md">
                      <h3 className="text-lg font-bold text-slate-900">
                        {previewData.samples[0]?.[mapping.name] || 'John Doe'}
                      </h3>
                      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-0.5">
                        {previewData.samples[0]?.[mapping.company] || 'Acme Corp'} • {previewData.samples[0]?.[mapping.email] || 'john@example.com'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {ingestStatus && (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-300">
              <div className="text-center max-w-md p-8 animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                  <Check className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">Success!</h2>
                <p className="text-slate-500 text-lg mb-8">
                  Successfully added <span className="font-bold text-slate-900">{ingestStatus.ingested}</span> records to your database.
                </p>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => { setView('search'); setIngestStatus(null); }} 
                    className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 rounded-xl font-bold"
                  >
                    Go to Search
                  </Button>
                  <p className="text-xs text-slate-400">Redirecting automatically in a few seconds...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-100">
      {/* Top Bar */}
      <nav className="fixed top-0 left-0 right-0 p-4 flex justify-end gap-2 bg-white/80 backdrop-blur-sm z-20">
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <SettingsIcon className="w-4 h-4" />
        </Button>
        <Button variant="default" size="sm" onClick={() => setView('ingest')} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="w-4 h-4 mr-1" /> Ingest
        </Button>
      </nav>

      <div className={cn(
        "transition-all duration-500 ease-in-out flex flex-col items-center px-4",
        query || results.length > 0 ? "pt-16" : "pt-[25vh]"
      )}>
        <div className={cn(
          "text-center transition-all duration-500",
          query || results.length > 0 ? "mb-6 scale-75 origin-top" : "mb-8 scale-100"
        )}>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            People<span className="text-sky-600">Search</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Instant HR Data Intelligence</p>
        </div>

        <div className={cn(
          "w-full max-w-2xl relative transition-all duration-500",
          query || results.length > 0 ? "mb-8" : "mb-4"
        )}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            className="w-full h-14 pl-12 pr-4 rounded-full border-slate-200 bg-white shadow-sm hover:shadow-md focus:shadow-md transition-shadow text-lg outline-none focus-visible:ring-sky-500"
            placeholder="Search by name, company, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="w-full max-w-3xl space-y-4 pb-20">
          {results.map(person => (
            <div 
              key={person.id} 
              className={cn(
                "group p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer rounded-xl flex justify-between items-center",
                selectedIds.has(person.id) && "bg-sky-50 border-sky-100"
              )}
              onClick={() => toggleSelect(person.id)}
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {person.person_name}
                </h3>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-0.5">
                  {person.company_name} • {person.email_id}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(person.raw_data).map(([k, v]) => (
                    v && !['person_name', 'company_name', 'email_id'].includes(k.toLowerCase()) && (
                      <span key={k} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {k}: {v}
                      </span>
                    )
                  ))}
                </div>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-sky-600" onClick={() => copyToClipboard(person.email_id)}>
                    <Copy className="w-4 h-4" />
                  </Button>
              </div>
            </div>
          ))}
          
          {query && results.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No records found for "{query}"
            </div>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 ring-1 ring-slate-900/5">
          <span className="text-sm font-semibold text-slate-900">{selectedIds.size} Selected</span>
          <div className="h-4 w-px bg-slate-200" />
          <Button variant="default" size="sm" onClick={() => {
             const emails = results.filter(p => selectedIds.has(p.id)).map(p => p.email_id).join(', ');
             copyToClipboard(emails);
          }} className="bg-sky-600 hover:bg-sky-700 text-white rounded-full">
            Copy Emails
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-900">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X className="w-4 h-4"/></Button>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium text-sm">Total Database Records</span>
                <span className="font-bold text-slate-900">{stats.total_records}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={clearDb} className="text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600 font-semibold">
                <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
              </Button>
              <Button variant="ghost" onClick={() => setShowSettings(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

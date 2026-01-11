import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";

// --- CONSTANTES E UTILITÁRIOS ---
const STORAGE_KEY = 'gaspar_app_v2';

const PerformanceStatus = {
  APPROVED: 'Aprovado',
  AT_RISK: 'Em Risco',
  DANGER: 'Precisa Atenção',
  NONE: 'Nenhuma Nota'
};

const AUTHORIZED_TEACHERS = ['lara.rieger@gmail.com', 'coordenacao.gaspar@gmail.com', 'professor.exemplo@gmail.com'];

const calculateTrimesterAverage = (grades: any) => {
  const { av1, av2, pat } = grades;
  const avgAV1 = av1.length > 0 ? av1.reduce((a: number, b: number) => a + b, 0) / av1.length : 0;
  const avgAV2 = av2.length > 0 ? av2.reduce((a: number, b: number) => a + b, 0) / av2.length : 0;
  const patVal = pat ?? 0;
  const final = (patVal * 3 + avgAV1 * 5 + avgAV2 * 2) / 10;
  return Number(final.toFixed(2));
};

const getStatus = (average: number) => {
  if (average === 0) return PerformanceStatus.NONE;
  if (average >= 7) return PerformanceStatus.APPROVED;
  if (average >= 5) return PerformanceStatus.AT_RISK;
  return PerformanceStatus.DANGER;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case PerformanceStatus.APPROVED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case PerformanceStatus.AT_RISK: return 'bg-amber-100 text-amber-700 border-amber-200';
    case PerformanceStatus.DANGER: return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

// --- COMPONENTES DE INTERFACE ---

const AITutor = ({ subjects }: any) => {
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', text: 'Olá! Sou seu Tutor IA. Como posso te ajudar com seus estudos hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const askTutor = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: `Você é um tutor acadêmico prestativo para um aluno do Colégio Gaspar. 
          As matérias do aluno são: ${subjects.map((s: any) => s.name).join(', ')}. 
          Dê respostas curtas, motivadoras e focadas em ajudar a organizar estudos e explicar conceitos.`
        }
      });

      const aiText = response.text || "Desculpe, tive um problema ao processar sua resposta.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com o Tutor. Verifique sua conexão." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[3rem] border shadow-sm overflow-hidden animate-in">
      <div className="p-6 bg-slate-900 text-amber-400 font-black uppercase text-[10px] tracking-widest flex items-center justify-between">
        <span>Tutor Inteligente Gemini</span>
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border shadow-sm rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm p-4 rounded-3xl rounded-tl-none flex space-x-1">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && askTutor()}
            placeholder="Pergunte algo sobre sua matéria..." 
            className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none font-medium text-sm"
          />
          <button 
            onClick={askTutor}
            disabled={loading}
            className="w-14 h-14 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, subText, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center space-x-2 mb-4">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-sm">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{subText}</p>
  </div>
);

const Dashboard = ({ data }: any) => {
  const { subjects, currentTrimester, studySession, user } = data;
  const stats = useMemo(() => {
    if (subjects.length === 0) return null;
    const subjectsWithGrades = subjects.map((s: any) => {
      const avg = calculateTrimesterAverage(s.trimesters[currentTrimester]);
      return { name: s.name, average: avg, status: getStatus(avg), color: s.color };
    });
    const bestSubject = [...subjectsWithGrades].sort((a, b) => b.average - a.average)[0];
    return { subjectsWithGrades, bestSubject };
  }, [subjects, currentTrimester]);

  const formatTime = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  const overallAvg = stats ? (stats.subjectsWithGrades.reduce((a: number, b: any) => a + b.average, 0) / subjects.length).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 animate-in">
      <header>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-slate-500 font-medium">Aqui está o resumo do seu {currentTrimester}º Trimestre.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Média Geral" value={overallAvg} subText="Total Trimestre" icon="📊" color="text-slate-900" />
        <MetricCard label="Foco de Estudo" value={formatTime(studySession.todaySeconds)} subText="Dedicação Hoje" icon="⏱️" color="text-indigo-600" />
        <MetricCard label="Melhor Matéria" value={stats?.bestSubject?.name || '-'} subText={`Média: ${stats?.bestSubject?.average || 0}`} icon="🌟" color="text-amber-600" />
        <MetricCard label="Agenda" value={data.calendar.length} subText="Eventos Marcados" icon="📅" color="text-slate-600" />
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Gráfico de Desempenho</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.subjectsWithGrades}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="average" radius={[8, 8, 8, 8]} barSize={32}>
                {stats?.subjectsWithGrades.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const SubjectManager = ({ subjects, updateSubjects, currentTrimester, setTrimester }: any) => {
  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleUpdateGrade = (subId: string, type: string, index: number, value: string) => {
    const val = Math.min(10, Math.max(0, parseFloat(value) || 0));
    const newSubjects = subjects.map((s: any) => {
      if (s.id !== subId) return s;
      const updatedTrimesters = { ...s.trimesters };
      updatedTrimesters[currentTrimester][type] = [...updatedTrimesters[currentTrimester][type]];
      updatedTrimesters[currentTrimester][type][index] = val;
      return { ...s, trimesters: updatedTrimesters };
    });
    updateSubjects(newSubjects);
  };

  const handleAddActivity = (subId: string, type: string) => {
    const newSubjects = subjects.map((s: any) => {
      if (s.id !== subId) return s;
      const updatedTrimesters = { ...s.trimesters };
      updatedTrimesters[currentTrimester][type] = [...updatedTrimesters[currentTrimester][type], 0];
      return { ...s, trimesters: updatedTrimesters };
    });
    updateSubjects(newSubjects);
  };

  if (activeSubject) {
    const sub = subjects.find((s: any) => s.id === activeSubject.id);
    const grades = sub.trimesters[currentTrimester];
    return (
      <div className="space-y-6 animate-in">
        <button onClick={() => setActiveSubject(null)} className="text-indigo-600 font-bold text-sm">← Voltar</button>
        <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
          <div className="p-6 text-white font-black uppercase text-xl" style={{ backgroundColor: sub.color }}>{sub.name}</div>
          <div className="p-6 space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border">
              <div><p className="text-[10px] font-black text-slate-400 uppercase">Média Final</p><p className="text-3xl font-black">{calculateTrimesterAverage(grades)}</p></div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusColor(getStatus(calculateTrimesterAverage(grades)))}`}>{getStatus(calculateTrimesterAverage(grades))}</div>
            </div>
            
            {['av1', 'av2'].map(type => (
              <div key={type}>
                <div className="flex justify-between mb-2"><h4 className="text-[10px] font-black uppercase text-slate-400">{type === 'av1' ? 'AV1 (Peso 5)' : 'AV2 (Peso 2)'}</h4><button onClick={() => handleAddActivity(sub.id, type)} className="text-indigo-600 font-bold text-xs">+ Adicionar</button></div>
                <div className="space-y-2">
                  {grades[type].map((g: number, i: number) => (
                    <input key={i} type="number" value={g} onChange={e => handleUpdateGrade(sub.id, type, i, e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                  ))}
                </div>
              </div>
            ))}
            
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">PAT (Peso 3)</h4>
              <input type="number" value={grades.pat ?? ''} onChange={e => {
                const val = e.target.value === '' ? null : Math.min(10, Math.max(0, parseFloat(e.target.value) || 0));
                updateSubjects(subjects.map((s: any) => s.id === sub.id ? { ...s, trimesters: { ...s.trimesters, [currentTrimester]: { ...s.trimesters[currentTrimester], pat: val } } } : s));
              }} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Nota da Prova Final" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Matérias</h2>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          {[1, 2, 3].map(t => <button key={t} onClick={() => setTrimester(t)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentTrimester === t ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{t}º TRIM</button>)}
        </div>
      </header>
      <button onClick={() => setIsAdding(true)} className="w-full py-4 border-2 border-dashed rounded-2xl text-slate-400 font-black uppercase text-xs">+ Nova Matéria</button>
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border shadow-lg space-y-4">
          <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="Nome (Ex: Biologia)" />
          <div className="flex space-x-2">
            <button onClick={() => {
              if (newName) updateSubjects([...subjects, { id: Date.now().toString(), name: newName, color: '#6366F1', trimesters: { 1: {av1: [], av2: [], pat: null}, 2: {av1: [], av2: [], pat: null}, 3: {av1: [], av2: [], pat: null} } }]);
              setIsAdding(false); setNewName('');
            }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-xs">Salvar</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s: any) => (
          <div key={s.id} onClick={() => setActiveSubject(s)} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-md cursor-pointer group">
            <div className="flex items-center space-x-3 mb-4"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div><h3 className="font-black uppercase text-slate-800">{s.name}</h3></div>
            <p className="text-3xl font-black text-slate-900">{calculateTrimesterAverage(s.trimesters[currentTrimester])}</p>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-1">Média do Trimestre</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Calendar = ({ events, subjects, onAddEvent, onRemoveEvent }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ subjectId: '', type: 'AV1', date: '', content: '' });

  const sortedEvents = useMemo(() => {
    return [...events].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId || !form.date) return;
    const subject = subjects.find((s: any) => s.id === form.subjectId);
    onAddEvent({
      id: Date.now().toString(),
      ...form,
      subjectName: subject?.name || 'Geral'
    });
    setForm({ subjectId: '', type: 'AV1', date: '', content: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Agenda</h2>
        <button onClick={() => setIsAdding(true)} className="bg-slate-900 text-amber-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/10">+ Novo Compromisso</button>
      </header>

      {isAdding && (
        <div className="bg-white p-6 rounded-[2rem] border shadow-xl space-y-4 animate-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Matéria</label>
                <select value={form.subjectId} onChange={e => setForm({...form, subjectId: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1 outline-none">
                  <option value="">Selecione...</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1 outline-none">
                  <option>AV1</option><option>AV2</option><option>PAT</option><option>Trabalho</option><option>Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição</label>
                <input value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Ex: Capítulos 1 a 3" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1 outline-none" />
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button type="submit" className="flex-1 bg-slate-900 text-amber-400 py-4 rounded-2xl font-black uppercase text-[10px]">Salvar Evento</button>
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {sortedEvents.map((e: any) => (
          <div key={e.id} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{new Date(e.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                <span className="text-xl font-black text-slate-900 leading-none">{new Date(e.date).getDate() + 1}</span>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className="font-black text-sm uppercase tracking-tighter">{e.subjectName}</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${e.type === 'PAT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{e.type}</span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{e.content || 'Sem descrição'}</p>
              </div>
            </div>
            <button onClick={() => onRemoveEvent(e.id)} className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
          </div>
        ))}
        {sortedEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
            <span className="text-4xl mb-4">✨</span>
            <p className="text-[10px] font-black uppercase">Tudo limpo por enquanto!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudyCenter = ({ data, onUpdateSession, onUpdateGroups }: any) => {
  const [mode, setMode] = useState('timer');
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', privacy: 'public' as 'public' | 'private' });
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const userGrade = data.user?.grade || '';
  
  const myGroups = data.studyGroups.filter((g: any) => {
    if (g.isOfficial) return normalize(g.name).includes(normalize(userGrade));
    return g.privacy === 'public' || g.id.startsWith('custom-');
  });

  const activeGroup = data.studyGroups.find((g: any) => g.id === activeGroupId);
  const canChat = activeGroup ? (activeGroup.isOfficial ? normalize(activeGroup.name).includes(normalize(userGrade)) : true) : false;

  const formatTime = (s: number) => {
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sc = s%60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sc.toString().padStart(2,'0')}`;
  };

  const createGroup = () => {
    if (!newGroupData.name.trim()) return;
    const newGroup = {
      id: 'custom-' + Date.now(),
      name: newGroupData.name,
      privacy: newGroupData.privacy,
      isOfficial: false,
      messages: [],
      membersCount: 1
    };
    onUpdateGroups([...data.studyGroups, newGroup]);
    setIsCreatingGroup(false);
    setNewGroupData({ name: '', privacy: 'public' });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
        <button onClick={() => setMode('timer')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${mode === 'timer' ? 'bg-slate-900 text-amber-400' : 'text-slate-400'}`}>Foco</button>
        <button onClick={() => setMode('groups')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${mode === 'groups' ? 'bg-slate-900 text-amber-400' : 'text-slate-400'}`}>Grupos</button>
      </div>

      {mode === 'timer' ? (
        <div className="flex flex-col items-center py-12 bg-white rounded-[3rem] border shadow-xl">
          <div className="w-64 h-64 rounded-full border-[10px] border-slate-50 flex items-center justify-center mb-8 relative">
            <div className={`absolute inset-0 rounded-full border-[10px] border-amber-400 border-t-transparent ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}></div>
            <span className="text-5xl font-mono font-black">{formatTime(seconds)}</span>
          </div>
          <button onClick={() => {
            if (isRunning) onUpdateSession({ ...data.studySession, totalSeconds: data.studySession.totalSeconds + seconds, todaySeconds: data.studySession.todaySeconds + seconds });
            if (isRunning) setSeconds(0);
            setIsRunning(!isRunning);
          }} className={`w-64 py-5 rounded-3xl font-black uppercase text-sm tracking-widest ${isRunning ? 'bg-rose-500 text-white' : 'bg-slate-900 text-amber-400'}`}>{isRunning ? 'Pausar' : 'Começar'}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[550px]">
          <div className="bg-white rounded-3xl border overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-black text-[10px] uppercase text-slate-400">Suas Turmas</span>
              <button onClick={() => setIsCreatingGroup(true)} className="w-8 h-8 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md active:scale-90 transition-transform">+</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {myGroups.map((g: any) => (
                <button key={g.id} onClick={() => setActiveGroupId(g.id)} className={`w-full text-left p-4 rounded-2xl transition-all ${activeGroupId === g.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50'}`}>
                   <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-black uppercase opacity-60">{g.isOfficial ? 'Oficial' : 'Extra'}</span>
                      {g.isOfficial && <span className="text-[7px] font-black bg-amber-400 text-slate-900 px-1 rounded uppercase">Sua Turma</span>}
                   </div>
                   <p className="text-sm font-bold truncate">{g.name}</p>
                </button>
              ))}
              {myGroups.length === 0 && <p className="text-[10px] text-slate-400 text-center py-10 font-bold uppercase">Nenhum grupo</p>}
            </div>
          </div>
          <div className="lg:col-span-3 bg-white rounded-3xl border flex flex-col overflow-hidden shadow-sm">
            {activeGroup ? (
              <>
                <div className="p-4 border-b font-black uppercase text-[10px] flex justify-between bg-slate-50"><span>{activeGroup.name}</span><span>{activeGroup.privacy === 'private' ? '🔒 Privado' : '🌐 Público'}</span></div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                  {activeGroup.messages.map((m: any) => (
                    <div key={m.id} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                      {!m.isMe && <span className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">{m.sender}</span>}
                      <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${m.isMe ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border shadow-sm rounded-tl-none'}`}>{m.text}</div>
                    </div>
                  ))}
                  {activeGroup.messages.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><span className="text-3xl mb-2">💬</span><p className="text-[10px] font-black uppercase">Inicie a conversa!</p></div>}
                </div>
                <div className={`p-3 border-t bg-white flex space-x-2 ${!canChat ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input value={msg} onChange={e => setMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && canChat && msg.trim() && (onUpdateGroups(data.studyGroups.map((g: any) => g.id === activeGroupId ? {...g, messages: [...g.messages, {id: Date.now().toString(), text: msg, isMe: true, sender: data.user.name.split(' ')[0]}]} : g)), setMsg(''))} className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none font-medium" placeholder={canChat ? "Diga algo..." : "Somente membros da turma"} />
                  <button disabled={!canChat || !msg.trim()} onClick={() => {
                    onUpdateGroups(data.studyGroups.map((g: any) => g.id === activeGroupId ? {...g, messages: [...g.messages, {id: Date.now().toString(), text: msg, isMe: true, sender: data.user.name.split(' ')[0]}]} : g));
                    setMsg('');
                  }} className="w-14 h-14 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">🚀</button>
                </div>
              </>
            ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-black uppercase text-xs p-10 text-center"><span>Selecione um grupo ou crie um novo para colaborar</span></div>}
          </div>
        </div>
      )}

      {/* Modal de Criação de Grupo */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl scale-in">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Novo Grupo</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-6 tracking-widest">Colabore com seus colegas</p>
            <div className="space-y-4">
              <input value={newGroupData.name} onChange={e => setNewGroupData({...newGroupData, name: e.target.value})} placeholder="Nome do Grupo" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setNewGroupData({...newGroupData, privacy: 'public'})} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${newGroupData.privacy === 'public' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Público</button>
                <button onClick={() => setNewGroupData({...newGroupData, privacy: 'private'})} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${newGroupData.privacy === 'private' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Privado</button>
              </div>
              <div className="flex space-x-2 pt-4">
                <button onClick={() => setIsCreatingGroup(false)} className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
                <button onClick={createGroup} disabled={!newGroupData.name.trim()} className="flex-1 py-4 bg-slate-900 text-amber-400 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-slate-900/20">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginScreen = ({ onLogin }: any) => {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('1º Ano Médio');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 animate-in">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20"><span className="text-3xl text-amber-400 font-black">CG</span></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Portal Acadêmico</h1>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mt-8">
            <button onClick={() => setRole('student')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${role === 'student' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Sou Aluno</button>
            <button onClick={() => setRole('teacher')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${role === 'teacher' ? 'bg-slate-900 text-amber-400 shadow-md' : 'text-slate-400'}`}>Sou Professor</button>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); if(role === 'student') onLogin({name, grade, role: 'student'}); else if(AUTHORIZED_TEACHERS.includes(email.toLowerCase())) onLogin({name, role: 'teacher', email, assignedSubjects: ['mat', 'por']}); else alert('Acesso Negado'); }} className="space-y-4">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome Completo" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
          {role === 'teacher' ? 
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Institucional" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 outline-none" /> :
            <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 outline-none appearance-none">
              <option>1º Ano Médio</option><option>2º Ano Médio</option><option>3º Ano Médio</option><option>9º Ano Fundamental</option>
            </select>
          }
          <button type="submit" className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest mt-4 transition-all active:scale-95 ${role === 'teacher' ? 'bg-amber-400 text-slate-900' : 'bg-slate-900 text-amber-400 shadow-xl shadow-slate-900/20'}`}>Acessar Portal</button>
        </form>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

const App = () => {
  const [data, setData] = useState<any>({ user: null, subjects: [], calendar: [], currentTrimester: 1, studySession: { totalSeconds: 0, todaySeconds: 0, lastStudyDate: '' }, studyGroups: [], studentsRegistry: [] });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setData(JSON.parse(saved));
    else {
      setData({
        user: null,
        subjects: [
          { id: 'mat', name: 'Matemática', color: '#6366F1', trimesters: { 1: {av1: [], av2: [], pat: null}, 2: {av1: [], av2: [], pat: null}, 3: {av1: [], av2: [], pat: null} } },
          { id: 'por', name: 'Português', color: '#EC4899', trimesters: { 1: {av1: [], av2: [], pat: null}, 2: {av1: [], av2: [], pat: null}, 3: {av1: [], av2: [], pat: null} } }
        ],
        calendar: [],
        currentTrimester: 1,
        studySession: { totalSeconds: 0, todaySeconds: 0, lastStudyDate: new Date().toISOString().split('T')[0] },
        studyGroups: [
          { id: 'm1', name: '1º Ano - Médio', privacy: 'public', isOfficial: true, messages: [] },
          { id: 'm2', name: '2º Ano - Médio', privacy: 'public', isOfficial: true, messages: [] },
          { id: 'm3', name: '3º Ano - Médio', privacy: 'public', isOfficial: true, messages: [] }
        ],
        studentsRegistry: []
      });
    }
  }, []);

  useEffect(() => { if(data.user) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

  if (!data.user) return <LoginScreen onLogin={(u: any) => { setData({...data, user: u}); setActiveTab(u.role === 'teacher' ? 'admin' : 'dashboard'); }} />;

  const NavBtn = ({ id, icon, label }: any) => (
    <button onClick={() => setActiveTab(id)} className={`flex flex-col items-center justify-center flex-1 py-3 transition-all ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`}>
      <span className="text-xl mb-1">{icon}</span><span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  const SideBtn = ({ id, icon, label }: any) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === id ? 'bg-amber-400 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
      <span className="text-xl">{icon}</span><span className="font-bold text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 transition-all">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full left-0 top-0 p-6">
        <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-900 font-black mb-10 shadow-lg">CG</div>
        <nav className="space-y-2 flex-1">
          {data.user.role === 'teacher' && <SideBtn id="admin" icon="🔑" label="Gestão" />}
          <SideBtn id="dashboard" icon="📊" label="Início" />
          <SideBtn id="subjects" icon="📚" label="Notas" />
          <SideBtn id="focus" icon="⏱️" label="Estudo" />
          <SideBtn id="calendar" icon="📅" label="Agenda" />
          <SideBtn id="ai" icon="🤖" label="Tutor IA" />
        </nav>
        <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} className="w-full text-left p-4 text-rose-400 font-bold text-sm mt-10">Sair do App</button>
      </aside>

      {/* Navegação Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t flex justify-around p-2 z-50 safe-bottom">
        <NavBtn id="dashboard" icon="📊" label="Painel" />
        <NavBtn id="subjects" icon="📚" label="Notas" />
        <NavBtn id="focus" icon="⏱️" label="Estudo" />
        <NavBtn id="calendar" icon="📅" label="Agenda" />
        <NavBtn id="ai" icon="🤖" label="IA" />
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 md:pl-72 md:p-12 max-w-7xl mx-auto w-full pb-32">
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'subjects' && <SubjectManager subjects={data.subjects} updateSubjects={(s: any) => setData({...data, subjects: s})} currentTrimester={data.currentTrimester} setTrimester={(t: number) => setData({...data, currentTrimester: t})} />}
        {activeTab === 'focus' && <StudyCenter data={data} onUpdateSession={(s: any) => setData({...data, studySession: s})} onUpdateGroups={(g: any) => setData({...data, studyGroups: g})} />}
        {activeTab === 'calendar' && (
          <Calendar 
            events={data.calendar} 
            subjects={data.subjects} 
            onAddEvent={(e: any) => setData({...data, calendar: [...data.calendar, e]})}
            onRemoveEvent={(id: string) => setData({...data, calendar: data.calendar.filter((x: any) => x.id !== id)})}
          />
        )}
        {activeTab === 'ai' && <AITutor subjects={data.subjects} />}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

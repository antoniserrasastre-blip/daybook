// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  Calendar, FileText, Link2, Plus, X, Trash2,
  FolderGit2 as Github, Mail, HardDrive, MessageSquare, Search, Save, ChevronLeft,
  ChevronRight, Sparkles, Folder, BookOpen, Code, Briefcase,
  Lightbulb, Bell, Phone, CalendarClock, CreditCard, Cake, Palette,
  HelpCircle, Cloud, CloudRain, Sun, CloudSnow, Wind, MapPin,
  AlertCircle, Clock, Target, CheckCircle2, Circle, PlayCircle,
  ArrowRight, Zap, TrendingUp, Flag, FolderKanban
} from "lucide-react";
import { ProjectsView } from "./components/Projects";

const storage = {
  get: (key) => {
    const v = localStorage.getItem(key);
    return v === null ? null : { value: v };
  },
  set: (key, value) => localStorage.setItem(key, value),
};

export default function Dashboard() {
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [notes, setNotes] = useState([]);

  const [notebooks] = useState([
    { id: "ideas",   name: "Ideas",                icon: "lightbulb",  color: "purple" },
    { id: "work",    name: "Procedimientos Work",  icon: "briefcase",  color: "blue" },
    { id: "writing", name: "Escritura",            icon: "book",       color: "pink" },
    { id: "code",    name: "Code Snippets",        icon: "code",       color: "green" },
  ]);

  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState("ideas");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    notes: "",
    inSprint: true,
    column: "todo",
    isReminder: false,
    category: "task",
    priority: "medium",
    dueDate: "",
    dueTime: "",
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [activePopups, setActivePopups] = useState([]);
  const [snoozeMenuFor, setSnoozeMenuFor] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoc, setWeatherLoc] = useState("Cargando ubicación...");
  const [now, setNow] = useState(new Date());
  const notificationLoopRef = useRef(null);
  const [editingItem, setEditingItem] = useState(null);

  const CATEGORIES = {
    task:        { name: "Task",        icon: CheckCircle2,  color: "indigo", persistent: false, description: "Tarea general" },
    call:        { name: "Call",        icon: Phone,         color: "red",    persistent: true,  description: "Llamada pendiente" },
    appointment: { name: "Appointment", icon: CalendarClock, color: "blue",   persistent: false, description: "Cita / reunión" },
    work:        { name: "Work",        icon: Briefcase,     color: "cyan",   persistent: false, description: "Asunto laboral" },
    payment:     { name: "Payment",     icon: CreditCard,    color: "amber",  persistent: false, description: "Pago / factura" },
    personal:    { name: "Personal",    icon: Cake,          color: "pink",   persistent: false, description: "Evento personal" },
    creative:    { name: "Creative",    icon: Palette,       color: "purple", persistent: false, description: "Proyecto creativo" },
    followup:    { name: "Follow-up",   icon: HelpCircle,    color: "emerald",persistent: false, description: "Pendiente respuesta" },
  };

  const PRIORITIES = {
    high:   { name: "Alta",  color: "bg-red-500/20 text-red-300 border-red-500/40",       dot: "bg-red-500",   order: 0 },
    medium: { name: "Media", color: "bg-amber-500/20 text-amber-300 border-amber-500/40", dot: "bg-amber-500", order: 1 },
    low:    { name: "Baja",  color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",    dot: "bg-zinc-500",  order: 2 },
  };

  const CATEGORY_COLORS = {
    red:     "bg-red-500/20 text-red-300 border-red-500/30",
    blue:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
    indigo:  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    cyan:    "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    amber:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
    pink:    "bg-pink-500/20 text-pink-300 border-pink-500/30",
    purple:  "bg-purple-500/20 text-purple-300 border-purple-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  useEffect(() => {
    try { const d = storage.get("items");   if (d) setItems(JSON.parse(d.value)); } catch {}
    try { const d = storage.get("sprints"); if (d) setSprints(JSON.parse(d.value)); } catch {}
    try { const d = storage.get("notes");   if (d) setNotes(JSON.parse(d.value)); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const current = getCurrentSprint();
    if (!current) {
      const newSprint = createWeeklySprint(new Date());
      saveSprints([...sprints, newSprint]);
    }
  }, [loading, sprints.length]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`);
        const data = await res.json();
        setWeather(data.current);
        try {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=es`);
          const geoData = await geoRes.json();
          setWeatherLoc(geoData.results?.[0]?.name || "Tu ubicación");
        } catch { setWeatherLoc("Tu ubicación"); }
      } catch { setWeatherLoc("Sin conexión"); }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => { setWeatherLoc("Madrid"); fetchWeather(40.4168, -3.7038); },
        { timeout: 5000 }
      );
    } else {
      setWeatherLoc("Madrid"); fetchWeather(40.4168, -3.7038);
    }
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const n = new Date();
      const toTrigger = [];
      items.forEach(r => {
        if (!r.isReminder) return;
        if (r.status === "done") return;
        if (!r.dueDate) return;
        if (r.snoozedUntil && new Date(r.snoozedUntil) > n) return;

        const dueDT = new Date(`${r.dueDate}T${r.dueTime || "09:00"}`);
        const cat = CATEGORIES[r.category];
        const msDiff = dueDT - n;
        const hoursUntil = msDiff / (1000 * 60 * 60);

        let shouldShow = false;
        if (cat?.persistent) {
          if (msDiff <= 0) shouldShow = true;
        } else if (r.category === "appointment") {
          if ((hoursUntil <= 24 && hoursUntil > 23.5) ||
              (hoursUntil <= 3 && hoursUntil > 2.5) ||
              (hoursUntil <= 0 && hoursUntil > -0.5)) shouldShow = true;
        } else if (r.category === "payment") {
          if ((hoursUntil <= 72 && hoursUntil > 71.5) ||
              (hoursUntil <= 0 && hoursUntil > -0.5)) shouldShow = true;
        } else if (r.category === "followup") {
          if (msDiff <= 0) shouldShow = true;
        } else {
          if (hoursUntil <= 0 && hoursUntil > -0.5) shouldShow = true;
        }
        if (shouldShow) toTrigger.push(r.id);
      });

      setActivePopups(prev => {
        const combined = [...new Set([...prev, ...toTrigger])];
        return combined.filter(id => {
          const r = items.find(x => x.id === id);
          return r && r.status !== "done";
        });
      });
    };
    checkReminders();
    notificationLoopRef.current = setInterval(checkReminders, 30000);
    return () => clearInterval(notificationLoopRef.current);
  }, [items]);

  const saveItems = (v) => { setItems(v); try { storage.set("items", JSON.stringify(v)); } catch {} };
  const saveSprints = (v) => { setSprints(v); try { storage.set("sprints", JSON.stringify(v)); } catch {} };
  const saveNotes = (v) => { setNotes(v); try { storage.set("notes", JSON.stringify(v)); } catch {} };

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const createWeeklySprint = (date) => {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
      id: Date.now(),
      name: `Sprint ${monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
      startDate: monday.toISOString(),
      endDate: sunday.toISOString(),
      status: "active",
      created: new Date().toISOString(),
    };
  };

  const getCurrentSprint = () => {
    const n = new Date();
    return sprints.find(s => s.status === "active" && new Date(s.startDate) <= n && new Date(s.endDate) >= n);
  };

  const currentSprint = getCurrentSprint();

  const closeSprintAndMoveUndone = () => {
    if (!currentSprint) return;
    const closedSprints = sprints.map(s =>
      s.id === currentSprint.id ? { ...s, status: "closed" } : s
    );
    const nextDate = new Date(currentSprint.endDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextSprint = createWeeklySprint(nextDate);

    const updatedItems = items.map(i => {
      if (i.sprintId === currentSprint.id && i.column !== "done") {
        return { ...i, sprintId: nextSprint.id, column: "todo" };
      }
      return i;
    });

    saveSprints([...closedSprints, nextSprint]);
    saveItems(updatedItems);
  };

  const addItem = () => {
    if (!newItem.title.trim()) return;
    const item = {
      id: Date.now(),
      title: newItem.title,
      notes: newItem.notes,
      status: newItem.column === "done" ? "done" : "pending",
      inSprint: newItem.inSprint,
      sprintId: newItem.inSprint && currentSprint ? currentSprint.id : null,
      column: newItem.column,
      isReminder: newItem.isReminder,
      category: newItem.category,
      priority: newItem.priority,
      dueDate: newItem.dueDate,
      dueTime: newItem.dueTime,
      created: new Date().toISOString(),
      snoozedUntil: null,
    };
    saveItems([item, ...items]);
    setNewItem({
      title: "", notes: "", inSprint: true, column: "todo",
      isReminder: false, category: "task", priority: "medium",
      dueDate: "", dueTime: ""
    });
    setShowNewItem(false);
  };

  const updateItem = (id, changes) => {
    const updated = items.map(i => {
      if (i.id !== id) return i;
      const merged = { ...i, ...changes };
      if (changes.column === "done") merged.status = "done";
      if (changes.column === "todo" || changes.column === "doing") merged.status = "pending";
      if (changes.status === "done" && merged.inSprint) merged.column = "done";
      if (changes.status === "pending" && merged.column === "done") merged.column = "doing";
      return merged;
    });
    saveItems(updated);
  };

  const completeItem = (id) => {
    updateItem(id, { status: "done", column: "done" });
    setActivePopups(prev => prev.filter(pid => pid !== id));
  };

  const deleteItem = (id) => {
    saveItems(items.filter(i => i.id !== id));
    setActivePopups(prev => prev.filter(pid => pid !== id));
    if (editingItem === id) setEditingItem(null);
  };

  const snoozeItem = (id, minutes) => {
    let until;
    if (minutes === "tomorrow") {
      until = new Date();
      until.setDate(until.getDate() + 1);
      until.setHours(9, 0, 0, 0);
    } else {
      until = new Date(Date.now() + minutes * 60000);
    }
    updateItem(id, { snoozedUntil: until.toISOString() });
    setActivePopups(prev => prev.filter(pid => pid !== id));
    setSnoozeMenuFor(null);
  };

  const handleDragStart = (item) => setDraggedItem(item.id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (column) => {
    if (draggedItem) updateItem(draggedItem, { column });
    setDraggedItem(null);
  };

  const createNote = (notebookId) => {
    const n = { id: Date.now(), notebook: notebookId, title: "Nueva nota", content: "", created: new Date().toISOString(), updated: new Date().toISOString() };
    saveNotes([n, ...notes]);
    setSelectedNote(n.id);
  };
  const updateNote = (id, changes) => {
    saveNotes(notes.map(n => n.id === id ? { ...n, ...changes, updated: new Date().toISOString() } : n));
  };
  const deleteNote = (id) => {
    saveNotes(notes.filter(n => n.id !== id));
    if (selectedNote === id) setSelectedNote(null);
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const sprintItems = currentSprint ? items.filter(i => i.sprintId === currentSprint.id) : [];
  const sprintTodo = sprintItems.filter(i => i.column === "todo");
  const sprintDoing = sprintItems.filter(i => i.column === "doing");
  const sprintDone = sprintItems.filter(i => i.column === "done");
  const sprintProgress = sprintItems.length > 0 ? (sprintDone.length / sprintItems.length) * 100 : 0;

  const pendingReminders = items
    .filter(i => i.isReminder && i.status !== "done")
    .sort((a, b) => {
      if (PRIORITIES[a.priority].order !== PRIORITIES[b.priority].order)
        return PRIORITIES[a.priority].order - PRIORITIES[b.priority].order;
      const aD = a.dueDate ? new Date(`${a.dueDate}T${a.dueTime || "23:59"}`) : new Date(8640000000000000);
      const bD = b.dueDate ? new Date(`${b.dueDate}T${b.dueTime || "23:59"}`) : new Date(8640000000000000);
      return aD - bD;
    });

  const todayEvents = items
    .filter(i => i.dueDate === todayStr && i.status !== "done")
    .sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || ""));

  const filteredNotes = notes
    .filter(n => n.notebook === selectedNotebook)
    .filter(n => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));

  const currentNote = notes.find(n => n.id === selectedNote);

  const getCalendarDays = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  };

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const weekDays = ["L","M","X","J","V","S","D"];

  const notebookIcons = { lightbulb: Lightbulb, briefcase: Briefcase, book: BookOpen, code: Code };
  const notebookColors = {
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300",
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300"
  };

  const getWeatherIcon = (code) => {
    if (code === undefined) return Cloud;
    if (code === 0) return Sun;
    if (code <= 3) return Cloud;
    if (code >= 51 && code <= 67) return CloudRain;
    if (code >= 71 && code <= 77) return CloudSnow;
    if (code >= 80 && code <= 82) return CloudRain;
    if (code >= 95) return CloudRain;
    return Cloud;
  };
  const getWeatherDesc = (code) => {
    if (code === undefined) return "—";
    if (code === 0) return "Despejado";
    if (code <= 3) return "Parcialmente nublado";
    if (code >= 51 && code <= 67) return "Lluvia";
    if (code >= 71 && code <= 77) return "Nieve";
    if (code >= 80 && code <= 82) return "Chubascos";
    if (code >= 95) return "Tormenta";
    return "Nublado";
  };

  const formatDueDate = (r) => {
    if (!r.dueDate) return "Sin fecha";
    const d = new Date(`${r.dueDate}T${r.dueTime || "00:00"}`);
    const diffDays = Math.round((d - new Date(todayStr)) / (1000 * 60 * 60 * 24));
    let prefix;
    if (diffDays === 0) prefix = "Hoy";
    else if (diffDays === 1) prefix = "Mañana";
    else if (diffDays === -1) prefix = "Ayer";
    else if (diffDays < 0) prefix = `Hace ${Math.abs(diffDays)}d`;
    else if (diffDays < 7) prefix = `En ${diffDays}d`;
    else prefix = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    return r.dueTime ? `${prefix} · ${r.dueTime}` : prefix;
  };

  const isOverdue = (r) => {
    if (!r.dueDate) return false;
    return new Date(`${r.dueDate}T${r.dueTime || "23:59"}`) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Cargando tu espacio...</div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather?.weather_code);

  const ItemCard = ({ item, draggable, compact }) => {
    const cat = CATEGORIES[item.category];
    const CatIcon = cat?.icon || CheckCircle2;
    const overdue = isOverdue(item) && item.status !== "done";

    return (
      <div
        draggable={draggable}
        onDragStart={() => draggable && handleDragStart(item)}
        onClick={() => setEditingItem(item.id)}
        className={`rounded-lg border p-2.5 cursor-pointer transition group ${
          item.status === "done"
            ? "bg-zinc-900/40 border-zinc-800/50 opacity-60"
            : overdue
            ? "bg-red-950/20 border-red-900/40 hover:border-red-800"
            : "bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/60"
        } ${draggable ? "active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITIES[item.priority || "medium"].dot}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm ${item.status === "done" ? "line-through text-zinc-500" : "text-zinc-100"}`}>
              {item.title}
            </div>
            {!compact && item.notes && (
              <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.notes}</div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.isReminder && cat && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${CATEGORY_COLORS[cat.color]}`}>
                  <CatIcon size={9} />{cat.name}
                </span>
              )}
              {item.dueDate && (
                <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-red-400" : "text-zinc-500"}`}>
                  <Clock size={9} />{formatDueDate(item)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {activePopups.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
          {activePopups.map(id => {
            const r = items.find(x => x.id === id);
            if (!r) return null;
            const cat = CATEGORIES[r.category];
            const CatIcon = cat?.icon || Bell;
            const isPersistent = cat?.persistent;
            return (
              <div key={id}
                className={`rounded-2xl border backdrop-blur-xl shadow-2xl p-4 ${
                  isPersistent ? "bg-red-950/90 border-red-500/50 ring-2 ring-red-500/30 animate-pulse" : "bg-zinc-900/95 border-zinc-700"
                }`}
                style={{ animation: "slideIn 0.3s ease-out" }}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${CATEGORY_COLORS[cat?.color] || CATEGORY_COLORS.indigo}`}>
                    <CatIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${PRIORITIES[r.priority].dot}`} />
                      <span className="text-xs text-zinc-400 uppercase tracking-wide">{cat?.name}</span>
                      {isPersistent && <span className="text-[10px] text-red-300 font-semibold">URGENTE</span>}
                    </div>
                    <div className="font-medium text-sm mb-1">{r.title}</div>
                    {r.notes && <div className="text-xs text-zinc-400 mb-2">{r.notes}</div>}
                    <div className="text-xs text-zinc-500 mb-3">{formatDueDate(r)}</div>
                    {snoozeMenuFor === id ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => snoozeItem(id, 15)} className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700">15 min</button>
                        <button onClick={() => snoozeItem(id, 60)} className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700">1 hora</button>
                        <button onClick={() => snoozeItem(id, 180)} className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700">3 horas</button>
                        <button onClick={() => snoozeItem(id, "tomorrow")} className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700">Mañana 9h</button>
                        <button onClick={() => setSnoozeMenuFor(null)} className="col-span-2 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => completeItem(id)} className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30 font-medium">✓ Done</button>
                        <button onClick={() => setSnoozeMenuFor(id)} className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700">Snooze</button>
                        {!isPersistent && (
                          <button onClick={() => setActivePopups(prev => prev.filter(pid => pid !== id))} className="px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <header className="border-b border-zinc-800/50 backdrop-blur sticky top-0 z-40 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Mi Cuaderno</h1>
              <p className="text-xs text-zinc-500">{today.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: Sparkles },
              { id: "sprint",    label: "Sprint",    icon: Target },
              { id: "reminders", label: "Reminders", icon: Bell, badge: pendingReminders.length },
              { id: "notes",     label: "Notas",     icon: FileText },
              { id: "calendar",  label: "Calendar",  icon: Calendar },
              { id: "projects",  label: "Proyectos", icon: FolderKanban },
              { id: "links",     label: "Links",     icon: Link2 }
            ].map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id} onClick={() => setActiveView(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition relative ${
                    activeView === v.id ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}>
                  <Icon size={15} />{v.label}
                  {v.badge > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500/30 text-red-300 rounded-full">{v.badge}</span>}
                </button>
              );
            })}
            <button onClick={() => setShowNewItem(true)} className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-1.5">
              <Plus size={14} /> Nuevo
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeView === "dashboard" && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Hola 👋</h2>
                  <p className="text-zinc-400 text-sm">
                    <span className="text-indigo-300 font-medium">{sprintDoing.length + sprintTodo.length}</span> tasks en sprint,
                    {" "}<span className="text-red-300 font-medium">{pendingReminders.length}</span> reminders activos
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold">{now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="text-xs text-zinc-500 mt-1">Hora local</div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/20 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2"><MapPin size={11} /> {weatherLoc}</div>
                  {weather ? (
                    <>
                      <div className="text-3xl font-semibold">{Math.round(weather.temperature_2m)}°C</div>
                      <div className="text-xs text-zinc-400 mt-1">{getWeatherDesc(weather.weather_code)}</div>
                      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Wind size={11} /> {Math.round(weather.wind_speed_10m)} km/h</div>
                    </>
                  ) : <div className="text-sm text-zinc-500">Cargando...</div>}
                </div>
                <WeatherIcon size={48} className="text-cyan-300/60" />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Target size={16} className="text-indigo-400" />
                    Sprint actual
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">{currentSprint?.name || "Sin sprint activo"}</p>
                </div>
                <button onClick={() => setActiveView("sprint")} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                  Ver board <ArrowRight size={12} />
                </button>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Progreso</span>
                  <span className="text-zinc-300 font-mono">{Math.round(sprintProgress)}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${sprintProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-zinc-800/40">
                  <div className="text-lg font-semibold text-zinc-300">{sprintTodo.length}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">To Do</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <div className="text-lg font-semibold text-amber-300">{sprintDoing.length}</div>
                  <div className="text-[10px] text-amber-500 uppercase">Doing</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <div className="text-lg font-semibold text-emerald-300">{sprintDone.length}</div>
                  <div className="text-[10px] text-emerald-500 uppercase">Done</div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2"><Bell size={16} className="text-red-400" />Reminders</h3>
                <button onClick={() => setActiveView("reminders")} className="text-xs text-zinc-500 hover:text-zinc-300">Ver todos →</button>
              </div>
              {pendingReminders.length === 0 ? (
                <div className="text-sm text-zinc-500 py-4 text-center">Nada pendiente 🎉</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {pendingReminders.slice(0, 4).map(r => <ItemCard key={r.id} item={r} compact />)}
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Calendar size={16} className="text-purple-400" />Hoy</h3>
              {todayEvents.length === 0 ? (
                <div className="text-sm text-zinc-500 py-4 text-center">Día despejado ✨</div>
              ) : (
                <div className="space-y-1.5">
                  {todayEvents.map(e => <ItemCard key={e.id} item={e} compact />)}
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Folder size={16} className="text-amber-400" />Cuadernos</h3>
              <div className="grid grid-cols-2 gap-2">
                {notebooks.map(nb => {
                  const Icon = notebookIcons[nb.icon] || Folder;
                  const count = notes.filter(n => n.notebook === nb.id).length;
                  return (
                    <button key={nb.id} onClick={() => { setSelectedNotebook(nb.id); setActiveView("notes"); }}
                      className={`p-3 rounded-xl bg-gradient-to-br ${notebookColors[nb.color]} border text-left hover:scale-[1.02] transition`}>
                      <Icon size={16} className="mb-1.5" />
                      <div className="font-medium text-xs">{nb.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{count} notas</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-span-12 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Link2 size={16} className="text-cyan-400" />Accesos rápidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { name: "GitHub", url: "https://github.com", icon: Github, color: "text-zinc-300" },
                  { name: "Gmail", url: "https://mail.google.com", icon: Mail, color: "text-red-400" },
                  { name: "Drive", url: "https://drive.google.com", icon: HardDrive, color: "text-amber-400" },
                  { name: "Gemini", url: "https://gemini.google.com", icon: MessageSquare, color: "text-indigo-400" }
                ].map(link => {
                  const Icon = link.icon;
                  return (
                    <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 transition">
                      <Icon size={14} className={link.color} />
                      <span className="text-sm flex-1">{link.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === "sprint" && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target size={20} className="text-indigo-400" /> Sprint Board
                </h2>
                <p className="text-xs text-zinc-500 mt-1">{currentSprint?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-xs text-zinc-400">{sprintDone.length}/{sprintItems.length} tasks</span>
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${sprintProgress}%` }} />
                  </div>
                </div>
                <button onClick={closeSprintAndMoveUndone}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5">
                  <Zap size={13} /> Cerrar sprint
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "todo",  title: "To Do",      icon: Circle,        color: "zinc",    items: sprintTodo },
                { id: "doing", title: "In Progress",icon: PlayCircle,    color: "amber",   items: sprintDoing },
                { id: "done",  title: "Done",       icon: CheckCircle2,  color: "emerald", items: sprintDone },
              ].map(col => {
                const ColIcon = col.icon;
                const colColors = {
                  zinc: "border-zinc-700 text-zinc-300",
                  amber: "border-amber-500/40 text-amber-300",
                  emerald: "border-emerald-500/40 text-emerald-300"
                };
                return (
                  <div key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(col.id)}
                    className={`rounded-2xl bg-zinc-900/50 border-2 border-dashed ${colColors[col.color]} p-4 min-h-[400px]`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <ColIcon size={15} />
                        {col.title}
                        <span className="text-xs text-zinc-500 ml-1">{col.items.length}</span>
                      </h3>
                      {col.id === "todo" && (
                        <button onClick={() => { setNewItem({ ...newItem, inSprint: true, column: "todo" }); setShowNewItem(true); }}
                          className="text-zinc-400 hover:text-zinc-200 p-1">
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {col.items.length === 0 ? (
                        <div className="text-xs text-zinc-600 text-center py-8">
                          {col.id === "todo" && "Arrastra o crea tasks aquí"}
                          {col.id === "doing" && "Nada en progreso"}
                          {col.id === "done" && "Aún nada completado"}
                        </div>
                      ) : col.items.map(item => <ItemCard key={item.id} item={item} draggable />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === "reminders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Bell size={20} className="text-red-400" /> Reminders
                </h2>
                <p className="text-xs text-zinc-500 mt-1">{pendingReminders.length} pendientes</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const count = pendingReminders.filter(r => r.category === key).length;
                const Icon = cat.icon;
                return (
                  <div key={key} className={`p-3 rounded-lg border ${CATEGORY_COLORS[cat.color]} flex flex-col items-center text-center`}>
                    <Icon size={16} className="mb-1" />
                    <div className="text-xs font-medium">{cat.name}</div>
                    <div className="text-[10px] opacity-70">{count}</div>
                  </div>
                );
              })}
            </div>

            {pendingReminders.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-12 text-center text-zinc-500">
                <Bell size={32} className="mx-auto mb-3 text-zinc-700" />
                <div>No hay reminders pendientes</div>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReminders.map(r => <ItemCard key={r.id} item={r} />)}
              </div>
            )}
          </div>
        )}

        {activeView === "notes" && (
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">
            <div className="col-span-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-4 overflow-y-auto">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 px-2">Cuadernos</h3>
              <div className="space-y-1">
                {notebooks.map(nb => {
                  const Icon = notebookIcons[nb.icon] || Folder;
                  const count = notes.filter(n => n.notebook === nb.id).length;
                  return (
                    <button key={nb.id} onClick={() => { setSelectedNotebook(nb.id); setSelectedNote(null); }}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition ${
                        selectedNotebook === nb.id ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      }`}>
                      <Icon size={14} />
                      <span className="flex-1 text-left">{nb.name}</span>
                      <span className="text-xs text-zinc-600">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="col-span-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                </div>
                <button onClick={() => createNote(selectedNotebook)} className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {filteredNotes.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-6">Sin notas todavía</div>
                ) : filteredNotes.map(n => (
                  <button key={n.id} onClick={() => setSelectedNote(n.id)}
                    className={`w-full text-left p-2 rounded-lg transition ${selectedNote === n.id ? "bg-indigo-500/20" : "hover:bg-zinc-800/40"}`}>
                    <div className="text-sm font-medium truncate">{n.title || "Sin título"}</div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">{n.content.slice(0, 40) || "Vacío"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5 flex flex-col overflow-hidden">
              {currentNote ? (
                <>
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
                    <input value={currentNote.title} onChange={e => updateNote(currentNote.id, { title: e.target.value })}
                      placeholder="Título..." className="flex-1 bg-transparent text-lg font-medium outline-none" />
                    <button onClick={() => deleteNote(currentNote.id)} className="text-zinc-500 hover:text-red-400 p-1.5">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea value={currentNote.content} onChange={e => updateNote(currentNote.id, { content: e.target.value })}
                    placeholder="Empieza a escribir..."
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-zinc-200 leading-relaxed font-mono" />
                  <div className="text-xs text-zinc-600 pt-2 border-t border-zinc-800 mt-2 flex justify-between">
                    <span>Creada: {new Date(currentNote.created).toLocaleString("es-ES")}</span>
                    <span className="flex items-center gap-1"><Save size={11} /> Guardado automático</span>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                  <div className="text-center">
                    <FileText size={32} className="mx-auto mb-3 text-zinc-700" />
                    <div>Selecciona una nota o crea una nueva</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "calendar" && (
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-sm">Hoy</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map(d => <div key={d} className="text-xs font-medium text-zinc-500 text-center py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {getCalendarDays().map((day, idx) => {
                if (!day) return <div key={idx} />;
                const dayStr = day.toISOString().split("T")[0];
                const dayItems = items.filter(i => i.dueDate === dayStr);
                const isToday = dayStr === todayStr;
                return (
                  <div key={idx} className={`min-h-[90px] p-2 rounded-lg border transition ${
                    isToday ? "bg-indigo-500/10 border-indigo-500/40" : "bg-zinc-800/20 border-zinc-800/50 hover:bg-zinc-800/40"
                  }`}>
                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-indigo-300" : "text-zinc-400"}`}>{day.getDate()}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map(i => {
                        const cat = CATEGORIES[i.category];
                        return (
                          <div key={i.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${
                              i.status === "done" ? "opacity-40 line-through" : ""
                            } ${CATEGORY_COLORS[cat?.color] || CATEGORY_COLORS.indigo}`}>
                            {i.dueTime && <span className="opacity-70">{i.dueTime}</span>}{i.title}
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && <div className="text-[10px] text-zinc-500">+{dayItems.length - 3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === "projects" && <ProjectsView />}

        {activeView === "links" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "GitHub", url: "https://github.com", icon: Github, desc: "Repositorios y proyectos", color: "from-zinc-500/20 to-zinc-700/10 border-zinc-600/30" },
              { name: "Gmail", url: "https://mail.google.com", icon: Mail, desc: "Correo electrónico", color: "from-red-500/20 to-red-700/10 border-red-500/30" },
              { name: "Google Drive", url: "https://drive.google.com", icon: HardDrive, desc: "Documentos y archivos", color: "from-amber-500/20 to-amber-700/10 border-amber-500/30" },
              { name: "Gemini", url: "https://gemini.google.com", icon: MessageSquare, desc: "Chat con IA de Google", color: "from-indigo-500/20 to-indigo-700/10 border-indigo-500/30" },
              { name: "Calendar", url: "https://calendar.google.com", icon: Calendar, desc: "Agenda de Google", color: "from-blue-500/20 to-blue-700/10 border-blue-500/30" },
              { name: "Claude", url: "https://claude.ai", icon: Sparkles, desc: "Chat con Claude AI", color: "from-purple-500/20 to-purple-700/10 border-purple-500/30" }
            ].map(link => {
              const Icon = link.icon;
              return (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                  className={`p-5 rounded-2xl bg-gradient-to-br ${link.color} border hover:scale-[1.02] transition`}>
                  <Icon size={24} className="mb-3" />
                  <div className="font-medium">{link.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{link.desc}</div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      {showNewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewItem(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Plus size={16} className="text-indigo-400" />Nuevo item</h3>
              <button onClick={() => setShowNewItem(false)} className="text-zinc-500 hover:text-zinc-200"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <input autoFocus value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="¿Qué hay que hacer?"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />

              <textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Notas (opcional)..." rows={2}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none" />

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setNewItem({ ...newItem, inSprint: !newItem.inSprint })}
                  className={`p-3 rounded-lg border text-sm flex items-center gap-2 transition ${
                    newItem.inSprint ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                  }`}>
                  <Target size={14} /> En Sprint
                </button>
                <button onClick={() => setNewItem({ ...newItem, isReminder: !newItem.isReminder })}
                  className={`p-3 rounded-lg border text-sm flex items-center gap-2 transition ${
                    newItem.isReminder ? "bg-red-500/20 border-red-500/40 text-red-300" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                  }`}>
                  <Bell size={14} /> Reminder
                </button>
              </div>

              {newItem.inSprint && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Columna inicial</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "todo", label: "To Do" },
                      { id: "doing", label: "In Progress" },
                      { id: "done", label: "Done" }
                    ].map(c => (
                      <button key={c.id} onClick={() => setNewItem({ ...newItem, column: c.id })}
                        className={`p-2 rounded-lg border text-xs transition ${
                          newItem.column === c.id ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                        }`}>{c.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {newItem.isReminder && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Categoría</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                      const Icon = cat.icon;
                      return (
                        <button key={key} onClick={() => setNewItem({ ...newItem, category: key })}
                          className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition ${
                            newItem.category === key ? CATEGORY_COLORS[cat.color] + " scale-105" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                          }`}>
                          <Icon size={14} />{cat.name}
                        </button>
                      );
                    })}
                  </div>
                  {CATEGORIES[newItem.category].persistent && (
                    <div className="mt-2 text-[11px] text-red-300 flex items-center gap-1">
                      <AlertCircle size={10} /> Pop-ups persistentes
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block flex items-center gap-1"><Flag size={10} />Prioridad</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(PRIORITIES).map(([key, p]) => (
                    <button key={key} onClick={() => setNewItem({ ...newItem, priority: key })}
                      className={`p-2 rounded-lg border text-xs transition ${
                        newItem.priority === key ? p.color : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                      }`}>{p.name}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Fecha (opcional)</label>
                  <input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Hora</label>
                  <input type="time" value={newItem.dueTime} onChange={e => setNewItem({ ...newItem, dueTime: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNewItem(false)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700">Cancelar</button>
                <button onClick={addItem} className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-400">Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && (() => {
        const item = items.find(i => i.id === editingItem);
        if (!item) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Editar item</h3>
                <div className="flex gap-1">
                  <button onClick={() => { deleteItem(item.id); }} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 size={15} /></button>
                  <button onClick={() => setEditingItem(null)} className="p-1.5 text-zinc-500 hover:text-zinc-200"><X size={18} /></button>
                </div>
              </div>

              <div className="space-y-3">
                <input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />

                <textarea value={item.notes || ""} onChange={e => updateItem(item.id, { notes: e.target.value })}
                  placeholder="Notas..." rows={2}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none" />

                {item.inSprint && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Estado en Sprint</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[{ id: "todo", label: "To Do" }, { id: "doing", label: "In Progress" }, { id: "done", label: "Done" }].map(c => (
                        <button key={c.id} onClick={() => updateItem(item.id, { column: c.id })}
                          className={`p-2 rounded-lg border text-xs transition ${
                            item.column === c.id ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                          }`}>{c.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Prioridad</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(PRIORITIES).map(([key, p]) => (
                      <button key={key} onClick={() => updateItem(item.id, { priority: key })}
                        className={`p-2 rounded-lg border text-xs transition ${
                          item.priority === key ? p.color : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                        }`}>{p.name}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={item.dueDate || ""} onChange={e => updateItem(item.id, { dueDate: e.target.value })}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  <input type="time" value={item.dueTime || ""} onChange={e => updateItem(item.id, { dueTime: e.target.value })}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>

                <button onClick={() => setEditingItem(null)} className="w-full px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-400">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

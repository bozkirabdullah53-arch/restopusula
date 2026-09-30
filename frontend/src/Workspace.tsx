import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import {
  LayoutDashboard,
  Store,
  ReceiptText,
  UtensilsCrossed,
  Package,
  ShoppingBag,
  Wallet,
  CircleDollarSign,
  ChartNoAxesCombined,
  Users,
  Truck,
  Settings2,
  Sparkles,
  Bell,
  Search,
  Plus,
  CalendarDays,
  ChevronRight,
  ChevronsUpDown,
  Ellipsis,
  BookOpen,
  RefreshCw,
  LogOut,
  LoaderCircle,
  Check,
  Info,
  Compass,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandDialog,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  AppData,
  Row,
  emptyData,
  today,
  range,
  metrics,
  insights,
  money,
  byKind,
  branchName,
  num,
} from "@/lib/domain";
import Dashboard from "./Dashboard";
import WorkspaceIntro from "./WorkspaceIntro";
import { roleLabel, displayDate } from "@/lib/presentation";
import Modules from "./Modules";
import { ActionDialog, FormSpec, formFor, FieldInput } from "./forms";

const groups = [
  {
    label: "YÖNETİM",
    items: [
      { id: "dashboard", name: "Genel bakış", icon: LayoutDashboard },
      { id: "branches", name: "Şubeler", icon: Store },
      { id: "reports", name: "Raporlar", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "OPERASYON",
    items: [
      { id: "sales", name: "Satış ve masalar", icon: ReceiptText },
      { id: "products", name: "Ürünler ve tarifler", icon: UtensilsCrossed },
      { id: "inventory", name: "Stok ve fire", icon: Package },
      { id: "purchases", name: "Satın alma", icon: ShoppingBag },
    ],
  },
  {
    label: "FİNANS",
    items: [
      { id: "accounts", name: "Kasa ve banka", icon: Wallet },
      { id: "expenses", name: "Giderler ve ödemeler", icon: CircleDollarSign },
      { id: "budget", name: "Bütçe ve vergi", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "EKİP ve KAYNAKLAR",
    items: [
      { id: "employees", name: "Personel ve puantaj", icon: Users },
      { id: "resources", name: "Araç ve enerji", icon: Truck },
    ],
  },
];
const descriptions: Row = {
  dashboard: "Satıştan servise, tüm şubeleriniz aynı masada.",
  branches: "Şubelerinizin performansını ve kaynaklarını merkezden yönetin.",
  sales: "Masa, adisyon ve tahsilat akışınızı aynı ekranda yönetin.",
  products: "Ürün tariflerini, malzeme miktarlarını ve satış maliyetini birlikte yönetin.",
  inventory: "Taze stok, kontrollü fire, izlenebilir hareketler.",
  purchases: "Talep ve teslimat arasında kaybolan hiçbir kayıt olmasın.",
  accounts: "Nakit, banka ve kart tahsilatlarının kontrolü sizde.",
  expenses: "Giderlerinizi, faturalarınızı ve vadelerinizi birlikte izleyin.",
  budget: "Planlananla gerçekleşeni karşılaştırın; mali takviminizi izleyin.",
  employees: "Ekibiniz, çalışma saatleri ve personel kartları.",
  resources: "Araç, yakıt ve enerji maliyetlerini görünür kılın.",
  reports: "Kayıtlarınızdan üretilen, paylaşmaya hazır raporlar.",
  settings: "İşletme bilgileri, kullanıcılar ve işlem geçmişi.",
};
const newActions = [
  ["branch", "Şube ekle"],
  ["product", "Ürün ekle"],
  ["material", "Malzeme / stok ekle"],
  ["expense", "Gider / fatura ekle"],
  ["purchase", "Satın alma talebi"],
  ["employee", "Personel ekle"],
];
const actionModules: Row = {
  branch: "branches",
  product: "products",
  recipe: "products",
  material: "inventory",
  move: "inventory",
  account: "accounts",
  account_tx: "accounts",
  expense: "expenses",
  pay_expense: "expenses",
  reverse_expense: "expenses",
  reverse_sale: "sales",
  supplier: "purchases",
  purchase: "purchases",
  purchase_status: "purchases",
  employee: "employees",
  attendance: "employees",
  budget: "budget",
  tax: "budget",
  vehicle: "resources",
  fuel: "resources",
  utility: "resources",
  member: "settings",
  company: "settings",
  table: "sales",
};
function Navigation({
  view,
  d,
  go,
  logout,
}: {
  view: string;
  d: AppData;
  go: (s: string) => void;
  logout: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  const nav = (s: string) => {
    go(s);
    setOpenMobile(false);
  };
  const allowed = (s: string) => !d.user || d.user.permissions?.[s]?.view;
  return (
    <Sidebar className="mise-sidebar">
      <SidebarHeader className="brand-area">
        <button className="brand" onClick={() => nav("dashboard")}>
          <span className="brand-icon">
            <Compass size={23} />
          </span>
          <span>
            resto<span className="orange">pusula</span>
            <small>RESTORAN YÖNETİMİ</small>
          </span>
        </button>
        <button
          className="workspace-choice"
          onClick={() => nav(allowed("settings") ? "settings" : "branches")}
        >
          <span className="workspace-mark">
            {d.tenant?.name?.charAt(0) || "R"}
          </span>
          <span>
            <strong>{d.tenant?.name || "İşletme çalışma alanı"}</strong>
            <small>Merkez yönetimi</small>
          </span>
          <ChevronsUpDown size={15} />
        </button>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const items = g.items.filter((i) => allowed(i.id));
          return items.length ? (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((i) => (
                  <SidebarMenuItem key={i.id}>
                    <SidebarMenuButton
                      isActive={
                        view === i.id ||
                        (view.startsWith("report-") && i.id === "reports")
                      }
                      className="nav-item"
                      onClick={() => nav(i.id)}
                    >
                      <i.icon size={18} />
                      <span>{i.name}</span>
                      {view === i.id && <span className="nav-indicator" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ) : null;
        })}
      </SidebarContent>
      <SidebarFooter>
        {allowed("assistant") && (
          <Button
            className="assistant-nav"
            variant="ghost"
            onClick={() => nav("assistant")}
          >
            <Sparkles size={18} />
            Yönetim asistanı<span className="small-tag">ÖZET</span>
          </Button>
        )}
        {allowed("settings") && (
          <button className="settings-nav" onClick={() => nav("settings")}>
            <Settings2 size={17} />
            Ayarlar ve yetkiler
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="profile">
              <span className="avatar">{d.user?.name?.charAt(0) || "R"}</span>
              <span>
                <strong>{d.user?.name || "Merkez yönetimi"}</strong>
                <small>{roleLabel(d.user?.role || "Patron")}</small>
              </span>
              <Ellipsis size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top">
            {d.user ? (
              <>
                <DropdownMenuItem onClick={() => nav("settings")}>
                  Hesap bilgileri
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut size={16} />
                  Çıkış yap
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => nav("login")}>
                Giriş yap
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const offlinePreview =
  window.location.protocol === "file:" ||
  Boolean((window as any).__RESTOPUSULA_PREVIEW__);
export default function Workspace() {
  const [d, setData] = useState<AppData>(emptyData),
    [auth, setAuth] = useState<Row | null>(null),
    [csrf, setCsrf] = useState(""),
    [view, setView] = useState(
      new URLSearchParams(window.location.search).get("view") || "dashboard",
    ),
    [branch, setBranch] = useState("all"),
    [period, setPeriod] = useState("month"),
    [start, setStart] = useState(today().slice(0, 7) + "-01"),
    [end, setEnd] = useState(today()),
    [form, setForm] = useState<FormSpec | null>(null),
    [authMode, setAuthMode] = useState(""),
    [authValues, setAuthValues] = useState<Row>({}),
    [authError, setAuthError] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(""),
    [command, setCommand] = useState(false),
    [notifications, setNotifications] = useState(false),
    [assistant, setAssistant] = useState(false),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState("");
  const pending = useRef(new Map<string, string>());
  async function request(path: string, body?: Row, token = csrf) {
    let r: Response;
    try {
      r = await fetch(path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        headers: body
          ? { "Content-Type": "application/json", "X-CSRF-Token": token }
          : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(
        "Uygulama sunucusuna ulaşılamıyor. Bağlantıyı kontrol edin.",
      );
    }
    let data: Row;
    try {
      data = await r.json();
    } catch {
      throw new Error("Sunucu yanıtı okunamadı.");
    }
    if (!r.ok)
      throw new Error(
        typeof data.detail === "string" ? data.detail : "İşlem tamamlanamadı.",
      );
    return data;
  }
  const refresh = useCallback(async () => {
    if (offlinePreview) return;
    setBusy(true);
    try {
      const r = await fetch("/api/state");
      if (r.status === 401) {
        setData(emptyData);
        return;
      }
      const s = await r.json();
      if (!r.ok) throw new Error(s.detail || "Veriler yüklenemedi.");
      setData(s);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (offlinePreview) return;
    void (async () => {
      try {
        const r = await fetch("/api/auth/me");
        if (!r.ok) return;
        const a = await r.json();
        setAuth(a.user);
        setCsrf(a.csrf);
        if (a.user.must_change) setAuthMode("password");
        else await refresh();
      } catch {
        setLoadError("Uygulama sunucusu henüz çalışmıyor.");
      }
    })();
  }, [refresh]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const handler = () =>
      setView(
        new URLSearchParams(window.location.search).get("view") || "dashboard",
      );
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  function go(s: string) {
    if (["login", "register", "password"].includes(s)) {
      setAuthMode(s);
      setAuthError("");
      return;
    }
    if (s === "assistant") {
      setAssistant(true);
      return;
    }
    const check = s.startsWith("report-") ? "reports" : s;
    if (d.user && !d.user.permissions?.[check]?.view) {
      toast.error("Bu ekran için yetkiniz yok.");
      return;
    }
    setView(s);
    if (!offlinePreview) window.history.pushState({}, "", `?view=${s}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function open(a: string, preset: Row = {}) {
    if (["login", "register", "password"].includes(a)) {
      go(a);
      return;
    }
    if (offlinePreview) {
      setForm(formFor(a, d, branch, preset));
      return;
    }
    if (!auth) {
      setAuthMode("register");
      return;
    }
    const mod = actionModules[a];
    if (mod && !d.user?.permissions?.[mod]?.view) {
      toast.error("Bu işlem için yetkiniz yok.");
      return;
    }
    setForm(formFor(a, d, branch, preset));
  }
  async function act(p: Row) {
    if (offlinePreview)
      throw new Error(
        "Kayıt işlemleri için Baslat.cmd ile çalışan uygulamayı açın.",
      );
    if (!auth) {
      setAuthMode("register");
      throw new Error("Önce çalışma alanınıza giriş yapın.");
    }
    const key = JSON.stringify(p);
    const requestId = pending.current.get(key) || crypto.randomUUID();
    pending.current.set(key, requestId);
    try {
      await request("/api/action", { ...p, request_id: requestId });
      pending.current.delete(key);
      toast.success("İşlem kaydedildi.");
      await refresh();
    } catch (e) {
      throw e;
    }
  }
  async function logout() {
    try {
      await request("/api/auth/logout", {});
      setAuth(null);
      setCsrf("");
      setData(emptyData);
      setView("dashboard");
      setBranch("all");
      toast.success("Oturum kapatıldı.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function authenticate(e: FormEvent) {
    e.preventDefault();
    if (offlinePreview) {
      setAuthError(
        "Hesap oluşturmak veya giriş yapmak için Baslat.cmd ile çalışan uygulamayı açın.",
      );
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const path =
        authMode === "password"
          ? "/api/auth/password"
          : authMode === "register"
            ? "/api/auth/register"
            : "/api/auth/login";
      const a = await request(path, authValues);
      setAuth(a.user);
      setCsrf(a.csrf);
      setAuthValues({});
      if (a.user.must_change) setAuthMode("password");
      else {
        setAuthMode("");
        await refresh();
        toast.success(
          authMode === "register"
            ? "İşletme çalışma alanınız hazır."
            : "Giriş başarılı.",
        );
      }
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function upload(file: File, b: string, record = "") {
    if (offlinePreview) {
      toast.info("Belge yüklemek için Baslat.cmd ile çalışan uygulamayı açın.");
      return;
    }
    if (!auth) {
      open("login");
      return;
    }
    if (b === "all") {
      toast.error("Belge yüklemek için şube filtresinden bir şube seçin.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("branch_id", b);
    fd.append("record_id", record);
    try {
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: fd,
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.detail);
      toast.success("Belge kaydedildi.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const alerts = insights(d, branch),
    active = groups.flatMap((g) => g.items).find((i) => i.id === view),
    title =
      view === "dashboard"
        ? "İşletmenize bir bakış"
        : view === "settings"
          ? "Ayarlar ve yetkiler"
          : view.startsWith("report-")
            ? "Rapor ön izlemesi"
            : active?.name || "Genel bakış";
  const m = metrics(d, branch, period, start, end),
    allowed = (s: string) => !d.user || d.user.permissions?.[s]?.view;
  function ask(q = question) {
    if (!q.trim()) return;
    const s = q.toLocaleLowerCase("tr");
    let answer = "";
    if (s.includes("şube") || s.includes("gider")) {
      const bs = d.branches
        .map((b) => ({ name: b.name, ...metrics(d, b.id, period, start, end) }))
        .filter((b) => b.spend != null)
        .sort((a, b) => (b.spend || 0) - (a.spend || 0));
      answer = bs.length
        ? `Seçili dönemde kayıtlı en yüksek işletme gideri ${bs[0].name}: ${money(bs[0].spend)}. Karşılaştırma ${m.r.start}–${m.r.end} tarihlerini kapsıyor.`
        : "Bu hesaplama için gerekli gider verisi bulunmuyor.";
    } else if (s.includes("stok") || s.includes("fire")) {
      answer = m.critical.length
        ? m.critical
            .map(
              (i) =>
                `${i.material.name}: ${num(i.quantity)} ${i.material.unit} (${branchName(d, i.branch_id)}).`,
            )
            .join("\n")
        : "Kayıtlı stoklarda kritik alt sınır uyarısı yok. Kayıtsız stoklar için durum belirlenemez.";
    } else if (s.includes("ödeme") || s.includes("fatura")) {
      answer = m.upcoming.length
        ? `Önümüzdeki 7 gün ve geciken kayıtlar: ${m.upcoming.map((e) => `${e.name} ${money(e.amount_cents)} (${displayDate(e.due_date)})`).join("; ")}.`
        : "Bu dönem için kayıtlı yaklaşan ödeme bulunmuyor.";
    } else if (s.includes("ürün") || s.includes("satan")) {
      const ids = new Set(m.sales.map((x) => x.id));
      const products = d.products
        .map((pr) => ({
          name: pr.name,
          qty: d.saleItems
            .filter((i) => i.product_id === pr.id && ids.has(i.sale_id))
            .reduce((n, i) => n + i.quantity, 0),
        }))
        .filter((p) => p.qty > 0)
        .sort((a, b) => b.qty - a.qty);
      answer = products.length
        ? `Seçili dönemde kayıtlı en çok satan ürün: ${products[0].name}, ${num(products[0].qty)} satış birimi.`
        : "Bu hesaplama için gerekli satış verisi bulunmuyor.";
    } else if (
      s.includes("kâr") ||
      s.includes("kar") ||
      s.includes("ciro") ||
      s.includes("özet")
    ) {
      answer =
        m.gross === null
          ? "Bu hesaplama için gerekli satış verisi bulunmuyor."
          : `KDV dahil ciro: ${money(m.gross)}. KDV hariç işletme gideri: ${money(m.spend)}. Kayıtlı işletme sonucu: ${money(m.result)}.${m.result === null ? " Ürün tarifi veya maliyet verisi eksik; kâr hesaplanmadı." : ""}`;
    } else
      answer =
        "Şube giderleri, en çok satan ürün, kritik stok, yaklaşan ödeme veya ciro hakkında soru sorabilirsiniz. Özetler kayıtlı verilerden hesaplanır.";
    setQuestion(q);
    setAnswer(answer);
  }
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "read_restaurant_summary",
          title: "İşletme özetini oku",
          description:
            "Seçili tarih aralığı ve şubenin kayıtlı cirosunu, giderini ve uyarılarını okur. Eksik veride null döner.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute(input: unknown) {
            if (input && Object.keys(input as object).length)
              throw new Error("Parametre kabul edilmez.");
            return {
              start: m.r.start,
              end: m.r.end,
              branch: branch,
              revenueCents: m.gross,
              expensesCents: m.spend,
              resultCents: m.result,
              alerts: alerts.map((a) => ({ title: a.title, text: a.text })),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [d, branch, period, start, end]);
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}
    >
      <Navigation view={view} d={d} go={go} logout={logout} />
      <SidebarInset className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-trigger" />
            <span>Çalışma alanı</span>
            <ChevronRight size={14} />
            <strong>{active?.name || title}</strong>
          </div>
          <div className="topbar-right">
            <button className="search-button" onClick={() => setCommand(true)}>
              <Search size={17} />
              <span>Panelde ara</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Verileri yenile"
              onClick={() => refresh()}
            >
              <RefreshCw size={17} className={busy ? "animate-spin" : ""} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Bildirimler"
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {alerts.length > 0 && <span>{alerts.length}</span>}
            </button>
            {auth ? (
              <button
                className="top-avatar"
                onClick={() => open("password")}
                title="Şifre değiştir"
              >
                {auth.name.charAt(0)}
              </button>
            ) : (
              <Button
                className="login-button"
                variant="outline"
                onClick={() => open("login")}
              >
                Giriş yap
              </Button>
            )}
          </div>
        </header>
        <main className="page-content">
          {offlinePreview && (
            <div className="offline-preview-note">
              <Info size={16} />
              <span>
                Görsel ön izleme · Kayıt ve ödeme işlemleri için Baslat.cmd ile
                uygulamayı açın.
              </span>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {branch === "all"
                  ? "MERKEZ YÖNETİMİ"
                  : branchName(d, branch).toLocaleUpperCase("tr")}
              </div>
              <h1>
                {title}
                <span className="orange">.</span>
              </h1>
              <p>{descriptions[view] || "Kayıtlarınızı güvenle inceleyin."}</p>
            </div>
            <div className="heading-actions">
              {allowed("assistant") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssistant(true);
                    ask("Yönetici özeti");
                  }}
                >
                  <BookOpen size={16} />
                  Yönetici özeti
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus size={17} />
                    Yeni işlem
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {newActions
                    .filter(([a]) => allowed(actionModules[a]))
                    .map(([a, l]) => (
                      <DropdownMenuItem key={a} onClick={() => open(a)}>
                        {l}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <WorkspaceIntro view={view} d={d} branch={branch} go={go} />
          <div className="filterbar">
            <div className="filter-start">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger
                  className="branch-picker"
                  aria-label="Şube filtresi"
                >
                  <Store size={16} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm şubeler</SelectItem>
                  {d.branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger
                  className="period-picker"
                  aria-label="Tarih aralığı"
                >
                  <CalendarDays size={16} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["today", "Bugün"],
                    ["yesterday", "Dün"],
                    ["week", "Son 7 gün"],
                    ["30", "Son 30 gün"],
                    ["month", "Bu ay"],
                    ["previous", "Geçen ay"],
                    ["year", "Bu yıl"],
                    ["custom", "Özel tarih aralığı"],
                  ].map(([id, l]) => (
                    <SelectItem key={id} value={id}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period === "custom" && (
                <div className="custom-range">
                  <Input
                    aria-label="Başlangıç tarihi"
                    type="date"
                    value={start}
                    max={end}
                    onChange={(e) => setStart(e.target.value)}
                  />
                  <Input
                    aria-label="Bitiş tarihi"
                    type="date"
                    value={end}
                    min={start}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              )}
            </div>
            <span className="sync-text">
              {busy
                ? "Güncelleniyor..."
                : auth
                  ? "Kayıtlı veriler"
                  : "Kayıtlarınızla güncellenir"}
              <span className="date-text">
                {new Date().toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Europe/Istanbul",
                })}
              </span>
            </span>
          </div>
          {loadError && (
            <div className="error-banner" role="alert">
              <Info size={18} />
              {loadError}
              <Button variant="outline" onClick={() => refresh()}>
                Yeniden dene
              </Button>
            </div>
          )}
          {view === "dashboard" ? (
            <Dashboard
              d={d}
              branch={branch}
              period={period}
              start={start}
              end={end}
              go={go}
              open={open}
            />
          ) : (
            <Modules
              key={view}
              view={view}
              d={d}
              branch={branch}
              period={period}
              start={start}
              end={end}
              open={open}
              act={act}
              go={go}
              upload={upload}
            />
          )}
          <footer className="page-footer">
            <span>
              restopusula <span className="footer-divider">/</span> İşletmenizin
              kontrol merkezi
            </span>
            <span>Göstergeler yalnızca kayıtlı verileri kapsar.</span>
          </footer>
        </main>
      </SidebarInset>
      <ActionDialog spec={form} onClose={() => setForm(null)} onSubmit={act} />
      <Dialog
        open={!!authMode}
        onOpenChange={(v) => {
          if (!v && !auth?.must_change) setAuthMode("");
        }}
      >
        <DialogContent
          className="auth-dialog"
          showCloseButton={!auth?.must_change}
        >
          <DialogHeader>
            <span className="auth-symbol">
              <Compass size={28} />
            </span>
            <DialogTitle>
              {authMode === "register"
                ? "İşletmenizi RestoPusula’ya bağlayın."
                : authMode === "password"
                  ? "Şifrenizi yenileyin."
                  : "Çalışma alanınıza hoş geldiniz."}
            </DialogTitle>
            <DialogDescription>
              {authMode === "register"
                ? "Hesabınızı oluşturun; ilk şubenizi birlikte tanımlayalım."
                : authMode === "password"
                  ? "Hesabınıza ait güvenli bir şifre belirleyin."
                  : "Satış, stok ve finans verilerinize güvenle erişin."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={authenticate}>
            {(authMode === "register"
              ? [
                  { key: "name", label: "Ad soyad" },
                  { key: "company", label: "İşletme adı" },
                  { key: "email", label: "E-posta", type: "email" },
                  {
                    key: "password",
                    label: "Şifre",
                    type: "password",
                    help: "En az 10 karakter.",
                  },
                ]
              : authMode === "password"
                ? [
                    {
                      key: "current",
                      label: "Mevcut / geçici şifre",
                      type: "password",
                    },
                    {
                      key: "password",
                      label: "Yeni şifre",
                      type: "password",
                      help: "En az 10 karakter.",
                    },
                  ]
                : [
                    { key: "email", label: "E-posta", type: "email" },
                    { key: "password", label: "Şifre", type: "password" },
                  ]
            ).map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={authValues[f.key]}
                onChange={(v) => setAuthValues((s) => ({ ...s, [f.key]: v }))}
              />
            ))}
            {authError && (
              <p role="alert" className="form-error">
                {authError}
              </p>
            )}
            <Button className="auth-submit" disabled={authBusy}>
              {authBusy && <LoaderCircle size={17} className="animate-spin" />}
              {authMode === "register"
                ? "Çalışma alanını oluştur"
                : authMode === "password"
                  ? "Şifreyi değiştir"
                  : "Giriş yap"}
            </Button>
          </form>
          {authMode !== "password" && (
            <div className="auth-switch">
              {authMode === "register"
                ? "Zaten hesabınız var mı?"
                : "Henüz hesabınız yok mu?"}
              <button
                onClick={() => {
                  setAuthMode(authMode === "register" ? "login" : "register");
                  setAuthError("");
                }}
              >
                {authMode === "register"
                  ? "Giriş yap"
                  : "İşletme hesabı oluştur"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CommandDialog
        open={command}
        onOpenChange={setCommand}
        title="Panelde ara"
        description="Bir modül veya ürün arayın."
      >
        <CommandInput placeholder="Şube, stok, rapor..." />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          <CommandGroup heading="Modüller">
            {groups
              .flatMap((g) => g.items)
              .filter((i) => allowed(i.id))
              .map((i) => (
                <CommandItem
                  key={i.id}
                  onSelect={() => {
                    go(i.id);
                    setCommand(false);
                  }}
                >
                  <i.icon size={17} />
                  {i.name}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Sheet open={notifications} onOpenChange={setNotifications}>
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <SheetTitle>Bildirimler ve uyarılar</SheetTitle>
            <SheetDescription>
              Kayıtlı stok, bütçe ve ödeme verilerinden oluşturulur.
            </SheetDescription>
          </SheetHeader>
          <div className="sheet-body">
            {alerts.length ? (
              alerts.map((a) => (
                <button
                  className={"insight " + a.type}
                  key={a.id}
                  onClick={() => {
                    go(a.view);
                    setNotifications(false);
                  }}
                >
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.text}</p>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))
            ) : (
              <div className="assistant-empty">
                <Check size={30} />
                <h3>Kayıtlı kritik uyarı yok.</h3>
                <p>
                  Eksik veya kaydedilmemiş işlemler için durum belirlenemez.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={assistant} onOpenChange={setAssistant}>
        <SheetContent className="detail-sheet assistant-sheet">
          <SheetHeader>
            <span className="sparkle-icon">
              <Sparkles size={24} />
            </span>
            <SheetTitle>Yönetim asistanı</SheetTitle>
            <SheetDescription>
              İşletmenizin kayıtlarından hesaplanan özetler.
            </SheetDescription>
          </SheetHeader>
          <div className="sheet-body">
            <div className="assistant-notice">
              <Info size={17} />
              <span>
                Bu sürümde veri analizi çalışır. Dil modeli bağlantısı henüz
                kurulmadı.
              </span>
            </div>
            <div className="prompt-buttons">
              {[
                "Bu ay hangi şubenin gideri yüksek?",
                "En çok satan ürün hangisi?",
                "Kritik stokları göster",
                "Yaklaşan ödemeler neler?",
              ].map((q) => (
                <button key={q} onClick={() => ask(q)}>
                  {q}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
            {answer ? (
              <div className="assistant-answer">
                <span className="eyebrow">KAYITLI VERİ ANALİZİ</span>
                <p>{answer}</p>
                <small>
                  {displayDate(m.r.start)} – {displayDate(m.r.end)} ·{" "}
                  {branch === "all" ? "Tüm şubeler" : branchName(d, branch)}
                </small>
              </div>
            ) : (
              <div className="assistant-empty">
                <Sparkles size={28} />
                <h3>Veriyi birlikte yorumlayalım.</h3>
                <p>Bir soru seçin veya aşağıya yazın.</p>
              </div>
            )}
          </div>
          <form
            className="assistant-question"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <Input
              aria-label="Asistana soru"
              placeholder="İşletmeniz hakkında sorun..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button type="submit">Sor</Button>
          </form>
        </SheetContent>
      </Sheet>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  );
}

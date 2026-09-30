import {
  ReceiptText,
  Wallet,
  TrendingUp,
  UtensilsCrossed,
  Store,
  Plus,
  ChartNoAxesCombined,
  Sparkles,
  Check,
  ChevronRight,
  Package,
  CalendarDays,
  Building2,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { displayDate } from "@/lib/presentation";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  AppData,
  Row,
  metrics,
  money,
  insights,
  branchName,
  today,
  dayPlus,
  num,
} from "@/lib/domain";

export function Blank({
  icon: Icon = Package,
  title,
  text,
  action,
  label = "İlk kaydı ekle",
}: {
  icon?: any;
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <Empty className="small-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon size={24} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <Button variant="outline" onClick={action}>
          <Plus size={16} />
          {label}
        </Button>
      )}
    </Empty>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
export function Metric({
  title,
  value,
  sub,
  icon: Icon,
  primary = false,
}: {
  title: string;
  value: string;
  sub: string;
  icon?: any;
  primary?: boolean;
}) {
  return (
    <article className={"kpi-card " + (primary ? "primary-kpi" : "")}>
      <div className="kpi-label">
        {title}
        {Icon && <Icon size={19} />}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </article>
  );
}
export function PanelHeading({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
export default function Dashboard({
  d,
  branch,
  period,
  start,
  end,
  go,
  open,
}: {
  d: AppData;
  branch: string;
  period: string;
  start: string;
  end: string;
  go: (s: string) => void;
  open: (s: string, preset?: Row) => void;
}) {
  const m = metrics(d, branch, period, start, end),
    alerts = insights(d, branch);
  const days: Record<string, Row> = {};
  for (const s of m.sales) {
    days[s.date] ??= {
      date: s.date,
      label: s.date.slice(8) + "." + s.date.slice(5, 7),
      revenue: null,
      expense: null,
    };
    days[s.date].revenue = (days[s.date].revenue ?? 0) + s.total_cents;
  }
  for (const e of m.expenses) {
    days[e.date] ??= {
      date: e.date,
      label: e.date.slice(8) + "." + e.date.slice(5, 7),
      revenue: null,
      expense: null,
    };
    days[e.date].expense = (days[e.date].expense ?? 0) + e.net_cents;
  }
  const chart = Object.values(days).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const unfinished =
    !d.branches.length || !d.accounts.length || !d.products.length;
  return (
    <>
      {unfinished && (
        <div className="setup-strip">
          <span className="setup-symbol">
            <Store size={21} />
          </span>
          <div>
            <strong>
              {!d.tenant
                ? "İşletmenizin ilk adımını birlikte atalım."
                : "Çalışma alanınızı tamamlayın."}
            </strong>
            <p>
              {!d.tenant
                ? "Hesabınızı oluşturun; şubelerinizi, satışlarınızı ve stoklarınızı tek merkezde yönetin."
                : !d.branches.length
                  ? "Şubelerinizi ekleyerek işletmenizi merkezi yönetime bağlayın."
                  : "Satış için ürün ve tahsilat hesaplarınızı tamamlayın."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              d.tenant
                ? go(
                    !d.branches.length
                      ? "branches"
                      : !d.accounts.length
                        ? "accounts"
                        : "products",
                  )
                : open("register")
            }
          >
            {d.tenant ? "Kuruluma devam et" : "İşletmeyi kur"}
          </Button>
        </div>
      )}
      <div className="kpi-grid">
        <Metric
          primary
          title="Toplam ciro"
          value={money(m.gross)}
          sub="KDV dahil · kayıtlı satışlar"
          icon={ReceiptText}
        />
        <Metric
          title="İşletme giderleri"
          value={money(m.spend)}
          sub="KDV hariç · tahakkuk tarihi"
          icon={Wallet}
        />
        <Metric
          title="Kayıtlı işletme sonucu"
          value={money(m.result)}
          sub={
            m.result === null
              ? "Ürün tarifi / maliyet verisi gerekli"
              : "Vergi öncesi · kayıtlı giderler"
          }
          icon={TrendingUp}
        />
        <Metric
          title="Ortalama adisyon"
          value={
            m.gross === null ? "—" : money(Math.round(m.gross / m.sales.length))
          }
          sub={
            m.sales.length
              ? `${m.sales.length} tamamlanan satış`
              : "Satış kaydı bekleniyor"
          }
          icon={UtensilsCrossed}
        />
      </div>
      <div className="dashboard-middle">
        <section className="panel chart-panel">
          <PanelHeading
            title="Gelir ve gider akışı"
            sub="Kayıtlı günler · seçili dönem"
          >
            <div className="chart-legend">
              <span>
                <i className="orange-dot" />
                Ciro
              </span>
              <span>
                <i className="gray-dot" />
                Gider
              </span>
            </div>
          </PanelHeading>
          {chart.length ? (
            <div className="real-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chart}
                  margin={{ top: 12, right: 20, left: 4, bottom: 6 }}
                >
                  <CartesianGrid stroke="#e7e8de" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#748189" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("tr-TR", {
                        notation: "compact",
                      }).format(v / 100) + " ₺"
                    }
                    tick={{ fontSize: 12, fill: "#748189" }}
                  />
                  <Tooltip
                    formatter={(v: any, n: any) => [
                      money(v),
                      n === "revenue" ? "Ciro" : "Gider",
                    ]}
                  />
                  <Line
                    dataKey="revenue"
                    stroke="#b94c35"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    dataKey="expense"
                    stroke="#356f5b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-chart">
              <div className="chart-grid" />
              <div className="chart-empty-content">
                <span className="empty-icon">
                  <ChartNoAxesCombined size={25} />
                </span>
                <strong>İlk satışınızla tablo netleşir.</strong>
                <p>Grafik, kaydedilen satış ve giderlerden oluşacak.</p>
                <Button variant="outline" onClick={() => go("sales")}>
                  <Plus size={16} />
                  Satış kaydet
                </Button>
              </div>
            </div>
          )}
          <div className="chart-footer">
            <span>{displayDate(m.r.start)}</span>
            <span>{displayDate(m.r.end)}</span>
          </div>
        </section>
        <section className="panel important-panel">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <span className="sparkle-icon">
                <Sparkles size={19} />
              </span>
              <h2>Öncelikli konular</h2>
            </div>
            <Pill tone={alerts.length ? "warning" : "neutral"}>
              {alerts.length ? `${alerts.length} konu` : "Veri bekleniyor"}
            </Pill>
          </div>
          <p className="important-intro">Dikkat gerektiren stok, bütçe ve ödeme konuları.</p>
          {alerts.length ? (
            <div className="insight-list">
              {alerts.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  className={"insight " + a.type}
                  onClick={() => go(a.view)}
                >
                  <span className="insight-marker" />
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.text}</p>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="important-empty">
              <Check size={24} />
              <h3>
                {d.sales.length
                  ? "Kayıtlı verilerde kritik uyarı yok."
                  : "Önce doğru veriler."}
              </h3>
              <p>
                Uyarılar ve özetler yalnızca işletmenizin kayıtlarından
                üretilir.
              </p>
            </div>
          )}
          <div className="quick-links">
            <button onClick={() => go("branches")}>
              <Store size={16} />
              <span>Şubeleri yönet</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => go("inventory")}>
              <Package size={16} />
              <span>Stok ve fireyi kontrol et</span>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => go("accounts")}>
              <Wallet size={16} />
              <span>Kasa ve banka hesapları</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </section>
      </div>
      <div className="balance-strip">
        {[
          ["Nakit kasa", m.cash, Wallet],
          ["Banka bakiyesi", m.bank, Building2],
          ["POS / kart bakiyesi", m.pos, ReceiptText],
          ["Kayıtlı personel gideri", m.labor, UtensilsCrossed],
        ].map(([name, v, Icon]) => (
          <div key={name as string}>
            {typeof Icon !== "string" && typeof Icon !== "number" && Icon && (
              <Icon size={17} />
            )}
            <span>
              {name as string}
              <strong>{money(v as number | null)}</strong>
            </span>
          </div>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel branch-panel">
          <PanelHeading
            title="Şube performansı"
            sub="Aynı dönem, net bir karşılaştırma."
          >
            <button className="text-button" onClick={() => go("branches")}>
              Şubeleri yönet
            </button>
          </PanelHeading>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Şube</TableHead>
                <TableHead>Ciro</TableHead>
                <TableHead>Gider</TableHead>
                <TableHead>Brüt katkı</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.branches
                .filter((b) => branch === "all" || b.id === branch)
                .map((b, i) => {
                  const bm = metrics(d, b.id, period, start, end),
                    critical = insights(d, b.id).length;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <button
                          className="branch-cell"
                          onClick={() => go("branches")}
                        >
                          <span
                            className={"branch-number branch-color-" + (i % 4)}
                          >
                            0{i + 1}
                          </span>
                          <strong>{b.name}</strong>
                        </button>
                      </TableCell>
                      <TableCell>{money(bm.gross)}</TableCell>
                      <TableCell>{money(bm.spend)}</TableCell>
                      <TableCell>{money(bm.contribution)}</TableCell>
                      <TableCell>
                        <Pill
                          tone={
                            critical
                              ? "warning"
                              : bm.sales.length
                                ? "success"
                                : "neutral"
                          }
                        >
                          {critical
                            ? `${critical} uyarı`
                            : bm.sales.length
                              ? "Kayıt var"
                              : "Veri bekleniyor"}
                        </Pill>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!d.branches.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Blank
                      icon={Store}
                      title="Şubeleriniz için yer hazır."
                      text="İlk şubenizi ekleyerek karşılaştırmayı başlatın."
                      action={() => open("branch")}
                      label="Şube ekle"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
        <section className="panel payments-panel">
          <PanelHeading title="Yaklaşan ödemeler">
            <Pill>7 gün</Pill>
          </PanelHeading>
          {m.upcoming.length ? (
            <div className="payment-list">
              {m.upcoming.slice(0, 4).map((e) => (
                <button key={e.id} onClick={() => go("expenses")}>
                  <span className="payment-icon">
                    <CalendarDays size={17} />
                  </span>
                  <div>
                    <strong>{e.name}</strong>
                    <small>
                      {displayDate(e.due_date)} · {branchName(d, e.branch_id)}
                    </small>
                  </div>
                  <b>{money(e.amount_cents)}</b>
                </button>
              ))}
              <div className="payment-total">
                <span>Kayıtlı toplam</span>
                <strong>
                  {money(m.upcoming.reduce((n, e) => n + e.amount_cents, 0))}
                </strong>
              </div>
            </div>
          ) : (
            <div className="payment-empty">
              <CalendarDays size={28} />
              <h3>Ödeme takviminiz hazır.</h3>
              <p>Vadeli gider ve tedarikçi kayıtları burada görünecek.</p>
              <Button variant="outline" onClick={() => open("expense")}>
                <Plus size={15} />
                Ödeme ekle
              </Button>
            </div>
          )}
        </section>
      </div>
      <p className="calculation-note">
        <Info size={15} />
        Kâr göstergesi = KDV hariç kayıtlı satış − tarif maliyeti − KDV hariç
        işletme gideri. Eksik maliyette hesaplanmaz. Tedarikçi alış faturası
        gider olarak tekrar sayılmaz.
      </p>
    </>
  );
}

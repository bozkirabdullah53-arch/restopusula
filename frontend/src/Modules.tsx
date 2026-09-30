import { useState } from "react";
import {
  Store,
  Package,
  Plus,
  Wallet,
  Users,
  Truck,
  ReceiptText,
  ShoppingBag,
  UtensilsCrossed,
  FileDown,
  FileText,
  Check,
  ShieldCheck,
  CalendarDays,
  Flame,
  Search,
  RotateCcw,
  Upload,
  Lock,
  Plug,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  AppData,
  Row,
  byKind,
  branchName,
  currentCost,
  money,
  exactMoney,
  num,
  metrics,
  today,
  month,
} from "@/lib/domain";
import { Blank, Pill, Metric, PanelHeading } from "./Dashboard";
import Sales from "./Sales";
import { statusLabel, roleLabel, channelLabel, transactionLabel, auditActionLabel, auditDescription, noteLabel, displayDate } from "@/lib/presentation";

export type ViewProps = {
  d: AppData;
  branch: string;
  period: string;
  start: string;
  end: string;
  open: (a: string, p?: Row) => void;
  act: (p: Row) => Promise<void>;
  go: (v: string) => void;
  upload: (file: File, b: string, record?: string) => Promise<void>;
};
function DataTable({
  heads,
  rows: rs,
  empty,
}: {
  heads: string[];
  rows: React.ReactNode[][];
  empty?: React.ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {heads.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rs.map((r, i) => (
          <TableRow key={i}>
            {r.map((v, j) => (
              <TableCell key={j}>{v}</TableCell>
            ))}
          </TableRow>
        ))}
        {!rs.length && (
          <TableRow>
            <TableCell colSpan={heads.length}>
              {empty || (
                <Blank
                  title="Henüz kayıt bulunmuyor."
                  text="İlk kaydı eklediğinizde bu alan güncellenir."
                />
              )}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
const scoped = (p: ViewProps, k: string) =>
  byKind(p.d, k).filter(
    (e) =>
      p.branch === "all" || e.branch_id === p.branch || e.branch_id === null,
  );
export default function Modules(p: ViewProps & { view: string }) {
  const { view, d, branch, open, act, go } = p,
    m = metrics(d, branch, p.period, p.start, p.end),
    [query, setQuery] = useState("");
  const filter = (a: Row[]) =>
    a.filter((r) =>
      String(r.name)
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
    );
  const search = (
    <div className="table-search">
      <Search size={17} />
      <Input
        aria-label="Kayıtlarda ara"
        placeholder="Kayıtlarda ara..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
  if (view === "sales") return <Sales {...p} />;
  if (view === "branches")
    return (
      <>
        <div className="section-toolbar">
          <p>
            {d.branches.length} tanımlı şube · şube başına ayrı finans ve stok
          </p>
          <Button onClick={() => open("branch")}>
            <Plus size={16} />
            Şube ekle
          </Button>
        </div>
        <div className="branch-cards">
          {d.branches.map((b, i) => {
            const bm = metrics(d, b.id, p.period, p.start, p.end);
            return (
              <article className="panel branch-card" key={b.id}>
                <div className="branch-card-top">
                  <span className={"branch-number branch-color-" + (i % 4)}>
                    0{i + 1}
                  </span>
                  <Pill>
                    {bm.sales.length ? "Kayıt var" : "Veri bekleniyor"}
                  </Pill>
                </div>
                <h2>{b.name}</h2>
                <p>{b.address || "Adres eklenmedi"}</p>
                <div className="branch-card-metrics">
                  <div>
                    Ciro<strong>{money(bm.gross)}</strong>
                  </div>
                  <div>
                    Brüt katkı<strong>{money(bm.contribution)}</strong>
                  </div>
                  <div>
                    Nakit kasa<strong>{money(bm.cash)}</strong>
                  </div>
                </div>
                <div className="branch-card-bottom">
                  <span>{b.manager || "Müdür belirtilmedi"}</span>
                  <span>{b.phone || "—"}</span>
                </div>
              </article>
            );
          })}
          {!d.branches.length && (
            <div className="panel span-full">
              <Blank
                icon={Store}
                title="İlk şubenizi tanımlayın."
                text="İlk şubenizi ekleyin; satış, stok ve giderlerini aynı merkezden takip edin."
                action={() => open("branch")}
                label="Şube ekle"
              />
            </div>
          )}
        </div>
      </>
    );
  if (view === "products")
    return (
      <Tabs defaultValue="catalog">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="catalog">Ürünler</TabsTrigger>
            <TabsTrigger value="recipes">Ürün tarifleri</TabsTrigger>
            <TabsTrigger value="profit">Ürün kârlılığı</TabsTrigger>
          </TabsList>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("recipe")}>
              <Plus size={16} />
              Tarife malzeme ekle
            </Button>
            <Button onClick={() => open("product")}>
              <Plus size={16} />
              Ürün ekle
            </Button>
          </div>
        </div>
        <TabsContent value="catalog">
          <section className="panel">
            <PanelHeading
              title="Ürün kataloğu"
              sub="Satış fiyatı, güncel tarif maliyeti ve katkı."
            >
              {search}
            </PanelHeading>
            <DataTable
              heads={[
                "Ürün",
                "Kategori",
                "KDV dahil fiyat",
                "Tarif maliyeti",
                "KDV hariç katkı",
                "Ürün tarifi",
              ]}
              rows={filter(d.products).map((pr) => {
                const cost = currentCost(d, pr.id);
                return [
                  <div className="name-cell">
                    <span className="product-symbol">
                      <UtensilsCrossed size={17} />
                    </span>
                    <strong>{pr.name}</strong>
                  </div>,
                  pr.category,
                  exactMoney(pr.price_cents),
                  exactMoney(cost),
                  cost == null ? (
                    <Pill>Maliyet eksik</Pill>
                  ) : (
                    exactMoney(
                      Math.round(pr.price_cents / (1 + pr.vat_rate / 100)) -
                        cost,
                    )
                  ),
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open("recipe", { product_id: pr.id })}
                  >
                    Düzenle
                  </Button>,
                ];
              })}
              empty={
                <Blank
                  icon={UtensilsCrossed}
                  title="Menünüzü işletmenize bağlayın."
                  text="Ürünleri ekleyin, malzemelerle ürün tariflerini oluşturun."
                  action={() => open("product")}
                  label="Ürün ekle"
                />
              }
            />
          </section>
        </TabsContent>
        <TabsContent value="recipes">
          <section className="panel">
            <PanelHeading
              title="Ürün tarifi ve malzemeler"
              sub="Satışta her bileşen, kayıtlı birimiyle stoktan otomatik düşer."
            />
            <DataTable
              heads={[
                "Ürün",
                "Malzeme",
                "Bir satış biriminde",
                "Birim maliyet",
                "Bileşen maliyeti",
              ]}
              rows={d.recipes.map((r) => {
                const mat = d.materials.find((m) => m.id === r.material_id);
                return [
                  d.products.find((pr) => pr.id === r.product_id)?.name,
                  mat?.name,
                  `${num(r.quantity)} ${mat?.unit || ""}`,
                  exactMoney(mat?.cost_cents),
                  exactMoney(
                    mat?.cost_cents == null
                      ? null
                      : Math.round(mat.cost_cents * r.quantity),
                  ),
                ];
              })}
            />
          </section>
        </TabsContent>
        <TabsContent value="profit">
          <section className="panel">
            <PanelHeading
              title="Satılan ürünlerin katkısı"
              sub="Geçmiş maliyet, satış anındaki kayıtla korunur."
            />
            <DataTable
              heads={[
                "Ürün",
                "Satış miktarı",
                "KDV dahil tutar",
                "Satış maliyeti",
              ]}
              rows={d.products.map((pr) => {
                const ids = new Set(m.sales.map((s) => s.id)),
                  items = d.saleItems.filter(
                    (i) => i.product_id === pr.id && ids.has(i.sale_id),
                  );
                return [
                  pr.name,
                  num(items.reduce((n, i) => n + i.quantity, 0)),
                  items.length
                    ? money(
                        items.reduce(
                          (n, i) => n + Math.round(i.price_cents * i.quantity),
                          0,
                        ),
                      )
                    : "—",
                  items.length && items.every((i) => i.cost_cents != null)
                    ? money(items.reduce((n, i) => n + i.cost_cents, 0))
                    : "Maliyet verisi eksik",
                ];
              })}
            />
            <p className="panel-note">
              Ürün tutarı iskonto öncesidir. İşletme sonucu iskonto sonrası
              satış toplamından hesaplanır.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "inventory")
    return (
      <Tabs defaultValue="stock">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="stock">Stok görünümü</TabsTrigger>
            <TabsTrigger value="moves">Hareketler</TabsTrigger>
            <TabsTrigger value="waste">Fire ve sayım</TabsTrigger>
          </TabsList>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("move")}>
              <Plus size={16} />
              Stok hareketi
            </Button>
            <Button onClick={() => open("material")}>
              <Plus size={16} />
              Malzeme ekle
            </Button>
          </div>
        </div>
        <div className="mini-kpis">
          <Metric
            title="Kayıtlı malzeme"
            value={String(d.materials.length)}
            sub="Tüm malzeme kartları"
            icon={Package}
          />
          <Metric
            title="Kritik stok"
            value={String(m.critical.length)}
            sub="Tanımlı alt sınır ve altı"
            icon={Flame}
          />
          <Metric
            title="Stok değeri"
            value={
              m.stock.length &&
              m.stock.every((i) => i.material?.cost_cents != null)
                ? money(
                    m.stock.reduce(
                      (n, i) =>
                        n + Math.round(i.quantity * i.material.cost_cents),
                      0,
                    ),
                  )
                : "—"
            }
            sub="Güncel birim maliyetle"
            icon={Wallet}
          />
        </div>
        <TabsContent value="stock">
          <section className="panel">
            <PanelHeading
              title="Şube stokları"
              sub="Kg, gram, litre ve adet bazında izleme."
            >
              {search}
            </PanelHeading>
            <DataTable
              heads={[
                "Malzeme",
                "Şube",
                "Mevcut miktar",
                "Birim maliyet",
                "Alt sınır",
                "Durum",
                "İşlem",
              ]}
              rows={m.stock
                .filter(
                  (i) =>
                    i.material &&
                    i.material.name
                      .toLocaleLowerCase("tr")
                      .includes(query.toLocaleLowerCase("tr")),
                )
                .map((i) => [
                  <strong>{i.material.name}</strong>,
                  branchName(d, i.branch_id),
                  `${num(i.quantity)} ${i.material.unit}`,
                  exactMoney(i.material.cost_cents),
                  `${num(i.material.min_stock)} ${i.material.unit}`,
                  <Pill
                    tone={
                      i.quantity <= i.material.min_stock ? "warning" : "success"
                    }
                  >
                    {i.quantity <= i.material.min_stock ? "Kritik" : "Yeterli"}
                  </Pill>,
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      open("move", {
                        material_id: i.material_id,
                        branch_id: i.branch_id,
                      })
                    }
                  >
                    Hareket
                  </Button>,
                ])}
              empty={
                <Blank
                  icon={Package}
                  title="Stok kontrolünü başlatın."
                  text="Gerçek açılış miktarını ve malzeme birimini girin."
                  action={() => open("material")}
                  label="Malzeme ekle"
                />
              }
            />
          </section>
        </TabsContent>
        {["moves", "waste"].map((tab) => (
          <TabsContent value={tab} key={tab}>
            <section className="panel">
              <PanelHeading
                title={
                  tab === "moves"
                    ? "Stok hareket geçmişi"
                    : "Fire ve sayım farkları"
                }
              />
              <DataTable
                heads={["Tarih", "Malzeme", "Şube", "Tür", "Miktar", "Neden"]}
                rows={d.moves
                  .filter(
                    (x) =>
                      (branch === "all" || x.branch_id === branch) &&
                      (tab === "moves" || ["waste", "count"].includes(x.kind)),
                  )
                  .map((x) => [
                    displayDate(x.date),
                    d.materials.find((m) => m.id === x.material_id)?.name,
                    branchName(d, x.branch_id),
                    {
                      opening: "Açılış",
                      sale: "Tarife göre malzeme tüketimi",
                      sale_reversal: "Satış iadesi",
                      waste: "Fire",
                      count: "Sayım farkı",
                      in: "Giriş",
                      purchase: "Teslimat",
                      transfer_in: "Transfer giriş",
                      transfer_out: "Transfer çıkış",
                    }[x.kind as string] || transactionLabel(x.kind),
                    num(x.quantity),
                    x.reason,
                  ])}
              />
            </section>
          </TabsContent>
        ))}
      </Tabs>
    );
  if (view === "accounts")
    return (
      <>
        <div className="section-toolbar">
          <p>Hesap bakiyeleri açılış ve tüm hareketlerin toplamıdır.</p>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("account_tx")}>
              <Plus size={16} />
              Hareket ekle
            </Button>
            <Button onClick={() => open("account")}>
              <Plus size={16} />
              Hesap ekle
            </Button>
          </div>
        </div>
        <div className="account-cards">
          {m.accounts.map((a) => (
            <article
              className={"panel account-card account-" + a.type}
              key={a.id}
            >
              <div className="account-type">
                <Wallet size={20} />
                <Pill>
                  {
                    { cash: "NAKİT KASA", bank: "BANKA", pos: "POS / KART" }[
                      a.type as string
                    ]
                  }
                </Pill>
              </div>
              <h2>{a.name}</h2>
              <p>{branchName(d, a.branch_id)}</p>
              <strong className="account-balance">
                {exactMoney(a.balance)}
              </strong>
              <button
                className="text-button"
                onClick={() =>
                  open("account_tx", {
                    account_id: a.id,
                    branch_id: a.branch_id,
                  })
                }
              >
                Hareket kaydet
              </button>
            </article>
          ))}
          {!m.accounts.length && (
            <div className="panel span-full">
              <Blank
                icon={Wallet}
                title="Bakiyeleri görünür hâle getirin."
                text="Nakit, banka ve POS hesaplarını gerçek açılış bakiyesiyle ekleyin."
                action={() => open("account")}
                label="Hesap ekle"
              />
            </div>
          )}
        </div>
        <section className="panel">
          <PanelHeading
            title="Hesap hareketleri"
            sub="Tahsilat, ödeme, transfer ve ters kayıtlar."
          />
          <DataTable
            heads={["Tarih", "Hesap", "Şube", "İşlem", "Tutar", "Açıklama"]}
            rows={d.ledger
              .filter((x) => branch === "all" || x.branch_id === branch)
              .map((x) => [
                displayDate(x.date),
                d.accounts.find((a) => a.id === x.account_id)?.name,
                branchName(d, x.branch_id),
                transactionLabel(x.kind),
                <span
                  className={x.amount_cents >= 0 ? "text-green" : "text-red"}
                >
                  {exactMoney(x.amount_cents)}
                </span>,
                noteLabel(x.note),
              ])}
          />
        </section>
      </>
    );
  if (view === "expenses")
    return (
      <Tabs defaultValue="all">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="all">Tüm kayıtlar</TabsTrigger>
            <TabsTrigger value="pending">Ödeme takvimi</TabsTrigger>
            <TabsTrigger value="documents">Belgeler</TabsTrigger>
          </TabsList>
          <Button onClick={() => open("expense")}>
            <Plus size={16} />
            Gider / fatura ekle
          </Button>
        </div>
        <div className="mini-kpis">
          <Metric
            title="İşletme gideri"
            value={money(m.spend)}
            sub="Seçili dönem · KDV hariç"
            icon={Wallet}
          />
          <Metric
            title="Ödenecek toplam"
            value={
              d.expenses.some(
                (e) =>
                  e.status === "pending" &&
                  (branch === "all" || e.branch_id === branch),
              )
                ? money(
                    d.expenses
                      .filter(
                        (e) =>
                          e.status === "pending" &&
                          (branch === "all" || e.branch_id === branch),
                      )
                      .reduce((n, e) => n + e.amount_cents, 0),
                  )
                : "—"
            }
            sub="Tüm kayıtlı vadeler"
            icon={CalendarDays}
          />
          <Metric
            title="7 günlük ödeme"
            value={
              m.upcoming.length
                ? money(m.upcoming.reduce((n, e) => n + e.amount_cents, 0))
                : "—"
            }
            sub="Gecikenler dahil"
            icon={ReceiptText}
          />
        </div>
        {["all", "pending"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <section className="panel">
              <PanelHeading
                title={
                  tab === "all" ? "Gider ve fatura kayıtları" : "Ödeme takvimi"
                }
                sub="İptal edilen kayıtların geçmişi korunur."
              />
              <DataTable
                heads={[
                  "Açıklama",
                  "Şube",
                  "Kategori / tür",
                  "Tutar",
                  "Tarih / vade",
                  "Durum",
                  "İşlemler",
                ]}
                rows={d.expenses
                  .filter(
                    (e) =>
                      (branch === "all" || e.branch_id === branch) &&
                      (tab === "pending"
                        ? e.status === "pending"
                        : e.date >= m.r.start && e.date <= m.r.end),
                  )
                  .map((e) => [
                    <strong>{e.name}</strong>,
                    branchName(d, e.branch_id),
                    <div>
                      {e.category}
                      <small className="cell-sub">
                        {
                          {
                            expense: "İşletme gideri",
                            purchase: "Alış faturası",
                            tax: "Mali yükümlülük",
                          }[e.kind as string]
                        }
                      </small>
                    </div>,
                    exactMoney(e.amount_cents),
                    <div>
                      {e.date}
                      <small className="cell-sub">
                        Vade: {e.due_date || "—"}
                      </small>
                    </div>,
                    <Pill
                      tone={
                        e.status === "paid"
                          ? "success"
                          : e.status === "pending"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {
                        {
                          paid: "Ödendi",
                          pending: "Ödenecek",
                          reversed: "Ters kayıt",
                        }[e.status as string]
                      }
                    </Pill>,
                    <div className="row-actions">
                      {e.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            open("pay_expense", {
                              id: e.id,
                              branch_id: e.branch_id,
                            })
                          }
                        >
                          Öde
                        </Button>
                      )}
                      {e.status !== "reversed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Ters kayıt oluştur"
                          onClick={() =>
                            open("reverse_expense", {
                              id: e.id,
                              branch_id: e.branch_id,
                            })
                          }
                        >
                          <RotateCcw size={15} />
                        </Button>
                      )}
                    </div>,
                  ])}
                empty={
                  <Blank
                    icon={ReceiptText}
                    title="Giderleri, vadesiyle birlikte izleyin."
                    text="Faturalarınızı kaydedin; ödemeleriniz takviminize yansısın."
                    action={() => open("expense")}
                    label="İlk gideri ekle"
                  />
                }
              />
            </section>
          </TabsContent>
        ))}
        <TabsContent value="documents">
          <section className="panel">
            <PanelHeading
              title="Fatura ve belgeler"
              sub="PDF, JPEG veya PNG · en fazla 10 MB"
            />
            <div className="upload-area">
              <Upload size={26} />
              <div>
                <strong>Fatura veya belge ekleyin.</strong>
                <p>
                  Şube filtresinden bir şube seçin, ardından dosyanızı yükleyin.
                </p>
              </div>
              <label className="file-upload-button">
                Dosya seç
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) p.upload(f, branch);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <DataTable
              heads={["Belge", "Şube", "Boyut", "İndir"]}
              rows={(d.documents || []).map((doc) => [
                doc.name,
                branchName(d, doc.branch_id),
                `${num(doc.size / 1024)} KB`,
                <a
                  href={"/api/documents/" + doc.id}
                  target="_blank"
                  rel="noreferrer"
                  className="text-button"
                >
                  Belgeyi aç
                </a>,
              ])}
            />
            <p className="panel-note">
              Bu sürümde belge alanları manuel girilir; otomatik belge okuma henüz bağlı
              değildir.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "purchases")
    return (
      <Tabs defaultValue="orders">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="orders">Satın alma</TabsTrigger>
            <TabsTrigger value="suppliers">Tedarikçi ve cari</TabsTrigger>
          </TabsList>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("supplier")}>
              <Plus size={16} />
              Tedarikçi
            </Button>
            <Button onClick={() => open("purchase")}>
              <Plus size={16} />
              Satın alma talebi
            </Button>
          </div>
        </div>
        <div className="workflow-steps">
          {["Talep", "Onay", "Sipariş", "Teslimat", "Fatura", "Ödeme"].map(
            (s, i) => (
              <span key={s}>
                <b>{i + 1}</b>
                {s}
              </span>
            ),
          )}
        </div>
        <TabsContent value="orders">
          <section className="panel">
            <PanelHeading
              title="Satın alma talepleri"
              sub="Teslimatta stok artar; gerçek fatura ve ödeme kendi kayıtlarına bağlanır."
            />
            <DataTable
              heads={[
                "Tarih",
                "Malzeme",
                "Tedarikçi",
                "Şube",
                "Miktar",
                "Teklif toplamı",
                "Aşama",
                "İlerle",
              ]}
              rows={scoped(p, "purchase").map((r) => {
                const steps = [
                    "Talep",
                    "Onaylandı",
                    "Sipariş verildi",
                    "Teslim alındı",
                    "Faturalandı",
                    "Ödendi",
                  ],
                  next = steps[steps.indexOf(r.status) + 1];
                return [
                  displayDate(r.date),
                  r.name,
                  byKind(d, "supplier").find((s) => s.id === r.supplier_id)
                    ?.name,
                  branchName(d, r.branch_id),
                  `${num(r.quantity)} ${r.unit}`,
                  money(r.total_cents),
                  <Pill tone={r.status === "Ödendi" ? "success" : "neutral"}>
                    {r.status}
                  </Pill>,
                  next ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        open("purchase_status", {
                          id: r.id,
                          branch_id: r.branch_id,
                          status: next,
                        })
                      }
                    >
                      {next}
                    </Button>
                  ) : (
                    <Check size={18} />
                  ),
                ];
              })}
              empty={
                <Blank
                  icon={ShoppingBag}
                  title="Satın almayı uçtan uca izleyin."
                  text="Önce tedarikçi ve stok malzemesi ekleyin; ardından talep oluşturun."
                  action={() => open("purchase")}
                  label="Talep oluştur"
                />
              }
            />
          </section>
        </TabsContent>
        <TabsContent value="suppliers">
          <section className="panel">
            <PanelHeading title="Tedarikçi cari hesapları" />
            <DataTable
              heads={[
                "Tedarikçi",
                "Tür",
                "Toplam fatura",
                "Ödenen",
                "Kalan",
                "Telefon",
              ]}
              rows={byKind(d, "supplier").map((s) => {
                const es = d.expenses.filter(
                  (e) =>
                    e.supplier_id === s.id &&
                    e.status !== "reversed" &&
                    (branch === "all" || e.branch_id === branch),
                );
                return [
                  s.name,
                  s.category,
                  es.length
                    ? money(es.reduce((n, e) => n + e.amount_cents, 0))
                    : "—",
                  es.length
                    ? money(
                        es
                          .filter((e) => e.status === "paid")
                          .reduce((n, e) => n + e.amount_cents, 0),
                      )
                    : "—",
                  es.length
                    ? money(
                        es
                          .filter((e) => e.status === "pending")
                          .reduce((n, e) => n + e.amount_cents, 0),
                      )
                    : "—",
                  s.phone || "—",
                ];
              })}
            />
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "employees")
    return (
      <Tabs defaultValue="team">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="team">Personel</TabsTrigger>
            <TabsTrigger value="attendance">Puantaj</TabsTrigger>
          </TabsList>
          {d.role !== "Personel" && (
            <div className="inline-actions">
              <Button variant="outline" onClick={() => open("attendance")}>
                <Plus size={16} />
                Puantaj kaydı
              </Button>
              <Button onClick={() => open("employee")}>
                <Plus size={16} />
                Personel ekle
              </Button>
            </div>
          )}
        </div>
        <TabsContent value="team">
          <section className="panel">
            <PanelHeading
              title={
                d.role === "Personel"
                  ? "Personel bilgilerim"
                  : "Ekip ve personel kartları"
              }
              sub="Personel kartındaki ücret, tek başına finansal gider oluşturmaz."
            />
            <DataTable
              heads={[
                "Ad soyad",
                "Görev",
                "Şube",
                "İşe giriş",
                "Aylık ücret",
                "Durum",
              ]}
              rows={scoped(p, "employee").map((e) => [
                <div className="name-cell">
                  <span className="avatar small">{e.name.charAt(0)}</span>
                  <strong>{e.name}</strong>
                </div>,
                e.title,
                branchName(d, e.branch_id),
                displayDate(e.start_date),
                exactMoney(e.salary_cents),
                <Pill tone="success">Aktif</Pill>,
              ])}
              empty={
                <Blank
                  icon={Users}
                  title="Ekibinizi aynı panelde toplayın."
                  text="Personel kartları, puantaj ve şube maliyet takibi için başlangıç."
                  action={
                    d.role === "Personel" ? undefined : () => open("employee")
                  }
                  label="Personel ekle"
                />
              }
            />
          </section>
        </TabsContent>
        <TabsContent value="attendance">
          <section className="panel">
            <PanelHeading
              title="Günlük puantaj"
              sub="Çalışma, izin ve devamsızlık. Planı aşan süre, yasal bordro hesabı değildir."
            />
            <DataTable
              heads={[
                "Tarih",
                "Personel",
                "Şube",
                "Durum",
                "Çalışma (saat)",
                "Planlanan",
                "Planı aşan",
              ]}
              rows={scoped(p, "attendance")
                .filter((e) => e.date >= m.r.start && e.date <= m.r.end)
                .map((e) => [
                  displayDate(e.date),
                  e.name,
                  branchName(d, e.branch_id),
                  statusLabel(e.status),
                  num(e.hours),
                  num(e.planned),
                  num(e.extra),
                ])}
            />
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "budget")
    return (
      <Tabs defaultValue="budget">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="budget">Bütçe kontrolü</TabsTrigger>
            <TabsTrigger value="tax">Mali takvim</TabsTrigger>
          </TabsList>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("tax")}>
              <Plus size={16} />
              Yükümlülük
            </Button>
            <Button onClick={() => open("budget")}>
              <Plus size={16} />
              Bütçe ekle
            </Button>
          </div>
        </div>
        <TabsContent value="budget">
          <div className="budget-cards">
            {scoped(p, "budget").map((b) => {
              const actual = d.expenses
                .filter(
                  (e) =>
                    e.status !== "reversed" &&
                    e.kind === "expense" &&
                    e.branch_id === b.branch_id &&
                    e.category === b.category &&
                    e.date.startsWith(b.month),
                )
                .reduce((n, e) => n + e.net_cents, 0);
              return (
                <section className="panel budget-card" key={b.id}>
                  <div className="flex justify-between items-center">
                    <h2>{b.category}</h2>
                    <Pill tone={actual > b.amount_cents ? "danger" : "neutral"}>
                      {b.month}
                    </Pill>
                  </div>
                  <p>{branchName(d, b.branch_id)}</p>
                  <div className="budget-amount">
                    <strong>{money(actual)}</strong>
                    <span>/ {money(b.amount_cents)}</span>
                  </div>
                  <Progress
                    value={Math.min((actual / b.amount_cents) * 100, 100)}
                    className={actual > b.amount_cents ? "over-budget" : ""}
                  />
                  <small>
                    {actual > b.amount_cents
                      ? `%${num((actual / b.amount_cents - 1) * 100)} aşım`
                      : `%${num((actual / b.amount_cents) * 100)} gerçekleşme`}
                  </small>
                </section>
              );
            })}
            {!scoped(p, "budget").length && (
              <section className="panel span-full">
                <Blank
                  title="Bütçeniz kararlarınıza yön versin."
                  text="Şube, ay ve gider kategorisi için hedef belirleyin."
                  action={() => open("budget")}
                  label="Bütçe ekle"
                />
              </section>
            )}
          </div>
        </TabsContent>
        <TabsContent value="tax">
          <section className="panel">
            <PanelHeading
              title="Vergi ve mali yükümlülükler"
              sub="Tutar ve vadeler kullanıcı tarafından girilir; otomatik vergi hesabı yapılmaz."
            />
            <DataTable
              heads={[
                "Yükümlülük",
                "Şube",
                "Tür",
                "Tutar",
                "Son tarih",
                "Durum",
                "İşlem",
              ]}
              rows={d.expenses
                .filter(
                  (e) =>
                    e.kind === "tax" &&
                    (branch === "all" || e.branch_id === branch),
                )
                .map((e) => [
                  e.name,
                  branchName(d, e.branch_id),
                  e.category,
                  money(e.amount_cents),
                  displayDate(e.due_date),
                  <Pill tone={e.status === "paid" ? "success" : "warning"}>
                    {e.status === "paid"
                      ? "Ödendi"
                      : e.status === "reversed"
                        ? "İptal"
                        : "Ödenecek"}
                  </Pill>,
                  e.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        open("pay_expense", {
                          id: e.id,
                          branch_id: e.branch_id,
                        })
                      }
                    >
                      Öde
                    </Button>
                  ) : (
                    "—"
                  ),
                ])}
            />
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "resources")
    return (
      <Tabs defaultValue="vehicles">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="vehicles">Araçlar</TabsTrigger>
            <TabsTrigger value="fuel">Yakıt</TabsTrigger>
            <TabsTrigger value="utilities">Enerji ve sayaç</TabsTrigger>
          </TabsList>
          <div className="inline-actions">
            <Button variant="outline" onClick={() => open("utility")}>
              Sayaç kaydı
            </Button>
            <Button variant="outline" onClick={() => open("fuel")}>
              Yakıt kaydı
            </Button>
            <Button onClick={() => open("vehicle")}>
              <Plus size={16} />
              Araç ekle
            </Button>
          </div>
        </div>
        <TabsContent value="vehicles">
          <section className="panel">
            <PanelHeading title="Araç envanteri" />
            <DataTable
              heads={[
                "Plaka",
                "Marka / model",
                "Şube",
                "Kilometre",
                "Yakıt",
                "Sigorta",
                "Muayene",
              ]}
              rows={scoped(p, "vehicle").map((v) => [
                v.name,
                `${v.brand} ${v.model} · ${v.year}`,
                branchName(d, v.branch_id),
                num(v.km),
                v.fuel,
                v.insurance_date || "—",
                v.inspection_date || "—",
              ])}
              empty={
                <Blank
                  icon={Truck}
                  title="Araçlarınızı ve giderlerini izleyin."
                  text="Yakıt, kilometre, sigorta ve muayene tarihlerini kaydedin."
                  action={() => open("vehicle")}
                  label="Araç ekle"
                />
              }
            />
          </section>
        </TabsContent>
        <TabsContent value="fuel">
          <section className="panel">
            <PanelHeading
              title="Yakıt kayıtları"
              sub="Tam depo yönteminde L/100 km · tek bir gider kaydıyla bağlantılı."
            />
            <DataTable
              heads={[
                "Tarih",
                "Araç",
                "Litre",
                "Kilometre",
                "L/100 km",
                "Tutar",
              ]}
              rows={scoped(p, "fuel").map((f) => [
                displayDate(f.date),
                f.name,
                num(f.liters),
                num(f.km),
                num(f.consumption),
                money(f.amount_cents),
              ])}
            />
          </section>
        </TabsContent>
        <TabsContent value="utilities">
          <section className="panel">
            <PanelHeading
              title="Enerji ve tüketim"
              sub="Sayaç farkı ve gerçek fatura tutarı."
            />
            <DataTable
              heads={[
                "Tarih",
                "Şube",
                "Tür",
                "İlk sayaç",
                "Son sayaç",
                "Tüketim",
                "Fatura tutarı",
              ]}
              rows={scoped(p, "utility").map((e) => [
                displayDate(e.date),
                branchName(d, e.branch_id),
                e.kind,
                num(e.first),
                num(e.last),
                `${num(e.consumption)} ${e.unit}`,
                money(e.amount_cents),
              ])}
            />
          </section>
        </TabsContent>
      </Tabs>
    );
  if (view === "reports")
    return (
      <>
        <div className="report-intro panel">
          <div className="report-intro-icon">
            <FileText size={30} />
          </div>
          <div>
            <h2>Kararlarınıza eşlik eden raporlar.</h2>
            <p>
              Seçili şube ve tarih aralığı raporlara uygulanır. Excel dosyaları
              gerçek kayıtlardan hazırlanır.
            </p>
          </div>
          <Pill>
            {displayDate(m.r.start)} → {displayDate(m.r.end)}
          </Pill>
        </div>
        <div className="report-grid">
          {[
            [
              "sales",
              "Satış raporu",
              "Kanal, tahsilat, ciro ve satış maliyeti.",
              ReceiptText,
              "sales",
            ],
            [
              "expenses",
              "Gider ve fatura raporu",
              "Gider türü, vergi, vade ve ödeme durumu.",
              Wallet,
              "expenses",
            ],
            [
              "inventory",
              "Stok raporu",
              "Şube, stok miktarı ve güncel birim maliyeti.",
              Package,
              "inventory",
            ],
            [
              "ledger",
              "Kasa ve banka raporu",
              "Hesap hareketleri, tahsilat ve ters kayıtlar.",
              Wallet,
              "accounts",
            ],
          ]
            .filter(
              (r) => d.user?.permissions?.[r[4] as string]?.export ?? !d.user,
            )
            .map(([kind, title, sub, Icon]) => (
              <article className="panel report-card" key={kind as string}>
                {typeof Icon !== "string" && <Icon size={24} />}
                <h2>{title as string}</h2>
                <p>{sub as string}</p>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!d.tenant) {
                        open("login");
                        return;
                      }
                      window.location.href = `/api/export?kind=${kind}&start=${displayDate(m.r.start)}&end=${displayDate(m.r.end)}&branch_id=${branch}`;
                    }}
                  >
                    <FileDown size={16} />
                    Excel .xlsx
                  </Button>
                  <Button variant="ghost" onClick={() => go("report-" + kind)}>
                    <FileText size={16} />
                    PDF / Yazdır
                  </Button>
                </div>
              </article>
            ))}
        </div>
        <section className="panel">
          <PanelHeading
            title="Şube karşılaştırması"
            sub="KDV hariç katkı; eksik maliyette sonuç hesaplanmaz."
          />
          <DataTable
            heads={[
              "Şube",
              "KDV dahil ciro",
              "KDV hariç ciro",
              "Satış maliyeti",
              "Gider",
              "Kayıtlı sonuç",
            ]}
            rows={d.branches
              .filter((b) => branch === "all" || b.id === branch)
              .map((b) => {
                const x = metrics(d, b.id, p.period, p.start, p.end);
                return [
                  b.name,
                  money(x.gross),
                  money(x.revenue),
                  money(x.cogs),
                  money(x.spend),
                  money(x.result),
                ];
              })}
          />
        </section>
      </>
    );
  if (view.startsWith("report-")) {
    const kind = view.slice(7);
    return (
      <div className="print-report">
        <div className="section-toolbar no-print">
          <Button variant="outline" onClick={() => go("reports")}>
            Raporlara dön
          </Button>
          <Button onClick={() => window.print()}>
            <FileText size={16} />
            PDF olarak kaydet / Yazdır
          </Button>
        </div>
        <section className="panel report-paper">
          <div className="print-brand">RestoPusula</div>
          <h1>
            {d.tenant?.name || "İşletme"} ·{" "}
            {
              (
                {
                  sales: "Satış",
                  expenses: "Gider",
                  inventory: "Stok",
                  ledger: "Hesap",
                } as Row
              )[kind]
            }{" "}
            raporu
          </h1>
          <p>
            {branch === "all" ? "Tüm şubeler" : branchName(d, branch)} ·{" "}
            {displayDate(m.r.start)} / {displayDate(m.r.end)}
          </p>
          {kind === "sales" ? (
            <DataTable
              heads={["Tarih", "Şube", "Kanal", "Tutar", "Maliyet", "Durum"]}
              rows={d.sales
                .filter(
                  (x) =>
                    (branch === "all" || x.branch_id === branch) &&
                    x.date >= m.r.start &&
                    x.date <= m.r.end,
                )
                .map((s) => [
                  displayDate(s.date),
                  branchName(d, s.branch_id),
                  channelLabel(s.channel),
                  exactMoney(s.total_cents),
                  exactMoney(s.cost_cents),
                  statusLabel(s.status),
                ])}
            />
          ) : kind === "expenses" ? (
            <DataTable
              heads={["Tarih", "Şube", "Gider", "Tutar", "Vade", "Durum"]}
              rows={d.expenses
                .filter(
                  (x) =>
                    (branch === "all" || x.branch_id === branch) &&
                    x.date >= m.r.start &&
                    x.date <= m.r.end,
                )
                .map((e) => [
                  displayDate(e.date),
                  branchName(d, e.branch_id),
                  e.name,
                  exactMoney(e.amount_cents),
                  displayDate(e.due_date),
                  statusLabel(e.status),
                ])}
            />
          ) : kind === "inventory" ? (
            <DataTable
              heads={["Şube", "Malzeme", "Miktar", "Birim maliyet"]}
              rows={m.stock.map((i) => [
                branchName(d, i.branch_id),
                i.material?.name,
                `${num(i.quantity)} ${i.material?.unit}`,
                exactMoney(i.material?.cost_cents),
              ])}
            />
          ) : (
            <DataTable
              heads={["Tarih", "Hesap", "Tutar", "Açıklama"]}
              rows={d.ledger
                .filter(
                  (x) =>
                    (branch === "all" || x.branch_id === branch) &&
                    x.date >= m.r.start &&
                    x.date <= m.r.end,
                )
                .map((l) => [
                  displayDate(l.date),
                  d.accounts.find((a) => a.id === l.account_id)?.name,
                  exactMoney(l.amount_cents),
                  noteLabel(l.note),
                ])}
            />
          )}
          <footer>
            Oluşturma tarihi: {displayDate(today())} · Yalnızca kayıtlı veriler · RestoPusula
          </footer>
        </section>
      </div>
    );
  }
  if (view === "settings")
    return (
      <Tabs defaultValue="company">
        <div className="section-toolbar">
          <TabsList>
            <TabsTrigger value="company">İşletme</TabsTrigger>
            <TabsTrigger value="users">Kullanıcı ve yetkiler</TabsTrigger>
            <TabsTrigger value="audit">İşlem geçmişi</TabsTrigger>
            <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="company">
          <div className="settings-grid">
            <section className="panel settings-card">
              <Store size={25} />
              <h2>{d.tenant?.name || "İşletme çalışma alanı"}</h2>
              <p>
                {d.branches.length} şube · Türk lirası (₺) · Türkiye saat dilimi
              </p>
              <Button variant="outline" onClick={() => open("company")}>
                İşletme bilgileri
              </Button>
            </section>
            <section className="panel settings-card">
              <ShieldCheck size={25} />
              <h2>Verilerinizin kontrolü sizde.</h2>
              <p>
                İşletme verilerini JSON olarak indirin. Şifreler ve oturum
                bilgileri yedeğe eklenmez.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (d.tenant) window.location.href = "/api/backup";
                  else open("login");
                }}
              >
                <FileDown size={16} />
                Verileri dışa aktar
              </Button>
            </section>
            <section className="panel settings-card">
              <Lock size={25} />
              <h2>Hesap güvenliği</h2>
              <p>
                Şifrenizi değiştirin; yeni kullanıcılar ilk girişte geçici
                şifrelerini yeniler.
              </p>
              <Button variant="outline" onClick={() => open("password")}>
                Şifre değiştir
              </Button>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="users">
          <section className="panel">
            <PanelHeading
              title="Kullanıcılar ve şube erişimi"
              sub="Her kullanıcı yalnızca yetkili olduğu şubelerin kayıtlarına erişir."
            >
              <Button onClick={() => open("member")}>
                <Plus size={16} />
                Kullanıcı ekle
              </Button>
            </PanelHeading>
            <DataTable
              heads={["Kullanıcı", "E-posta", "Rol", "Yetkili şube", "Durum"]}
              rows={d.members.map((u) => [
                u.name,
                u.email,
                roleLabel(u.role),
                u.branch_id ? branchName(d, u.branch_id) : "Tüm şubeler",
                <Pill tone={u.must_change ? "warning" : "success"}>
                  {u.must_change ? "Şifre değişmeli" : "Aktif"}
                </Pill>,
              ])}
            />
          </section>
        </TabsContent>
        <TabsContent value="audit">
          <section className="panel">
            <PanelHeading
              title="Denetim / işlem izi"
              sub="Son 250 kritik işlem. Finansal geçmiş silinmez."
            />
            <DataTable
              heads={["Zaman", "Kullanıcı", "İşlem", "Açıklama"]}
              rows={d.audit.map((a) => [
                new Date(a.created_at).toLocaleString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                }),
                a.user_name,
                auditActionLabel(a.action),
                auditDescription(a.description),
              ])}
            />
          </section>
        </TabsContent>
        <TabsContent value="integrations">
          <div className="integration-grid">
            {[
              "POS cihazları",
              "E-fatura / e-arşiv",
              "Banka bağlantısı",
              "İnternet siparişi",
              "Otomatik fatura okuma",
              "Yapay zekâ sağlayıcısı",
            ].map((s) => (
              <section className="panel settings-card" key={s}>
                <Plug size={24} />
                <h2>{s}</h2>
                <Pill>Bağlı değil</Pill>
                <p>
                  Bu bağlantı henüz kurulmadı. İlk sürümde kayıtlar panelden
                  manuel girilir.
                </p>
              </section>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    );
  return (
    <Blank
      title="Bu ekran için yetki gerekiyor."
      text="Hesabınızın izinlerini işletme sahibiyle kontrol edin."
    />
  );
}

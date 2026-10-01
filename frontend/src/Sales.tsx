import { useState, useEffect } from "react";
import { channelLabel, displayDate } from "@/lib/presentation";
import {
  Plus,
  Minus,
  UtensilsCrossed,
  Users,
  ShoppingBag,
  ReceiptText,
  Check,
  Trash2,
  LoaderCircle,
  Store,
  Search,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Row,
  byKind,
  money,
  exactMoney,
  num,
  branchName,
  today,
  metrics,
} from "@/lib/domain";
import { Blank, Pill, PanelHeading } from "./Dashboard";
import type { ViewProps } from "./Modules";

export default function Sales({
  d,
  branch,
  period,
  start,
  end,
  open,
  act,
}: ViewProps) {
  const [tab, setTab] = useState("tables"),
    [cart, setCart] = useState<Row[]>([]),
    [activeBranch, setActiveBranch] = useState(""),
    [table, setTable] = useState<Row | null>(null),
    [channel, setChannel] = useState("Masa"),
    [category, setCategory] = useState("Tümü"),
    [query, setQuery] = useState(""),
    [discount, setDiscount] = useState("0"),
    [paymentRows, setPaymentRows] = useState<Row[]>([
      { account_id: "", amount: "" },
    ]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (branch !== "all") setActiveBranch(branch);
    else if (d.branches.length === 1) setActiveBranch(d.branches[0].id);
  }, [branch, d.branches]);
  const accounts = d.accounts.filter((a) => a.branch_id === activeBranch),
    m = metrics(d, branch, period, start, end),
    tables = byKind(d, "table").filter(
      (t) => branch === "all" || t.branch_id === branch,
    ),
    categories = ["Tümü", ...new Set(d.products.map((p) => p.category))];
  const full = Math.round(
      cart.reduce(
        (n, i) =>
          n +
          (d.products.find((p) => p.id === i.product_id)?.price_cents || 0) *
            i.quantity,
        0,
      ),
    ),
    discountCents = Math.round(Number(discount || 0) * 100),
    total = full - discountCents;
  function add(id: string) {
    setCart((old) => {
      const i = old.find((x) => x.product_id === id);
      return i
        ? old.map((x) =>
            x.product_id === id ? { ...x, quantity: x.quantity + 1 } : x,
          )
        : [...old, { product_id: id, quantity: 1 }];
    });
    setError("");
  }
  function change(id: string, amount: number) {
    setCart((s) =>
      s
        .map((x) =>
          x.product_id === id ? { ...x, quantity: x.quantity + amount } : x,
        )
        .filter((x) => x.quantity > 0),
    );
  }
  function chooseTable(t: Row) {
    if (
      cart.length &&
      !window.confirm("Açık taslağınız değişecek. Bu masaya geçilsin mi?")
    )
      return;
    setTable(t);
    setActiveBranch(t.branch_id);
    setChannel("Masa");
    const order = byKind(d, "order").find(
      (o) => o.table_id === t.id && o.status === "open",
    );
    setCart(order?.items || []);
    setDiscount("0");
    setPaymentRows([{ account_id: "", amount: "" }]);
    setTab("pos");
    setError("");
  }
  async function finish(saveOrder = false) {
    if (!activeBranch) {
      setError("Bir şube seçin.");
      return;
    }
    if (!cart.length) {
      setError("Adisyona bir ürün ekleyin.");
      return;
    }
    if (saveOrder && !table) {
      setError("Adisyon kaydetmek için bir masa seçin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (saveOrder) {
        await act({
          action: "order",
          branch_id: activeBranch,
          table_id: table!.id,
          items: cart,
          date: today(),
        });
      } else {
        if (total < 0) throw new Error("İskonto satış tutarını aşamaz.");
        await act({
          action: "sale",
          branch_id: activeBranch,
          table_id: table?.id || null,
          channel,
          items: cart,
          discount: discount || "0",
          date: today(),
          payments: paymentRows.map((r) => ({
            account_id: r.account_id,
            amount:
              paymentRows.length === 1 ? (total / 100).toFixed(2) : r.amount,
          })),
        });
        setCart([]);
        setTable(null);
        setDiscount("0");
        setPaymentRows([{ account_id: "", amount: "" }]);
        setTab("history");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="section-toolbar">
        <TabsList>
          <TabsTrigger value="tables">Masa planı</TabsTrigger>
          <TabsTrigger value="pos">Satış / adisyon</TabsTrigger>
          <TabsTrigger value="history">Satış geçmişi</TabsTrigger>
        </TabsList>
        <Button onClick={() => open("table")}>
          <Plus size={16} />
          Masa ekle
        </Button>
      </div>
      <TabsContent value="tables">
        <section className="panel">
          <PanelHeading
            title="Masa planı"
            sub="Bir masayı seçerek açık adisyonunu görüntüleyin."
          />
          <div className="table-legend">
            {[
              "Boş",
              "Dolu",
              "Rezerve",
              "Hesap bekliyor",
              "Temizlik bekliyor",
            ].map((s) => (
              <span key={s}>
                <i
                  className={"table-status-dot state-" + s.replaceAll(" ", "-")}
                />
                {s}
              </span>
            ))}
          </div>
          {tables.length ? (
            <div className="table-plan">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className={
                    "table-card status-" + t.status.replaceAll(" ", "-")
                  }
                >
                  <button className="table-main" onClick={() => chooseTable(t)}>
                    <div className="table-card-top">
                      <span>
                        <UtensilsCrossed size={19} />
                      </span>
                      <small>{t.zone}</small>
                    </div>
                    <h3>{t.name}</h3>
                    <span className="table-persons">
                      <Users size={14} />
                      {t.capacity} kişi
                    </span>
                    <Pill
                      tone={
                        t.status === "Dolu"
                          ? "warning"
                          : t.status === "Boş"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {t.status}
                    </Pill>
                    <small>{branchName(d, t.branch_id)}</small>
                  </button>
                  <Select
                    value={t.status}
                    onValueChange={(v) => {
                      void act({
                        action: "table_status",
                        id: t.id,
                        branch_id: t.branch_id,
                        status: v,
                      }).catch((e) => setError(e.message));
                    }}
                  >
                    <SelectTrigger
                      aria-label={`${t.name} durum değiştir`}
                      className="table-status-picker"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Boş",
                        "Dolu",
                        "Rezerve",
                        "Hesap bekliyor",
                        "Temizlik bekliyor",
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : (
            <Blank
              icon={UtensilsCrossed}
              title="Servis alanınızı oluşturun."
              text="Salon, teras ve bahçe masalarını şubenize ekleyin."
              action={() => open("table")}
              label="Masa ekle"
            />
          )}
          {error && <p className="form-error">{error}</p>}
        </section>
      </TabsContent>
      <TabsContent value="pos">
        <div className="pos-grid">
          <section className="panel pos-products">
            <PanelHeading
              title="Menü"
              sub={
                table
                  ? `${table.name} · ${branchName(d, activeBranch)}`
                  : "Ürün seçin, adisyonu oluşturun."
              }
            >
              <div className="table-search">
                <Search size={16} />
                <Input
                  aria-label="Ürün ara"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ürün ara..."
                />
              </div>
            </PanelHeading>
            <div className="category-chips">
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? "selected" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="product-grid">
              {d.products
                .filter(
                  (pr) =>
                    (category === "Tümü" || pr.category === category) &&
                    pr.name
                      .toLocaleLowerCase("tr")
                      .includes(query.toLocaleLowerCase("tr")),
                )
                .map((pr) => (
                  <button
                    key={pr.id}
                    className="pos-product"
                    onClick={() => add(pr.id)}
                  >
                    <span className="product-category-icon">
                      <UtensilsCrossed size={26} />
                    </span>
                    <small>{pr.category}</small>
                    <strong>{pr.name}</strong>
                    <div>
                      <b>{money(pr.price_cents)}</b>
                      <span className="add-product">
                        <Plus size={16} />
                      </span>
                    </div>
                  </button>
                ))}
            </div>
            {!d.products.length && (
              <Blank
                icon={ShoppingBag}
                title="Menü henüz eklenmedi."
                text="Ürün kataloğuna satış fiyatlarıyla birlikte ürün ekleyin."
                action={() => open("product")}
                label="Ürün ekle"
              />
            )}
          </section>
          <section className="panel cart-panel">
            <PanelHeading title={table ? table.name : "Yeni adisyon"}>
              <Pill>{cart.reduce((n, i) => n + i.quantity, 0)} ürün</Pill>
            </PanelHeading>
            <div className="cart-selects">
              <Select
                value={activeBranch}
                onValueChange={(v) => {
                  setActiveBranch(v);
                  setTable(null);
                  setPaymentRows([{ account_id: "", amount: "" }]);
                }}
              >
                <SelectTrigger aria-label="Satış şubesi">
                  <Store size={16} />
                  <SelectValue placeholder="Satış şubesi" />
                </SelectTrigger>
                <SelectContent>
                  {d.branches.map((b) => (
                    <SelectItem value={b.id} key={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger aria-label="Satış kanalı">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Masa", "Paket servis", "Gel-al", "Online sipariş"].map(
                    (s) => (
                      <SelectItem value={s} key={s}>
                        {channelLabel(s)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="cart-lines">
              {cart.map((i) => {
                const pr = d.products.find((p) => p.id === i.product_id);
                return (
                  <div className="cart-line" key={i.product_id}>
                    <div>
                      <strong>{pr?.name}</strong>
                      <small>{money(pr?.price_cents)} / birim</small>
                      <div className="quantity-controls">
                        <button
                          aria-label="Bir azalt"
                          onClick={() => change(i.product_id, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{num(i.quantity)}</span>
                        <button
                          aria-label="Bir artır"
                          onClick={() => change(i.product_id, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <b>{money((pr?.price_cents || 0) * i.quantity)}</b>
                      <button
                        className="remove-item"
                        aria-label="Ürünü çıkar"
                        onClick={() =>
                          setCart((s) =>
                            s.filter((x) => x.product_id !== i.product_id),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!cart.length && (
                <div className="cart-empty">
                  <ReceiptText size={31} />
                  <strong>Adisyonunuz burada.</strong>
                  <p>Menüden ürün ekleyerek başlayın.</p>
                </div>
              )}
            </div>
            <div className="cart-summary">
              <div>
                <span>Ara toplam</span>
                <b>{exactMoney(full)}</b>
              </div>
              <label>
                <span>İskonto (TL)</span>
                <Input
                  type="number"
                  min={0}
                  step=".01"
                  aria-label="İskonto"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
              <div className="cart-total">
                <span>Tahsil edilecek</span>
                <strong>{exactMoney(total)}</strong>
              </div>
            </div>
            <div className="payments-selector">
              <div className="flex justify-between items-center">
                <strong>Tahsilat hesabı</strong>
                <button
                  className="text-button"
                  onClick={() =>
                    setPaymentRows((r) => [
                      ...r,
                      { account_id: "", amount: "" },
                    ])
                  }
                >
                  Hesabı böl
                </button>
              </div>
              {paymentRows.map((r, i) => (
                <div className="split-payment" key={i}>
                  <Select
                    value={r.account_id}
                    onValueChange={(v) =>
                      setPaymentRows((rs) =>
                        rs.map((x, j) =>
                          j === i ? { ...x, account_id: v } : x,
                        ),
                      )
                    }
                  >
                    <SelectTrigger aria-label={`Ödeme hesabı ${i + 1}`}>
                      <SelectValue placeholder="Hesap seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paymentRows.length > 1 && (
                    <>
                      <Input
                        type="number"
                        step=".01"
                        min={0}
                        value={r.amount}
                        aria-label={`Ödeme tutarı ${i + 1}`}
                        onChange={(e) =>
                          setPaymentRows((rs) =>
                            rs.map((x, j) =>
                              j === i ? { ...x, amount: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label="Ödemeyi kaldır"
                        onClick={() =>
                          setPaymentRows((rs) => rs.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {!accounts.length && (
                <p className="hint">
                  Önce bu şube için kasa / banka / POS hesabı ekleyin.
                </p>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="cart-actions">
              {table && (
                <Button
                  variant="outline"
                  onClick={() => finish(true)}
                  disabled={busy || !cart.length}
                >
                  Adisyonu kaydet
                </Button>
              )}
              <Button onClick={() => finish()} disabled={busy || !cart.length}>
                {busy ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Ödemeyi tamamla
              </Button>
            </div>
          </section>
        </div>
      </TabsContent>
      <TabsContent value="history">
        <section className="panel">
          <PanelHeading
            title="Satış geçmişi"
            sub="Tamamlanan ve ters kayıtla kapatılan satışlar."
          />
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Tarih",
                  "Şube",
                  "Kanal",
                  "Tahsilat",
                  "Ciro",
                  "Maliyet",
                  "Durum",
                  "İşlem",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.sales
                .filter(
                  (s) =>
                    (branch === "all" || s.branch_id === branch) &&
                    s.date >= m.r.start &&
                    s.date <= m.r.end,
                )
                .map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{displayDate(s.date)}</TableCell>
                    <TableCell>{branchName(d, s.branch_id)}</TableCell>
                    <TableCell>{channelLabel(s.channel)}</TableCell>
                    <TableCell>{s.payment}</TableCell>
                    <TableCell>{exactMoney(s.total_cents)}</TableCell>
                    <TableCell>{exactMoney(s.cost_cents)}</TableCell>
                    <TableCell>
                      <Pill
                        tone={s.status === "reversed" ? "neutral" : "success"}
                      >
                        {s.status === "reversed" ? "Ters kayıt" : "Tamamlandı"}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      {s.status !== "reversed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            open("reverse_sale", {
                              id: s.id,
                              branch_id: s.branch_id,
                            })
                          }
                        >
                          <RotateCcw size={14} />
                          İade
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {!d.sales.length && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Blank
                      title="İlk satışınız burada görünecek."
                      text="Adisyonu tamamladığınızda tahsilat ve tarife bağlı stok hareketleri birlikte kaydedilir."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </TabsContent>
    </Tabs>
  );
}

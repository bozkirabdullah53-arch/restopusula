export type Row = Record<string, any>;
export type AppData = {
  tenant: Row | null;
  role: string;
  user: Row | null;
  branches: Row[];
  products: Row[];
  materials: Row[];
  recipes: Row[];
  inventory: Row[];
  moves: Row[];
  sales: Row[];
  saleItems: Row[];
  accounts: Row[];
  ledger: Row[];
  expenses: Row[];
  entities: Row[];
  members: Row[];
  audit: Row[];
  documents?: Row[];
};
export const emptyData: AppData = {
  tenant: null,
  role: "Patron",
  user: null,
  branches: [],
  products: [],
  materials: [],
  recipes: [],
  inventory: [],
  moves: [],
  sales: [],
  saleItems: [],
  accounts: [],
  ledger: [],
  expenses: [],
  entities: [],
  members: [],
  audit: [],
};
export const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(n / 100);
export const exactMoney = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 2,
      }).format(n / 100);
export const num = (n: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(n);
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dayPlus(day: string, n: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const month = () => today().slice(0, 7);
export const branchName = (d: AppData, id: string | null) =>
  d.branches.find((b) => b.id === id)?.name ?? "Merkez";
export const byKind = (d: AppData, k: string) =>
  d.entities
    .filter((e) => e.kind === k)
    .map((e) => ({
      ...e,
      ...(typeof e.data === "string" ? JSON.parse(e.data) : e.data),
    }));
export function range(p: string, start?: string, end?: string) {
  const t = today();
  if (p === "today") return { start: t, end: t };
  if (p === "yesterday") return { start: dayPlus(t, -1), end: dayPlus(t, -1) };
  if (p === "week") return { start: dayPlus(t, -6), end: t };
  if (p === "30") return { start: dayPlus(t, -29), end: t };
  if (p === "year") return { start: t.slice(0, 4) + "-01-01", end: t };
  if (p === "previous") {
    const last = dayPlus(t.slice(0, 7) + "-01", -1);
    return { start: last.slice(0, 7) + "-01", end: last };
  }
  if (p === "custom" && start && end) return { start, end };
  return { start: t.slice(0, 7) + "-01", end: t };
}
export function currentCost(d: AppData, id: string): number | null {
  const r = d.recipes.filter((r) => r.product_id === id);
  if (!r.length) return null;
  let t = 0;
  for (const x of r) {
    const m = d.materials.find((m) => m.id === x.material_id);
    if (!m || m.cost_cents == null) return null;
    t += Math.round(m.cost_cents * x.quantity);
  }
  return t;
}
export function metrics(
  d: AppData,
  branch: string,
  p: string,
  start?: string,
  end?: string,
) {
  const r = range(p, start, end),
    scope = (x: Row) => branch === "all" || x.branch_id === branch;
  const sales = d.sales.filter(
      (x) =>
        scope(x) &&
        x.status !== "reversed" &&
        x.date >= r.start &&
        x.date <= r.end,
    ),
    expenses = d.expenses.filter(
      (x) =>
        scope(x) &&
        x.status !== "reversed" &&
        x.kind === "expense" &&
        x.date >= r.start &&
        x.date <= r.end,
    );
  const sum = (a: Row[], k: string) => a.reduce((n, x) => n + (x[k] ?? 0), 0);
  const gross = sales.length ? sum(sales, "total_cents") : null,
    revenue = sales.length ? sum(sales, "net_cents") : null,
    spend = expenses.length ? sum(expenses, "net_cents") : null,
    cogs =
      sales.length && sales.every((s) => s.cost_cents != null)
        ? sum(sales, "cost_cents")
        : null,
    contribution = revenue != null && cogs != null ? revenue - cogs : null,
    result = contribution != null ? contribution - (spend ?? 0) : null;
  const upcoming = d.expenses.filter(
    (x) =>
      scope(x) &&
      x.status === "pending" &&
      x.due_date &&
      x.due_date <= dayPlus(today(), 7),
  );
  const stock: Row[] = d.inventory
    .filter(scope)
    .map((i) => ({
      ...i,
      material: d.materials.find((m) => m.id === i.material_id),
    }));
  const critical = stock.filter(
    (i) => i.material && i.quantity <= i.material.min_stock,
  );
  const accounts: Row[] = d.accounts
    .filter(scope)
    .map((a) => ({
      ...a,
      balance:
        a.opening_cents +
        d.ledger
          .filter((l) => l.account_id === a.id)
          .reduce((n, l) => n + l.amount_cents, 0),
    }));
  const balance = (t: string) => {
    const a = accounts.filter((a) => a.type === t);
    return a.length ? sum(a, "balance") : null;
  };
  return {
    r,
    sales,
    expenses,
    gross,
    revenue,
    spend,
    cogs,
    contribution,
    result,
    margin:
      revenue && contribution != null ? (contribution / revenue) * 100 : null,
    upcoming,
    critical,
    stock,
    accounts,
    cash: balance("cash"),
    bank: balance("bank"),
    pos: balance("pos"),
    labor: expenses.some((x) => x.category === "Personel")
      ? sum(
          expenses.filter((x) => x.category === "Personel"),
          "net_cents",
        )
      : null,
  };
}
export function insights(d: AppData, branch = "all") {
  const m = metrics(d, branch, "month"),
    out: Row[] = [];
  for (const i of m.critical)
    out.push({
      id: i.id,
      type: "warning",
      title: `${i.material.name}: kritik stok`,
      text: `${branchName(d, i.branch_id)} · ${num(i.quantity)} ${i.material.unit} kaldı. Alt sınır ${num(i.material.min_stock)} ${i.material.unit}.`,
      view: "inventory",
    });
  for (const e of m.upcoming)
    out.push({
      id: e.id,
      type: e.due_date < today() ? "danger" : "warning",
      title: e.due_date < today() ? "Vadesi geçen ödeme" : "Yaklaşan ödeme",
      text: `${e.name} · ${money(e.amount_cents)} · ${e.due_date}`,
      view: "expenses",
    });
  for (const b of byKind(d, "budget").filter(
    (b) => b.month === month() && (branch === "all" || b.branch_id === branch),
  )) {
    const actual = m.expenses
      .filter(
        (e) =>
          e.category === b.category &&
          (!b.branch_id || e.branch_id === b.branch_id),
      )
      .reduce((n, e) => n + e.net_cents, 0);
    if (actual > b.amount_cents)
      out.push({
        id: b.id,
        type: "danger",
        title: `${b.category} bütçesi aşıldı`,
        text: `${money(actual)} / ${money(b.amount_cents)} · %${num((actual / b.amount_cents - 1) * 100)} aşım`,
        view: "budget",
      });
  }
  const missing = m.sales.filter((s) => s.cost_cents == null);
  if (missing.length)
    out.push({
      id: "cost",
      type: "info",
      title: "Kârlılık için maliyet eksik",
      text: `${missing.length} satışta reçete veya malzeme maliyeti eksik.`,
      view: "products",
    });
  return out;
}

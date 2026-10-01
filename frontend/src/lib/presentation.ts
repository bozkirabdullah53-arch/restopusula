/** Labels are presentation-only; API and stored codes retain their original values. */
const statuses: Record<string, string> = {
  completed: "Tamamlandı", pending: "Ödeme bekliyor", paid: "Ödendi",
  reversed: "Ters kayıt", open: "Açık",
};
const transactions: Record<string, string> = {
  sale: "Satış tahsilatı", sale_reversal: "Satış iadesi",
  expense: "İşletme gideri", expense_reversal: "Gider ters kaydı",
  purchase: "Alış faturası", tax: "Mali yükümlülük",
  in: "Giriş", out: "Çıkış", opening: "Açılış",
  count: "Sayım", cash_count: "Kasa sayım farkı", waste: "Fire",
  transfer: "Transfer", transfer_in: "Gelen transfer", transfer_out: "Giden transfer",
};
const actions: Record<string, string> = {
  register: "İşletme hesabı oluşturma", login: "Giriş", logout: "Çıkış",
  password: "Şifre değişikliği", export: "Rapor dışa aktarımı", backup: "Veri dışa aktarımı",
  company: "İşletme bilgileri", branch: "Şube kaydı", product: "Ürün kaydı",
  recipe: "Ürün tarifi", material: "Malzeme kaydı", move: "Stok hareketi",
  sale: "Satış", reverse_sale: "Satış iadesi", table: "Masa kaydı",
  table_status: "Masa durumu", order: "Adisyon", account: "Tahsilat hesabı",
  account_tx: "Hesap hareketi", expense: "Gider kaydı", pay_expense: "Gider ödemesi",
  reverse_expense: "Gider ters kaydı", supplier: "Tedarikçi kaydı",
  purchase: "Satın alma talebi", purchase_status: "Satın alma aşaması",
  employee: "Personel kaydı", attendance: "Puantaj", budget: "Bütçe",
  tax: "Mali yükümlülük", vehicle: "Araç kaydı", fuel: "Yakıt",
  utility: "Enerji faturası", member: "Kullanıcı kaydı",
  ai_connection: "Yapay zekâ bağlantısı", ai_test: "Yapay zekâ bağlantı testi",
};
export const statusLabel = (value: string) => statuses[value] ?? value;
export const transactionLabel = (value: string) => transactions[value] ?? value;
export const auditActionLabel = (value: string) => actions[value] ?? value;
export const roleLabel = (value: string) => value === "Patron" ? "İşletme sahibi" : value;
export const channelLabel = (value: string) => value === "Online sipariş" ? "İnternet siparişi" : value;
export const noteLabel = (value: string) =>
  value === "Reçete tüketimi" ? "Tarife göre malzeme tüketimi" : value;
export function auditDescription(value: string) {
  return value
    .replace(/reçetesine/g, "ürün tarifine")
    .replace(/Reçete/g, "Ürün tarifi")
    .replace(/reçete/g, "ürün tarifi")
    .replace(/, Patron$/, ", İşletme sahibi")
    .replace(/\b(in|out|waste|count|transfer) işlemi/g, (_, code: string) =>
      transactions[code].toLocaleLowerCase("tr-TR") + " işlemi");
}
export function displayDate(value: string | null | undefined) {
  if (!value) return "—";
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.slice(8, 10) + "." + value.slice(5, 7) + "." + value.slice(0, 4)
    : value;
}

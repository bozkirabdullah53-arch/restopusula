import { useEffect, useState, FormEvent } from "react";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AppData, Row, byKind, today, month, branchName } from "@/lib/domain";

export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  default?: any;
  min?: number;
  step?: string;
};
export type FormSpec = {
  action: string;
  title: string;
  description: string;
  fields: Field[];
  preset?: Row;
};
const opts = (a: string[]) => a.map((v) => ({ value: v, label: v }));
const categories = [
  "Malzeme",
  "Personel",
  "Kira",
  "Elektrik",
  "Su",
  "Doğalgaz",
  "Yakıt",
  "Araç",
  "Bakım",
  "Sigorta",
  "Vergi",
  "Muhasebe",
  "Reklam",
  "Telefon",
  "İnternet",
  "Temizlik",
  "Ambalaj",
  "Diğer",
];
export const productCategories = [
  "Balık",
  "Deniz ürünleri",
  "Mezeler",
  "Salatalar",
  "Sıcak yemekler",
  "Izgara",
  "Tatlı",
  "İçecek",
  "Diğer",
];
export const roles = [
  "Patron",
  "Genel Müdür",
  "Şube Müdürü",
  "Muhasebe",
  "Depo / Stok Sorumlusu",
  "Mutfak",
  "Personel",
];
export function formFor(
  action: string,
  d: AppData,
  branch: string,
  preset: Row = {},
): FormSpec {
  const branchField: Field = {
    key: "branch_id",
    label: "Şube",
    type: "select",
    options: d.branches.map((x) => ({ value: x.id, label: x.name })),
    default:
      branch === "all"
        ? d.branches.length === 1
          ? d.branches[0].id
          : ""
        : branch,
  };
  const name: Field = { key: "name", label: "Ad" },
    date: Field = {
      key: "date",
      label: "İşlem tarihi",
      type: "date",
      default: today(),
    };
  const amount: Field = {
      key: "amount",
      label: "Tutar (TL)",
      type: "number",
      min: 0.01,
      step: ".01",
    },
    vat: Field = {
      key: "vat_rate",
      label: "KDV oranı (%)",
      type: "number",
      min: 0,
      step: "1",
      help: "Belgenizde veya ürününüzde geçerli oranı girin.",
    };
  const category: Field = {
    key: "category",
    label: "Kategori",
    type: "select",
    options: opts(categories),
  };
  const account: Field = {
    key: "account_id",
    label: "Ödeme hesabı",
    type: "select",
    required: false,
    options: d.accounts.map((a) => ({
      value: a.id,
      label: `${branchName(d, a.branch_id)} · ${a.name}`,
    })),
  };
  const mat: Field = {
    key: "material_id",
    label: "Malzeme",
    type: "select",
    options: d.materials.map((m) => ({
      value: m.id,
      label: `${m.name} (${m.unit})`,
    })),
  };
  const supplier: Field = {
    key: "supplier_id",
    label: "Tedarikçi",
    type: "select",
    options: byKind(d, "supplier").map((s) => ({ value: s.id, label: s.name })),
  };
  const q: Field = {
    key: "quantity",
    label: "Miktar",
    type: "number",
    min: 0,
    step: ".000001",
  };
  const note: Field = {
    key: "note",
    label: "Açıklama",
    required: false,
    type: "textarea",
  };
  const map: Record<string, FormSpec> = {
    company: {
      action,
      title: "İşletme bilgileri",
      description: "Tüm şubeleriniz bu işletmeye bağlı tutulur.",
      fields: [
        { ...name, label: "İşletme adı", default: d.tenant?.name },
        {
          key: "sector",
          label: "İşletme türü",
          default: d.tenant?.sector || "Restoran",
        },
      ],
    },
    branch: {
      action,
      title: "Yeni şube",
      description: "Finans, stok ve ekip kayıtları şube bazında ayrılır.",
      fields: [
        { ...name, label: "Şube adı", placeholder: "Örn. Bursa Nilüfer" },
        { key: "manager", label: "Şube müdürü", required: false },
        { key: "address", label: "Adres", type: "textarea", required: false },
        { key: "phone", label: "Telefon", required: false },
        { key: "tax_no", label: "Vergi numarası", required: false },
      ],
    },
    product: {
      action,
      title: "Ürün ekle",
      description:
        "Satış fiyatını tanımlayın, reçeteyi ürün kartından tamamlayın.",
      fields: [
        name,
        {
          key: "category",
          label: "Kategori",
          type: "select",
          options: opts(productCategories),
        },
        {
          key: "price",
          label: "KDV dahil satış fiyatı (TL)",
          type: "number",
          min: 0,
          step: ".01",
        },
        vat,
      ],
    },
    recipe: {
      action,
      title: "Reçete malzemesi",
      description:
        "Bir satış biriminde kullanılan miktarı malzemenin kendi birimiyle girin. Örneğin kg birimindeki malzemede 400 g = 0,4 kg.",
      fields: [
        {
          key: "product_id",
          label: "Ürün",
          type: "select",
          options: d.products.map((p) => ({ value: p.id, label: p.name })),
        },
        mat,
        { ...q, help: "Kg ↔ gram dönüşümünü miktarı girerken yapın." },
      ],
    },
    material: {
      action,
      title: "Malzeme & açılış stoğu",
      description:
        "Birim maliyet KDV hariçtir. Maliyeti bilmiyorsanız boş bırakın.",
      fields: [
        branchField,
        name,
        {
          key: "unit",
          label: "Stok birimi",
          type: "select",
          options: opts([
            "kg",
            "g",
            "L",
            "mL",
            "adet",
            "kasa",
            "koli",
            "paket",
          ]),
        },
        {
          key: "cost",
          label: "Birim maliyet (TL, KDV hariç)",
          type: "number",
          min: 0,
          step: ".01",
          required: false,
        },
        { ...q, label: "Açılış miktarı" },
        {
          key: "min_stock",
          label: "Kritik stok alt sınırı",
          type: "number",
          min: 0,
          step: ".000001",
        },
        date,
      ],
    },
    move: {
      action,
      title: "Stok hareketi",
      description:
        "Sayımda fiili miktarı girin. Fire ve transfer işlemleri stok miktarını günceller.",
      fields: [
        branchField,
        mat,
        {
          key: "kind",
          label: "İşlem türü",
          type: "select",
          options: [
            { value: "in", label: "Stok girişi" },
            { value: "waste", label: "Fire / tüketim" },
            { value: "count", label: "Sayım (fiili miktar)" },
            { value: "transfer", label: "Şubeler arası transfer" },
          ],
        },
        q,
        {
          key: "target_branch_id",
          label: "Transfer için alan şube",
          type: "select",
          options: branchField.options,
          required: false,
        },
        {
          key: "cost",
          label: "Girişte birim maliyet (TL)",
          type: "number",
          min: 0,
          step: ".01",
          required: false,
        },
        { key: "reason", label: "Hareket / fire nedeni", type: "textarea" },
        date,
      ],
    },
    account: {
      action,
      title: "Kasa / banka / POS hesabı",
      description:
        "Gerçek açılış bakiyesini girin. Satış ve ödemeler seçilen hesapta izlenir.",
      fields: [
        branchField,
        name,
        {
          key: "type",
          label: "Hesap türü",
          type: "select",
          options: [
            { value: "cash", label: "Nakit kasa" },
            { value: "bank", label: "Banka hesabı" },
            { value: "pos", label: "POS / kart tahsilatı" },
          ],
        },
        {
          key: "opening",
          label: "Açılış bakiyesi (TL)",
          type: "number",
          step: ".01",
        },
      ],
    },
    account_tx: {
      action,
      title: "Hesap hareketi",
      description:
        "Hesap giriş / çıkışları ciro veya işletme gideri sayılmaz. İlgili satış veya gideri kendi ekranında kaydedin.",
      fields: [
        branchField,
        { ...account, required: true },
        {
          key: "kind",
          label: "İşlem türü",
          type: "select",
          options: [
            { value: "in", label: "Diğer giriş" },
            { value: "out", label: "Diğer çıkış" },
            { value: "transfer", label: "Hesaplar arası transfer" },
            { value: "count", label: "Kasa sayımı (gerçek bakiye)" },
          ],
        },
        amount,
        {
          ...account,
          key: "target_account_id",
          label: "Transfer için hedef hesap",
          required: false,
        },
        { ...note, required: true },
        date,
      ],
    },
    expense: {
      action,
      title: "Gider / fatura ekle",
      description:
        "Alış faturaları stok maliyetinden ayrı takip edilir; işletme giderine ikinci kez eklenmez.",
      fields: [
        branchField,
        name,
        category,
        {
          key: "kind",
          label: "Kayıt türü",
          type: "select",
          default: "expense",
          options: [
            { value: "expense", label: "İşletme gideri" },
            { value: "purchase", label: "Stok / tedarikçi alış faturası" },
            { value: "tax", label: "Vergi / mali yükümlülük" },
          ],
        },
        amount,
        vat,
        date,
        {
          key: "due_date",
          label: "Son ödeme tarihi",
          type: "date",
          required: false,
        },
        {
          key: "status",
          label: "Ödeme durumu",
          type: "select",
          default: "pending",
          options: [
            { value: "pending", label: "Ödenecek" },
            { value: "paid", label: "Ödendi" },
          ],
        },
        account,
        { ...supplier, required: false },
        note,
      ],
    },
    pay_expense: {
      action,
      title: "Ödeme kaydet",
      description:
        "Ödeme, seçilen hesaptan düşülecek. Fatura gider olarak tekrar eklenmez.",
      fields: [branchField, { ...account, required: true }, date],
    },
    reverse_expense: {
      action,
      title: "Gider ters kaydı",
      description:
        "Asıl kayıt ve geçmiş korunur. Ödenmişse hesaba ters hareket eklenir.",
      fields: [
        branchField,
        { key: "reason", label: "İptal / düzeltme nedeni", type: "textarea" },
        date,
      ],
    },
    reverse_sale: {
      action,
      title: "Satış iadesi / ters kayıt",
      description:
        "Tam satış iadesi tahsilatı ve reçete stok hareketlerini ters çevirir. Asıl kayıt korunur.",
      fields: [
        branchField,
        { key: "reason", label: "İade nedeni", type: "textarea" },
        date,
      ],
    },
    supplier: {
      action,
      title: "Tedarikçi ekle",
      description:
        "Alışlar, faturalar ve ödeme durumu bu cari hesapta izlenir.",
      fields: [
        name,
        {
          key: "category",
          label: "Tedarik türü",
          type: "select",
          options: opts([
            "Balıkçı",
            "Et tedarikçisi",
            "Sebze tedarikçisi",
            "İçecek firması",
            "Temizlik firması",
            "Ambalaj firması",
            "Teknik servis",
            "Diğer",
          ]),
        },
        { key: "phone", label: "Telefon", required: false },
        { key: "email", label: "E-posta", type: "email", required: false },
        { key: "tax_no", label: "Vergi no", required: false },
      ],
    },
    purchase: {
      action,
      title: "Satın alma talebi",
      description:
        "Talep, onay, sipariş ve teslimat adımlarını izleyin. Teslimatta stok güncellenir.",
      fields: [
        branchField,
        supplier,
        mat,
        q,
        {
          key: "cost",
          label: "Teklif birim fiyatı (TL, KDV hariç)",
          type: "number",
          step: ".01",
          min: 0,
        },
        date,
        note,
      ],
    },
    purchase_status: {
      action,
      title: "Satın alma aşamasını tamamla",
      description:
        "Teslimat stok girişini oluşturur; fatura için gerçek alış faturasını seçin.",
      fields: [
        branchField,
        {
          key: "status",
          label: "Yeni aşama",
          type: "select",
          options: opts([
            "Onaylandı",
            "Sipariş verildi",
            "Teslim alındı",
            "Faturalandı",
            "Ödendi",
          ]),
        },
        {
          key: "expense_id",
          label: "Faturalama için alış faturası",
          type: "select",
          options: d.expenses
            .filter((e) => e.kind === "purchase" && e.status !== "reversed")
            .map((e) => ({ value: e.id, label: e.name })),
          required: false,
        },
        date,
      ],
    },
    table: {
      action,
      title: "Masa ekle",
      description:
        "Masa durumlarını ve açık adisyonları satış ekranından izleyin.",
      fields: [
        branchField,
        { ...name, label: "Masa adı / numarası" },
        {
          key: "capacity",
          label: "Kişi kapasitesi",
          type: "number",
          min: 1,
          step: "1",
        },
        { key: "zone", label: "Alan", placeholder: "Salon / Teras / Bahçe" },
      ],
    },
    employee: {
      action,
      title: "Personel kartı",
      description:
        "Ücret kartı tek başına gider oluşturmaz. Ödenen / tahakkuk eden ücretleri Personel gideri olarak kaydedin.",
      fields: [
        branchField,
        { ...name, label: "Ad soyad" },
        { key: "title", label: "Görev" },
        { key: "email", label: "E-posta", type: "email", required: false },
        { key: "phone", label: "Telefon", required: false },
        { key: "start_date", label: "İşe giriş tarihi", type: "date" },
        {
          key: "salary",
          label: "Kayıtlı aylık ücret (TL)",
          type: "number",
          step: ".01",
          min: 0,
        },
      ],
    },
    attendance: {
      action,
      title: "Günlük puantaj",
      description:
        "Planı aşan süre kayıtlı saatlerden hesaplanır; bordro ve yasal fazla mesai hesabı değildir.",
      fields: [
        branchField,
        {
          key: "employee_id",
          label: "Personel",
          type: "select",
          options: byKind(d, "employee").map((e) => ({
            value: e.id,
            label: e.name,
          })),
        },
        date,
        {
          key: "status",
          label: "Durum",
          type: "select",
          options: opts(["Çalıştı", "İzin", "Devamsızlık"]),
        },
        {
          key: "hours",
          label: "Çalışılan saat",
          type: "number",
          min: 0,
          step: ".25",
        },
        {
          key: "planned",
          label: "Planlanan saat",
          type: "number",
          min: 0,
          step: ".25",
        },
      ],
    },
    budget: {
      action,
      title: "Şube bütçesi",
      description: "KDV hariç işletme giderlerini bu bütçeyle karşılaştırın.",
      fields: [
        branchField,
        category,
        { key: "month", label: "Bütçe ayı", type: "month", default: month() },
        amount,
      ],
    },
    tax: {
      action,
      title: "Mali yükümlülük",
      description:
        "Tutar ve vadeyi muhasebecinizin veya belgenizin verdiği bilgiyle girin.",
      fields: [
        branchField,
        { ...name, label: "Yükümlülük adı" },
        {
          key: "category",
          label: "Tür",
          type: "select",
          options: opts([
            "KDV",
            "Stopaj",
            "SGK",
            "Muhtasar",
            "Geçici vergi",
            "Kurumlar / gelir vergisi",
            "Damga vergisi",
            "Diğer",
          ]),
        },
        amount,
        { ...vat, default: 0 },
        date,
        { key: "due_date", label: "Son ödeme tarihi", type: "date" },
        {
          key: "status",
          label: "Durum",
          type: "select",
          default: "pending",
          options: [
            { value: "pending", label: "Ödenecek" },
            { value: "paid", label: "Ödendi" },
          ],
        },
        account,
        note,
      ],
    },
    vehicle: {
      action,
      title: "Araç kartı",
      description:
        "Araç, yakıt ve yaklaşan yenileme tarihlerini şube bazında izleyin.",
      fields: [
        branchField,
        { ...name, label: "Plaka" },
        { key: "brand", label: "Marka" },
        { key: "model", label: "Model" },
        {
          key: "year",
          label: "Model yılı",
          type: "number",
          step: "1",
          min: 1980,
        },
        {
          key: "km",
          label: "Son kilometre",
          type: "number",
          min: 0,
          step: "1",
        },
        {
          key: "fuel",
          label: "Yakıt tipi",
          type: "select",
          options: opts(["Dizel", "Benzin", "LPG", "Elektrik"]),
        },
        {
          key: "insurance_date",
          label: "Sigorta yenileme",
          type: "date",
          required: false,
        },
        {
          key: "inspection_date",
          label: "Muayene tarihi",
          type: "date",
          required: false,
        },
      ],
    },
    fuel: {
      action,
      title: "Yakıt kaydı",
      description:
        "L/100 km hesabı, iki dolum arasında tam depo yöntemiyle anlamlıdır. Tutar tek bir Yakıt gideri oluşturur.",
      fields: [
        branchField,
        {
          key: "vehicle_id",
          label: "Araç",
          type: "select",
          options: byKind(d, "vehicle").map((v) => ({
            value: v.id,
            label: v.name,
          })),
        },
        date,
        {
          key: "liters",
          label: "Alınan yakıt (L)",
          type: "number",
          min: 0.001,
          step: ".001",
        },
        {
          key: "km",
          label: "Yeni kilometre",
          type: "number",
          step: "1",
          min: 0,
        },
        amount,
        vat,
      ],
    },
    utility: {
      action,
      title: "Sayaç & enerji faturası",
      description:
        "Sayaç tüketimi ve fatura kaydı birlikte tutulur. Gider kaydı otomatik oluşur.",
      fields: [
        branchField,
        {
          key: "kind",
          label: "Sayaç türü",
          type: "select",
          options: opts(["Elektrik", "Su", "Doğalgaz"]),
        },
        {
          key: "first",
          label: "İlk sayaç",
          type: "number",
          min: 0,
          step: ".001",
        },
        {
          key: "last",
          label: "Son sayaç",
          type: "number",
          min: 0,
          step: ".001",
        },
        amount,
        vat,
        date,
        { key: "due_date", label: "Son ödeme tarihi", type: "date" },
      ],
    },
    member: {
      action,
      title: "Kullanıcı ekle",
      description:
        "Geçici şifreyi güvenli biçimde iletin. Kullanıcı ilk girişte şifresini değiştirmek zorunda kalır.",
      fields: [
        { ...name, label: "Ad soyad" },
        { key: "email", label: "E-posta", type: "email" },
        {
          key: "password",
          label: "Geçici şifre",
          type: "password",
          help: "En az 10 karakter.",
        },
        { key: "role", label: "Rol", type: "select", options: opts(roles) },
        {
          ...branchField,
          key: "member_branch_id",
          label: "Yetkili şube (boşsa tümü)",
          required: false,
        },
      ],
    },
  };
  return { ...map[action], preset };
}
export function FieldInput({
  field: f,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const required = f.required !== false;
  return (
    <label
      className={"form-field " + (f.type === "textarea" ? "full-field" : "")}
    >
      <span>
        {f.label}
        {required && <b> *</b>}
      </span>
      {f.type === "select" ? (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger aria-label={f.label}>
            <SelectValue placeholder="Seçin" />
          </SelectTrigger>
          <SelectContent>
            {f.required === false && (
              <SelectItem value="__none__">Seçim yok</SelectItem>
            )}
            {f.options?.map((o) => (
              <SelectItem value={o.value} key={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : f.type === "textarea" ? (
        <textarea
          aria-label={f.label}
          required={required}
          maxLength={2000}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <div className={f.type === "password" ? "password-field" : ""}>
          <Input
            aria-label={f.label}
            type={f.type === "password" && show ? "text" : f.type || "text"}
            required={required}
            min={f.min}
            maxLength={f.type === "password" ? 128 : 500}
            step={f.step}
            value={value ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {f.type === "password" && (
            <button
              type="button"
              aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
      )}
      {f.help && <small>{f.help}</small>}
    </label>
  );
}
export function ActionDialog({
  spec,
  onClose,
  onSubmit,
}: {
  spec: FormSpec | null;
  onClose: () => void;
  onSubmit: (p: Row) => Promise<void>;
}) {
  const [values, setValues] = useState<Row>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (spec) {
      const values: Row = {};
      for (const f of spec.fields)
        values[f.key] = spec.preset?.[f.key] ?? f.default ?? "";
      setValues(values);
      setError("");
    }
  }, [spec]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!spec) return;
    for (const f of spec.fields)
      if (f.required !== false && !String(values[f.key] ?? "").trim()) {
        setError(`${f.label} alanını doldurun.`);
        return;
      }
    setBusy(true);
    setError("");
    try {
      const p: Row = { ...spec.preset, ...values, action: spec.action };
      for (const k of Object.keys(p)) if (p[k] === "__none__") p[k] = "";
      await onSubmit(p);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!spec}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="action-dialog">
        <DialogHeader>
          <span className="eyebrow">YENİ KAYIT</span>
          <DialogTitle>{spec?.title}</DialogTitle>
          <DialogDescription>{spec?.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="form-grid">
            {spec?.fields.map((f) => (
              <FieldInput
                field={f}
                value={values[f.key]}
                key={f.key}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              />
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" size={16} />}{" "}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

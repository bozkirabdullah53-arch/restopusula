import { useId, useState } from "react";
import { ArrowUpRight, Compass, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppData, branchName } from "@/lib/domain";

type Scene = "menu" | "dining" | "stock" | "finance" | "team" | "delivery" | "branch";
const sections: Record<string, { title: string; text: string; scene: Scene }> = {
  branches: { title: "Her şube, aynı yönetim standardı.", text: "Şubelerinizin satışlarını, giderlerini ve kaynaklarını birlikte izleyin.", scene: "branch" },
  sales: { title: "İyi servis, düzenli bir akışla başlar.", text: "Masadan adisyona, satıştan tahsilata tüm servis akışı aynı yerde.", scene: "dining" },
  products: { title: "Lezzetin standardı, maliyetin kontrolü.", text: "Ürün tariflerini, kullanılan malzemeleri ve porsiyon maliyetini yönetin.", scene: "menu" },
  inventory: { title: "Mutfakta her malzemenin yeri belli.", text: "Stok girişlerini, sayımları, şube transferlerini ve fireyi takip edin.", scene: "stock" },
  purchases: { title: "Mutfağın ihtiyacından teslimata.", text: "Tedarikçilerinizi, satın alma taleplerini ve teslimatları aynı akışta izleyin.", scene: "stock" },
  accounts: { title: "Tahsilatın ve bakiyenin kontrolü sizde.", text: "Nakit, banka ve kart hesaplarının hareketlerini birlikte inceleyin.", scene: "finance" },
  expenses: { title: "Giderler net, vadeler görünür.", text: "İşletme giderlerini, faturaları ve ödemeleri kayıtlarından takip edin.", scene: "finance" },
  budget: { title: "Planınızla gerçekleşeni birlikte görün.", text: "Şube bütçelerini ve mali yükümlülükleri aynı çalışma alanında izleyin.", scene: "finance" },
  employees: { title: "İyi bir işletmenin merkezinde ekip var.", text: "Personel kartlarını, çalışma saatlerini ve puantajı şube bazında yönetin.", scene: "team" },
  resources: { title: "Servisin arkasındaki kaynakları izleyin.", text: "Araç, yakıt, sayaç ve enerji giderlerini kayıtlarıyla birlikte görün.", scene: "delivery" },
  reports: { title: "Kararlarınızın dayanağı, işletme kayıtları.", text: "Satış, stok, gider ve hesap raporlarını Excel veya PDF olarak hazırlayın.", scene: "finance" },
  settings: { title: "İşletmenize ait bir çalışma alanı.", text: "İşletme bilgilerini, kullanıcı erişimlerini ve veri dışa aktarımını yönetin.", scene: "branch" },
};

function Illustration({ scene }: { scene: Scene }) {
  const id = useId().replace(/:/g, "");
  const grad = "scene-paper-" + id;
  return (
    <svg viewBox="0 0 320 160" fill="none" className="module-illustration" aria-hidden="true">
      <defs><linearGradient id={grad} x1="40" y1="20" x2="260" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf5" /><stop offset="1" stopColor="#ede8d7" /></linearGradient></defs>
      <ellipse cx="170" cy="141" rx="124" ry="9" fill="#1d4933" opacity=".08" />
      {(scene === "menu" || scene === "dining") && (
        <g>
          <rect x="72" y="18" width="192" height="128" rx="25" fill="#e5ded0" />
          <rect x="77" y="22" width="182" height="117" rx="23" fill={"url(#" + grad + ")"} />
          <circle cx="166" cy="81" r="48" fill="white" stroke="#cfcbb9" strokeWidth="2" />
          <circle cx="166" cy="81" r="35" stroke="#eeeee5" strokeWidth="2" />
          {scene === "menu" ? (
            <g>
              <path d="M142 75c8-21 44-20 50 1-9 19-41 22-50-1Z" fill="#ce8c4b" />
              <path d="m146 74 38-9m-34 19 38-9" stroke="#9c5f37" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="181" cy="103" rx="14" ry="7" fill="#487957" transform="rotate(-28 181 103)" />
              <ellipse cx="156" cy="103" rx="12" ry="6" fill="#688954" transform="rotate(22 156 103)" />
              <path d="M139 93a12 12 0 0 1-5-21l8 17Z" fill="#ead080" stroke="#cbb363" />
              <circle cx="198" cy="87" r="6" fill="#bd6047" /><circle cx="141" cy="58" r="5" fill="#bd6047" />
            </g>
          ) : (
            <g>
              <rect x="145" y="54" width="39" height="51" rx="4" fill="#d8dfd0" transform="rotate(-15 145 54)" />
              <path d="m156 64 18 30" stroke="#aabca5" strokeWidth="2" />
              <ellipse cx="235" cy="51" rx="10" ry="14" stroke="#b39971" strokeWidth="2" />
              <path d="M235 66v18m-8 0h16" stroke="#b39971" strokeWidth="2" strokeLinecap="round" />
              <rect x="118" y="3" width="36" height="12" rx="5" fill="#386451" /><rect x="181" y="3" width="36" height="12" rx="5" fill="#386451" />
              <rect x="118" y="149" width="36" height="8" rx="4" fill="#386451" /><rect x="181" y="149" width="36" height="8" rx="4" fill="#386451" />
            </g>
          )}
          <path d="M96 60v54m-6-62v19m6-19v19m6-19v19M241 95v27" stroke="#a3a593" strokeWidth="3" strokeLinecap="round" />
          <path d="M245 92c0-10-8-13-8-4v12h8" fill="#c2c3b6" />
        </g>
      )}
      {scene === "stock" && (
        <g>
          <rect x="78" y="79" width="100" height="61" rx="5" fill="#c79665" />
          <path d="M78 99h100M78 120h100M97 80v60m62-60v60" stroke="#a5754a" strokeWidth="3" />
          <ellipse cx="104" cy="70" rx="16" ry="23" fill="#7a9664" transform="rotate(-22 104 70)" /><ellipse cx="123" cy="67" rx="14" ry="24" fill="#3e7251" transform="rotate(17 123 67)" />
          <circle cx="149" cy="73" r="17" fill="#b95c43" /><path d="m142 55 6 7 7-7" stroke="#587249" strokeWidth="3" />
          <rect x="183" y="39" width="66" height="101" rx="6" fill={"url(#" + grad + ")"} stroke="#c7baa0" />
          <path d="M207 39v29l10-6 10 6V39" fill="#c7ad7d" />
          <rect x="201" y="88" width="31" height="25" rx="4" stroke="#416c54" strokeWidth="2" /><path d="m211 98 5 5 9-11" stroke="#416c54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {scene === "finance" && (
        <g>
          <rect x="88" y="33" width="100" height="103" rx="7" fill="#c8d2c4" transform="rotate(-10 88 33)" />
          <rect x="106" y="24" width="96" height="115" rx="6" fill={"url(#" + grad + ")"} stroke="#c7baa0" />
          <rect x="121" y="40" width="21" height="19" rx="4" fill="#416c54" />
          <path d="M151 46h35m-35 8h26M121 76h65m-65 13h65m-65 13h39m-39 13h42" stroke="#c4c4b4" strokeWidth="3" strokeLinecap="round" />
          <rect x="193" y="72" width="61" height="70" rx="9" fill="#24503e" /><rect x="203" y="83" width="41" height="13" rx="3" fill="#b9c9b6" />
          {[0, 1, 2].map((row) => [0, 1, 2].map((col) => <rect key={row + "-" + col} x={203 + col * 15} y={104 + row * 10} width="10" height="6" rx="2" fill={col === 2 ? "#c3aa74" : "#628470"} />))}
        </g>
      )}
      {scene === "team" && (
        <g>
          <path d="M73 140v-13c0-32 60-32 60 0v13" fill="#d7ddce" /><circle cx="103" cy="79" r="20" fill="#d1ab82" />
          <path d="M195 140v-13c0-32 60-32 60 0v13" fill="#b7c6af" /><circle cx="225" cy="79" r="20" fill="#c6a77f" />
          <path d="M121 140v-27c0-44 87-44 87 0v27" fill="#416c54" /><circle cx="165" cy="61" r="27" fill="#d6b48c" />
          <path d="M138 52c-3-31 50-34 54 0-20-3-21-14-28-11-8 5-9 10-26 11Z" fill="#284838" />
          <path d="m147 93 18 19 18-19M165 112v28" stroke="#94ae91" strokeWidth="3" />
        </g>
      )}
      {scene === "delivery" && (
        <g>
          <rect x="65" y="53" width="119" height="72" rx="6" fill={"url(#" + grad + ")"} stroke="#c9bc9d" strokeWidth="2" />
          <path d="M184 78h41l29 28v19h-70V78Z" fill="#416c54" /><path d="M195 86h22l17 20h-39V86Z" fill="#b7c9b0" />
          <circle cx="104" cy="130" r="16" fill="#2a4738" /><circle cx="104" cy="130" r="7" fill="#c8cbbe" /><circle cx="223" cy="130" r="16" fill="#2a4738" /><circle cx="223" cy="130" r="7" fill="#c8cbbe" />
          <path d="M96 74h55m-55 10h43M123 61v45" stroke="#b4b3a0" strokeWidth="3" />
        </g>
      )}
      {scene === "branch" && (
        <g>
          <rect x="89" y="58" width="151" height="83" rx="5" fill={"url(#" + grad + ")"} stroke="#c7baa0" />
          <path d="M78 58h174l-17-29H95L78 58Z" fill="#416c54" />
          <path d="M102 31 93 58m41-27-4 27m36-27v27m31-27 4 27m21-27 11 27" stroke="#d9e1d3" strokeWidth="8" />
          <path d="M78 58c0 15 24 15 24 0 0 15 24 15 24 0 0 15 26 15 26 0 0 15 26 15 26 0 0 15 26 15 26 0 0 15 24 15 24 0 0 15 24 15 24 0" stroke="#416c54" strokeWidth="7" />
          <rect x="105" y="83" width="56" height="34" rx="3" fill="#afc1aa" /><path d="M133 83v34" stroke="#f9f8ed" strokeWidth="3" />
          <rect x="183" y="83" width="34" height="58" rx="3" fill="#426852" /><circle cx="210" cy="115" r="2" fill="#d3c092" />
        </g>
      )}
    </svg>
  );
}
export default function WorkspaceIntro({ view, d, branch, go }: { view: string; d: AppData; branch: string; go: (view: string) => void; }) {
  const titleId = useId();
  const [dismissed, setDismissed] = useState(() => window.localStorage.getItem("restopusula-setup-dismissed") === "1");
  const canView = (module: string) => !d.user || Boolean(d.user.permissions?.[module]?.view);
  if (view === "dashboard") return (
    <>
    <section className="restaurant-banner" aria-labelledby={titleId}>
      <img className="restaurant-photo" src="/images/restaurant-interior.webp" width={2172} height={724} alt="" fetchPriority="high" />
      <div className="restaurant-banner-content">
        <span className="restaurant-eyebrow"><Compass size={15} /> RESTORANINIZIN KONTROL MERKEZİ</span>
        <h2 id={titleId}>Her şubede aynı özen.</h2>
        <p>Servisten mutfağa, stoktan finansa.<br />İşletmenizin tüm akışını birlikte yönetin.</p>
        <div className="restaurant-banner-actions">
          {canView("sales") && <Button className="restaurant-primary" onClick={() => go("sales")}>Servisi yönet <ArrowUpRight size={16} /></Button>}
          {canView("products") && <Button className="restaurant-secondary" variant="ghost" onClick={() => go("products")}>Ürünleri incele <ArrowUpRight size={16} /></Button>}
        </div>
      </div>
      <span className="restaurant-scope"><Store size={14} />{branch === "all" ? "Tüm şubeler" : branchName(d, branch)}</span>
    </section>
    {d.tenant && !dismissed && (
      <SetupGuide d={d} go={go} canView={canView} onDismiss={() => { window.localStorage.setItem("restopusula-setup-dismissed", "1"); setDismissed(true); }} />
    )}
    </>
  );
  const section = sections[view];
  if (!section) return null;
  return (
    <section className={"module-intro scene-" + section.scene} aria-labelledby={titleId}>
      <div><span className="module-eyebrow">RESTOPUSULA</span><h2 id={titleId}>{section.title}</h2><p>{section.text}</p></div>
      <Illustration scene={section.scene} />
    </section>
  );
}

function SetupGuide({ d, go, canView, onDismiss }: { d: AppData; go: (view: string) => void; canView: (module: string) => boolean; onDismiss: () => void }) {
  const steps = [
    { title: "İlk şubenizi ekleyin", detail: "Satış ve stok kayıtları bir şubeye bağlanır.", module: "branches", done: d.branches.length > 0 },
    { title: "Tahsilat hesabı oluşturun", detail: "Nakit, banka veya POS hesabınızı seçin.", module: "accounts", done: d.accounts.length > 0 },
    { title: "Menünüzü ve tarifinizi tanımlayın", detail: "Ürün ve malzemeler satış maliyetini hesaplar.", module: "products", done: d.products.length > 0 && d.materials.length > 0 },
    { title: "İlk satışınızı kaydedin", detail: "Masa veya hızlı satış ekranından başlayın.", module: "sales", done: d.sales.length > 0 },
  ];
  const visible = steps.filter((step) => canView(step.module));
  const complete = visible.filter((step) => step.done).length;
  const next = visible.find((step) => !step.done);
  if (!next) return null;
  return (
    <section className="setup-guide" aria-label="İlk kurulum adımları">
      <div className="setup-guide-head">
        <div><span className="setup-guide-kicker">HIZLI BAŞLANGIÇ</span><h2>İşletmenizi 4 adımda hazırlayın</h2><p>Her adım sizi doğrudan ilgili ekrana götürür. İstediğiniz zaman devam edebilirsiniz.</p></div>
        <button className="setup-guide-dismiss" onClick={onDismiss} aria-label="Kurulum rehberini kapat"><X size={18} /></button>
      </div>
      <div className="setup-guide-progress" aria-label={`Kurulum ${complete} / ${visible.length} adım tamamlandı`}><span style={{ width: `${visible.length ? (complete / visible.length) * 100 : 0}%` }} /></div>
      <div className="setup-guide-steps">
        {visible.map((step, index) => <button key={step.module} className={`setup-guide-step ${step.done ? "is-done" : step === next ? "is-next" : ""}`} onClick={() => go(step.module)}>
          <span className="setup-guide-number">{step.done ? "✓" : index + 1}</span><span className="setup-guide-copy"><strong>{step.title}</strong><small>{step.detail}</small></span><span className="setup-guide-state">{step.done ? "Tamamlandı" : step === next ? "Şimdi başla" : "Sırada"}</span>
        </button>)}
      </div>
    </section>
  );
}

import { useEffect, useState, FormEvent } from "react";
import { Sparkles, ShieldCheck, Plug, Check, LoaderCircle, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Row } from "@/lib/domain";
import { Pill } from "./Dashboard";

const providers = {
  openai: { name: "OpenAI", model: "gpt-4.1-mini", keyUrl: "https://platform.openai.com/api-keys" },
  gemini: { name: "Google Gemini", model: "gemini-2.5-flash", keyUrl: "https://aistudio.google.com/apikey" },
  anthropic: { name: "Anthropic Claude", model: "claude-haiku-4-5", keyUrl: "https://platform.claude.com/settings/keys" },
};
type Provider = keyof typeof providers;
type Connection = {
  provider: Provider;
  model: string;
  has_key: boolean;
  last_tested_at: string | null;
  updated_at: string;
};
type Props = {
  request: (path: string, body?: Row) => Promise<Row>;
  preview: boolean;
  owner: boolean;
};

export default function AISettings({ request, preview, owner }: Props) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(providers.openai.model);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(!preview && owner);
  const [ready, setReady] = useState(preview);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setApiKey("");
    if (preview || !owner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setReady(false);
    setError("");
    request("/api/ai-connection")
      .then((data) => {
        if (!active) return;
        const saved = data.connection as Connection | null;
        setConnection(saved);
        setProvider(saved?.provider || "openai");
        setModel(saved?.model || providers.openai.model);
        setReady(true);
      })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request, preview, owner, reload]);

  const dirty = !connection || provider !== connection.provider || model.trim() !== connection.model || Boolean(apiKey.trim());
  const locked = preview || !owner || !ready || loading || Boolean(busy);
  async function run(action: "save" | "test" | "remove") {
    if (locked) return;
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const result = await request(
        action === "save" ? "/api/ai-connection" : `/api/ai-connection/${action}`,
        action === "save" ? { provider, model: model.trim(), api_key: apiKey } : {},
      );
      const saved = result.connection as Connection | null;
      setConnection(saved);
      setApiKey("");
      setConfirmRemove(false);
      if (saved) {
        setProvider(saved.provider);
        setModel(saved.model);
      } else {
        setProvider("openai");
        setModel(providers.openai.model);
      }
      setMessage(result.message);
    } catch (e) {
      setError((e as Error).message);
      if (action === "test") {
        try {
          const current = await request("/api/ai-connection");
          setConnection(current.connection);
        } catch {
          setConnection((saved) => saved ? { ...saved, last_tested_at: null } : null);
        }
      }
    } finally {
      setBusy("");
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void run("save");
  }
  function changeProvider(value: Provider) {
    setProvider(value);
    setModel(connection?.provider === value ? connection.model : providers[value].model);
    setApiKey("");
    setMessage("");
    setConfirmRemove(false);
  }

  return (
    <div className="ai-settings-grid">
      <section className="panel ai-connection-panel" aria-busy={loading || Boolean(busy)}>
        <div className="ai-section-heading">
          <div className="ai-symbol"><Sparkles size={23} /></div>
          <div><span className="module-eyebrow">AI BAĞLANTISI</span><h2>Yapay zekâ bağlantısı</h2></div>
          <Pill tone={connection?.last_tested_at ? "success" : "neutral"}>
            {connection?.last_tested_at ? "Erişim doğrulandı" : connection ? "Kaydedildi" : "Henüz eklenmedi"}
          </Pill>
        </div>
        <p className="ai-intro">İşletmeniz için bir sağlayıcı ekleyin. Model ve anahtar ayarlarını buradan yönetin.</p>
        {preview ? (
          <div className="ai-notice"><Plug size={18} /><p><strong>Görsel ön izleme</strong>Sağlayıcı ve model alanlarını inceleyebilirsiniz. API anahtarı girişi ve bağlantı işlemleri çalışan uygulamada açılır.</p></div>
        ) : !owner ? (
          <div className="ai-notice"><ShieldCheck size={18} /><p><strong>İşletme sahibi erişimi</strong>Bu bölümü kullanmak için Patron hesabıyla giriş yapın.</p></div>
        ) : null}
        {loading && <p className="ai-loading" role="status"><LoaderCircle size={16} className="ai-spinner" />Bağlantı bilgisi yükleniyor…</p>}
        <form className="ai-form" onSubmit={save} autoComplete="off">
          <div className="ai-fields">
            <label className="form-field">
              <span>Sağlayıcı</span>
              <select aria-label="Sağlayıcı" value={provider} disabled={Boolean(busy) || (!preview && locked)}
                onChange={(event) => changeProvider(event.target.value as Provider)}>
                {Object.entries(providers).map(([value, info]) => <option key={value} value={value}>{info.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Model kimliği</span>
              <Input aria-label="Model kimliği" value={model} required maxLength={128}
                spellCheck={false} autoCapitalize="none" disabled={Boolean(busy) || (!preview && locked)}
                onChange={(event) => { setModel(event.target.value); setMessage(""); }} />
              <small>Sağlayıcıdaki tam model kimliğini girin.</small>
            </label>
          </div>
          <label className="form-field ai-key-field">
            <span>API anahtarı</span>
            <Input aria-label="API anahtarı" type="password" name="provider-api-key" autoComplete="new-password"
              value={apiKey} maxLength={2048} disabled={locked} spellCheck={false} autoCapitalize="none"
              required={!connection || provider !== connection.provider}
              placeholder={preview ? "Çalışan uygulamada girilir" : connection?.provider === provider ? "Kayıtlı anahtarı korumak için boş bırakın" : "Sağlayıcınızın API anahtarı"}
              onChange={(event) => { setApiKey(event.target.value); setMessage(""); }} />
            <small>{connection?.provider === provider ? "Anahtar kayıtlı. Değiştirmek için yeni anahtarı girin." : "Anahtar şifreli saklanır ve kayıttan sonra tekrar gösterilmez."}</small>
          </label>
          <div className="ai-security-note"><ShieldCheck size={17} /><span>Yalnızca işletme sahibi yönetebilir. Anahtar işletme dışa aktarımına eklenmez.</span></div>
          {error && <div className="form-error" role="alert">{error}{!ready && !preview && owner && <Button type="button" variant="outline" onClick={() => setReload((n) => n + 1)}>Yeniden yükle</Button>}</div>}
          {message && <div className="ai-feedback" role="status"><Check size={17} />{message}</div>}
          <div className="ai-actions">
            <Button type="submit" disabled={locked}><Plug size={16} />{busy === "save" ? "Kaydediliyor…" : "Bağlantıyı kaydet"}</Button>
            <Button type="button" variant="outline" disabled={locked || dirty} onClick={() => void run("test")}>
              {busy === "test" ? <LoaderCircle size={16} className="ai-spinner" /> : <Check size={16} />}
              {busy === "test" ? "Test ediliyor…" : "Bağlantıyı test et"}
            </Button>
            {connection && <Button type="button" variant="ghost" disabled={locked} onClick={() => setConfirmRemove(true)}><Trash2 size={16} />Bağlantıyı kaldır</Button>}
          </div>
          {dirty && connection && <p className="ai-caption">Değişiklikleri kaydettikten sonra bağlantıyı test edin.</p>}
          {confirmRemove && <div className="ai-remove-confirm" role="alert"><p>Bu işletmenin bağlantısı ve kayıtlı API anahtarı kaldırılsın mı?</p><div><Button type="button" variant="outline" disabled={locked} onClick={() => setConfirmRemove(false)}>Vazgeç</Button><Button type="button" disabled={locked} onClick={() => void run("remove")}>{busy === "remove" ? "Kaldırılıyor…" : "Evet, kaldır"}</Button></div></div>}
          {connection?.last_tested_at && <p className="ai-caption">Son başarılı test: {new Date(connection.last_tested_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>}
        </form>
      </section>
      <aside className="ai-help-column">
        <section className="panel ai-help-panel">
          <span className="module-eyebrow">ÜÇ ADIMDA BAĞLANTI</span>
          <h3>Sağlayıcınızı ekleyin</h3>
          <ol><li><strong>Sağlayıcı ve modeli seçin.</strong><span>Hesabınızda erişebildiğiniz model kimliğini kullanın.</span></li><li><strong>API anahtarını kaydedin.</strong><span>Anahtarı sağlayıcınızın hesabından oluşturun.</span></li><li><strong>Bağlantıyı test edin.</strong><span>Test, anahtarın seçilen modele erişimini kontrol eder.</span></li></ol>
          <a href={providers[provider].keyUrl} target="_blank" rel="noopener noreferrer">{providers[provider].name} anahtar sayfası<ExternalLink size={14} /></a>
        </section>
        <section className="ai-info-card"><ShieldCheck size={20} /><h3>Kontrol sizde</h3><p>Bağlantı testi içerik üretmez ve işletme kayıtlarını sağlayıcıya göndermez.</p><p>Yönetim asistanı kayıtlı verilerle çalışmayı sürdürür. Bu bölüm sağlayıcı bağlantısını yönetir.</p></section>
      </aside>
    </div>
  );
}

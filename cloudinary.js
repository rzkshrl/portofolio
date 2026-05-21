// ── Cloudinary Config ─────────────────────────────────────────────
const CLD_CONFIG = {
  cloudName:    "dwvaghfci",
  apiKey:       "453717685932771",
  uploadPreset: "portofolio",
};

// ── URL Builder ───────────────────────────────────────────────────
const cld = {
  base: () => `https://res.cloudinary.com/${CLD_CONFIG.cloudName}`,
  thumb(publicId, { w = 800, h, q = "auto", f = "auto" } = {}) {
    const t = [`w_${w}`, `q_${q}`, `f_${f}`, "c_fill"];
    if (h) t.push(`h_${h}`);
    const type = publicId.match(/\.(mp4|mov|webm|avi)$/i) ? "video" : "image";
    const id   = publicId.replace(/\.[^.]+$/, "");
    if (type === "video") t.push("so_0");
    return `${this.base()}/${type}/upload/${t.join(",")}/${id}.jpg`;
  },
  video(publicId, { w = 900, q = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return {
      webm: `${this.base()}/video/upload/w_${w},q_${q},f_webm,vc_vp9/${id}.webm`,
      mp4:  `${this.base()}/video/upload/w_${w},q_${q},f_mp4,vc_h264/${id}.mp4`,
    };
  },
  image(publicId, { w = 900, q = "auto", f = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return `${this.base()}/image/upload/w_${w},q_${q},f_${f},c_fill/${id}`;
  },
  uploadUrl()   { return `https://api.cloudinary.com/v1_1/${CLD_CONFIG.cloudName}/auto/upload`; },
  uploadPreset: () => CLD_CONFIG.uploadPreset,
  cloudName:    () => CLD_CONFIG.cloudName,
  apiKey:       () => CLD_CONFIG.apiKey,
};

// ── i18n ──────────────────────────────────────────────────────────
const i18n = {
  _key: "rsm_lang",
  get()     { return localStorage.getItem(this._key) || "id"; },
  set(lang) {
    localStorage.setItem(this._key, lang);
    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  },
  t(path) {
    const val = path.split(".").reduce((o, k) => o?.[k], window.STRINGS?.[this.get()]);
    return val ?? path;
  },
};

// ── Translations ──────────────────────────────────────────────────
window.STRINGS = {
  id: {
    nav:     { work: "Karya", personal: "Personal", contact: "Kontak", hire: "Hire Me" },
    hero:    { eyebrow: "Showcase © 2023 — 2026", scroll: "Gulir ke bawah", badge: "↓ Gulir untuk menjelajahi" },
    projects:{ empty: "Upload media di halaman Admin", personalLabel: "Karya Pribadi", personalTitle: "Proyek Mandiri" },
    contact: {
      label: "Hubungi Aku", h1: "Ayo", h2: "Terhubung",
      desc:  "Tertarik berkolaborasi? Aku terbuka untuk project videografi, motion graphics, konten sosial media, dan desain visual.",
      li_hint: "Terhubung secara profesional", email_hint: "Kirim pesan langsung", wa_hint: "Hubungi via chat",
    },
    footer:  { tagline: "Videografi · Gerak · Desain" },
  },
  en: {
    nav:     { work: "Work", personal: "Personal", contact: "Contact", hire: "Hire Me" },
    hero:    { eyebrow: "Showcase © 2023 — 2026", scroll: "Scroll down", badge: "↓ Scroll to explore" },
    projects:{ empty: "Upload media via the Admin panel", personalLabel: "Personal Work", personalTitle: "Self Projects" },
    contact: {
      label: "Get in touch", h1: "Let's", h2: "Connect",
      desc:  "Interested in collaborating? I'm open to videography, motion graphics, social media content, and visual design projects.",
      li_hint: "Connect professionally", email_hint: "Send a direct message", wa_hint: "Chat via WhatsApp",
    },
    footer:  { tagline: "Videography · Motion · Design" },
  },
};

// ── Store ─────────────────────────────────────────────────────────
const store = {
  KEY: "rsm_portfolio_v2",
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || defaultProjects(); }
    catch { return defaultProjects(); }
  },
  save(d) { localStorage.setItem(this.KEY, JSON.stringify(d)); },
  addMedia(cid, media) {
    const d = this.get(), c = d.clients.find(x => x.id === cid);
    if (c) { c.items.push(media); this.save(d); } return d;
  },
  updateClient(cid, fields) {
    const d = this.get(), i = d.clients.findIndex(x => x.id === cid);
    if (i > -1) { d.clients[i] = { ...d.clients[i], ...fields }; this.save(d); } return d;
  },
  addClient(c)  { const d = this.get(); d.clients.push(c); this.save(d); return d; },
  removeMedia(cid, mid) {
    const d = this.get(), c = d.clients.find(x => x.id === cid);
    if (c) { c.items = c.items.filter(m => m.id !== mid); this.save(d); } return d;
  },
  removeClient(cid) {
    const d = this.get(); d.clients = d.clients.filter(c => c.id !== cid); this.save(d); return d;
  },
  // Reorder media within a client
  reorder(cid, from, to) {
    const d = this.get(), c = d.clients.find(x => x.id === cid);
    if (c) { const [m] = c.items.splice(from, 1); c.items.splice(to, 0, m); this.save(d); } return d;
  },
  // ★ Reorder the clients list
  reorderClients(from, to) {
    const d = this.get();
    const [moved] = d.clients.splice(from, 1);
    d.clients.splice(to, 0, moved);
    this.save(d); return d;
  },
};

// ── Defaults ──────────────────────────────────────────────────────
function defaultProjects() {
  return {
    profile: {
      name: "Rizky Syahrul M", tagline: "Videography · Motion · Design",
      bio_id: "Seorang kreator visual yang menghadirkan cerita melalui video, gerak, dan desain. Dari Surakarta, berkarya untuk brand-brand terkemuka.",
      bio_en: "A visual creator who brings stories to life through video, motion, and design. Based in Surakarta, crafting content for leading brands.",
      linkedin: "https://www.linkedin.com/in/rizkysyahrul/",
      email: "rizkysahrul0@gmail.com", whatsapp: "+62 822 5387 7985",
    },
    clients: [
      { id: "haay-studio",  name: "Haay Studio",              sub_id: "Instagram Reels · Produksi Konten",                               sub_en: "Instagram Reels · Content Production",                         items: [] },
      { id: "medika-herba", name: "Medika Herba",              sub_id: "Konten Media Sosial · Video Pendek · Iklan Produk",               sub_en: "Social Media Content · Short-form Video · Product Ads",         items: [] },
      { id: "jagonet",      name: "PT Sarana Media Cemerlang", sub_id: "Video Company Profile · Jagonet",                                sub_en: "Company Profile Video · Jagonet",                               items: [] },
      { id: "sahada",       name: "PT Sahada Laku Utama",      sub_id: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit", sub_en: "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit", items: [] },
      { id: "politeknik",   name: "Politeknik Negeri Madiun",  sub_id: "Motion Video Grafis · UKM Niknema Photography",                  sub_en: "Motion Video Graphic · UKM Niknema Photography",                items: [] },
      { id: "self",         name: "Self Projects",             sub_id: "Desain · Poster · Visual",                                      sub_en: "Design · Poster · Visual",                                      items: [] },
    ],
  };
}

// ── URL Builder ────────────────────────────────────────────────────
const cld = {
  base: () => `https://res.cloudinary.com/${CLD_CONFIG.cloudName}`,
  thumb(publicId, { w = 800, h, q = "auto", f = "auto", ar } = {}) {
    const t = [`w_${w}`, `q_${q}`, `f_${f}`, "c_fill"];
    if (h) t.push(`h_${h}`);
    if (ar) t.push(`ar_${ar}`, "c_fill");
    const type = publicId.match(/\.(mp4|mov|webm|avi)$/i) ? "video" : "image";
    const id = publicId.replace(/\.[^.]+$/, "");
    if (type === "video") t.push("so_0");
    return `${this.base()}/${type}/upload/${t.join(",")}/${id}.jpg`;
  },
  video(publicId, { w = 900, q = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return {
      webm: `${this.base()}/video/upload/w_${w},q_${q},f_webm,vc_vp9/${id}.webm`,
      mp4: `${this.base()}/video/upload/w_${w},q_${q},f_mp4,vc_h264/${id}.mp4`,
    };
  },
  image(publicId, { w = 900, q = "auto", f = "auto" } = {}) {
    const id = publicId.replace(/\.[^.]+$/, "");
    return `${this.base()}/image/upload/w_${w},q_${q},f_${f},c_fill/${id}`;
  },
  uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${CLD_CONFIG.cloudName}/auto/upload`;
  },
  uploadPreset: () => CLD_CONFIG.uploadPreset,
  cloudName: () => CLD_CONFIG.cloudName,
  apiKey: () => CLD_CONFIG.apiKey,
};

// ── i18n ────────────────────────────────────────────────────────────
const i18n = {
  KEY: "rsm_lang",

  get() {
    return localStorage.getItem(this.KEY) || "id";
  },

  set(lang) {
    localStorage.setItem(this.KEY, lang);
    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  },

  t(keyPath) {
    const lang = this.get();
    const keys = keyPath.split(".");
    let val = (window.STRINGS || {})[lang];
    for (const k of keys) val = val?.[k];
    return val || keyPath;
  },
};

// ── Translations ────────────────────────────────────────────────────
window.STRINGS = {
  id: {
    nav: {
      work: "Karya",
      personal: "Personal",
      contact: "Kontak",
      hire: "Hire Me",
    },
    hero: { eyebrow: "Showcase © 2023 — 2026", scroll: "Gulir" },
    projects: { title: "Proyek", uploadHint: "Upload media di halaman Admin" },
    self: { label: "Karya Pribadi", title: "Self Projects" },
    contact: {
      label: "Hubungi",
      heading1: "Ayo",
      heading2: "Terhubung",
      desc: "Tertarik berkolaborasi? Aku terbuka untuk project videografi, motion graphics, konten sosial media, dan desain visual.",
      li_hint: "Terhubung secara profesional",
      email_hint: "Kirim pesan langsung",
      wa_hint: "Hubungi via chat",
    },
    footer: { tagline: "Videografi · Gerak · Desain" },
  },
  en: {
    nav: {
      work: "Work",
      personal: "Personal",
      contact: "Contact",
      hire: "Hire Me",
    },
    hero: { eyebrow: "Showcase © 2023 — 2026", scroll: "Scroll" },
    projects: {
      title: "Projects",
      uploadHint: "Upload media via the Admin panel",
    },
    self: { label: "Personal Work", title: "Self Projects" },
    contact: {
      label: "Get in touch",
      heading1: "Let's",
      heading2: "Connect",
      desc: "Interested in collaborating? I'm open to videography, motion graphics, social media content, and visual design projects.",
      li_hint: "Connect professionally",
      email_hint: "Send a direct message",
      wa_hint: "Chat via WhatsApp",
    },
    footer: { tagline: "Videography · Motion · Design" },
  },
};

// ── Project Store (localStorage) ──────────────────────────────────
const store = {
  KEY: "rsm_portfolio_v2",

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || defaultProjects();
    } catch {
      return defaultProjects();
    }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  addMedia(clientId, media) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      client.items.push(media);
      this.save(data);
    }
    return data;
  },

  updateClient(clientId, fields) {
    const data = this.get();
    const idx = data.clients.findIndex((c) => c.id === clientId);
    if (idx > -1) {
      data.clients[idx] = { ...data.clients[idx], ...fields };
      this.save(data);
    }
    return data;
  },

  addClient(client) {
    const data = this.get();
    data.clients.push(client);
    this.save(data);
    return data;
  },

  removeMedia(clientId, mediaId) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      client.items = client.items.filter((m) => m.id !== mediaId);
      this.save(data);
    }
    return data;
  },

  removeClient(clientId) {
    const data = this.get();
    data.clients = data.clients.filter((c) => c.id !== clientId);
    this.save(data);
    return data;
  },

  // Reorder clients list (by index)
  reorderClients(fromIdx, toIdx) {
    const data = this.get();
    const [moved] = data.clients.splice(fromIdx, 1);
    data.clients.splice(toIdx, 0, moved);
    this.save(data);
    return data;
  },

  // Reorder media inside a client
  reorderMedia(clientId, fromIdx, toIdx) {
    const data = this.get();
    const client = data.clients.find((c) => c.id === clientId);
    if (client) {
      const [item] = client.items.splice(fromIdx, 1);
      client.items.splice(toIdx, 0, item);
      this.save(data);
    }
    return data;
  },
};

// ── Default project data ────────────────────────────────────────────
function defaultProjects() {
  return {
    profile: {
      name: "Rizky Syahrul M",
      tagline: "Videography · Motion · Design",
      // Bilingual bio
      bio_id:
        "Seorang kreator visual yang menghadirkan cerita melalui video, gerak, dan desain. Dari Surakarta, berkarya untuk brand-brand terkemuka.",
      bio_en:
        "A visual creator who brings stories to life through video, motion, and design. Based in Surakarta, crafting content for leading brands.",
      skills: ["Videography", "Motion Graphics", "Design", "Content Creator"],
      linkedin: "https://www.linkedin.com/in/rizkysyahrul/",
      email: "rizkysahrul0@gmail.com",
      whatsapp: "+62 822 5387 7985",
    },
    clients: [
      {
        id: "haay-studio",
        name: "Haay Studio",
        sub_id: "Instagram Reels · Produksi Konten",
        sub_en: "Instagram Reels · Content Production",
        items: [],
      },
      {
        id: "medika-herba",
        name: "Medika Herba",
        sub_id: "Konten Media Sosial · Video Pendek · Iklan Produk",
        sub_en: "Social Media Content · Short-form Video · Product Ads",
        items: [],
      },
      {
        id: "jagonet",
        name: "PT Sarana Media Cemerlang",
        sub_id: "Video Company Profile · Jagonet",
        sub_en: "Company Profile Video · Jagonet",
        items: [],
      },
      {
        id: "sahada",
        name: "PT Sahada Laku Utama",
        sub_id:
          "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit",
        sub_en:
          "TikTok · YouTube · Meta Ads · Snackvideo · Gamamilk & Etacefit",
        items: [],
      },
      {
        id: "politeknik",
        name: "Politeknik Negeri Madiun",
        sub_id: "Motion Video Grafis · UKM Niknema Photography",
        sub_en: "Motion Video Graphic · UKM Niknema Photography",
        items: [],
      },
      {
        id: "self",
        name: "Self Projects",
        sub_id: "Desain · Poster · Visual",
        sub_en: "Design · Poster · Visual",
        items: [],
      },
    ],
  };
}

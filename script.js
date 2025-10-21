/******************************
 * Google-like Image Search — iOS Optimized
 ******************************/

let i = 0;
let selfieCam = false;

const player = document.getElementById('player');
const canvas  = document.getElementById('canvas');
let word = "";

// ⚙️ Configurações
const PER_PAGE = 6;                 // menos imagens = mais rápido no iOS
const TRANSLATE_ENABLED = true;     // mude para false se não quiser traduzir
const TRANSLATE_FROM = 'en';
const TRANSLATE_TO   = 'pt-BR';
const UNSPLASH_KEY   = 'qrEGGV7czYXuVDfWsfPZne88bLVBZ3NLTBxm_Lr72G8';

// cancelamento de requisições anteriores
let currentFetchController = null;

// cache simples para traduções (memória)
const translateCache = new Map();

// ------- Eventos de captura (vídeo) -------
player?.addEventListener('touchstart', shutterPress);
player?.addEventListener('click', shutterPress);

// Inicia a câmera traseira
function setupVideo() {
  try {
    const camera = 'environment';
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: camera } })
      .then(stream => { if (player) player.srcObject = stream; })
      .catch(err => console.error('Erro ao acessar câmera:', err));
  } catch (err) {
    console.error('setupVideo exception:', err);
  }
}

// Clique nos botões de palavra
document.querySelectorAll(".word").forEach(box =>
  box.addEventListener("click", function() {
    const dt = this.getAttribute('data-type') || "";
    updateUIWithWord(dt);
  })
);

// Botão "Enviar"
document.querySelector("#wordbtn")?.addEventListener("click", function (e) {
  e.preventDefault();
  const inputEl = document.querySelector("#wordinput");
  const val = (inputEl && 'value' in inputEl) ? inputEl.value : "";
  updateUIWithWord(val);
});

// Atualiza UI e faz busca no Unsplash
function updateUIWithWord(newWord) {
  word = (newWord || "").trim();

  document.querySelector("#word-container")?.remove();

  const q = document.querySelector(".D0h3Gf");
  if (q) q.value = word;

  document.querySelectorAll("span.word").forEach(s => { s.textContent = word; });

  loadImg(word);
}

window.addEventListener('load', setupVideo, false);

// Captura um frame do vídeo
function shutterPress(e) {
  try {
    e.preventDefault();

    const video = document.querySelector('video');
    if (!video || !video.srcObject) return;

    const mediaStream = video.srcObject;
    const tracks = mediaStream.getTracks();
    const track = mediaStream.getVideoTracks()[0];

    if (!canvas || !('getContext' in canvas)) return;

    const context = canvas.getContext("2d");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 360;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = document.querySelector('#spec-pic');
    const data  = canvas.toDataURL("image/png");
    if (photo) photo.setAttribute("src", data);

    track && track.stop();
    tracks.forEach(t => t.stop());
    player && player.remove();
  } catch (err) {
    console.error('shutterPress exception:', err);
  }
}

/* =========================
   Busca (Unsplash) + Tradução
   ========================= */

async function loadImg(word) {
  try {
    // cancela busca anterior, se existir
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();

    const q = encodeURIComponent(word || "");
    const url = `https://api.unsplash.com/search/photos?query=${q}&per_page=${PER_PAGE}&client_id=${UNSPLASH_KEY}`;

    const resp = await fetch(url, { signal: currentFetchController.signal });
    if (!resp.ok) throw new Error(`Unsplash HTTP ${resp.status}`);
    const data = await resp.json();

    const results = Array.isArray(data.results) ? data.results : [];
    const cards   = document.querySelectorAll(".i");

    if (results.length === 0) {
      cards.forEach(image => {
        const imgEl  = image.querySelector("img");
        const descEl = image.querySelector(".desc");
        if (imgEl)  { imgEl.removeAttribute("src"); imgEl.removeAttribute('srcset'); }
        if (descEl) descEl.textContent = "Nenhum resultado encontrado.";
      });
      return;
    }

    // prepara textos para traduzir
    const prepared = results.map(hit => ({
      img: hit?.urls?.small || "",
      desc: sanitizeDesc(hit?.description || hit?.alt_description || "")
    }));

    // traduz (com cache e concorrência limitada)
    let translated = prepared.map(p => p.desc);
    if (TRANSLATE_ENABLED) {
      translated = await translateMany(prepared.map(p => p.desc), TRANSLATE_FROM, TRANSLATE_TO);
    }

    // aplica nos cards
    let idx = 0;
    cards.forEach(image => {
      const item   = prepared[idx % prepared.length];
      const tdesc  = translated[idx % translated.length] || "";
      const imgEl  = image.querySelector("img");
      const descEl = image.querySelector(".desc");

      if (imgEl && item.img) {
        // dicas pro Safari/iOS
        imgEl.decoding = 'async';
        try { imgEl.loading = 'lazy'; } catch(_) {}
        imgEl.referrerPolicy = 'no-referrer';
        imgEl.src = item.img;
      }
      if (descEl) descEl.textContent = tdesc;

      idx++;
    });

  } catch (err) {
    if (err?.name === 'AbortError') return; // busca cancelada — ignora
    console.error('loadImg error:', err);
    document.querySelectorAll(".i .desc").forEach(d => d.textContent = "Erro ao carregar imagens.");
  }
}

// formata descrição original
function sanitizeDesc(text) {
  const t = (text || "").toString().trim();
  if (!t) return "";
  let s = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?…]$/.test(s)) s += '.';
  return s;
}

/* ===== Tradução com cache e limitação de concorrência ===== */

async function translateMany(texts, from = 'en', to = 'pt-BR') {
  // elimina vazios e usa cache quando possível
  const out = new Array(texts.length).fill("");
  const tasks = [];

  for (let i = 0; i < texts.length; i++) {
    const src = texts[i] || "";
    if (!src) { out[i] = ""; continue; }

    // cache
    if (translateCache.has(src)) {
      out[i] = translateCache.get(src);
      continue;
    }

    tasks.push({ idx: i, text: src });
  }

  // limita concorrência (2 requisições por vez — bom para iOS/4G)
  const CONCURRENCY = 2;
  let active = 0;
  let cursor = 0;

  await new Promise(resolve => {
    const next = () => {
      if (cursor >= tasks.length && active === 0) return resolve();

      while (active < CONCURRENCY && cursor < tasks.length) {
        const { idx, text } = tasks[cursor++];
        active++;
        translateOne(text, from, to)
          .then(tr => {
            translateCache.set(text, tr);
            out[idx] = tr;
          })
          .catch(() => { out[idx] = text; }) // fallback: mantém original
          .finally(() => { active--; next(); });
      }
    };
    next();
  });

  // garante preenchimento com cache/entrada original
  for (let i = 0; i < texts.length; i++) {
    if (!out[i]) out[i] = translateCache.get(texts[i]) || texts[i] || "";
  }
  return out;
}

async function translateOne(text, from = 'en', to = 'pt-BR') {
  if (!text) return "";
  // MyMemory gratuita — ideal para testes/POC
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Translate HTTP ${r.status}`);
  const j = await r.json();
  const tr = (j?.responseData?.translatedText || "").toString().trim();
  return tr || text;
}

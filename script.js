/* =========================
   script.js — câmera em overlay externo (sem zoom, clique único, sem flash)
   ========================= */

/* ---------- Estado/refs globais ---------- */
let word = "";
let specImg;           // <img id="spec-pic">
let placeholderDiv;    // div preto no lugar da imagem enquanto a câmera está aberta

// Câmera em overlay
let overlay;           // container fixo fora do grid
let player;            // <video> preview
let canvas;            // <canvas> captura

// Controle de prontidão/captura
let streamReady = false;
let pendingShot = false;   // toque antes da câmera pronta → captura assim que ficar pronta
let shotDone = false;      // garante clique único

/* ---------- Imagens locais com legendas personalizadas ---------- */
// Use { src, caption }. Se alguma entrada for string, vira {src, caption:""} via helper.
const STATIC_IMAGES = {
veado: [
  { src: "https://gg0.nl/insulto/veado/ArtStation.jpg",  caption: "veado, cervo, animal, natureza, wild" },
  { src: "https://gg0.nl/insulto/veado/DevianArt.jpg",   caption: "cervo, animal, pet, sweet, natureza" },
  { src: "https://gg0.nl/insulto/veado/Freepik1.jpg",    caption: "veado, cervídeo, animal, wild, cute" },
  { src: "https://gg0.nl/insulto/veado/Freepik2.jpg",    caption: "animal, cervo, natureza, fofura, pet" },
  { src: "https://gg0.nl/insulto/veado/Pexels.jpg",      caption: "cervo, animal, natural, sweet, calm" },
  { src: "https://gg0.nl/insulto/veado/Pinterest1.jpg",  caption: "veado, fofura, natureza, cervo, wild" },
  { src: "https://gg0.nl/insulto/veado/Pinterest2.jpg",  caption: "cervo, wild, cute, natureza, sweet" },
  { src: "https://gg0.nl/insulto/veado/Pixabay.jpg",     caption: "animal, veado, cervo, wild, nature" },
  { src: "https://gg0.nl/insulto/veado/Rawpixel.jpg",    caption: "cervo, animal, sweet, wild, calm" }
],
gata: [
  { src: "https://gg0.nl/insulto/gata/ArtStation.jpg",   caption: "gata, felina, pet, animal, fofura" },
  { src: "https://gg0.nl/insulto/gata/DevianArt.jpg",    caption: "gato, felino, brincar, carinho, pet" },
  { src: "https://gg0.nl/insulto/gata/Freepik1.jpg",     caption: "gatinha, felina, animal, doce, cute" },
  { src: "https://gg0.nl/insulto/gata/Freepik2.jpg",     caption: "gato, pet, fofura, felino, miado" },
  { src: "https://gg0.nl/insulto/gata/Pexels.jpg",       caption: "gatinho, animal, amor, carinho, pet" },
  { src: "https://gg0.nl/insulto/gata/Pinterest1.jpg",   caption: "felina, fofura, gato, pet, brincar" },
  { src: "https://gg0.nl/insulto/gata/Pinterest2.jpg",   caption: "cat, cute, feline, pet, sweet, love" },
  { src: "https://gg0.nl/insulto/gata/Pixabay.jpg",      caption: "felino, pet, animal, cute, adorable" },
  { src: "https://gg0.nl/insulto/gata/Rawpixel.jpg",     caption: "gato, animal, fofura, carinho, pet" }
],
vaca: [
  { src: "https://gg0.nl/insulto/vaca/ArtStation.jpg",   caption: "vaca, bovina, animal, pet, fofura" },
  { src: "https://gg0.nl/insulto/vaca/DevianArt.jpg",    caption: "bovino, doce, animal, cute, gentle" },
  { src: "https://gg0.nl/insulto/vaca/Freepik1.jpg",     caption: "vaca, gado, animal, calm, sweet" },
  { src: "https://gg0.nl/insulto/vaca/Freepik2.jpg",     caption: "bovina, pet, animal, wild, love" },
  { src: "https://gg0.nl/insulto/vaca/Pexels.jpg",       caption: "animal, vaca, gentle, cute, pet" },
  { src: "https://gg0.nl/insulto/vaca/Pinterest1.jpg",   caption: "vaca, fofura, bovina, sweet, love" },
  { src: "https://gg0.nl/insulto/vaca/Pinterest2.jpg",   caption: "cow, cute, pet, sweet, gentle" },
  { src: "https://gg0.nl/insulto/vaca/Pixabay.jpg",      caption: "animal, vaca, pet, bovina, calm" },
  { src: "https://gg0.nl/insulto/vaca/Rawpixel.jpg",     caption: "vaca, animal, sweet, pet, love" }
]
};

/* Fallback de tags por palavra (se algum item não tiver caption) */
const DEFAULT_STATIC_TAGS = {
  veado: "veado, cervo, natureza",
  gata:  "gata, felino, doméstico",
  vaca:  "vaca, bovino, fazenda"
};

/* ---------- Utils ---------- */
function forceReflow(el){ void el?.offsetHeight; }
function isCameraOpen(){ return !!(player && player.srcObject); }

/* Trunca texto de descrição das imagens */
function truncateText(str, max = 30) {
  const arr = Array.from((str || '').trim());
  return arr.length > max ? arr.slice(0, max - 1).join('') + '…' : arr.join('');
}

/* Helpers para itens estáticos */
function prettyFromFilename(url){
  const file = (url.split('/').pop() || '').replace(/\.(jpe?g|png|webp)$/i, '');
  return file.replace(/[_-]+/g, ' ');
}
function getStaticItems(word){
  const list = STATIC_IMAGES[word] || [];
  // compat: string -> { src, caption: "" }
  return list.map(item => (typeof item === 'string') ? { src:item, caption:'' } : item);
}

/* ---------- Placeholder preto no card da foto ---------- */
function ensureSpecPlaceholder() {
  specImg = specImg || document.querySelector('#spec-pic');
  if (!specImg) return;

  // se já existir, mantém
  placeholderDiv = specImg.parentElement.querySelector('#spec-placeholder');
  if (placeholderDiv) return;

  const container = specImg.parentElement;
  const w = container?.clientWidth || specImg.clientWidth || 320;
  const h = Math.round(w * 4 / 3); // 3:4 (portrait) — altura maior

  placeholderDiv = document.createElement('div');
  placeholderDiv.id = 'spec-placeholder';
  Object.assign(placeholderDiv.style, {
    width: '100%',
    height: `${h}px`,      // altura já correta, sem “telinha pequena”
    aspectRatio: '3 / 4',  // ajuda em redimensionamentos
    background: 'black',
    borderRadius: getComputedStyle(specImg).borderRadius || '12px',
    display: 'block'
  });

  // garante que a imagem ocupará exatamente o mesmo espaço depois
  Object.assign(specImg.style, {
    width: '100%',
    height: 'auto',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'none'
  });

  container.insertBefore(placeholderDiv, specImg.nextSibling);
}

/* ---------- Overlay da câmera (fora do div) ---------- */
function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'camera-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    display: 'none',                 // oculto até a câmera estar pronta
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(0,0,0,.55)',
    zIndex: '9999',
    touchAction: 'none'
  });

  // Moldura do preview (tamanho fixo, evita saltos)
  const frame = document.createElement('div');
  frame.id = 'camera-frame';
  Object.assign(frame.style, {
    position: 'relative',
    width: '88vw',
    maxWidth: '720px',
    height: 'calc(88vw * 1.3333)',  // altura fixa 4:3 — evita salto visual
    maxHeight: '82vh',
    background: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,.5)',
    transition: 'none',
    willChange: 'transform'
  });

  // <video>
  player = document.createElement('video');
  player.id = 'player';
  player.setAttribute('playsinline', '');
  player.setAttribute('autoplay', '');
  player.muted = true;
  Object.assign(player.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: '50% 50%',
    cursor: 'pointer'
  });

  // Canvas oculto
  canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  canvas.style.display = 'none';

  frame.appendChild(player);
  frame.appendChild(canvas);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  // Um ÚNICO listener (pointerdown é mais rápido)
  overlay.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (shotDone) return;                 
    if (!streamReady) {                   
      pendingShot = true;                 
      return;
    }
    shutterPress();
  }, { passive:false });

  return overlay;
}

/* ---------- Abrir/fechar câmera ---------- */
async function openCameraOverlay(){
  streamReady = false;
  pendingShot = false;
  shotDone = false;

  ensureSpecPlaceholder();
  ensureOverlay();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } }
    });

    player.srcObject = stream;

    player.onloadedmetadata = () => {
      const waitReady = () => {
        if (player.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && player.videoWidth > 0) {
          player.play().catch(()=>{});
          streamReady = true;
          overlay.style.display = 'flex';       // só mostra depois de pronta
          if (pendingShot && !shotDone) {
            pendingShot = false;
            requestAnimationFrame(() => shutterPress());
          }
        } else {
          requestAnimationFrame(waitReady);
        }
      };
      waitReady();
    };
  } catch (err) {
    console.error('Erro ao acessar câmera:', err);
    alert('⚠️ Permita o acesso à câmera para continuar.');
    closeCameraOverlay();
  }
}

function closeCameraOverlay(){
  try {
    if (player && player.srcObject) {
      player.srcObject.getTracks().forEach(t => t.stop());
    }
  } catch(_) {}

  if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
  overlay = null;
  player = null;
  canvas = null;
}

/* ---------- Captura ---------- */
async function shutterPress(){
  if (shotDone) return;
  if (!player || !player.srcObject || !streamReady) return;

  shotDone = true;

  if (!specImg) specImg = document.querySelector('#spec-pic');

  const vw = player.videoWidth || 640;
  const vh = player.videoHeight || 480;

  if (!canvas) canvas = document.createElement('canvas');
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  ctx.drawImage(player, 0, 0, canvas.width, canvas.height);

  const done = async (blob) => {
    if (!specImg) return;

    if (blob) {
      const url = URL.createObjectURL(blob);
      specImg.src = url;
      try { await specImg.decode?.(); } catch(_){}
      try { URL.revokeObjectURL(url); } catch(_){}
    } else {
      specImg.src = canvas.toDataURL('image/jpeg', 0.9);
      try { await specImg.decode?.(); } catch(_){}
    }

    // mantém proporção e substitui o placeholder suavemente
    specImg.style.width = '100%';
    specImg.style.height = 'auto';
    specImg.style.aspectRatio = '3 / 4';
    specImg.style.display = '';
    if (placeholderDiv && placeholderDiv.parentElement) {
      placeholderDiv.parentElement.removeChild(placeholderDiv);
    }
    placeholderDiv = null;
    closeCameraOverlay();
  };

  if (canvas.toBlob) {
    canvas.toBlob((blob) => { done(blob); }, 'image/webp', 0.85);
  } else {
    await done(null);
  }
}

/* ---------- Busca de imagens (mantido + atalho local) ---------- */
function isAnimalIntent(term) {
  if (!term) return false;
  const t = term.toLowerCase().trim();
  const animals = [
    "gata","gato","gatinha","gatinho","cachorro","cão","cadela","cachorra",
    "cobra","vaca","touro","galinha","galo","veado","leão","tigre","onça",
    "puma","pantera","ave","pássaro","pato","cavalo","égua","peixe",
    "golfinho","baleia","macaco","lobo","raposa","coelho"
  ];
  if (animals.includes(t)) return true;
  if (/\banimal(es)?\b/.test(t)) return true;
  return false;
}

async function loadImg(word) {
  try {
    let searchTerm = (word || "").toLowerCase().trim();

    // 1) ATALHO LOCAL: usa imagens definidas e captions personalizadas
    const localItems = getStaticItems(searchTerm);
    if (localItems.length) {
      const cards = document.querySelectorAll('.i'); // 9 cards laterais
      cards.forEach((card, idx) => {
        const { src, caption } = localItems[idx % localItems.length];
        const imgEl  = card.querySelector('img');
        const descEl = card.querySelector('.desc');

        if (imgEl) imgEl.src = src;

        // Prioridade: caption → fallback por palavra → nome de arquivo "bonitinho"
        const text = (caption && caption.trim())
          ? caption.trim()
          : (DEFAULT_STATIC_TAGS[searchTerm] || prettyFromFilename(src));

        if (descEl) descEl.textContent = truncateText(text, 30);
      });
      return; // não chama API
    }

    // 2) (SE não houver local) segue fluxo normal de APIs
    const wantsAnimal = isAnimalIntent(searchTerm);

    if (["gato", "gata", "gatinho", "gatinha"].includes(searchTerm)) {
      searchTerm = "gato de estimação, gato doméstico, cat pet";
    }

    const q = encodeURIComponent(searchTerm);
    const pixParams = new URLSearchParams({
      key: "24220239-4d410d9f3a9a7e31fe736ff62",
      q,
      lang: "pt",
      per_page: "9",
      image_type: "photo",
      safesearch: "true"
    });
    if (wantsAnimal) pixParams.set("category", "animals");

    const pixResp = await fetch(`https://pixabay.com/api/?${pixParams.toString()}`);
    let results = [];
    if (pixResp.ok) {
      const data = await pixResp.json();
      results = Array.isArray(data.hits) ? data.hits : [];
      if (wantsAnimal && results.length) {
        const humanRe = /(woman|girl|man|people|modelo|fashion|beauty)/i;
        results = results.filter(h => !humanRe.test(h?.tags || ""));
      }
    }

    if (!results.length) {
      const unsplashQuery = wantsAnimal ? `${q}+animal` : q;
      const u = `https://api.unsplash.com/search/photos?query=${unsplashQuery}&per_page=9&content_filter=high&client_id=qrEGGV7czYXuVDfWsfPZne88bLVBZ3NLTBxm_Lr72G8`;
      const us = await fetch(u);
      if (us.ok) {
        const d = await us.json();
        const uResults = Array.isArray(d.results) ? d.results : [];
        results = uResults.map(r => ({
          webformatURL: r?.urls?.small,
          tags: (r?.description || r?.alt_description || "").toString(),
          user: "Unsplash"
        }));
      }
    }

    const cards = document.querySelectorAll('.i');
    if (!results.length) {
      cards.forEach(image => {
        const imgEl = image.querySelector('img');
        const descEl = image.querySelector('.desc');
        if (imgEl) imgEl.removeAttribute('src');
        if (descEl) descEl.textContent = 'Nenhum resultado encontrado.';
      });
      return;
    }

    let idx = 0;
    cards.forEach(image => {
      const hit = results[idx % results.length];
      const imgEl = image.querySelector('img');
      const descEl = image.querySelector('.desc');

      if (imgEl && hit?.webformatURL) imgEl.src = hit.webformatURL;

      let descText = (hit?.tags || hit?.user || '').toString();
      descText = descText.replace(/\s*,\s*/g, ', ').replace(/\s{2,}/g, ' ');
      const short = truncateText(descText, 30);

      if (descEl) descEl.textContent = short;
      idx++;
    });
  } catch (err) {
    console.error('loadImg error:', err);
    document.querySelectorAll('.i .desc').forEach(d => d.textContent = 'Erro ao carregar imagens.');
  }
}

/* ---------- UI / fluxo ---------- */
function updateUIWithWord(newWord) {
  word = (newWord || '').trim();
  document.querySelector('#word-container')?.remove();
  const q = document.querySelector('.D0h3Gf');
  if (q) q.value = word;
  document.querySelectorAll('span.word').forEach(s => { s.textContent = word; });
  loadImg(word);
  openCameraOverlay();
}

function bindWordCards(){
  document.querySelectorAll('#word-container .item.word').forEach(box => {
    const onPick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dt = box.getAttribute('data-type') || '';
      updateUIWithWord(dt);
    };
    box.addEventListener('pointerdown', onPick, { passive:false });
  });
}

function bindSendButton(){
  document.querySelector('#wordbtn')?.addEventListener('click', function(e){
    e.preventDefault();
    const inputEl = document.querySelector('#wordinput');
    const val = (inputEl && 'value' in inputEl) ? inputEl.value : '';
    updateUIWithWord(val);
  });
}

/* ---------- Inicialização ---------- */
function init(){
  specImg = document.querySelector('#spec-pic');
  bindWordCards();
  bindSendButton();
}

window.addEventListener('load', init, false);




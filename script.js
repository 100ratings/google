let i = 0;
let selfieCam = false;

const player = document.getElementById('player');
const canvas = document.getElementById('canvas');
let word = "";

// 🎬 Eventos de captura (toque/clique no vídeo)
player?.addEventListener('touchstart', shutterPress);
player?.addEventListener('click', shutterPress);

// 📹 Inicia a câmera traseira
function setupVideo() {
  try {
    const camera = 'environment';
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: camera }
    })
    .then(stream => { if (player) player.srcObject = stream; })
    .catch(err => console.error('Erro ao acessar câmera:', err));
  } catch (err) {
    console.error('setupVideo exception:', err);
  }
}

// 🧩 Clique nos botões de palavra
document.querySelectorAll(".word").forEach(box =>
  box.addEventListener("click", function() {
    const dt = this.getAttribute('data-type') || "";
    updateUIWithWord(dt);
  })
);

// 📨 Botão "Enviar"
document.querySelector("#wordbtn")?.addEventListener("click", function (e) {
  e.preventDefault();
  const inputEl = document.querySelector("#wordinput");
  const val = (inputEl && 'value' in inputEl) ? inputEl.value : "";
  updateUIWithWord(val);
});

// 🧠 Atualiza UI e faz busca no Unsplash
function updateUIWithWord(newWord) {
  word = (newWord || "").trim();

  document.querySelector("#word-container")?.remove();

  const q = document.querySelector(".D0h3Gf");
  if (q) q.value = word;

  document.querySelectorAll("span.word").forEach(s => { s.textContent = word; });

  loadImg(word);
}

window.addEventListener('load', setupVideo, false);

// 📸 Captura um frame do vídeo
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = document.querySelector('#spec-pic');
    const data = canvas.toDataURL("image/png");
    if (photo) photo.setAttribute("src", data);

    track && track.stop();
    tracks.forEach(t => t.stop());
    player && player.remove();
  } catch (err) {
    console.error('shutterPress exception:', err);
  }
}

// 🌐 Busca imagens e traduz descrições automaticamente
async function loadImg(word) {
  try {
    const q = encodeURIComponent(word || "");
    const url = `https://api.unsplash.com/search/photos?query=${q}&per_page=9&client_id=qrEGGV7czYXuVDfWsfPZne88bLVBZ3NLTBxm_Lr72G8`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Unsplash HTTP ${resp.status}`);
    const data = await resp.json();

    const results = Array.isArray(data.results) ? data.results : [];
    const cards = document.querySelectorAll(".i");

    if (results.length === 0) {
      cards.forEach(image => {
        const imgEl = image.querySelector("img");
        const descEl = image.querySelector(".desc");
        if (imgEl) imgEl.removeAttribute("src");
        if (descEl) descEl.textContent = "Nenhum resultado encontrado.";
      });
      return;
    }

    let idx = 0;
    for (const image of cards) {
      const hit = results[idx % results.length];
      const imgEl = image.querySelector("img");
      const descEl = image.querySelector(".desc");

      if (imgEl && hit?.urls?.small) imgEl.src = hit.urls.small;

      let descText = (hit?.description || hit?.alt_description || "").toString();

      // 📝 Ajuste de pontuação e capitalização
      if (descText.trim() !== "") {
        descText = descText.charAt(0).toUpperCase() + descText.slice(1);
        if (!descText.endsWith('.')) descText += '.';

        // 🌍 Tradução automática (MyMemory API)
        try {
          const tr = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(descText)}&langpair=en|pt-BR`)
            .then(r => r.json());
          const translated = tr?.responseData?.translatedText || descText;
          if (descEl) descEl.textContent = translated;
        } catch {
          if (descEl) descEl.textContent = descText;
        }

      } else {
        if (descEl) descEl.textContent = "";
      }

      idx++;
    }

  } catch (err) {
    console.error('loadImg error:', err);
    document.querySelectorAll(".i .desc").forEach(d => d.textContent = "Erro ao carregar imagens.");
  }
}

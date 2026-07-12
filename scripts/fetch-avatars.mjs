// Fetches character portraits from Wikipedia's REST API and saves square
// avatar crops into public/avatars/{id}.jpg.
//
// LICENSE SAFETY: only images served from upload.wikimedia.org/wikipedia/commons/
// are kept — everything on Commons is free-licensed (CC/PD). Non-free fair-use
// images (served from /wikipedia/en/) are automatically skipped, so film-studio
// stills can never end up in the public repo. For film characters we fetch the
// ACTOR's freely-licensed photo instead.
//
// Usage: node scripts/fetch-avatars.mjs
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

// charId → Wikipedia article title (actor's article for film characters)
const MAP = {
  jordan_peterson: "Jordan_Peterson",
  sadhguru: "Sadhguru",
  dostoevsky: "Fyodor_Dostoevsky",
  remarque: "Erich_Maria_Remarque",
  reza_aslan: "Reza_Aslan",
  matthew_hussey: "Matthew_Hussey",
  david_beckham: "David_Beckham",
  nick_vaughan: "Chris_Evans_(actor)", // Before We Go
  winston_wolf: "Harvey_Keitel", // Pulp Fiction
  jared_cohen: "Simon_Baker", // Margin Call
  gsp: "Georges_St-Pierre",
  george_carlin: "George_Carlin",
  j_cole: "J._Cole",
  jim_carrey: "Jim_Carrey",
  cristiano_ronaldo: "Cristiano_Ronaldo",
  messi: "Lionel_Messi",
  tyler_durden: "Brad_Pitt", // Fight Club
  sherlock_holmes: "Sherlock_Holmes", // Paget illustration, PD
  jack_sparrow: "Johnny_Depp", // Pirates
  jordan_belfort: "Jordan_Belfort",
  vito_corleone: "Marlon_Brando", // The Godfather
  albert_einstein: "Albert_Einstein",
  machiavelli: "Niccolò_Machiavelli",
  mike_tyson: "Mike_Tyson",
  kobe_bryant: "Kobe_Bryant",
  muhammad_ali: "Muhammad_Ali",
  napoleon: "Napoleon",
  pierre_bourdieu: "Pierre_Bourdieu",
  esther_perel: "Esther_Perel",
  penn_badgley: "Penn_Badgley", // YOU
  steve_jobs: "Steve_Jobs",
  gary_vee: "Gary_Vaynerchuk",
  juror_8: "Henry_Fonda", // 12 Angry Men
  jason_silva: "Jason_Silva",
  monica_bellucci: "Monica_Bellucci",
  rumi: "Rumi",
  omar_khayyam: "Omar_Khayyam",
  simon_sinek: "Simon_Sinek",
  lex_fridman: "Lex_Fridman",
  dr_sean_maguire: "Robin_Williams", // Good Will Hunting
  harvey_specter: "Gabriel_Macht", // Suits
  elon_musk: "Elon_Musk",
};

const OUT = "public/avatars";
mkdirSync(OUT, { recursive: true });
const UA =
  "BajgalaAvatarFetcher/1.0 (personal project; contact via github.com/Soohrob/bajgala)";

const ok = [];
const skipped = [];

async function fetchRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429) return res;
    const wait = 3000 * (i + 1);
    console.log(`  429 — backing off ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error("rate-limited after retries");
}

for (const [id, title] of Object.entries(MAP)) {
  if (existsSync(`${OUT}/${id}.jpg`)) {
    ok.push(id);
    console.log(`• ${id} (already fetched)`);
    continue;
  }
  try {
    const res = await fetchRetry(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) throw new Error(`summary ${res.status}`);
    const data = await res.json();
    let src = data.originalimage?.source || data.thumbnail?.source;
    if (!src) throw new Error("no image on article");
    // THE LICENSE GATE: Commons-hosted files only.
    if (!src.includes("/wikipedia/commons/")) throw new Error("non-free image (not Commons)");
    // Prefer a ~500px thumbnail over multi-MB originals when possible.
    if (data.thumbnail?.source?.includes("/thumb/")) {
      src = data.thumbnail.source.replace(/\/(\d+)px-/, "/500px-");
    }
    const img = await fetchRetry(src);
    if (!img.ok) throw new Error(`image ${img.status}`);
    const buf = Buffer.from(await img.arrayBuffer());
    const ext = src.match(/\.(png|jpe?g)(?:$|\?)/i)?.[1];
    if (!ext) throw new Error(`unsupported format: ${src.slice(-24)}`);
    const raw = `${OUT}/_raw_${id}.${ext.toLowerCase()}`;
    writeFileSync(raw, buf);
    // Square-crop (top-biased for tall portraits — faces live near the top),
    // resize to 256, convert to jpeg.
    const dims = execSync(`sips -g pixelWidth -g pixelHeight "${raw}"`).toString();
    const w = +dims.match(/pixelWidth: (\d+)/)[1];
    const h = +dims.match(/pixelHeight: (\d+)/)[1];
    const s = Math.min(w, h);
    const offY = h > w ? Math.round((h - s) * 0.08) : 0;
    const offX = w > h ? Math.round((w - s) / 2) : 0;
    execSync(
      `sips -c ${s} ${s} --cropOffset ${offY} ${offX} "${raw}" --out "${raw}" >/dev/null && sips -z 256 256 -s format jpeg -s formatOptions 82 "${raw}" --out "${OUT}/${id}.jpg" >/dev/null && rm "${raw}"`
    );
    ok.push(id);
    console.log(`✓ ${id} ← ${title}`);
  } catch (err) {
    skipped.push(`${id} (${title}): ${err.message}`);
    console.log(`✗ ${id}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 1200)); // be polite to the API
}

console.log(`\n${ok.length} fetched, ${skipped.length} skipped`);
if (skipped.length) console.log("Skipped:\n  " + skipped.join("\n  "));

// Attribution record for the repo.
writeFileSync(
  "public/avatars/SOURCES.md",
  `# Avatar image sources\n\nAll images below were fetched from the lead image of the listed Wikipedia article and are hosted on Wikimedia Commons (public domain or Creative Commons). See each article/Commons file page for author credits. Verify per-file licenses before any commercial use.\n\n${ok
    .map((id) => `- ${id}.jpg — https://en.wikipedia.org/wiki/${MAP[id]}`)
    .join("\n")}\n`
);
console.log("Wrote public/avatars/SOURCES.md");

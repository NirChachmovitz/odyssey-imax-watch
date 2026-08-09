#!/usr/bin/env node
// One-shot check: is "האודיסאה" (The Odyssey) showing in IMAX at Planet Rishon LeZion
// on any date BEYOND the threshold (default 2026-08-19)? If so, push a phone alert via ntfy.
// Stateless + Node built-ins only (fetch) — designed to run on a GitHub Actions cron.
// Never exits non-zero, so the workflow stays green.

const CONFIG = {
  base: 'https://www.planetcinema.co.il',
  group: '10100',
  cinemaId: process.env.CINEMA || '1072',            // Planet Rishon LeZion
  filmPrefix: process.env.FILM_PREFIX || '7460s2r',  // האודיסאה (covers he + ru cuts)
  attr: process.env.ATTR || 'imax',
  threshold: process.env.THRESHOLD || '2026-08-19',  // alert on dates strictly AFTER this
  ntfyTopic: process.env.NTFY_TOPIC || '',
  filmUrl: process.env.FILM_URL || 'https://www.planetcinema.co.il/films/the-odyssey/7460s2r',
  cinemaName: 'Planet Rishon LeZion',
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.planetcinema.co.il/',
};

const getJson = async (url) => {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};

async function push(title, body, priority, tags) {
  if (!CONFIG.ntfyTopic) { console.log('(no NTFY_TOPIC set — skipping push)'); return; }
  const headers = {
    Title: title.replace(/[^\x20-\x7E]/g, '').trim(),
    Priority: priority,
    Tags: tags,
    Click: CONFIG.filmUrl,
  };
  await fetch(`https://ntfy.sh/${CONFIG.ntfyTopic}`, { method: 'POST', headers, body });
  console.log('push sent (' + priority + ')');
}

async function main() {
  const q = `${CONFIG.base}/il/data-api-service/v1/quickbook/${CONFIG.group}`;
  const d = await getJson(`${q}/dates/in-cinema/${CONFIG.cinemaId}/until/2027-12-31?attr=&lang=he_IL`);
  const dates = (d.body && d.body.dates) || [];
  const newDates = dates.filter((x) => x > CONFIG.threshold);
  console.log(`max date: ${dates[dates.length - 1] || 'none'} | beyond ${CONFIG.threshold}: ${newDates.join(', ') || 'NONE'}`);
  if (newDates.length === 0) return;

  const hits = [];
  for (const date of newDates) {
    try {
      const e = await getJson(`${q}/film-events/in-cinema/${CONFIG.cinemaId}/at-date/${date}?attr=&lang=he_IL`);
      for (const ev of (e.body && e.body.events) || []) {
        if (String(ev.filmId).startsWith(CONFIG.filmPrefix) && (ev.attributeIds || []).includes(CONFIG.attr)) {
          hits.push({ date, time: ev.eventDateTime ? ev.eventDateTime.slice(11, 16) : '', soldOut: !!ev.soldOut });
        }
      }
    } catch (err) { console.log('events fetch failed for', date, '-', String(err)); }
  }

  if (hits.length) {
    const lines = hits.slice(0, 12).map((h) => `${h.date} ${h.time}${h.soldOut ? ' (sold out)' : ''}`).join('\n');
    console.log('ODYSSEY IMAX FOUND:\n' + lines);
    await push('Odyssey IMAX tickets opened!',
      `New האודיסאה IMAX shows at ${CONFIG.cinemaName} beyond ${CONFIG.threshold}:\n${lines}\nTap to open the booking page.`,
      'urgent', 'clapper,ticket');
  } else {
    console.log('new dates opened but no Odyssey IMAX yet');
    await push('Planet opened new dates',
      `Planet Rishon opened dates ${newDates.join(', ')} but Odyssey IMAX isn't listed yet — may follow soon.`,
      'default', 'calendar');
  }
}

main().catch((e) => { console.error('error:', e); /* stay green */ });

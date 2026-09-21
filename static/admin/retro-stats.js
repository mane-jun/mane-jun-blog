// Prefills the numbers of a new weekly/monthly retrospective from the daily retrospectives.
// Daily data (date, condition 1-5, exercise O/X) comes from the retro overview page (/retro/, layouts/retro.html),
// and the body template from config.yml, so both stay in one place. Used by retro-title.js.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const isoDate = (time) => new Date(time).toISOString().slice(0, 10);

// Days the retrospective looks back on, matching retroTitle(): weekly → Mon–Sun (on Sunday the current week,
// otherwise the last complete week); monthly → the previous month.
export function retroPeriod(collection, now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const today = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  let start;
  let end;
  if (collection === 'weekly') {
    end = today - kst.getUTCDay() * DAY_MS;
    start = end - 6 * DAY_MS;
  } else if (collection === 'monthly') {
    start = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1);
    end = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 0);
  } else {
    return null;
  }
  const days = [];
  for (let time = start; time <= end; time += DAY_MS) days.push(isoDate(time));
  return days;
}

// The daily entries embedded in the retro overview page: <script id="retro-data" type="application/json">.
export function parseRetroData(html) {
  const json = /<script[^>]*\bid=["']?retro-data["']?[^>]*>([\s\S]*?)<\/script>/u.exec(html)?.[1];
  return json ? JSON.parse(json) : null;
}

// The body default of a collection in config.yml (a "default: |" block under the body field).
export function templateFromConfig(configText, collection) {
  const lines = configText.replace(/\r\n/gu, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === `- name: ${collection}`);
  if (start < 0) return null;
  const bodyField = lines.findIndex((line, index) => index > start && /^\s*name: body\s*$/u.test(line));
  const defaultLine = lines.findIndex((line, index) => index > bodyField && /^\s*default: \|\s*$/u.test(line));
  if (bodyField < 0 || defaultLine < 0) return null;

  const block = [];
  let indent = null;
  for (const line of lines.slice(defaultLine + 1)) {
    if (line.trim() === '') { block.push(''); continue; }
    const lineIndent = line.length - line.trimStart().length;
    indent ??= lineIndent;
    if (lineIndent < indent) break;
    block.push(line.slice(indent));
  }
  while (block.length && block.at(-1) === '') block.pop();
  return `${block.join('\n')}\n`;
}

const average = (entries) => {
  const rated = entries.filter((entry) => entry.condition > 0);
  return rated.length ? (rated.reduce((sum, entry) => sum + entry.condition, 0) / rated.length).toFixed(1) : '-';
};

// Replaces a template line; the line is left alone when the template no longer has it.
const replaceLine = (body, pattern, line) => body.replace(pattern, line);

export const LINE_PATTERNS = {
  weekly: {
    written: /^- 회고 쓴 날: .*\/7$/mu,
    exercised: /^- 운동한 날: .*\/7$/mu,
    condition: /^- 컨디션: 월.*$/mu,
  },
  monthly: {
    counts: /^- 회고 쓴 날: .*· 운동한 날: .*$/mu,
    condition: /^- 주별 평균 컨디션: .*$/mu,
  },
};

export function fillTemplate(collection, template, entries, days) {
  const inPeriod = entries.filter((entry) => days.includes(entry.date));
  const exercised = inPeriod.filter((entry) => entry.exercise === 'O').length;
  let body = template;

  if (collection === 'weekly') {
    const byDate = new Map(inPeriod.map((entry) => [entry.date, entry]));
    const conditions = days.map((day, index) => `${WEEKDAYS[index]} ${byDate.get(day)?.condition || '-'}`).join('  ');
    body = replaceLine(body, LINE_PATTERNS.weekly.written, `- 회고 쓴 날: ${inPeriod.length}/7`);
    body = replaceLine(body, LINE_PATTERNS.weekly.exercised, `- 운동한 날: ${exercised}/7`);
    body = replaceLine(body, LINE_PATTERNS.weekly.condition, `- 컨디션: ${conditions}  (평균 ${average(inPeriod)})`);
  } else if (collection === 'monthly') {
    // "Weeks" of a month are days 1–7, 8–14, 15–21, 22–28 and 29–end.
    const weeks = [];
    for (let first = 0; first < days.length; first += 7) {
      const weekDays = days.slice(first, first + 7);
      weeks.push(`${weeks.length + 1}주 ${average(inPeriod.filter((entry) => weekDays.includes(entry.date)))}`);
    }
    body = replaceLine(body, LINE_PATTERNS.monthly.counts, `- 회고 쓴 날: ${inPeriod.length}/${days.length}   · 운동한 날: ${exercised}/${days.length}`);
    body = replaceLine(body, LINE_PATTERNS.monthly.condition, `- 주별 평균 컨디션: ${weeks.join('  ')}`);
  }
  return body;
}

// Fetches the template and daily data and returns the filled body, or null when anything is unavailable.
export async function prefilledBody(collection, now = new Date(), fetchText = (url) => fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))) {
  const days = retroPeriod(collection, now);
  if (!days) return null;
  const [configText, retroHtml] = await Promise.all([fetchText('config.yml'), fetchText('../retro/')]);
  const template = templateFromConfig(configText, collection);
  const entries = parseRetroData(retroHtml);
  return template && entries ? fillTemplate(collection, template, entries, days) : null;
}

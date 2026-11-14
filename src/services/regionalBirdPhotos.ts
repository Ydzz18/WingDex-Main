import type { EbirdSpecies } from './ebird';

export type RegionalBirdPhoto = {
  uri: string;
  attribution: string;
  license: string;
  sourceUrl: string;
};

type WikiPhotoCandidate = {
  speciesCode: string;
  fileTitle: string;
  fallbackUri: string;
  articleUrl: string;
};

const photoCache = new Map<string, RegionalBirdPhoto | null>();

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeTitle(title: string) {
  return title.replace(/_/g, ' ').trim().toLocaleLowerCase();
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function getMappings(query: Record<string, unknown>) {
  return ['normalized', 'redirects'].flatMap((key) => {
    const values = query[key];
    if (!Array.isArray(values)) return [];
    return values.flatMap((item) => {
      const mapping = asRecord(item);
      const from = asString(mapping?.from);
      const to = asString(mapping?.to);
      return from && to ? [{ from, to }] : [];
    });
  });
}

function stripMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchApiRecord(url: string, signal: AbortSignal, source: string) {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(`Could not reach ${source} to load bird photos.`);
  }
  if (!response.ok) throw new Error(`${source} returned HTTP ${response.status} while loading bird photos.`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${source} returned an invalid bird photo response.`);
  }
  const result = asRecord(payload);
  if (!result) throw new Error(`${source} returned an invalid bird photo response.`);
  return result;
}

function addCanonicalTitles(query: Record<string, unknown>, codesByTitle: Map<string, string>) {
  getMappings(query).forEach(({ from, to }) => {
    const speciesCode = codesByTitle.get(normalizeTitle(from));
    if (speciesCode) codesByTitle.set(normalizeTitle(to), speciesCode);
  });
}

export async function fetchRegionalBirdPhotos(
  species: EbirdSpecies[],
  signal: AbortSignal,
): Promise<Record<string, RegionalBirdPhoto>> {
  const uniqueSpecies = [...new Map(species.map((item) => [item.speciesCode.toLowerCase(), item])).values()];
  const uncachedSpecies = uniqueSpecies.filter((item) => !photoCache.has(item.speciesCode.toLowerCase()));
  const codesByTitle = new Map<string, string>();
  const titles: string[] = [];

  uncachedSpecies.forEach((item) => {
    const code = item.speciesCode.toLowerCase();
    [item.comName, item.sciName].forEach((title) => {
      const normalizedTitle = normalizeTitle(title);
      codesByTitle.set(normalizedTitle, code);
      titles.push(title);
    });
  });

  const candidates = new Map<string, WikiPhotoCandidate>();
  for (const titleBatch of chunk([...new Set(titles)], 50)) {
    if (signal.aborted) throw new Error('Bird photo lookup was cancelled.');
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'pageimages|info',
      piprop: 'name|thumbnail',
      pithumbsize: '640',
      inprop: 'url',
      redirects: '1',
      titles: titleBatch.join('|'),
      origin: '*',
    });
    const response = await fetchApiRecord(
      `https://en.wikipedia.org/w/api.php?${params.toString()}`,
      signal,
      'Wikipedia',
    );
    const query = asRecord(response.query);
    if (!query) throw new Error('Wikipedia returned an invalid bird photo response.');
    addCanonicalTitles(query, codesByTitle);
    const pages = asRecord(query.pages);
    if (!pages) continue;
    Object.values(pages).forEach((item) => {
      const page = asRecord(item);
      const title = asString(page?.title);
      const speciesCode = title ? codesByTitle.get(normalizeTitle(title)) : undefined;
      const fileTitle = asString(page?.pageimage);
      const thumbnail = asRecord(page?.thumbnail);
      const fallbackUri = asString(thumbnail?.source);
      const articleUrl = asString(page?.fullurl);
      if (!speciesCode || !fileTitle || !fallbackUri || !articleUrl || candidates.has(speciesCode)) return;
      candidates.set(speciesCode, {
        speciesCode,
        fileTitle: fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`,
        fallbackUri,
        articleUrl,
      });
    });
  }

  uncachedSpecies.forEach((item) => {
    const code = item.speciesCode.toLowerCase();
    if (!candidates.has(code)) photoCache.set(code, null);
  });

  const candidateList = [...candidates.values()];
  const fileTitles = candidateList.map((item) => item.fileTitle);
  const codesByFileTitle = new Map(candidateList.map((item) => [normalizeTitle(item.fileTitle), item.speciesCode]));
  const commonsPages = new Map<string, Record<string, unknown>>();

  for (const fileBatch of chunk(fileTitles, 50)) {
    if (signal.aborted) throw new Error('Bird photo lookup was cancelled.');
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '640',
      titles: fileBatch.join('|'),
      origin: '*',
    });
    const response = await fetchApiRecord(
      `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
      signal,
      'Wikimedia Commons',
    );
    const query = asRecord(response.query);
    if (!query) throw new Error('Wikimedia Commons returned an invalid bird photo response.');
    addCanonicalTitles(query, codesByFileTitle);
    const pages = asRecord(query.pages);
    if (!pages) continue;
    Object.values(pages).forEach((item) => {
      const page = asRecord(item);
      if (!page) return;
      const title = asString(page.title);
      if (!title) return;
      const speciesCode = codesByFileTitle.get(normalizeTitle(title));
      if (speciesCode) commonsPages.set(speciesCode, page);
    });
  }

  for (const candidate of candidateList) {
    const commonsPage = commonsPages.get(candidate.speciesCode);
    const imageInfoList = commonsPage?.imageinfo;
    const imageInfo = Array.isArray(imageInfoList) ? asRecord(imageInfoList[0]) : null;
    const metadata = asRecord(imageInfo?.extmetadata);
    const artist = asString(asRecord(metadata?.Artist)?.value)
      ?? asString(asRecord(metadata?.Credit)?.value);
    const license = asString(asRecord(metadata?.LicenseShortName)?.value);
    const uri = asString(imageInfo?.thumburl) ?? candidate.fallbackUri;
    const sourceUrl = asString(imageInfo?.descriptionurl) ?? candidate.articleUrl;
    photoCache.set(candidate.speciesCode, {
      uri,
      attribution: artist
        ? stripMarkup(artist)
        : imageInfo ? 'Wikimedia Commons contributor' : 'Wikipedia article image',
      license: license
        ? stripMarkup(license)
        : imageInfo ? 'See source page' : 'See article source',
      sourceUrl,
    });
  }

  return Object.fromEntries(uniqueSpecies.flatMap((item) => {
    const code = item.speciesCode.toLowerCase();
    const photo = photoCache.get(code);
    return photo ? [[code, photo]] : [];
  }));
}

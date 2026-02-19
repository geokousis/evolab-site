#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const authorId = process.env.SCHOLAR_AUTHOR_ID || 'JW3CBIgAAAAJ';
const authorName = compact(process.env.SCHOLAR_AUTHOR_NAME || '');
const serpApiKey = process.env.SERPAPI_KEY;
const serperApiKey = process.env.SERPER_API_KEY || null;
const provider = (process.env.SCHOLAR_PROVIDER || '').trim().toLowerCase();
const serperBaseUrl = (process.env.SERPER_BASE_URL || 'https://google.serper.dev').replace(/\/+$/, '');
const manualScholarQuery = compact(process.env.SCHOLAR_QUERY || '');
const strictAuthorFilter = process.env.SCHOLAR_STRICT_AUTHOR_FILTER === '1';
const scholarProfileLang = compact(process.env.SCHOLAR_PROFILE_HL || 'en');
const scholarProfileUrl = compact(process.env.SCHOLAR_PROFILE_URL || '');
const resolveDetailLinks = process.env.SCHOLAR_RESOLVE_DETAIL_LINKS !== '0';
const detailLinkLimit = Math.max(0, asNumber(process.env.SCHOLAR_DETAIL_LINK_LIMIT) || 20);
const outputFile = process.env.SCHOLAR_OUTPUT_FILE || 'public/data/scholar-cache.json';
const shouldUpsertSupabase = process.env.SCHOLAR_SYNC_SUPABASE === '1';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const nowIso = new Date().toISOString();

const lastToken = (value) => compact(value).split(' ').filter(Boolean).at(-1)?.toLowerCase() || '';

const getDoiFromUrl = (url) => {
  if (!url) return null;
  const doiMatch = url.match(/doi\.org\/(.+)$/i);
  return doiMatch?.[1] ?? null;
};

const safeFetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json();
};

const buildAuthorUrl = (id, apiKey) => {
  const params = new URLSearchParams({
    engine: 'google_scholar_author',
    author_id: id,
    hl: 'en',
    num: '100',
    api_key: apiKey,
  });
  return `https://serpapi.com/search.json?${params.toString()}`;
};

const extractYear = (...values) => {
  for (const value of values) {
    const text = compact(value);
    const match = text.match(/\b(19|20)\d{2}\b/);
    if (match) return asNumber(match[0]);
  }
  return null;
};

const buildIdFromTitle = (title, prefix = 'scholar') => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${prefix}-${slug}`;
};

const unique = (items) => Array.from(new Set(items.map((item) => compact(item)).filter(Boolean)));

const stripTags = (value) => compact(String(value || '').replace(/<[^>]+>/g, ' '));

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ');

const safeNumber = (value) => asNumber(String(value || '').replace(/,/g, ''));

const buildSerperQueries = () => {
  if (manualScholarQuery) return [manualScholarQuery];

  const fallbacks = [];
  if (authorName) {
    fallbacks.push(`author:"${authorName}"`);
    fallbacks.push(authorName);
    const surname = lastToken(authorName);
    if (surname) {
      fallbacks.push(`author:${surname}`);
    }
  }
  if (authorId) {
    fallbacks.push(authorId);
  }
  return unique(fallbacks);
};

const buildScholarProfileListUrl = () => {
  if (scholarProfileUrl) return scholarProfileUrl;

  const params = new URLSearchParams({
    hl: scholarProfileLang || 'en',
    user: authorId,
    view_op: 'list_works',
    sortby: 'pubdate',
    cstart: '0',
    pagesize: '100',
  });
  return `https://scholar.google.com/citations?${params.toString()}`;
};

const profileToMetrics = (profile) => {
  const rows = profile?.cited_by?.table || [];
  const citationRow = rows.find((row) => row.citations);
  const hIndexRow = rows.find((row) => row.h_index);
  const i10Row = rows.find((row) => row.i10_index);

  return {
    totalCitations: asNumber(citationRow?.citations?.all),
    citationsSincePeriod: asNumber(citationRow?.citations?.since_2019),
    hIndex: asNumber(hIndexRow?.h_index?.all),
    hIndexSincePeriod: asNumber(hIndexRow?.h_index?.since_2019),
    i10Index: asNumber(i10Row?.i10_index?.all),
    i10IndexSincePeriod: asNumber(i10Row?.i10_index?.since_2019),
  };
};

const profileToPublications = (profile) => {
  const articles = Array.isArray(profile?.articles) ? profile.articles : [];

  return articles
    .map((article, index) => {
      const title = String(article?.title || '').trim();
      if (!title) return null;

      const year = asNumber(article?.year);
      const link = article?.link || null;
      const id = article?.citation_id
        ? `scholar-${article.citation_id}`
        : `scholar-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

      return {
        id,
        title,
        authors: String(article?.authors || '').trim(),
        journal: String(article?.publication || '').trim(),
        year: year ?? 0,
        doi: getDoiFromUrl(link),
        link,
        citations: asNumber(article?.cited_by?.value),
        display_order: index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.citations || 0) - (a.citations || 0);
    });
};

const serperToPublications = (result) => {
  const rows = Array.isArray(result?.organic) ? result.organic : [];
  const surname = lastToken(authorName);

  const publications = rows
    .map((row, index) => {
      const title = compact(row?.title);
      if (!title) return null;

      const publicationSummary = compact(row?.publicationInfo?.summary);
      const snippet = compact(row?.snippet);
      const link = row?.link || null;
      const citations =
        asNumber(row?.inlineLinks?.citedBy?.total) ??
        asNumber(row?.citedBy?.total) ??
        asNumber(row?.citedBy) ??
        asNumber(row?.citations);

      let authors = '';
      let journal = '';
      if (publicationSummary.includes(' - ')) {
        const [left, right] = publicationSummary.split(' - ', 2);
        authors = compact(left);
        journal = compact(right.replace(/\b(19|20)\d{2}\b/g, '').replace(/,\s*$/g, ''));
      } else {
        authors = publicationSummary;
      }

      return {
        id: buildIdFromTitle(title, 'serper'),
        title,
        authors: authors || '',
        journal: journal || '',
        year: extractYear(row?.year, publicationSummary, snippet) ?? 0,
        doi: getDoiFromUrl(link),
        link,
        citations,
        display_order: index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.citations || 0) - (a.citations || 0);
    });

  if (!surname) return publications;

  const filtered = publications.filter((pub) => {
    const haystack = `${pub.authors} ${pub.title}`.toLowerCase();
    return haystack.includes(surname);
  });

  if (strictAuthorFilter) return filtered;
  return filtered.length > 0 ? filtered : publications;
};

const serperToMetrics = (publications) => {
  const citationValues = publications
    .map((pub) => asNumber(pub.citations))
    .filter((value) => value !== null);

  if (citationValues.length === 0) {
    return {
      totalCitations: null,
      citationsSincePeriod: null,
      hIndex: null,
      hIndexSincePeriod: null,
      i10Index: null,
      i10IndexSincePeriod: null,
    };
  }

  const totalCitations = citationValues.reduce((sum, value) => sum + (value || 0), 0);
  const i10Index = citationValues.filter((value) => (value || 0) >= 10).length;
  const sorted = [...citationValues].sort((a, b) => b - a);
  const hIndex = sorted.reduce((h, value, index) => (value >= index + 1 ? index + 1 : h), 0);

  return {
    totalCitations,
    citationsSincePeriod: null,
    hIndex,
    hIndexSincePeriod: null,
    i10Index,
    i10IndexSincePeriod: null,
  };
};

const scholarProfileToPublications = (html) => {
  const rows = html.match(/<tr class="gsc_a_tr"[\s\S]*?<\/tr>/g) || [];

  return rows
    .map((row, index) => {
      const anchorTagMatch = row.match(/<a[^>]*class="gsc_a_at"[^>]*>/);
      const titleMatch = row.match(/<a[^>]*class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/);
      const yearMatch = row.match(/class="gsc_a_yi">(\d{4})</);
      const citationMatch = row.match(/class="gsc_a_ac[^"]*"[^>]*>([^<]*)</);
      const grayMatches = [...row.matchAll(/<div class="gs_gray">([\s\S]*?)<\/div>/g)];

      const title = stripTags(decodeHtml(titleMatch?.[1] || ''));
      if (!title) return null;

      const anchorTag = anchorTagMatch?.[0] || '';
      const hrefMatch = anchorTag.match(/href=(["'])(.*?)\1/);
      const href = decodeHtml(hrefMatch?.[2] || '');
      const citationIdMatch = href.match(/citation_for_view=([^&"]+)/);
      const authors = stripTags(decodeHtml(grayMatches[0]?.[1] || ''));
      const journal = stripTags(decodeHtml(grayMatches[1]?.[1] || ''));

      return {
        id:
          citationIdMatch?.[1]
            ? `scholar-${citationIdMatch[1].replace(/[^a-zA-Z0-9:_-]/g, '-')}`
            : buildIdFromTitle(title, 'scholar-page'),
        title,
        authors,
        journal,
        year: safeNumber(yearMatch?.[1]) || 0,
        doi: null,
        link: href ? `https://scholar.google.com${href}` : null,
        citations: safeNumber(stripTags(decodeHtml(citationMatch?.[1] || ''))),
        display_order: index + 1,
      };
    })
    .filter(Boolean);
};

const isExternalPaperUrl = (url) => {
  const value = compact(url).toLowerCase();
  if (!value.startsWith('http')) return false;
  if (value.includes('scholar.google.com/citations')) return false;
  if (value.includes('scholar.google.com/scholar')) return false;
  if (value.includes('/intl/')) return false;
  if (value.includes('accounts.google.com')) return false;
  return true;
};

const extractBestExternalFromCitationHtml = (html) => {
  const valueBlocks = [...html.matchAll(/<div class="gsc_oci_value"[^>]*>([\s\S]*?)<\/div>/g)];
  for (const block of valueBlocks) {
    const anchors = [...block[1].matchAll(/<a[^>]+href=(["'])(.*?)\1/gi)];
    for (const anchor of anchors) {
      const href = decodeHtml(anchor[2] || '');
      if (isExternalPaperUrl(href)) {
        return href;
      }
    }
  }

  const allAnchors = [...html.matchAll(/<a[^>]+href=(["'])(.*?)\1/gi)];
  for (const anchor of allAnchors) {
    const href = decodeHtml(anchor[2] || '');
    if (isExternalPaperUrl(href)) {
      return href;
    }
  }

  return null;
};

const resolveCitationToExternalLink = async (citationUrl) => {
  const response = await fetch(citationUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      Accept: 'text/html',
    },
  });

  if (!response.ok) return null;
  const html = await response.text();
  if (/unusual traffic|not a robot|captcha|enable javascript/i.test(html)) return null;
  return extractBestExternalFromCitationHtml(html);
};

const enrichScholarProfilePublications = async (publications) => {
  if (!resolveDetailLinks || detailLinkLimit === 0) return publications;

  const limit = Math.min(detailLinkLimit, publications.length);
  const enriched = await Promise.all(
    publications.slice(0, limit).map(async (pub) => {
      if (!pub.link || !pub.link.includes('view_op=view_citation')) return pub;

      try {
        const resolved = await resolveCitationToExternalLink(pub.link);
        if (!resolved) return pub;
        return { ...pub, link: resolved };
      } catch (_error) {
        return pub;
      }
    })
  );

  return [...enriched, ...publications.slice(limit)];
};

const scholarProfileToMetrics = (html) => {
  const values = [...html.matchAll(/class="gsc_rsb_std">([\d,]+)</g)]
    .map((match) => safeNumber(match[1]))
    .filter((value) => value !== null);

  return {
    totalCitations: values[0] ?? null,
    citationsSincePeriod: values[1] ?? null,
    hIndex: values[2] ?? null,
    hIndexSincePeriod: values[3] ?? null,
    i10Index: values[4] ?? null,
    i10IndexSincePeriod: values[5] ?? null,
  };
};

const fetchFromScholarProfile = async () => {
  if (!authorId && !scholarProfileUrl) {
    throw new Error('Set SCHOLAR_AUTHOR_ID or SCHOLAR_PROFILE_URL for profile mode.');
  }

  const url = buildScholarProfileListUrl();
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Scholar profile request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const html = await response.text();
  if (
    /unusual traffic|not a robot|captcha|enable javascript/i.test(html) ||
    !/gsc_a_t/i.test(html)
  ) {
    throw new Error('Scholar profile blocked/unsupported in this environment (captcha or JS wall).');
  }

  const publications = scholarProfileToPublications(html);
  if (publications.length === 0) {
    throw new Error('Scholar profile parsed zero publications.');
  }
  const enrichedPublications = await enrichScholarProfilePublications(publications);

  return {
    source: {
      provider: 'google-scholar-profile',
      query: url,
      authorId,
      profileUrl: `https://scholar.google.com/citations?user=${authorId}&hl=${scholarProfileLang || 'en'}`,
    },
    metrics: scholarProfileToMetrics(html),
    publications: enrichedPublications,
  };
};

const chooseProvider = () => {
  if (provider === 'profile' || provider === 'scholar-profile' || provider === 'google-scholar-profile') {
    return 'profile';
  }
  if (provider === 'serper') return 'serper';
  if (provider === 'serpapi') return 'serpapi';
  if (provider === 'auto') return 'auto';
  if (serperApiKey) return 'serper';
  if (serpApiKey) return 'serpapi';
  return 'profile';
};

const fetchFromSerper = async () => {
  if (!serperApiKey) {
    throw new Error('Missing SERPER_API_KEY. Set it before running npm run sync:scholar');
  }

  const queries = buildSerperQueries();
  if (queries.length === 0) {
    throw new Error('Set SCHOLAR_QUERY or SCHOLAR_AUTHOR_NAME for Serper mode.');
  }

  const errors = [];

  for (const query of queries) {
    const response = await fetch(`${serperBaseUrl}/scholar`, {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
        num: 100,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      errors.push(`q="${query}" -> ${response.status}: ${body.slice(0, 160)}`);
      continue;
    }

    const data = await response.json();
    const publications = serperToPublications(data);
    const metrics = serperToMetrics(publications);
    if (publications.length === 0) {
      errors.push(`q="${query}" -> 0 publications matched author filter`);
      continue;
    }

    return {
      source: {
        provider: 'serper/google_scholar',
        query,
        authorId,
        profileUrl: `https://scholar.google.com/citations?user=${authorId}&hl=en`,
      },
      metrics,
      publications,
    };
  }

  throw new Error(
    `Serper queries failed. ${errors.join(' | ')}. Try setting SCHOLAR_AUTHOR_NAME and a simpler SCHOLAR_QUERY (no site: operator).`
  );
};

const fetchFromSerpApi = async () => {
  if (!serpApiKey) {
    throw new Error('Missing SERPAPI_KEY. Set it before running npm run sync:scholar');
  }

  const url = buildAuthorUrl(authorId, serpApiKey);
  const data = await safeFetchJson(url);
  const metrics = profileToMetrics(data);
  const publications = profileToPublications(data);

  return {
    source: {
      provider: 'serpapi/google_scholar_author',
      authorId,
      profileUrl: `https://scholar.google.com/citations?user=${authorId}&hl=en`,
    },
    metrics,
    publications,
  };
};

const ensureParentDir = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const upsertToSupabase = async (publications) => {
  if (!shouldUpsertSupabase) return;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'SCHOLAR_SYNC_SUPABASE=1 requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const rows = publications.map((pub) => ({
    id: pub.id,
    title: pub.title,
    authors: compact(pub.authors),
    journal: compact(pub.journal),
    year: pub.year || 0,
    doi: pub.doi,
    link: pub.link,
  }));

  const { error } = await supabase.from('publications').upsert(rows, { onConflict: 'id' });
  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
};

async function main() {
  const selectedProvider = chooseProvider();
  if (!selectedProvider) {
    throw new Error(
      'Missing API key. Set SERPER_API_KEY (recommended) or SERPAPI_KEY before running npm run sync:scholar'
    );
  }

  let result;
  if (selectedProvider === 'profile') {
    result = await fetchFromScholarProfile();
  } else if (selectedProvider === 'serpapi') {
    result = await fetchFromSerpApi();
  } else if (selectedProvider === 'serper') {
    try {
      result = await fetchFromSerper();
    } catch (error) {
      result = await fetchFromScholarProfile();
      console.warn(`[scholar-sync] serper failed, fell back to profile mode: ${error.message}`);
    }
  } else {
    try {
      result = await fetchFromScholarProfile();
    } catch (_e1) {
      try {
        result = await fetchFromSerper();
      } catch (_e2) {
        result = await fetchFromSerpApi();
      }
    }
  }

  const output = {
    source: result.source,
    syncedAt: nowIso,
    metrics: result.metrics,
    publications: result.publications,
  };

  await ensureParentDir(outputFile);
  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await upsertToSupabase(result.publications);

  console.log(
    `[scholar-sync] provider=${selectedProvider} saved ${result.publications.length} publications to ${outputFile} at ${nowIso}`
  );
  if (result.metrics.totalCitations !== null) {
    console.log(
      `[scholar-sync] citations=${result.metrics.totalCitations}, h-index=${result.metrics.hIndex ?? '-'}, i10-index=${result.metrics.i10Index ?? '-'}`
    );
  }
}

main().catch((error) => {
  console.error('[scholar-sync] failed:', error.message);
  process.exit(1);
});

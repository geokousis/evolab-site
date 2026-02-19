# evolab-site

## Google Scholar auto-sync

You can auto-sync papers and citation metrics from Google Scholar.

Default provider is direct Scholar profile parsing (`view_op=list_works&sortby=pubdate`), so ordering matches the "latest first" list.

1. Set environment variables:

```bash
export SCHOLAR_PROVIDER="profile"
export SCHOLAR_AUTHOR_ID="JW3CBIgAAAAJ"
export SCHOLAR_AUTHOR_NAME="Nikolaos Alachiotis"
export SCHOLAR_PROFILE_HL="el"
export SCHOLAR_RESOLVE_DETAIL_LINKS="1"
export SCHOLAR_DETAIL_LINK_LIMIT="20"
# Optional if you want Serper fallback:
# export SERPER_API_KEY="your_serper_key"
# Optional override if you want a fixed query:
# export SCHOLAR_QUERY="author:\"Nikolaos Alachiotis\""
```

2. Run sync:

```bash
npm run sync:scholar
```

This writes `public/data/scholar-cache.json`, which the Papers section loads automatically.
In profile mode, the script can resolve citation entries to direct external paper URLs.
If sync is slow, lower `SCHOLAR_DETAIL_LINK_LIMIT` or set `SCHOLAR_RESOLVE_DETAIL_LINKS=0`.
If profile-mode is blocked by Google (captcha/JS wall), set `SCHOLAR_PROVIDER=serper` and add `SERPER_API_KEY`.
If Serper rejects a query, the script automatically retries safer variants and then falls back to profile mode.
By default, author filtering is soft; set `SCHOLAR_STRICT_AUTHOR_FILTER=1` to enforce strict surname filtering.

### Optional provider: SerpApi

If you want to use SerpApi instead:

```bash
export SCHOLAR_PROVIDER="serpapi"
export SERPAPI_KEY="your_serpapi_key"
npm run sync:scholar
```

### Optional: sync into Supabase publications table

If you also want to upsert papers into Supabase:

```bash
export SCHOLAR_SYNC_SUPABASE=1
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
npm run sync:scholar
```

For automation, schedule `npm run sync:scholar` daily via cron or GitHub Actions.

# Vault — private video/audio cloud (free tier)
Stack: Next.js (Vercel Hobby) + Neon Postgres + Backblaze B2 (S3-compatible, private bucket).
1. neon.tech -> new project -> run schema.sql in SQL Editor -> copy DATABASE_URL.
2. backblaze.com -> B2 -> private bucket -> App Key (S3 endpoint, key id, secret).
3. B2 CORS rules (S3 API): allow your site origin, methods PUT, GET, HEAD, headers *.
   (Use B2 CLI: b2 bucket update --cors-rules ... ; or UI "CORS Rules" -> custom).
4. Push folder to GitHub -> import in vercel.com -> add env vars from .env.example -> Deploy.
5. Put your G-XXXXXXXXXX in NEXT_PUBLIC_GA_ID.
Free limits (verify on provider sites): B2 ~10 GB storage; Neon ~0.5 GB DB; Vercel Hobby = non-commercial use, fair-use bandwidth.
To change storage later: edit only lib/s3.js env vars (any S3-compatible provider).

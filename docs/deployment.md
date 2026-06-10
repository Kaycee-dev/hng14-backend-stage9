# Deployment — manual VPS, DuckDNS, HTTPS, Nginx

This is the lowest-friction robust path for this project: the app runs in Docker; **host
Nginx** terminates TLS (via Certbot) and reverse-proxies to the backend on `127.0.0.1:3000`.
No managed platforms (no Heroku/Render/Railway/Fly).

> **Do this dry-run on Tuesday or Wednesday, with the current build — not Friday.** DuckDNS DNS
> propagation, Certbot issuance, and Nginx SSE buffering are the classic last-hour time sinks.
> Deploying early, even before the app is finished, de-risks the whole submission.

## 0. Prerequisites
- A VPS you SSH into (EC2 / GCE / DigitalOcean / Hetzner / Azure VM — any).
- A DuckDNS subdomain (free at duckdns.org).
- Ports **80** and **443** open in the VPS firewall / security group.

## 1. DNS (DuckDNS)
1. Create a subdomain at duckdns.org, e.g. `yourname-stage9`.
2. Set its IP to your VPS's public IP and save.
3. Verify from your laptop: `dig +short yourname-stage9.duckdns.org` returns the VPS IP.
   (Give it a few minutes to propagate.)

## 2. Install Docker, Nginx, Certbot on the VPS
```bash
# Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then log out/in

# Nginx + Certbot
sudo apt-get update
sudo apt-get install -y nginx
sudo snap install --classic certbot && sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

## 3. Bring up the app
```bash
git clone <your-repo> stage9 && cd stage9
cp .env.prod.example .env        # then edit: set a strong POSTGRES_PASSWORD (match it in DATABASE_URL)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps     # all containers Up
curl -s http://127.0.0.1:3000/api/dashboard       # JSON, locally on the box
```

## 4. Nginx site + HTTPS
```bash
# Install the provided site config, with your real subdomain
sudo cp nginx/scheduler.conf /etc/nginx/sites-available/scheduler.conf
sudo sed -i 's/YOUR_SUBDOMAIN.duckdns.org/yourname-stage9.duckdns.org/' /etc/nginx/sites-available/scheduler.conf
sudo ln -sf /etc/nginx/sites-available/scheduler.conf /etc/nginx/sites-enabled/scheduler.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Issue + install the cert (Certbot edits the config to add :443 + an 80->443 redirect)
sudo certbot --nginx -d yourname-stage9.duckdns.org
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Verify (these are your submission evidence)
```bash
# HTTPS UI + API
curl -sI  https://yourname-stage9.duckdns.org/            | head -n1   # 200
curl -s   https://yourname-stage9.duckdns.org/api/dashboard

# SSE actually streams through Nginx (no buffering)
curl -N   https://yourname-stage9.duckdns.org/api/events/jobs
#   ... then create a job in another shell and confirm `data:` frames arrive

# Full behaviour
bash scripts/smoke_test.sh   # point it at the public URL
```
Open `https://yourname-stage9.duckdns.org/` in a browser: the dashboard should update live as
jobs run (no refresh).

## Updating after a code change
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes
- Certs auto-renew via the Certbot systemd timer; `sudo certbot renew --dry-run` to confirm.
- The `appdata` volume keeps `/data` shared across backend + workers so the DAG's `upload_file`
  step can read the report `generate_report` wrote — do not remove it.
- `docker compose -f docker-compose.prod.yml down` stops the stack; **never add `-v`** against the
  DB volume holding demo data you intend to present.

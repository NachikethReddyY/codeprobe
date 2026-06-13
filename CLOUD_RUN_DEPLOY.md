# Deploy CodeProbe to Google Cloud Run

Google Cloud Run lets you deploy containerized apps without managing servers. Pay only for what you use.

## Prerequisites

1. **Google Cloud Account** — [Sign up free](https://cloud.google.com)
2. **Google Cloud CLI** — [Install gcloud](https://cloud.google.com/sdk/docs/install)
3. **Docker** (optional, Cloud Build can build for you)
4. **Git** with CodeProbe cloned locally

## Step-by-Step Deployment

### 1. Set Up Google Cloud Project

Create a new project:
```bash
gcloud projects create codeprobe-prod --name="CodeProbe"
```

Set it as default:
```bash
gcloud config set project codeprobe-prod
```

Enable required APIs:
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 2. Configure Environment Variables

Create a `.env.cloud` file with your API keys (don't commit this):
```env
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
BRIGHT_DATA_API_KEY=<your-bright-data-key>
DAYTONA_API_KEY=<your-daytona-key>
NOSANA_API_KEY=<your-nosana-key>
NODE_ENV=production
```

### 3. Build and Deploy with Cloud Build

Cloud Build automatically builds from your Dockerfile and deploys:

```bash
gcloud run deploy codeprobe \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 3600s \
  --env-vars-file .env.cloud
```

**Flags explained:**
- `--source .` — Build from current directory
- `--region us-central1` — Deploy region (pick closest to you)
- `--allow-unauthenticated` — Allow public access (remove for private)
- `--memory 512Mi` — RAM per instance (512MB = $0.00001667/sec)
- `--timeout 3600s` — Request timeout (1 hour max for Cloud Run)
- `--env-vars-file .env.cloud` — Load environment variables

### 4. Get Your Service URL

After deployment:
```bash
gcloud run services describe codeprobe --region us-central1
```

Look for **Service URL** — that's your live API.

Or use:
```bash
gcloud run services list
```

### 5. Test Your Deployment

```bash
curl https://your-service-url.run.app/api/scans
```

Should return JSON with scan results.

## Deployment Options

### Option A: Cloud Build (Recommended for new users)
- Automatic Docker builds
- No local Docker needed
- Free build quota: 120 build-minutes/day

```bash
gcloud run deploy codeprobe --source .
```

### Option B: Build Locally, Push to Artifact Registry

1. Build Docker image:
```bash
docker build -t codeprobe .
```

2. Tag for Artifact Registry:
```bash
docker tag codeprobe us-central1-docker.pkg.dev/codeprobe-prod/codeprobe/api:latest
```

3. Push to registry:
```bash
docker push us-central1-docker.pkg.dev/codeprobe-prod/codeprobe/api:latest
```

4. Deploy from registry:
```bash
gcloud run deploy codeprobe \
  --image us-central1-docker.pkg.dev/codeprobe-prod/codeprobe/api:latest \
  --region us-central1 \
  --allow-unauthenticated
```

## Update Secrets Safely

Don't put API keys in `.env.cloud`. Use Secret Manager:

```bash
# Create a secret
echo -n "your-bright-data-key" | gcloud secrets create bright-data-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding bright-data-key \
  --member=serviceAccount:PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Reference in deployment
gcloud run deploy codeprobe \
  --source . \
  --set-secrets BRIGHT_DATA_API_KEY=bright-data-key:latest
```

## Pricing

**Cloud Run is cheap:**
- **Compute:** $0.00001667 per vCPU-second
- **Memory:** $0.0000035 per GB-second
- **Invocations:** $0.40 per 1M requests
- **Free tier:** 2M requests/month

Example: 1000 scans/month × 6sec = ~$0.004/month + request costs.

## Monitoring & Logs

View live logs:
```bash
gcloud run logs read codeprobe --region us-central1 --limit 50
```

Stream logs real-time:
```bash
gcloud run logs read codeprobe --region us-central1 --follow
```

View in Cloud Console:
```
https://console.cloud.google.com/run
```

## Environment Variables

Set via CLI:
```bash
gcloud run deploy codeprobe \
  --env-vars GITHUB_CLIENT_ID=xxx,GITHUB_CLIENT_SECRET=yyy
```

Update existing service:
```bash
gcloud run services update codeprobe \
  --update-env-vars BRIGHT_DATA_API_KEY=new-key
```

## Scale & Performance

Cloud Run auto-scales based on traffic:

```bash
# Set max concurrent requests per instance
gcloud run deploy codeprobe --concurrency 80

# Set max instances
gcloud run deploy codeprobe --max-instances 100

# Set min instances (always running)
gcloud run deploy codeprobe --min-instances 1
```

**Min instances cost:** Always running = always billing.

## Troubleshooting

### "Build failed"
Check build logs:
```bash
gcloud builds log --region=us-central1
```

### "Permission denied"
Authenticate:
```bash
gcloud auth login
gcloud auth application-default login
```

### "Service unavailable"
Check CPU/memory limits. Increase if needed:
```bash
gcloud run deploy codeprobe --cpu 2 --memory 1Gi
```

### View service details
```bash
gcloud run services describe codeprobe --region us-central1
```

## Next Steps

1. **Set up CI/CD** — Auto-deploy on git push:
   - Use Cloud Build GitHub integration
   - Or GitHub Actions with `gcloud` CLI

2. **Enable Cloud Trace** — Monitor performance:
   ```bash
   gcloud services enable cloudtrace.googleapis.com
   ```

3. **Set up alerts** — Get notified on errors:
   ```bash
   gcloud alpha monitoring policies create --notification-channels=CHANNEL_ID
   ```

4. **Add custom domain** — Point your domain to Cloud Run:
   ```bash
   gcloud run services update codeprobe --set-cloudsql-instances=...
   ```

## Resources

- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Best Practices](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
- [Samples](https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/main/run)

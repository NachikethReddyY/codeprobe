# CodeProbe API Deployment to Google Cloud Run

Complete step-by-step guide to deploy the CodeProbe API server to Google Cloud Run with all required environment variables.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed ([install](https://cloud.google.com/sdk/docs/install))
- Docker installed locally (for building and testing)
- Bun installed locally (for testing)
- Google Cloud project created

## Step 1: Set Up Google Cloud Project

```bash
# Set your project ID (replace with your actual project ID)
export PROJECT_ID="your-project-id"
export REGION="us-central1"  # or your preferred region

# Set the project as default
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create a service account for deployment
gcloud iam service-accounts create codeprobe-deployer \
  --display-name="CodeProbe Deployer"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:codeprobe-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:codeprobe-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Step 2: Create Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
# Use official Bun runtime as base image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy application code
COPY src ./src

# Expose port (Cloud Run requires this)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the API server
CMD ["bun", "run", "src/api/server.ts"]
```

## Step 3: Create .dockerignore

Create a `.dockerignore` file to exclude unnecessary files:

```
node_modules
bun_modules
.git
.github
.env.local
.env
dist
*.test.ts
*.test.js
README.md
DEPLOY.md
demo-vulnerable-app
```

## Step 4: Update Server for Cloud Run

The API server needs to listen on the port specified by the `PORT` environment variable (Cloud Run sets this to 8080).

Update `/src/api/server.ts` to use the PORT environment variable:

```typescript
const PORT = parseInt(process.env.PORT || "3000", 10);

export default Bun.serve({
  port: PORT,
  // ... rest of the configuration
});

console.log(`🚀 API server listening on http://localhost:${PORT}`);
```

## Step 5: Build and Push Docker Image to Google Cloud

```bash
# Configure Docker authentication with Google Cloud
gcloud auth configure-docker gcr.io

# Build the Docker image (from project root)
docker build -t gcr.io/$PROJECT_ID/codeprobe-api:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/codeprobe-api:latest

# Verify the image was pushed
gcloud container images list --repository=gcr.io/$PROJECT_ID
```

## Step 6: Gather Required Environment Variables

Before deploying, prepare these environment variables:

```bash
# These are required - set your actual values:
export GOOGLE_CLOUD_URL="https://[YOUR_CLOUD_RUN_URL]"  # You'll get this after deployment
export API_SECRET_TOKEN="your-secret-token-here"
export BRIGHT_DATA_API_KEY="your-bright-data-key"
export DAYTONA_API_KEY="your-daytona-key"
export NOSANA_API_KEY="your-nosana-key"

# Optional GitHub OAuth (if using dashboard)
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Step 7: Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy codeprobe-api \
  --image=gcr.io/$PROJECT_ID/codeprobe-api:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars=NODE_ENV=production,\
API_SECRET_TOKEN=$API_SECRET_TOKEN,\
BRIGHT_DATA_API_KEY=$BRIGHT_DATA_API_KEY,\
DAYTONA_API_KEY=$DAYTONA_API_KEY,\
NOSANA_API_KEY=$NOSANA_API_KEY,\
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID,\
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET

# Output will show your Cloud Run URL, save it:
# Service URL: https://codeprobe-api-xxxxx.run.app
```

## Step 8: Get Your Public URL

```bash
# Get the deployed service URL
CLOUD_RUN_URL=$(gcloud run services describe codeprobe-api \
  --platform=managed \
  --region=$REGION \
  --format='value(status.url)')

echo "Your API URL: $CLOUD_RUN_URL"

# Update the GOOGLE_CLOUD_URL environment variable
export GOOGLE_CLOUD_URL=$CLOUD_RUN_URL

# Redeploy with the correct URL
gcloud run deploy codeprobe-api \
  --image=gcr.io/$PROJECT_ID/codeprobe-api:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars=NODE_ENV=production,\
GOOGLE_CLOUD_URL=$CLOUD_RUN_URL,\
API_SECRET_TOKEN=$API_SECRET_TOKEN,\
BRIGHT_DATA_API_KEY=$BRIGHT_DATA_API_KEY,\
DAYTONA_API_KEY=$DAYTONA_API_KEY,\
NOSANA_API_KEY=$NOSANA_API_KEY,\
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID,\
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
```

## Step 9: Test the Deployment

### 9a: Test the API Endpoint

```bash
# Basic health check (GET /)
curl -X GET https://codeprobe-api-xxxxx.run.app/

# Create a scan (POST /api/scan)
# Replace with your actual URL and token
curl -X POST https://codeprobe-api-xxxxx.run.app/api/scans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_SECRET_TOKEN" \
  -d '{
    "url": "https://github.com/example/repo",
    "branch": "main"
  }'

# List scans (GET /api/scans)
curl -X GET https://codeprobe-api-xxxxx.run.app/api/scans \
  -H "Authorization: Bearer $API_SECRET_TOKEN"

# Get specific scan (GET /api/scans/{scanId})
curl -X GET https://codeprobe-api-xxxxx.run.app/api/scans/{scanId} \
  -H "Authorization: Bearer $API_SECRET_TOKEN"
```

### 9b: View Logs

```bash
# Stream real-time logs from Cloud Run
gcloud run logs read codeprobe-api \
  --platform=managed \
  --region=$REGION \
  --limit=50 \
  --follow

# View recent logs
gcloud run logs read codeprobe-api \
  --platform=managed \
  --region=$REGION \
  --limit=100
```

## Step 10: Update NPM Package Registry

Update the CLI to use your deployed server URL:

### Option A: Update package.json

```bash
# Edit package.json to add the server URL as a config
cat >> package.json <<EOF
,
  "codeprobe": {
    "apiUrl": "$GOOGLE_CLOUD_URL"
  }
EOF
```

### Option B: Set Environment Variable in CLI

Ensure the CLI reads from the environment:

```bash
# Users should set this before running the CLI
export CODEPROBE_API_URL="$GOOGLE_CLOUD_URL"

# Or they can add it to their shell profile
echo 'export CODEPROBE_API_URL="'$GOOGLE_CLOUD_URL'"' >> ~/.bashrc
# or ~/.zshrc for zsh
```

### Option C: Create a .codeprobe/config file

Create a config file for the CLI:

```bash
mkdir -p ~/.codeprobe
cat > ~/.codeprobe/config.json <<EOF
{
  "apiUrl": "$GOOGLE_CLOUD_URL",
  "apiToken": "$API_SECRET_TOKEN"
}
EOF

chmod 600 ~/.codeprobe/config.json
```

## Step 11: Update DNS (Optional)

If you want a custom domain instead of the Cloud Run URL:

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=codeprobe-api \
  --domain=api.yourdomain.com \
  --platform=managed \
  --region=$REGION

# This will output DNS records to add to your DNS provider
# Add the provided A record to your DNS settings
```

## Troubleshooting

### Container fails to start

Check logs:
```bash
gcloud run logs read codeprobe-api --limit=50
```

Common issues:
- **Port not set**: Ensure `PORT` environment variable is used in server.ts
- **Missing dependencies**: Verify `bun install --production` includes all needed packages
- **Permission denied**: Check that Bun has execute permissions in Dockerfile

### Environment variables not loaded

```bash
# Verify environment variables are set
gcloud run services describe codeprobe-api \
  --platform=managed \
  --region=$REGION \
  --format='value(spec.template.spec.containers[0].env)'
```

### API returning 403/401 errors

- Verify `API_SECRET_TOKEN` is set and matches your CLI token
- Check that the token is being sent in the Authorization header: `Authorization: Bearer <token>`

### High latency or timeouts

Increase CPU and memory:
```bash
gcloud run deploy codeprobe-api \
  --image=gcr.io/$PROJECT_ID/codeprobe-api:latest \
  --platform=managed \
  --region=$REGION \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600
```

## Step 12: Set Up Continuous Deployment (Optional)

Create a GitHub Actions workflow to auto-deploy on push:

Create `.github/workflows/deploy-cloud-run.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main
    paths:
      - 'src/api/**'
      - 'package.json'
      - 'Dockerfile'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          export_default_credentials: true
      
      - name: Configure Docker authentication
        run: gcloud auth configure-docker gcr.io
      
      - name: Build and push Docker image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/codeprobe-api:latest .
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/codeprobe-api:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy codeprobe-api \
            --image=gcr.io/${{ secrets.GCP_PROJECT_ID }}/codeprobe-api:latest \
            --platform=managed \
            --region=us-central1 \
            --allow-unauthenticated \
            --memory=1Gi \
            --cpu=1 \
            --timeout=3600 \
            --set-env-vars=NODE_ENV=production,\
API_SECRET_TOKEN=${{ secrets.API_SECRET_TOKEN }},\
BRIGHT_DATA_API_KEY=${{ secrets.BRIGHT_DATA_API_KEY }},\
DAYTONA_API_KEY=${{ secrets.DAYTONA_API_KEY }},\
NOSANA_API_KEY=${{ secrets.NOSANA_API_KEY }}
```

Store secrets in GitHub:
```bash
# Go to your repo Settings > Secrets and add:
# - GCP_PROJECT_ID
# - GCP_SA_KEY (service account JSON key)
# - API_SECRET_TOKEN
# - BRIGHT_DATA_API_KEY
# - DAYTONA_API_KEY
# - NOSANA_API_KEY
```

## Summary

Your CodeProbe API is now deployed and accessible at:

```
https://codeprobe-api-xxxxx.run.app
```

The CLI and dashboard can now communicate with your Cloud Run service using:

```bash
export CODEPROBE_API_URL="https://codeprobe-api-xxxxx.run.app"
export CODEPROBE_API_TOKEN="$API_SECRET_TOKEN"
```

## Useful Commands Reference

```bash
# View all Cloud Run services
gcloud run services list --platform=managed

# Delete the service
gcloud run services delete codeprobe-api --platform=managed --region=us-central1

# Update just the environment variables (without rebuilding)
gcloud run deploy codeprobe-api \
  --update-env-vars KEY=VALUE \
  --platform=managed \
  --region=us-central1

# Monitor traffic and performance
gcloud run services describe codeprobe-api \
  --platform=managed \
  --region=us-central1 \
  --format='value(status)'

# Get metrics
gcloud monitoring dashboards list
```

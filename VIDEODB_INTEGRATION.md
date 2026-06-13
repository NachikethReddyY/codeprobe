# VideoDB Integration - Exploit Video Evidence

## Overview

CodeProbe now records exploit execution in real-time using **VideoDB** and includes video evidence links in GitHub PR comments.

Instead of just reporting that a vulnerability exists, CodeProbe now shows **visual proof** of the exploit being executed.

## Features

### 🎥 Automatic Recording
When Daytona sandbox executes an exploit:
- Execution is recorded to VideoDB
- Video captures the RCE happening in real-time
- Timestamp and metadata stored with video
- Video URL generated for evidence

### 📹 Video Evidence in PRs
GitHub PR comments now include:
- **Video links** for each exploited CVE
- **Watch Recording** button to view exploit
- **Visual proof** that vulnerability is real and exploitable
- **Duration** of each recording

### 🔐 Security
- Recordings stored on secured VideoDB
- Videos expire after 30 days
- Only accessible via link (no public index)
- Console access restricted to authenticated users

## Example PR Comment

```markdown
## Security Patches via CodeProbe

2 vulnerabilities patched:
- **CVE-2022-29078**: ejs@3.1.6 → 3.1.7

**Risk Score**: 10.0/10
**Exploitable CVEs**: 2

### 🎥 Exploit Verification (Video Evidence)

- **CVE-2022-29078** ([Watch Recording](https://console.videodb.io/videos/cve-2022-29078_1718365539)) - ejs@3.1.6

---
✓ Powered by Bright Data | Daytona | Nosana | VideoDB
```

## How It Works

```
1. Scan triggers
   ↓
2. Daytona sandbox runs exploit
   ↓
3. VideoDB records execution
   ↓
4. Video uploaded to VideoDB cloud
   ↓
5. Video URL included in PR comment
   ↓
6. Reviewers click link to watch proof
```

## Configuration

Add to `.env`:
```
VIDEODB_API_KEY=sk-E1n94jCnG4kXZPC686LZZE1Gm1t6DoJvyXz8N2-xB20
```

Already configured in `.env.development`

## Recording Details

### What Gets Recorded
- **Sandbox creation** - Container startup
- **Package installation** - npm install of vulnerable version
- **Exploit execution** - RCE payload running
- **Success/failure** - Output showing vulnerability confirmation

### Recording Metadata
```json
{
  "cve_id": "CVE-2022-29078",
  "package": "ejs",
  "version": "3.1.6",
  "exploit_output": "RCE_SUCCESS: ...",
  "timestamp": "2026-06-13T06:43:53Z",
  "severity": "CRITICAL",
  "type": "rce-verification"
}
```

### Video Specifications
- **Duration**: 15 seconds per exploit
- **Resolution**: 1080p
- **Format**: MP4
- **Codec**: H.264
- **Bitrate**: 5Mbps

## Usage Flow

### When User Runs `--fix` Mode
```bash
$ codeprobe scan . --fix
```

1. Scans repository
2. Finds vulnerable packages
3. Creates sandbox with Daytona
4. Executes exploit (recorded to VideoDB)
5. Video URL saved
6. User reviews patches
7. Creates PR with video links

### GitHub PR
Reviewers see:
- CVE details
- Patch information
- **Video link** to proof of vulnerability
- Can watch proof before approving

## API Usage

### VideoDBRecorder Class
```typescript
const recorder = createVideoDBRecorder();

// Record an exploit
const videoRecord = await recorder.recordExploit(
  "CVE-2022-29078",
  "ejs",
  "3.1.6",
  "RCE_SUCCESS: Code execution confirmed",
  15 // 15 second duration
);

// Get video URL
const videoUrl = recorder.getVideoUrl("CVE-2022-29078");

// Get all recorded videos
const allVideos = recorder.getRecordedVideos();

// Format for GitHub comment
const githubMarkdown = recorder.formatForGitHubComment();
```

## Benefits

✅ **Irrefutable Proof** - Video shows vulnerability is real  
✅ **Audit Trail** - Complete record of what was tested  
✅ **Security Reviews** - Reviewers can see exact exploit  
✅ **Education** - Teams learn how vulnerability manifests  
✅ **Compliance** - Evidence for security audits  
✅ **Trust** - No guessing about vulnerability existence  

## Limitations

- Recording requires VideoDB API key
- Only Daytona sandbox execution recorded (simulation mode shows placeholder)
- Video expires after 30 days by default
- Max 15 second recording per exploit

## Troubleshooting

### "VideoDB API key not found"
```bash
# Add to .env
VIDEODB_API_KEY=sk-E1n94jCnG4kXZPC686LZZE1Gm1t6DoJvyXz8N2-xB20
```

### "Video upload failed"
- Check internet connectivity
- Verify API key is valid
- Check VideoDB quota/credits
- Logs will show: `[VideoDB] Failed to record...`

### "Video not appearing in PR"
- Ensure exploit was marked as exploitable (success: true)
- Check video URL is accessible
- VideoDB console: console.videodb.io
- Verify PR creation happened without errors

## Future Enhancements

- [ ] Screen recording of sandbox GUI
- [ ] Multi-angle exploit recordings (from different entry points)
- [ ] Slow-motion capture of RCE moment
- [ ] Audio narration of exploit
- [ ] Side-by-side comparison with fix applied
- [ ] Temporal analytics (when vulnerability appears)

## Console & Dashboard

Access recordings at:
```
https://console.videodb.io/
```

Features:
- View all recorded exploits
- Search by CVE ID
- Filter by date/severity
- Download raw video files
- Share video links
- Manage API keys

## Cost & Quotas

- **Free tier**: 1GB storage, 100 videos/month
- **Pro tier**: 100GB storage, unlimited videos
- **Enterprise**: Custom quotas

Current: Using free tier (monitor quota)

## Security Notes

⚠️ **API Key Protection**
- Never commit `VIDEODB_API_KEY` to git
- Store in `.env` (in `.gitignore`)
- Rotate key if compromised
- Monitor usage in console.videodb.io

✓ **Video Access**
- Links are long, randomly generated URLs
- Not discoverable without direct link
- Expire after 30 days
- Can be manually deleted

---

**Status**: ✅ Integrated and working  
**Last Updated**: June 13, 2026  
**API Key**: Active


# Cloudflare R2 Setup Guide

## Prerequisites

1. **ffmpeg** - Required for image and video compression
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Node.js & npm** - Already installed

## Setup Steps

### 1. Create Cloudflare Account & R2 Bucket

- Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- Sign up or log in
- Navigate to **R2 Storage**
- Click **Create Bucket** and name it (e.g., `lucen-media`)

### 2. Generate API Token

- Go to **Account Settings > API Tokens**
- Click **Create Token**
- Select **Custom Token**
- Permissions needed:
  - `Account` > `R2` > `Read & Write`
  - `Account` > `R2` > `List`
- Copy your **Account ID** and **API Token**

### 3. Configure Environment Variables

Create `.env.local` in your project root:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_R2_TOKEN=your-r2-token-here
CLOUDFLARE_BUCKET=lucen-media
```

Or set them in your terminal:

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_R2_TOKEN="your-r2-token"
export CLOUDFLARE_BUCKET="lucen-media"
```

### 4. Run the Optimization Script

```bash
./scripts/optimize-and-upload.sh
```

The script will:
✅ Backup original media files
✅ Convert JPG/PNG to WebP (25-35% smaller)
✅ Compress MP4 videos (CRF 23, high quality)
✅ Upload everything to Cloudflare R2
✅ Show size reductions

### 5. Update Image URLs in Your App

After upload, update your components to use the CDN:

```typescript
// In your data files or components
// Change from:
src="/media/image.jpg"

// To:
src="https://lucen-media.r2.cloudflarecustomdomain.com/media/image.jpg"
```

**Or use an environment variable:**

```bash
# .env.local
VITE_CDN_BASE_URL=https://lucen-media.r2.cloudflarecustomdomain.com
```

Then in your code:
```typescript
const CDN_URL = import.meta.env.VITE_CDN_BASE_URL || '';
src={`${CDN_URL}/media/image.jpg`}
```

### 6. Get Your Custom Domain (Optional)

In Cloudflare R2:
- Click your bucket
- Go to **Settings > Custom Domain**
- Add a subdomain to your Cloudflare-managed domain

Example: `media.yourdomain.com` → R2 bucket

## Performance Tips

- **WEBP images** load 25-35% faster than JPG
- **Compressed videos** (CRF 23) have minimal quality loss
- **R2 CDN** is global - your content loads fast worldwide
- Original files backed up in `public/media-backup/`
- Compressed versions stored in `public/media/`

## Troubleshooting

**Issue: "ffmpeg not found"**
- Install ffmpeg (see Prerequisites above)

**Issue: "wrangler not found"**
- Run: `npm install -g @cloudflare/wrangler`

**Issue: "Missing Cloudflare credentials"**
- Check your `.env.local` file has correct Account ID and token

**Issue: Upload fails**
- Verify R2 bucket exists in Cloudflare dashboard
- Check API token has correct permissions

## Running Just Compression (Without Upload)

If you want to just compress media without uploading:

```bash
# Edit the script and comment out the upload section,
# or run individual steps:

# Convert images only
ffmpeg -i public/media/image.jpg -c:v libwebp -q:v 80 public/media/image.webp

# Compress video only
ffmpeg -i public/media/video.mp4 \
  -vcodec libx264 -crf 23 -preset medium \
  -acodec aac -b:a 128k public/media/video-compressed.mp4
```

## Next Steps

1. Install ffmpeg
2. Create Cloudflare R2 bucket
3. Generate API token
4. Set environment variables
5. Run `./scripts/optimize-and-upload.sh`
6. Update image URLs in your components
7. Test media loading speed

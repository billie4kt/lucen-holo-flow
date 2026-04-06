#!/bin/bash

# Media Optimization & Cloudflare R2 Upload Script
# Compresses images and videos, then uploads to Cloudflare R2

set -e

MEDIA_DIR="./public/media"
BACKUP_DIR="./public/media-backup"
BUCKET_NAME="${CLOUDFLARE_BUCKET:-lucen-media}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}"
R2_TOKEN="${CLOUDFLARE_R2_TOKEN}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Media Optimization & Cloudflare R2 Upload${NC}"
echo ""

# Check dependencies
check_dependencies() {
  echo -e "${YELLOW}📦 Checking dependencies...${NC}"
  
  if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ ffmpeg not found. Install it first:${NC}"
    echo "   Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "   macOS: brew install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
  fi
  
  if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  wrangler not found. Installing...${NC}"
    npm install -g @cloudflare/wrangler
  fi
  
  echo -e "${GREEN}✅ Dependencies OK${NC}"
}

# Backup original media
backup_media() {
  echo -e "${YELLOW}📁 Backing up original media...${NC}"
  if [ -d "$BACKUP_DIR" ]; then
    read -p "Backup already exists. Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      return
    fi
  else
    mkdir -p "$BACKUP_DIR"
    cp -r "$MEDIA_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✅ Media backed up to $BACKUP_DIR${NC}"
  fi
}

# Compress images to WebP
compress_images() {
  echo -e "${YELLOW}🖼️  Converting images to WebP...${NC}"
  
  local count=0
  for file in "$MEDIA_DIR"/*.{jpg,jpeg,png}; do
    [ -e "$file" ] || continue
    
    local filename=$(basename "$file")
    local basename="${filename%.*}"
    local output="$MEDIA_DIR/${basename}.webp"
    
    if [ ! -f "$output" ]; then
      echo "  Converting: $filename..."
      ffmpeg -i "$file" -c:v libwebp -q:v 80 -y "$output" 2>/dev/null
      count=$((count + 1))
    fi
  done
  
  if [ $count -gt 0 ]; then
    echo -e "${GREEN}✅ Converted $count images${NC}"
  else
    echo -e "${YELLOW}ℹ️  No new images to convert${NC}"
  fi
}

# Compress videos
compress_videos() {
  echo -e "${YELLOW}🎬 Compressing videos...${NC}"
  
  local count=0
  for file in "$MEDIA_DIR"/*.{mp4,webm,mov}; do
    [ -e "$file" ] || continue
    
    local filename=$(basename "$file")
    local basename="${filename%.*}"
    local ext="${filename##*.}"
    local compressed="$MEDIA_DIR/${basename}-compressed.${ext}"
    
    if [ ! -f "$compressed" ]; then
      echo "  Compressing: $filename..."
      ffmpeg -i "$file" \
        -vcodec libx264 -crf 23 -preset medium \
        -acodec aac -b:a 128k \
        -y "$compressed" 2>/dev/null
      
      # Show size reduction
      orig_size=$(du -h "$file" | cut -f1)
      comp_size=$(du -h "$compressed" | cut -f1)
      echo "    $orig_size → $comp_size"
      count=$((count + 1))
    fi
  done
  
  if [ $count -gt 0 ]; then
    echo -e "${GREEN}✅ Compressed $count videos${NC}"
  else
    echo -e "${YELLOW}ℹ️  No new videos to compress${NC}"
  fi
}

# Setup Cloudflare R2
setup_cloudflare() {
  echo -e "${YELLOW}☁️  Setting up Cloudflare R2...${NC}"
  
  if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_R2_TOKEN" ]; then
    echo -e "${RED}❌ Missing Cloudflare credentials${NC}"
    echo "   Set these environment variables:"
    echo "   export CLOUDFLARE_ACCOUNT_ID=your-account-id"
    echo "   export CLOUDFLARE_R2_TOKEN=your-r2-token"
    echo ""
    echo "   Or create a .env.local file with these values"
    return 1
  fi
  
  echo -e "${GREEN}✅ Cloudflare credentials found${NC}"
}

# Upload to Cloudflare R2
upload_to_r2() {
  echo -e "${YELLOW}⬆️  Uploading to Cloudflare R2...${NC}"
  
  # Export credentials for wrangler
  export CLOUDFLARE_ACCOUNT_ID
  export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_R2_TOKEN"
  
  # Create bucket if it doesn't exist
  echo "  Checking if bucket exists..."
  wrangler r2 bucket list | grep -q "$BUCKET_NAME" || {
    echo "  Creating bucket: $BUCKET_NAME"
    wrangler r2 bucket create "$BUCKET_NAME"
  }
  
  # Upload all media files
  echo "  Uploading files..."
  for file in "$MEDIA_DIR"/*; do
    [ -e "$file" ] || continue
    
    local filename=$(basename "$file")
    echo "    Uploading: $filename..."
    wrangler r2 object put "$BUCKET_NAME/media/$filename" \
      --file "$file" \
      --account-id "$ACCOUNTflare_ACCOUNT_ID"
  done
  
  echo -e "${GREEN}✅ Upload complete${NC}"
}

# Update image URLs in code (optional)
update_urls() {
  echo -e "${YELLOW}🔗 Update image URLs in your code?${NC}"
  read -p "Update CDN URLs in components? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    local r2_url="https://$BUCKET_NAME.r2.cloudflarecustomdomain.com"
    
    echo "   Using CDN: $r2_url"
    echo ""
    echo "   Update your components to use CDN URLs:"
    echo "   From: /media/image.jpg"
    echo "   To:   $r2_url/media/image.jpg"
    echo ""
    echo "   Or set an environment variable:"
    echo "   VITE_CDN_URL=$r2_url"
  fi
}

# Main execution
main() {
  check_dependencies
  backup_media
  compress_images
  compress_videos
  
  if setup_cloudflare; then
    read -p "Upload to Cloudflare R2 now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      upload_to_r2
      update_urls
    fi
  fi
  
  echo ""
  echo -e "${GREEN}🎉 Media optimization complete!${NC}"
  echo ""
  echo "Summary:"
  echo "  Original files: $BACKUP_DIR"
  echo "  WebP images: $MEDIA_DIR/*.webp"
  echo "  Compressed videos: $MEDIA_DIR/*-compressed.mp4"
  echo ""
}

main "$@"

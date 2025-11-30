# MyDictionary Icons

All icons generated from `assets/logo.png` (1024x1024).

## Icon Sizes

| Size | File | Usage |
|------|------|-------|
| 16x16 | `icon-16.png` | Browser toolbar, extension menu |
| 48x48 | `icon-48.png` | Extension management page, popup header |
| 128x128 | `icon-128.png` | Chrome Web Store, installation dialog |
| 64x64 | `../logo-64.png` | General purpose, high-quality display |

## Regenerating Icons

If you update the source logo (`assets/logo.png`), regenerate all icons:

```bash
cd assets
sips -z 16 16 logo.png --out icons/icon-16.png
sips -z 48 48 logo.png --out icons/icon-48.png
sips -z 128 128 logo.png --out icons/icon-128.png
sips -z 64 64 logo.png --out logo-64.png
```

## Source

- **Source file**: `assets/logo.png` (1024x1024, PNG)
- **Tool**: macOS `sips` (Scriptable Image Processing System)
- **Format**: PNG, 8-bit RGB, non-interlaced

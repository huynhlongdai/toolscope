

## Plan bổ sung: Hỗ trợ Custom Ad Scripts ngoài Google AdSense

### Bối cảnh

Plan AdSense trước đó chỉ hỗ trợ Google AdSense. Cần thêm option cho admin dán **custom HTML/JS ad script** (ví dụ: mạng quảng cáo khác như MGID, PropellerAds, Ezoic, hoặc affiliate banners) vào từng vị trí quảng cáo.

### Thay đổi so với plan gốc

Mở rộng cấu trúc `ads_config` để mỗi slot hỗ trợ 2 chế độ:
- **`adsense`**: Dùng Google AdSense (client_id + slot_id) — như plan cũ
- **`custom`**: Admin dán trực tiếp HTML/JS script quảng cáo bất kỳ

### Cấu trúc dữ liệu `ads_config` (cập nhật)

```json
{
  "enabled": true,
  "client_id": "ca-pub-xxx",
  "slots": {
    "hero_below": {
      "enabled": true,
      "mode": "adsense",
      "slot_id": "123456",
      "format": "horizontal",
      "custom_code": ""
    },
    "between_tools": {
      "enabled": true,
      "mode": "custom",
      "slot_id": "",
      "format": "auto",
      "custom_code": "<div><!-- custom ad html/js --></div>"
    }
  }
}
```

### Thay đổi cụ thể

#### 1. `AdUnit.tsx` (component mới)
- Đọc config từ `useAdsConfig()` hook
- Nếu `mode === "adsense"` → render `<ins class="adsbygoogle">`
- Nếu `mode === "custom"` → render custom HTML bằng `dangerouslySetInnerHTML` trong sandboxed div, execute `<script>` tags thủ công
- Nếu slot tắt hoặc ads tắt global → render null

#### 2. `AnalyticsProvider.tsx`
- Thêm đọc key `ads_config` từ site_settings
- Nếu có `client_id` + `enabled` + ít nhất 1 slot mode=adsense → inject AdSense script
- Không inject nếu chỉ dùng custom scripts

#### 3. `AdminSettings.tsx` — Tab "Quảng cáo"
- **Global**: Toggle bật/tắt tất cả, input Ad Client ID
- **Mỗi slot**: 
  - Toggle bật/tắt
  - Select mode: "Google AdSense" | "Custom Script"
  - Nếu AdSense: input Slot ID, select format
  - Nếu Custom: textarea để dán HTML/JS code
  - Preview badge hiển thị mode đang dùng

#### 4. Gắn `AdUnit` vào các trang (giữ nguyên plan gốc)
- Index.tsx: `hero_below`, `footer_above`
- ToolDetail.tsx: `tool_detail_top`, `tool_detail_mid`
- BlogDetail.tsx: `blog_mid`
- ToolsPage.tsx, CategoryPage.tsx: `between_tools`

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/ads/AdUnit.tsx` | **Mới** — dual-mode component (adsense + custom) + useAdsConfig hook |
| `src/components/analytics/AnalyticsProvider.tsx` | Inject AdSense script conditionally |
| `src/pages/admin/AdminSettings.tsx` | Tab "Quảng cáo" với mode selector per slot |
| `src/pages/Index.tsx` | Gắn AdUnit |
| `src/pages/ToolDetail.tsx` | Gắn AdUnit |
| `src/pages/BlogDetail.tsx` | Gắn AdUnit |
| `src/pages/ToolsPage.tsx` | Gắn AdUnit |
| `src/pages/CategoryPage.tsx` | Gắn AdUnit |

### Thứ tự triển khai

1. Tạo `AdUnit` component + `useAdsConfig` hook (dual-mode)
2. Cập nhật `AnalyticsProvider` inject AdSense script có điều kiện
3. Thêm tab Quảng cáo trong `AdminSettings` (mode selector + custom code textarea)
4. Gắn `AdUnit` vào các trang


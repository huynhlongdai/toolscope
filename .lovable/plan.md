

## Plan nang cap cac module he thong

### Hien trang tom tat

| Module | Co san | Thieu |
|---|---|---|
| **Menu Manager** | Header/footer editor, icon picker, preview, nested items, reorder | Duplicate menu, reset default, import/export menu JSON, validation URL |
| **Newsletter** | Stats, search/filter, compose email, preview, bulk delete, CSV export | Segment tags, schedule send, campaign history, unsubscribe link, duplicate detection |
| **Translations** | 3 tabs (content/menu/system), batch translate, diff dialog | Stats overview cards, bulk translate all missing, progress bar per locale, export/import translations JSON |
| **Search Analytics** | Stats cards, top keywords chart, trend chart, zero-results, search rules, auto-rule AI | Filter by date range, export search logs CSV, rule performance metrics |
| **Audit Logs** | Search, filter action/entity, revert, detail | Stats cards, date range filter, user profile lookup, export CSV, bulk cleanup old logs |
| **Backup** | Full JSON export, settings export/import, CSV per table | Scheduled backup reminder, selective table import, backup history, data validation on import |
| **Settings** | AI providers, site info, analytics, scripts, modules | Environment indicator, reset individual settings, settings change history |

### Thay doi de xuat

#### 1. Menu Manager — nang cap
- **Duplicate menu**: Copy header → footer hoac nguoc lai
- **Reset to defaults**: Nut khoi phuc menu mac dinh (header/footer)
- **Export/Import menu JSON**: Xuat/nhap cau hinh menu rieng le
- **URL validation**: Canh bao khi URL khong bat dau bang `/` hoac `http`
- **Drag count badge**: Hien thi tong so items va children

#### 2. Newsletter — nang cap
- **Duplicate detection**: Khi hien thi list, highlight duplicate emails
- **Segment tags**: Filter theo "New 7d", "New 30d" nhanh (tabs/buttons thay vi chi stats)
- **Campaign history**: Luu cac email da soan vao `site_settings` (key: `newsletter_campaigns`) de xem lai
- **Schedule send**: Cho phep dat lich gui (luu vao campaign history, hien thi badge "Scheduled")
- **Import subscribers CSV**: Upload CSV de them subscribers hang loat

#### 3. Translations — nang cap
- **Stats overview cards**: Tong translations, % hoan thanh per locale, auto vs manual ratio
- **Bulk translate all missing**: Nut "Dich tat ca chua dich" cho 1 locale — goi batch translate
- **Progress bar per locale**: Thanh tien trinh hien thi % da dich cho tung ngon ngu
- **Export/Import translations**: Xuat JSON ban dich theo locale, import de khoi phuc

#### 4. Search Analytics — nang cap
- **Date range filter**: Chon khoang thoi gian (7d/30d/90d/custom)
- **Export search logs CSV**: Xuat danh sach search logs
- **Rule hit count**: Dem so lan moi rule duoc match (tu search_logs)
- **Source filter**: Filter logs theo source (hero/browse/category)

#### 5. Audit Logs — nang cap
- **Stats cards**: Tong logs, hom nay, tuan nay, revertable actions count
- **Date range filter**: Chon khoang thoi gian
- **User profile lookup**: Hien thi display_name thay vi user_id (join profiles)
- **Export CSV**: Xuat audit logs filtered
- **Bulk cleanup**: Xoa logs cu hon X ngay

#### 6. Backup — nang cap
- **Selective table import**: Khi import JSON, cho phep chon bang nao muon restore (checkbox)
- **Data validation**: Kiem tra so luong rows truoc khi import, hien thi diff (so luong hien tai vs file)
- **Backup history**: Luu lich su backup vao `site_settings` (key: `backup_history`)
- **Include more tables**: Them `user_roles`, `notifications`, `follows`, `collections`, `launches` vao BACKUP_TABLES

#### 7. Settings — nang cap
- **Environment indicator**: Badge hien thi "Production" / "Development"
- **Reset individual setting**: Nut reset tung setting ve gia tri mac dinh
- **Quick test all providers**: Cai thien bulk test — hien thi ket qua tung provider realtime
- **Danger zone**: Section rieng cho cac thao tac nguy hiem (reset all settings, clear cache)

### Files thay doi

| File | Thay doi |
|---|---|
| `src/pages/admin/AdminMenus.tsx` | Duplicate, reset defaults, export/import JSON, URL validation |
| `src/pages/admin/AdminNewsletter.tsx` | Import CSV, campaign history, segment tabs, duplicate detection |
| `src/pages/admin/AdminTranslations.tsx` | Stats cards, progress bars, bulk translate, export/import |
| `src/pages/admin/AdminSearchAnalytics.tsx` | Date range filter, export CSV, rule hit count, source filter |
| `src/pages/admin/AdminAuditLogs.tsx` | Stats cards, date range, user profiles, export CSV, bulk cleanup |
| `src/pages/admin/AdminBackup.tsx` | Selective import, validation, history, more tables |
| `src/pages/admin/AdminSettings.tsx` | Environment badge, reset setting, danger zone |

### Thu tu trien khai

1. AdminMenus (duplicate, reset, export/import, validation)
2. AdminNewsletter (import CSV, campaigns, segments)
3. AdminTranslations (stats, progress, bulk translate, export/import)
4. AdminSearchAnalytics (date range, export, rule hits, source filter)
5. AdminAuditLogs (stats, date range, user profiles, export, cleanup)
6. AdminBackup (selective import, validation, history, more tables)
7. AdminSettings (env badge, reset, danger zone)


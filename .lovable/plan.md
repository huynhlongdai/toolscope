

## Plan nang cap cac module cong dong: Users, Reviews, Reports, Moderation

### Hien trang

**AdminUsers**: Search, filter role/ban, edit profile, activity timeline, bulk ban/role change, CSV export. Chua co: stats cards, email user, warn user, filter by activity level.

**AdminReviews**: Search, filter status, bulk approve/delete, detail dialog voi structured ratings, CSV export. Chua co: admin reply (vendor response), edit review, stats cards, filter by rating/tool.

**AdminReports**: Filter status, search, detail dialog, resolve/dismiss. Chua co: stats cards, bulk actions, filter by target_type, link to target content, admin notes, export.

**AdminModeration**: Tabs pending tools/reviews/comments/flagged, blacklist keywords. Chua co: stats overview, pending questions, pending launch comments, auto-action on flagged content.

**ProfilePage**: Edit profile, tabs reviews/activity/bookmarks/collections, stats, badges. Chua co: follow button on other profiles, report user.

**Public components**: CommentSection (replies, report, votes), QASection (questions/answers, votes), StructuredReviewForm, VoteButtons. Chua co: edit/delete own comments, sort comments.

### Thay doi de xuat

#### 1. Database migration

```sql
-- Them admin_note vao reports
ALTER TABLE reports ADD COLUMN admin_note text;

-- Bang user_warnings: canh bao nguoi dung
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  warned_by uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage warnings" ON user_warnings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own warnings" ON user_warnings FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

#### 2. AdminUsers — nang cap

- **Stats cards**: Tong users, active (khong ban), banned, new this month
- **Warn user**: Dialog gui canh bao (insert `user_warnings`) — hien thi so warnings trong table
- **Filter by activity**: "Active contributors" (co >= 1 review/comment), "Inactive" (0 activity)
- **Send notification**: Admin gui notification truc tiep toi user (insert `notifications`)
- **View warnings**: Trong activity timeline dialog, them tab warnings

#### 3. AdminReviews — nang cap

- **Stats cards**: Tong reviews, published, pending, avg ratings
- **Admin reply**: Admin co the reply truc tiep vao review (insert vao `comments` voi tool_id tuong ung, hoac field vendor_response trong review — su dung VendorResponse component co san)
- **Edit review**: Admin co the sua title, content, status cua review
- **Filter nang cao**: Filter theo tool (search), rating range (1-5), has pros/cons, is_editor_review
- **Quick approve**: Approve review ngay tu table (khong can vao detail)

#### 4. AdminReports — nang cap

- **Stats cards**: Tong reports, pending, resolved, dismissed
- **Bulk actions**: Chon nhieu reports → resolve/dismiss tat ca
- **Filter by target_type**: Filter theo comment, review, tool, user
- **Admin note**: Ghi chu noi bo khi xu ly report (field `admin_note`)
- **Link to target**: Trong detail, hien thi noi dung bi bao cao (load comment/review/tool tuong ung tu target_id)
- **Export CSV**: Xuat danh sach reports
- **Auto-action**: Khi resolve report type=comment → option xoa comment luon

#### 5. AdminModeration — nang cap

- **Stats overview**: Cards tong hop pending tools + reviews + flagged comments + pending reports
- **Pending questions tab**: Hien thi questions moi can review
- **Launch comments tab**: Hien thi launch_comments moi
- **Quick ban user**: Tu flagged comment → ban user ngay
- **Bulk approve tools/reviews**: Chon nhieu → approve tat ca
- **Auto-action settings**: Cau hinh so lan bi flag truoc khi tu dong an content

#### 6. Public ProfilePage — nang cap

- **Report user**: Button bao cao user khac (insert `reports` voi target_type='user')
- **Follow/Unfollow**: Tich hop FollowButton co san cho other profiles (target_type='user')
- **Warnings banner**: Neu user co warnings, hien thi thong bao nhe cho chinh ho

#### 7. CommentSection — nang cap

- **Edit own comment**: User co the sua comment cua minh
- **Delete own comment**: User co the xoa comment cua minh
- **Sort options**: Moi nhat, Cu nhat, Nhieu vote nhat
- **Load more**: "Xem them" thay vi gioi han 20

#### 8. QASection — nang cap

- **Mark as resolved**: Nguoi hoi co the danh dau cau hoi da giai quyet
- **Report question/answer**: Button bao cao
- **Sort questions**: Moi nhat, Nhieu vote nhat, Chua tra loi

### Files thay doi

| File | Thay doi |
|---|---|
| Migration SQL | `user_warnings` table, `admin_note` column on `reports` |
| `src/pages/admin/AdminUsers.tsx` | Stats cards, warn user, filter activity, send notification |
| `src/pages/admin/AdminReviews.tsx` | Stats cards, edit review, filter nang cao, quick approve |
| `src/pages/admin/AdminReports.tsx` | Stats, bulk actions, filter target_type, admin note, link target, export, auto-action |
| `src/pages/admin/AdminModeration.tsx` | Stats overview, pending questions, launch comments, quick ban, bulk approve |
| `src/pages/ProfilePage.tsx` | Report user, follow button, warnings banner |
| `src/components/tool-detail/CommentSection.tsx` | Edit/delete own, sort, load more |
| `src/components/tool-detail/QASection.tsx` | Mark resolved, report, sort |

### Thu tu trien khai

1. Migration (user_warnings + admin_note)
2. AdminUsers nang cap (stats, warn, filter, notify)
3. AdminReviews nang cap (stats, edit, filter, quick approve)
4. AdminReports nang cap (stats, bulk, filter, admin note, link target, export)
5. AdminModeration nang cap (stats, questions, launch comments, quick ban)
6. ProfilePage nang cap (report, follow, warnings)
7. CommentSection nang cap (edit, delete, sort, load more)
8. QASection nang cap (mark resolved, report, sort)


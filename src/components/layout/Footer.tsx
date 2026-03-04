import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">T</span>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ToolScope</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Nền tảng tổng hợp & review công cụ hàng đầu. Tìm tool phù hợp nhất cho bạn.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Khám phá</h4>
            <div className="flex flex-col gap-2">
              <Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground">Tất cả tools</Link>
              <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground">Danh mục</Link>
              <Link to="/trending" className="text-sm text-muted-foreground hover:text-foreground">Trending</Link>
              <Link to="/compare" className="text-sm text-muted-foreground hover:text-foreground">So sánh</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Cộng đồng</h4>
            <div className="flex flex-col gap-2">
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
              <Link to="/collections" className="text-sm text-muted-foreground hover:text-foreground">Collections</Link>
              <Link to="/submit" className="text-sm text-muted-foreground hover:text-foreground">Gửi tool</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Về chúng tôi</h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">Giới thiệu</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Liên hệ</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Chính sách</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © 2026 ToolScope. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

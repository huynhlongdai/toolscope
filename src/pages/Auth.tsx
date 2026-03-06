import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({ title: "Đã gửi email đặt lại mật khẩu", description: "Vui lòng kiểm tra hộp thư." });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Đăng nhập thành công!" });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Đã gửi email xác nhận", description: "Vui lòng kiểm tra hộp thư của bạn." });
      }
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">T</span>
            </div>
            <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {mode === "login" ? "Đăng nhập" : mode === "signup" ? "Tạo tài khoản" : "Quên mật khẩu"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "Đăng nhập để tiếp tục sử dụng ToolScope" : mode === "signup" ? "Tạo tài khoản mới để bắt đầu" : "Nhập email để nhận link đặt lại mật khẩu"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              {mode !== "forgot" && (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required minLength={6} className="h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                  Quên mật khẩu?
                </button>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : mode === "signup" ? "Đăng ký" : "Gửi link đặt lại"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "forgot" ? (
                <button onClick={() => setMode("login")} className="font-medium text-primary hover:underline">← Quay lại đăng nhập</button>
              ) : (
                <>
                  {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
                  <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-medium text-primary hover:underline">
                    {mode === "login" ? "Đăng ký" : "Đăng nhập"}
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

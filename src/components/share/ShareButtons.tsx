import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, Facebook, Twitter, Linkedin, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonsProps {
  url?: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Đã copy link!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            <Facebook className="mr-2 h-4 w-4" /> Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer">
            <Twitter className="mr-2 h-4 w-4" /> Twitter/X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <Copy className="mr-2 h-4 w-4" /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

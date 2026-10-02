import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  bucket: string;
  currentUrl?: string | null;
  onUpload: (path: string) => void;
  onRemove?: () => void;
  label?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "h-16 w-16", md: "h-20 w-20", lg: "h-24 w-24" };

const ImageUpload = ({ bucket, currentUrl, onUpload, onRemove, label = "Upload Photo", fallback = "?", size = "md" }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fullUrl = currentUrl
    ? currentUrl.startsWith("http")
      ? currentUrl
      : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${currentUrl}`
    : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      onUpload(path);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className={sizeMap[size]}>
        {fullUrl && <AvatarImage src={fullUrl} alt="Photo" />}
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
          {fallback.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-1">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {label}
        </Button>
        {currentUrl && onRemove && (
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive h-7 text-xs" onClick={onRemove}>
            <X className="h-3 w-3" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;

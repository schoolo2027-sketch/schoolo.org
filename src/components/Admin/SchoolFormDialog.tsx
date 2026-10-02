import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/Common/ImageUpload";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SchoolFormData {
  school_name: string;
  short_name: string;
  school_code: string;
  eiin: string;
  admin_id_number: string;
  website: string;
  established_year: string;
  default_version: string;
  school_email: string;
  school_phone: string;
  principal_name: string;
  school_address: string;
  school_logo: string;
  principal_signature: string;
  registrar_signature: string;
  plan_name: string;
  max_students: number;
  max_teachers: number;
  subscription_expiry: string;
  is_active: boolean;
  student_login_enabled: boolean;
  teacher_login_enabled: boolean;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  bkash_merchant: string;
  nagad_merchant: string;
  sslcommerz_store_id: string;
}

export const emptySchoolForm: SchoolFormData = {
  school_name: "", short_name: "", school_code: "", eiin: "", admin_id_number: "",
  website: "", established_year: "", default_version: "bangla",
  school_email: "", school_phone: "", principal_name: "", school_address: "",
  school_logo: "", principal_signature: "", registrar_signature: "",
  plan_name: "free", max_students: 100, max_teachers: 20,
  subscription_expiry: "", is_active: true,
  student_login_enabled: true, teacher_login_enabled: true,
  admin_name: "", admin_email: "", admin_password: "",
  bkash_merchant: "", nagad_merchant: "", sslcommerz_store_id: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SchoolFormData;
  setForm: React.Dispatch<React.SetStateAction<SchoolFormData>>;
  isEditing: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="pt-6 pb-2">
    <h3 className="text-xs font-bold tracking-[3px] uppercase text-foreground border-b border-border pb-2">
      {children}
    </h3>
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-primary/70 mb-1 block">
    {children}
  </label>
);

const SchoolFormDialog = ({ open, onOpenChange, form, setForm, isEditing, isPending, onSubmit }: Props) => {
  const update = (key: keyof SchoolFormData, value: any) => setForm(p => ({ ...p, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-black tracking-wide uppercase">
            {isEditing ? "Update Institution" : "Create Institution"}
          </DialogTitle>
          <DialogDescription className="text-xs tracking-[2px] uppercase text-primary/60">
            Institutional Configuration Node
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-160px)] px-6">
          <div className="space-y-1 pb-6">
            {/* BASIC INFORMATION */}
            <SectionTitle>Basic Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>School Name *</FieldLabel>
                <Input placeholder="Enter school name" value={form.school_name} onChange={(e) => update("school_name", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Short Name</FieldLabel>
                <Input placeholder="e.g. DIS" value={form.short_name} onChange={(e) => update("short_name", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <FieldLabel>EIIN (Optional)</FieldLabel>
                <Input placeholder="e.g. 123456" value={form.eiin} onChange={(e) => update("eiin", e.target.value)} />
              </div>
              <div>
                <FieldLabel>School ID</FieldLabel>
                <Input 
                  readOnly 
                  value={isEditing ? (form.school_code || "Auto-generated") : "Auto-generated"} 
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[9px] text-muted-foreground mt-1">Auto-generated unique ID</p>
              </div>
              <div>
                <FieldLabel>Admin ID Number</FieldLabel>
                <Input placeholder="e.g. ADM-001" value={form.admin_id_number} onChange={(e) => update("admin_id_number", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <FieldLabel>Website</FieldLabel>
                <Input placeholder="https://example.com" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Established Year</FieldLabel>
                <Input placeholder="e.g. 1995" value={form.established_year} onChange={(e) => update("established_year", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Medium</FieldLabel>
                <Select value={form.default_version} onValueChange={(v) => update("default_version", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bangla">Bangla</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CONTACT & LOCATION */}
            <SectionTitle>Contact & Location</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Official Email</FieldLabel>
                <Input placeholder="school@example.com" value={form.school_email} onChange={(e) => update("school_email", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <Input placeholder="+880 1711-000000" value={form.school_phone} onChange={(e) => update("school_phone", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Principal Name</FieldLabel>
                <Input placeholder="Dr. Jane Smith" value={form.principal_name} onChange={(e) => update("principal_name", e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Address</FieldLabel>
              <Textarea placeholder="Full school address" rows={2} value={form.school_address} onChange={(e) => update("school_address", e.target.value)} />
            </div>

            {/* VISUAL IDENTITY */}
            <SectionTitle>Visual Identity</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <FieldLabel>School Logo</FieldLabel>
                <ImageUpload
                  bucket="school-logos"
                  currentUrl={form.school_logo || null}
                  onUpload={(path) => update("school_logo", path)}
                  onRemove={() => update("school_logo", "")}
                  label="Upload Logo"
                  fallback={form.school_name || "?"}
                  size="lg"
                />
              </div>
              <div className="flex flex-col items-center">
                <FieldLabel>Principal Signature</FieldLabel>
                <ImageUpload
                  bucket="signatures"
                  currentUrl={form.principal_signature || null}
                  onUpload={(path) => update("principal_signature", path)}
                  onRemove={() => update("principal_signature", "")}
                  label="Upload Signature"
                  fallback="SIG"
                  size="lg"
                />
              </div>
              <div className="flex flex-col items-center">
                <FieldLabel>Registrar Signature</FieldLabel>
                <ImageUpload
                  bucket="signatures"
                  currentUrl={form.registrar_signature || null}
                  onUpload={(path) => update("registrar_signature", path)}
                  onRemove={() => update("registrar_signature", "")}
                  label="Upload Signature"
                  fallback="REG"
                  size="lg"
                />
              </div>
            </div>

            {/* SUBSCRIPTION & LIMITS */}
            <SectionTitle>Subscription & Limits</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Max Students</FieldLabel>
                <Input type="number" value={form.max_students} onChange={(e) => update("max_students", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <FieldLabel>Max Teachers</FieldLabel>
                <Input type="number" value={form.max_teachers} onChange={(e) => update("max_teachers", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <FieldLabel>Expiry Date</FieldLabel>
                <Input type="date" value={form.subscription_expiry} onChange={(e) => update("subscription_expiry", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={form.is_active ? "active" : "suspended"} onValueChange={(v) => update("is_active", v === "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Plan</FieldLabel>
                <Select value={form.plan_name} onValueChange={(v) => update("plan_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ADMIN CREDENTIALS - now always editable */}
            <SectionTitle>Admin Credentials</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Admin Email {!isEditing && "*"}</FieldLabel>
                <Input placeholder="admin@school.com" value={form.admin_email} onChange={(e) => update("admin_email", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Admin Name / ID</FieldLabel>
                <Input placeholder="e.g. ADM-123456" value={form.admin_name} onChange={(e) => update("admin_name", e.target.value)} />
              </div>
              <div>
                <FieldLabel>{isEditing ? "New Password (optional)" : "Password *"}</FieldLabel>
                <div className="flex gap-1">
                  <Input type="password" placeholder={isEditing ? "Leave blank to keep" : "••••••••"} value={form.admin_password} onChange={(e) => update("admin_password", e.target.value)} />
                  <Button type="button" variant="outline" size="sm" className="text-[10px] px-2 shrink-0" onClick={() => update("admin_password", generatePassword())}>
                    Gen
                  </Button>
                </div>
                {isEditing && <p className="text-[9px] text-muted-foreground mt-1">Only fill if you want to change the password</p>}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Maximum 2 admin accounts per school</p>

            {/* LOGIN ACCESS CONTROL */}
            <SectionTitle>Login Access Control</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase">Student Login Access</p>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Enable/Disable Student Portal Access</p>
                </div>
                <Switch checked={form.student_login_enabled} onCheckedChange={(v) => update("student_login_enabled", v)} />
              </div>
              <div className="rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase">Teacher Login Access</p>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Enable/Disable Teacher Portal Access</p>
                </div>
                <Switch checked={form.teacher_login_enabled} onCheckedChange={(v) => update("teacher_login_enabled", v)} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Save" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolFormDialog;

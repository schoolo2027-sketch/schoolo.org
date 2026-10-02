import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  example?: string;
}

export interface ImportResult {
  inserted: number;
  errors?: string[];
}

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  columns: ImportColumn[];
  templateName: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
}

const norm = (v: any) => String(v ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const ExcelImportDialog = ({
  open, onOpenChange, title, description, columns, templateName, onImport,
}: ExcelImportDialogProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setRows([]); setFileName(""); setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const header = columns.map(c => c.label + (c.required ? " *" : ""));
    const sample = columns.map(c => c.example ?? "");
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    ws["!cols"] = columns.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${templateName}-template.xlsx`);
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false });
      if (raw.length < 2) throw new Error("File-e kono data row nei.");

      const headers = (raw[0] || []).map((h) => norm(String(h).replace(/\*/g, "")));
      const idxMap: Record<string, number> = {};
      columns.forEach((c) => {
        const i = headers.findIndex((h) => h === norm(c.label) || h === norm(c.key));
        if (i >= 0) idxMap[c.key] = i;
      });

      const missingRequired = columns.filter(c => c.required && idxMap[c.key] === undefined);
      if (missingRequired.length) {
        throw new Error(`Required column missing: ${missingRequired.map(c => c.label).join(", ")}`);
      }

      const parsed = raw.slice(1).map((r) => {
        const o: Record<string, string> = {};
        columns.forEach((c) => {
          const i = idxMap[c.key];
          o[c.key] = i === undefined ? "" : String(r[i] ?? "").trim();
        });
        return o;
      }).filter((o) => Object.values(o).some((v) => v !== ""));

      if (!parsed.length) throw new Error("Kono valid row paoa jayni.");
      setRows(parsed);
      setResult(null);
      setFileName(file.name);
    } catch (e: any) {
      reset();
      toast({ title: "File read error", description: e.message, variant: "destructive" });
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      toast({
        title: `${res.inserted} row import hoyeche`,
        description: res.errors?.length ? `${res.errors.length} row skip hoyeche.` : undefined,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const preview = rows.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            {description || "Excel (.xlsx/.csv) file upload kore ekshathe onek row add korun."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <Button variant="secondary" onClick={() => inputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> Choose File
            </Button>
            {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Columns: </span>
            {columns.map((c) => (
              <Badge key={c.key} variant={c.required ? "default" : "outline"} className="mr-1 mb-1">
                {c.label}{c.required ? " *" : ""}
              </Badge>
            ))}
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview — {rows.length} row paoa gche</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>{columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-medium">{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {columns.map((c) => <td key={c.key} className="px-2 py-1.5">{r[c.key] || "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > preview.length && (
                <p className="text-xs text-muted-foreground">+ {rows.length - preview.length} more rows…</p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" /> {result.inserted} row successfully added.
              </p>
              {result.errors?.length ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {result.errors.length} row skip hoyeche:
                  </p>
                  <ul className="max-h-32 overflow-y-auto list-disc pl-6 text-xs text-muted-foreground">
                    {result.errors.slice(0, 30).map((er, i) => <li key={i}>{er}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
            <Button onClick={runImport} disabled={!rows.length || importing} className="gap-2">
              <Upload className="h-4 w-4" /> {importing ? "Importing…" : `Import ${rows.length || ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelImportDialog;

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface BackupRecord {
  id: string;
  backup_date: string;
  file_path: string;
  file_size: number | null;
  tables_included: string[];
  row_counts: Record<string, number> | null;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

type DatabaseBackupRow = {
  id: string;
  backup_date: string;
  file_path: string;
  file_size: number | null;
  tables_included: string[];
  row_counts: unknown;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
};

const DatabaseBackups = () => {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; backup: BackupRecord | null }>({
    open: false,
    backup: null,
  });
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    backup: BackupRecord | null;
    selectedTables: string[];
  }>({
    open: false,
    backup: null,
    selectedTables: [],
  });
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("database_backups")
        .select("*")
        .order("backup_date", { ascending: false });

      if (error) throw error;
      
      // Transform to BackupRecord type
      const backupRecords: BackupRecord[] = (data as DatabaseBackupRow[] || []).map((row) => ({
        id: row.id,
        backup_date: row.backup_date,
        file_path: row.file_path,
        file_size: row.file_size,
        tables_included: row.tables_included,
        row_counts: row.row_counts as Record<string, number> | null,
        status: row.status,
        error_message: row.error_message,
        created_at: row.created_at,
        completed_at: row.completed_at,
      }));
      
      setBackups(backupRecords);
    } catch (error) {
      console.error("Error fetching backups:", error);
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const runBackupNow = async () => {
    setRunningBackup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("database-backup", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Backup completed successfully");
      fetchBackups();
    } catch (error: unknown) {
      console.error("Backup error:", error);
      toast.error(`Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRunningBackup(false);
    }
  };

  const downloadBackup = async (backup: BackupRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from("database-backups")
        .download(backup.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.file_path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download backup");
    }
  };

  const deleteBackup = async (backup: BackupRecord) => {
    try {
      // Delete from storage
      await supabase.storage.from("database-backups").remove([backup.file_path]);

      // Delete from database
      const { error } = await supabase
        .from("database_backups")
        .delete()
        .eq("id", backup.id);

      if (error) throw error;

      setBackups((prev) => prev.filter((b) => b.id !== backup.id));
      toast.success("Backup deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete backup");
    }
    setDeleteDialog({ open: false, backup: null });
  };

  const openRestoreDialog = (backup: BackupRecord) => {
    setRestoreDialog({
      open: true,
      backup,
      selectedTables: backup.tables_included || [],
    });
  };

  const toggleTableSelection = (table: string) => {
    setRestoreDialog((prev) => ({
      ...prev,
      selectedTables: prev.selectedTables.includes(table)
        ? prev.selectedTables.filter((t) => t !== table)
        : [...prev.selectedTables, table],
    }));
  };

  const selectAllTables = () => {
    if (restoreDialog.backup) {
      setRestoreDialog((prev) => ({
        ...prev,
        selectedTables: prev.backup?.tables_included || [],
      }));
    }
  };

  const deselectAllTables = () => {
    setRestoreDialog((prev) => ({
      ...prev,
      selectedTables: [],
    }));
  };

  const restoreBackup = async () => {
    if (!restoreDialog.backup || restoreDialog.selectedTables.length === 0) {
      toast.error("Please select at least one table to restore");
      return;
    }

    setRestoring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("database-restore", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          backup_id: restoreDialog.backup.id,
          tables_to_restore: restoreDialog.selectedTables,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      toast.success(
        `Restored ${result.tables_restored} tables with ${result.total_rows_restored} rows`
      );
      setRestoreDialog({ open: false, backup: null, selectedTables: [] });
    } catch (error: unknown) {
      console.error("Restore error:", error);
      toast.error(`Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRestoring(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTotalRows = (rowCounts: Record<string, number> | null) => {
    if (!rowCounts) return 0;
    return Object.values(rowCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="h-6 w-6 text-cyan-400" />
              {t("admin.backups.title", "Database Backups")}
            </h1>
            <p className="text-slate-400 mt-1">
              {t("admin.backups.subtitle", "Automatic daily backups with 5-day retention")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchBackups}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={runBackupNow}
              disabled={runningBackup}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              <Play className={`h-4 w-4 ${runningBackup ? "animate-pulse" : ""}`} />
              {runningBackup ? "Running..." : "Run Backup Now"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">{backups.length}</div>
            <div className="text-sm text-slate-400">Total Backups</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-green-400">
              {backups.filter((b) => b.status === "completed").length}
            </div>
            <div className="text-sm text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-cyan-400">
              {formatFileSize(
                backups.reduce((sum, b) => sum + (b.file_size || 0), 0)
              )}
            </div>
            <div className="text-sm text-slate-400">Total Size</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">
              {backups[0]?.backup_date
                ? format(new Date(backups[0].backup_date), "MMM d")
                : "N/A"}
            </div>
            <div className="text-sm text-slate-400">Latest Backup</div>
          </div>
        </div>

        {/* Backups Table */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Date</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Tables</TableHead>
                <TableHead className="text-slate-300">Rows</TableHead>
                <TableHead className="text-slate-300">Size</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No backups found. Click "Run Backup Now" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((backup) => (
                  <TableRow key={backup.id} className="border-slate-700 hover:bg-slate-800/30">
                    <TableCell className="font-medium text-white">
                      {format(new Date(backup.backup_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {backup.status === "completed" ? (
                        <Badge className="bg-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : backup.status === "failed" ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {backup.tables_included?.length || 0} tables
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {getTotalRows(backup.row_counts).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {formatFileSize(backup.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadBackup(backup)}
                          className="text-cyan-400 hover:text-cyan-300"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRestoreDialog(backup)}
                          className="text-green-400 hover:text-green-300"
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteDialog({ open: true, backup })}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Info box */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="font-medium text-white mb-2">Automatic Backups</h3>
          <p className="text-sm text-slate-400">
            Backups run automatically every day at midnight. Backups older than 5 days are
            automatically deleted. You can also run a manual backup at any time using the
            "Run Backup Now" button.
          </p>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, backup: null })}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Backup</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete the backup from{" "}
              {deleteDialog.backup &&
                format(new Date(deleteDialog.backup.backup_date), "MMMM d, yyyy")}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.backup && deleteBackup(deleteDialog.backup)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialog.open}
        onOpenChange={(open) =>
          !open && setRestoreDialog({ open: false, backup: null, selectedTables: [] })
        }
      >
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Restore Backup</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select which tables to restore from the backup dated{" "}
              {restoreDialog.backup &&
                format(new Date(restoreDialog.backup.backup_date), "MMMM d, yyyy")}
              . Existing data will be merged with backup data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllTables}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAllTables}>
                Deselect All
              </Button>
            </div>

            <ScrollArea className="h-[300px] border border-slate-700 rounded-lg p-4">
              <div className="space-y-2">
                {restoreDialog.backup?.tables_included?.map((table) => (
                  <div
                    key={table}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={table}
                        checked={restoreDialog.selectedTables.includes(table)}
                        onCheckedChange={() => toggleTableSelection(table)}
                      />
                      <label htmlFor={table} className="text-white cursor-pointer">
                        {table}
                      </label>
                    </div>
                    <span className="text-sm text-slate-400">
                      {restoreDialog.backup?.row_counts?.[table]?.toLocaleString() || 0} rows
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="text-sm text-slate-400">
              Selected: {restoreDialog.selectedTables.length} tables
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRestoreDialog({ open: false, backup: null, selectedTables: [] })
              }
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={restoreBackup}
              disabled={restoring || restoreDialog.selectedTables.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoring ? "Restoring..." : "Restore Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DatabaseBackups;

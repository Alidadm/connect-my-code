import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Database, Users, DollarSign, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Swal from "sweetalert2";

type OrphanedData = {
  orphanedCommissions: number;
  orphanedSubscriptions: number;
  orphanedPosts: number;
  orphanedFriendships: number;
  orphanedMessages: number;
  totalOrphaned: number;
};

const DataCleanup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [orphanedData, setOrphanedData] = useState<OrphanedData | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  // Scan for orphaned data
  const scanOrphanedData = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-scan-orphaned-data");
      
      if (error) throw error;
      
      setOrphanedData(data);
      setLastScan(new Date());
      
      toast({
        title: "Scan Complete",
        description: `Found ${data.totalOrphaned} orphaned records.`,
      });
    } catch (error: any) {
      console.error("Error scanning:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to scan for orphaned data",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Clean up orphaned data
  const cleanupOrphanedData = async () => {
    const result = await Swal.fire({
      title: '<span class="text-amber-600">⚠️ Clean Up Orphaned Data?</span>',
      html: `
        <div class="text-center">
          <p class="text-slate-700 mb-4">This will permanently delete all orphaned records:</p>
          <ul class="text-left text-sm text-slate-600 mb-4 space-y-1">
            <li>• ${orphanedData?.orphanedCommissions || 0} commission records</li>
            <li>• ${orphanedData?.orphanedSubscriptions || 0} subscription records</li>
            <li>• ${orphanedData?.orphanedPosts || 0} post records</li>
            <li>• ${orphanedData?.orphanedFriendships || 0} friendship records</li>
            <li>• ${orphanedData?.orphanedMessages || 0} message records</li>
          </ul>
          <p class="text-sm text-red-500">This action cannot be undone.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Clean Up',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      width: 420,
      customClass: {
        popup: 'rounded-xl',
      }
    });

    if (!result.isConfirmed) return;

    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cleanup-orphaned-data");
      
      if (error) throw error;
      
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${data.totalDeleted} orphaned records.`,
      });
      
      // Refresh the scan
      await scanOrphanedData();
    } catch (error: any) {
      console.error("Error cleaning up:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clean up orphaned data",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  // Initial scan on load
  useEffect(() => {
    scanOrphanedData();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Cleanup</h1>
            <p className="text-muted-foreground">
              Clean up orphaned data left behind when test users are deleted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={scanOrphanedData}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Scan Again
            </Button>
            <Button
              onClick={cleanupOrphanedData}
              disabled={isCleaning || !orphanedData || orphanedData.totalOrphaned === 0}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isCleaning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clean Up All
            </Button>
          </div>
        </div>

        {/* Last scan time */}
        {lastScan && (
          <p className="text-sm text-muted-foreground">
            Last scanned: {lastScan.toLocaleString()}
          </p>
        )}

        {/* Summary Card */}
        <Card className={orphanedData?.totalOrphaned ? "border-amber-300 bg-amber-50/50" : "border-green-300 bg-green-50/50"}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {orphanedData?.totalOrphaned ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <CardTitle className="text-lg">
                {isScanning ? "Scanning..." : orphanedData?.totalOrphaned ? `${orphanedData.totalOrphaned} Orphaned Records Found` : "No Orphaned Data"}
              </CardTitle>
            </div>
            <CardDescription>
              {orphanedData?.totalOrphaned
                ? "These records reference deleted users and can be safely removed."
                : "Your database is clean with no orphaned references."}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Detailed Breakdown */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Orphaned Commissions
                </CardTitle>
                <Badge variant={orphanedData?.orphanedCommissions ? "destructive" : "secondary"}>
                  {orphanedData?.orphanedCommissions || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Commission records referencing deleted users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Orphaned Subscriptions
                </CardTitle>
                <Badge variant={orphanedData?.orphanedSubscriptions ? "destructive" : "secondary"}>
                  {orphanedData?.orphanedSubscriptions || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Subscription records with no associated user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Orphaned Posts
                </CardTitle>
                <Badge variant={orphanedData?.orphanedPosts ? "destructive" : "secondary"}>
                  {orphanedData?.orphanedPosts || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Posts without a valid author
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Orphaned Friendships
                </CardTitle>
                <Badge variant={orphanedData?.orphanedFriendships ? "destructive" : "secondary"}>
                  {orphanedData?.orphanedFriendships || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Friendship records with missing users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Orphaned Messages
                </CardTitle>
                <Badge variant={orphanedData?.orphanedMessages ? "destructive" : "secondary"}>
                  {orphanedData?.orphanedMessages || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Messages with deleted sender or receiver
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-700">About Data Cleanup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-600 space-y-2">
            <p>
              When test users are deleted, some related data may be left behind if there are no foreign key constraints.
              This tool helps you identify and remove such orphaned records.
            </p>
            <p>
              <strong>Note:</strong> The system now has a unique constraint on commissions to prevent duplicate
              referral commissions for the same user.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DataCleanup;

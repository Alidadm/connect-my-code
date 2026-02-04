import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Compass, 
  Heart, 
  Settings2, 
  RefreshCw,
  UserX,
  Sparkles,
  Inbox,
  Mail
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePenPals } from "@/hooks/usePenPals";
import { usePenPalRequests } from "@/hooks/usePenPalRequests";
import { useVirtualPostcards } from "@/hooks/useVirtualPostcards";
import { PenPalCard } from "@/components/penpal/PenPalCard";
import { PenPalPreferencesDialog } from "@/components/penpal/PenPalPreferencesDialog";
import { PenPalRequestsTab } from "@/components/penpal/PenPalRequestsTab";
import { PostcardsTab } from "@/components/penpal/PostcardsTab";

const PenPals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    discoverProfiles,
    myConnections,
    myPreferences,
    loading,
    connectWithPenPal,
    disconnectPenPal,
    updatePreferences,
    refreshDiscover,
  } = usePenPals();

  const {
    incomingRequests,
    outgoingRequests,
    loading: requestsLoading,
    processing,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    hasPendingRequest,
  } = usePenPalRequests();

  const {
    receivedPostcards,
    sentPostcards,
    unreadCount,
    loading: postcardsLoading,
    sending: sendingPostcard,
    sendPostcard,
    markAsRead,
  } = useVirtualPostcards();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDiscover();
    setRefreshing(false);
  };

  const handleConnect = async (userId: string, message?: string) => {
    return sendRequest(userId, message);
  };

  const handleSendPostcard = async (receiverId: string, template: string, message?: string) => {
    return sendPostcard(receiverId, template, message);
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4">
          <Users className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-center">
            {t("penpal.loginRequired", "Sign in to find Pen Pals")}
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            {t("penpal.loginDesc", "Connect with new friends from around the world")}
          </p>
          <Button onClick={() => navigate("/login")}>
            {t("auth.signIn", "Sign In")}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const pendingRequestsCount = incomingRequests.length;
  const myInterests = myPreferences?.interests || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {t("penpal.title", "PenPals")}
            </h1>
            <p className="text-muted-foreground">
              {t("penpal.subtitle", "Discover and connect with new friends worldwide")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setPrefsOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {t("penpal.preferences", "Preferences")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="discover" className="gap-2">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">{t("penpal.discover", "Discover")}</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">{t("penpal.requests", "Requests")}</span>
              {pendingRequestsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
                  {pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">{t("penpal.myPenpals", "My PenPals")}</span>
              {myConnections.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 rounded-full">
                  {myConnections.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="postcards" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t("penpal.postcards", "Postcards")}</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {t("penpal.discoverHint", "Find new friends to connect with")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {t("common.refresh", "Refresh")}
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : discoverProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <UserX className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-lg font-medium">
                  {t("penpal.noMoreProfiles", "No one new to discover right now")}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {t("penpal.emptyTips", "Try updating your interests in Preferences, or check back later as new members join.")}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={() => setPrefsOpen(true)} variant="outline" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t("penpal.preferences", "Preferences")}
                  </Button>
                  <Button onClick={handleRefresh} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t("common.refresh", "Refresh")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {discoverProfiles.map((profile) => (
                  <PenPalCard
                    key={profile.user_id}
                    profile={profile}
                    onConnect={handleConnect}
                    connecting={processing === profile.user_id}
                    hasPendingRequest={hasPendingRequest(profile.user_id)}
                    myInterests={myInterests}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6">
            <PenPalRequestsTab
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              loading={requestsLoading}
              processing={processing}
              onAccept={acceptRequest}
              onDecline={declineRequest}
              onCancel={cancelRequest}
            />
          </TabsContent>

          {/* My Connections Tab */}
          <TabsContent value="connections" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : myConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Heart className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-lg font-medium">
                  {t("penpal.noPenpals", "No pen pals yet")}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {t("penpal.startDiscovering", "Start discovering and connecting with new friends!")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myConnections.map((connection) => (
                  connection.penpal_profile && (
                    <PenPalCard
                      key={connection.id}
                      profile={connection.penpal_profile}
                      onConnect={async () => true}
                      connecting={false}
                      isConnected
                      myInterests={myInterests}
                      onSendPostcard={handleSendPostcard}
                      sendingPostcard={sendingPostcard}
                    />
                  )
                ))}
              </div>
            )}
          </TabsContent>

          {/* Postcards Tab */}
          <TabsContent value="postcards" className="mt-6">
            <PostcardsTab
              receivedPostcards={receivedPostcards}
              sentPostcards={sentPostcards}
              loading={postcardsLoading}
              onMarkAsRead={markAsRead}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PenPalPreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        preferences={myPreferences}
        onSave={updatePreferences}
      />
    </MainLayout>
  );
};

export default PenPals;

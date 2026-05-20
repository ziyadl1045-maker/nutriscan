import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { initAdMob } from "@/lib/admob";
import { AdBanner } from "@/components/AdBanner";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ScanPage from "@/pages/Scan";
import ProductDetails from "@/pages/ProductDetails";
import ProfilePage from "@/pages/Profile";
import ChatPage from "@/pages/Chat";

function Router() {
  const { user, isLoading } = useAuth();
  const isFree = user?.subscriptionStatus !== 'premium';

  useEffect(() => {
    initAdMob();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/" component={user ? Dashboard : Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/scan">
          {!user ? <Landing /> : <ScanPage />}
        </Route>
        <Route path="/product/:barcode">
          {!user ? <Landing /> : <ProductDetails />}
        </Route>
        <Route path="/profile">
          {!user ? <Landing /> : <ProfilePage />}
        </Route>
        <Route path="/chat">
          {!user ? <Landing /> : <ChatPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
      {user && <AdBanner show={isFree} />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

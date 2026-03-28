import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Listings = lazy(() => import("./pages/Listings"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const NewListing = lazy(() => import("./pages/NewListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const Messages = lazy(() => import("./pages/Messages"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SellerPublic = lazy(() => import("./pages/SellerPublic"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      /** Deux tentatives max pour mieux absorber les micro-coupures réseau / redémarrage API */
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/mot-de-passe-oublie" element={<ForgotPassword />} />
                  <Route path="/auth/reinitialiser" element={<ResetPassword />} />
                  <Route path="/annonces" element={<Listings />} />
                  <Route path="/annonces/nouvelle" element={<NewListing />} />
                  <Route path="/annonces/:id/modifier" element={<EditListing />} />
                  <Route path="/annonces/:id" element={<ListingDetail />} />
                  <Route path="/vendeur/:userId" element={<SellerPublic />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:conversationId" element={<Messages />} />
                  <Route path="/mon-compte" element={<MyAccount />} />
                  <Route path="/favoris" element={<Favorites />} />
                  <Route path="/mentions-legales" element={<MentionsLegales />} />
                  <Route path="/confidentialite" element={<Confidentialite />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

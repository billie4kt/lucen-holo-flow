import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import IndustryPage from "./pages/IndustryPage.tsx";
import UseCasePage from "./pages/UseCasePage.tsx";
import IndustriesIndex from "./pages/IndustriesIndex.tsx";
import Services from "./pages/Services.tsx";
import Contact from "./pages/Contact.tsx";
import About from "./pages/About.tsx";
import GetStarted from "./pages/GetStarted.tsx";
import IntegrationPage from "./pages/IntegrationPage.tsx";
import Auth from "./pages/Auth.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminOverview from "./pages/admin/Overview";
import AdminSubmissions from "./pages/admin/Submissions";
import AdminTelemetry from "./pages/admin/Telemetry";
import AdminContent from "./pages/admin/Content";
import AdminUsers from "./pages/admin/Users";
import AdminOrgs from "./pages/admin/Orgs";
import ClientOverview from "./pages/dashboard/Overview";
import ClientEngagements from "./pages/dashboard/Engagements";
import ClientAnalytics from "./pages/dashboard/Analytics";
import ClientMessages from "./pages/dashboard/Messages";
import ClientSettings from "./pages/dashboard/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/industries" element={<IndustriesIndex />} />
          <Route path="/industries/:slug" element={<IndustryPage />} />
          <Route path="/use-cases/:slug" element={<UseCasePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/integrations/:slug" element={<IntegrationPage />} />
          <Route path="/auth" element={<Auth />} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute role="admin"><AdminSubmissions /></ProtectedRoute>} />
          <Route path="/admin/telemetry" element={<ProtectedRoute role="admin"><AdminTelemetry /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute role="admin"><AdminContent /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/orgs" element={<ProtectedRoute role="admin"><AdminOrgs /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><ClientOverview /></ProtectedRoute>} />
          <Route path="/dashboard/engagements" element={<ProtectedRoute><ClientEngagements /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><ClientAnalytics /></ProtectedRoute>} />
          <Route path="/dashboard/messages" element={<ProtectedRoute><ClientMessages /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

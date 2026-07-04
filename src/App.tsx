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
import Admin from "./pages/Admin.tsx";
import IntegrationPage from "./pages/IntegrationPage.tsx";

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
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

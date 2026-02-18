import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FinanceProvider } from "./contexts/DataContext";
import Index from "./pages/Index";
import Expenses from "./pages/Expenses";
import UploadPage from "./pages/UploadPage";
import Desapego from "./pages/Desapego";
import SettingsPage from "./pages/SettingsPage";
import Transactions from "./pages/Transactions";
import PlannedEntries from "./pages/PlannedEntries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <FinanceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/planned" element={<PlannedEntries />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/desapego" element={<Desapego />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FinanceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;


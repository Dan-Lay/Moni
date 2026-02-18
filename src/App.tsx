import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FinanceProvider } from "./contexts/DataContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Expenses from "./pages/Expenses";
import UploadPage from "./pages/UploadPage";
import Desapego from "./pages/Desapego";
import SettingsPage from "./pages/SettingsPage";
import Transactions from "./pages/Transactions";
import PlannedEntries from "./pages/PlannedEntries";
import LoginPage from "./pages/LoginPage";
import Verify2FAPage from "./pages/Verify2FAPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-2fa" element={<Verify2FAPage />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/planned" element={<ProtectedRoute><PlannedEntries /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/desapego" element={<ProtectedRoute><Desapego /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

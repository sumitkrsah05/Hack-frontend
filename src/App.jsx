import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import { ScanProvider } from "@/lib/scanStore";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import ModeSelector from "@/pages/ModeSelector";
import ConfigForm from "@/pages/ConfigForm";
import Monitor from "@/pages/Monitor";
import Report from "@/pages/Report";
import History from "@/pages/History";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ScanProvider>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/scan" element={<ModeSelector />} />
                <Route path="/scan/:mode" element={<ConfigForm />} />
                <Route path="/monitor/:jobId" element={<Monitor />} />
                <Route path="/report/:jobId" element={<Report />} />
                <Route path="/history" element={<History />} />
                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Routes>
          </Router>
          <Toaster />
        </ScanProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
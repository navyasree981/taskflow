// =============================================================================
// App.jsx — Router setup
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/stores";
import { connectSocket } from "./services/services";
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  BoardPage,
} from "./pages/pages";

const ProtectedRoute = ({ children }) => {
  const { user, token } = useAuthStore();
  if (!user || !token) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user) return <Navigate to="/" replace />;
  return children;
};
<h1 className="text-5xl font-display text-red-500">Tailwind Working</h1>;
function App() {
  const { user } = useAuthStore();
  useEffect(() => {
    if (user) connectSocket();
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/board/:boardId"
          element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

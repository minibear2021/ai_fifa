import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./routes/Home";
import Login from "./routes/Login";
import Register from "./routes/Register";
import Dashboard from "./routes/Dashboard";
import TeamDetail from "./routes/TeamDetail";
import ApiKeys from "./routes/ApiKeys";
import Matches from "./routes/Matches";
import MatchDetail from "./routes/MatchDetail";
import Leaderboard from "./routes/Leaderboard";
import ApiDocs from "./routes/ApiDocs";

export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <Routes>
        <Route element={<Layout><Home /></Layout>} path="/" />
        <Route element={<Layout><Login /></Layout>} path="/login" />
        <Route element={<Layout><Register /></Layout>} path="/register" />
        <Route
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
          path="/dashboard"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout><TeamDetail /></Layout>
            </ProtectedRoute>
          }
          path="/team/:id"
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout><ApiKeys /></Layout>
            </ProtectedRoute>
          }
          path="/api-keys"
        />
        <Route element={<Layout><Matches /></Layout>} path="/matches" />
        <Route element={<Layout><MatchDetail /></Layout>} path="/matches/:id" />
        <Route element={<Layout><Leaderboard /></Layout>} path="/leaderboard" />
        <Route element={<ApiDocs />} path="/api/v1/docs/ui" />
        <Route element={<ApiDocs />} path="/docs" />
      </Routes>
    </>
  );
}

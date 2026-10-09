// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { UserIdProvider, useUserID } from './utils/userIdContext.jsx';
import { ThemeProvider } from "./utils/themeContext.jsx";
import { publicPageRoutes } from './public/publicPageRoutes.jsx';

import ChatLayout from './protected/chatLayout.jsx';
import AuthLayout from './authentication/authLayout.jsx';
import PublicLayout from './public/publicLayout.jsx';
import NotFoundPage from './public/pages/notfoundpage.tsx';

import './App.css';
import { authPageRoutes } from './authentication/authPageRoutes.jsx';

function ProtectedRoute({ children }) {
  const { authenticated, loading } = useUserID();
  const logged = localStorage.getItem("user_state") === "true";

  if (loading && logged) {
    return children;
  }
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { authenticated, loading, accessToken } = useUserID();
  const logged = localStorage.getItem("user_state") === "true";

  if (loading && logged) {
    return <Navigate to="/chat" replace />;
  }

  if (authenticated && accessToken) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

function WithUserIdProvider() {
  return (
    <UserIdProvider>
      <Outlet />
    </UserIdProvider>
  );
}

export default function App() {
  return (
    <div className="app">
      <ThemeProvider>
        <Router>
          <Routes>
            <Route element={<WithUserIdProvider />}>
              <Route element={<AuthLayout />}>
                {authPageRoutes.map(({ path, element }) => {
                  const firstSegment = path.split("/").filter(Boolean)[0];
                  const isPublicOnly =
                    firstSegment === "login" || firstSegment === "register";

                  return (
                    <Route
                      key={path}
                      path={path}
                      element={
                        isPublicOnly ? (
                          <PublicOnlyRoute>{element}</PublicOnlyRoute>
                        ) : (
                          element
                        )
                      }
                    />
                  );
                })}
              </Route>
              <Route path="/" element={<PublicLayout />}>
                {publicPageRoutes.map(({ path, element }) => (
                  <Route key={path} path={path} element={element} />
                ))}
                <Route path="*" element={<NotFoundPage/>}/>
              </Route>
              <Route
                path="/chat/:id?"
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </div>
  );
}

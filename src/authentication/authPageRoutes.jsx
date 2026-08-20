import React from 'react';
import RegisterPage from './register/registerPage';
import LoginPage from './login/loginPage';
import VerifyAccount from './verification/verifyaccount';
import ForceChangePassword from './forcechangepassword/forceChangePassword';
import ForgotPassword from './forgotpassword/forgotPasswordPage';

export const authPageRoutes = [
  { path: '/login', element: <LoginPage />},
  { path: '/register', element: <RegisterPage />},
  { path: '/register/:code', element: <RegisterPage /> },
  { path: '/verify-account', element: <VerifyAccount /> },
  { path: '/force-change-password', element: <ForceChangePassword /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
];

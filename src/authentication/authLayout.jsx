import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/partials/header.jsx';
import './authLayout.css'

export default function AuthLayout() {
  return (
    <div className='auth-container'>
      <Header
      logoOnly
      />
      <div className='auth-card'>
        <Outlet/>
      </div>
    </div>
  );
}

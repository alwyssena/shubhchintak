import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Signup from './Components/Signup';  // Import the Signup component
import Dashboard from './Components/dashboard';  // Assume you have a Dashboard component
import Login from './Components/login';  // Assume you have a Login component

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
         <Route path="/dashboard" element={<Dashboard />} /> 
      </Routes>
    </Router>
  );
};

export default App;

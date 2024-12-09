import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // For navigation after successful signup
import axios from 'axios';  // Axios for API requests
import  './Signup.css'

const Signup = () => {
  const navigate = useNavigate();  // For navigation after successful signup
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form field changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');  // Clear any previous error messages

    // Send POST request to register the user
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', formData);

      // Extract token from the response
      const { token } = response.data;

      // Save JWT token to localStorage
      localStorage.setItem('token', token);

      // Navigate to the dashboard after successful signup
      navigate('/dashboard');
    } catch (err) {
      // Handle error gracefully
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} className="signup-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        {/* Display error message if any */}
        {error && <p className="error">{error}</p>}

        <button type="submit" className="signup-button" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>

      {/* Link to login page if the user already has an account */}
      <div className="login-link">
        <p>Already have an account? <a href="/login">Log In</a></p>
      </div>
    </div>
  );
};

export default Signup;

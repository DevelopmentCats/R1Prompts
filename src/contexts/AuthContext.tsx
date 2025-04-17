import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
  emailNotifications?: boolean;
  darkMode?: boolean;
  createdAt: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
  updateUserProfile: (userData: Partial<User>) => Promise<User>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = async (authToken: string) => {
    try {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      const response = await axiosInstance.get('/users/profile');
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      if ((err as any)?.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        // Only redirect to login if not on a public route
        const publicRoutes = ['/prompts/explore', '/', '/prompts/', '/login', '/register'];
        if (!publicRoutes.some(route => location.pathname.startsWith(route))) {
          navigate('/login');
        }
      }
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const userData = await fetchUserProfile(storedToken);
        if (userData) {
          setToken(storedToken);
        }
      } else {
        const publicRoutes = ['/prompts/explore', '/', '/prompts/', '/login', '/register'];
        if (!publicRoutes.some(route => location.pathname.startsWith(route))) {
          navigate('/login');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      if (!userData || !newToken) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', newToken);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      setUser(userData);
      setError(null);

      const from = location.state?.from?.pathname || '/';
      navigate(from);
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please check your credentials.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    if (!token) throw new Error('No authentication token');

    try {
      const response = await axiosInstance.put('/users/profile', userData);
      const updatedUser = response.data;
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    logout,
    register: async (username: string, email: string, password: string) => {
      try {
        await axiosInstance.post('/auth/register', { username, email, password });
        await login(email, password);
      } catch (err) {
        console.error('Registration error:', err);
        setError('Failed to register. Please try again.');
        throw err;
      }
    },
    updateProfile: (userData: Partial<User>) => {
      if (user) {
        setUser({ ...user, ...userData });
      }
    },
    updateUserProfile,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

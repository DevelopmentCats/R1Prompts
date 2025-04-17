import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { ChakraProvider, ColorModeScript, Center, Box } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import theme from './theme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import PromptView from './pages/PromptView';
import PromptCreate from './pages/PromptCreate';
import EditPrompt from './pages/EditPrompt';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import Generate from './pages/Generate';
import { useColorMode } from '@chakra-ui/react';
import LoadingLogo from './components/LoadingLogo';

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLoading } = useAuth();
  const { colorMode } = useColorMode();

  if (isLoading) {
    return (
      <Center h="100vh" bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}>
        <LoadingLogo />
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={<Profile />}
          />
          <Route
            path="/prompts/create"
            element={
              <ProtectedRoute>
                <PromptCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts/explore"
            element={<Explore />}
          />
          <Route
            path="/prompts/generate"
            element={
              <ProtectedRoute>
                <Generate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts/:id"
            element={<PromptView />}
          />
          <Route
            path="/prompts/:id/edit"
            element={
              <ProtectedRoute>
                <EditPrompt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Explore />} />
        </Route>
      </Routes>
    </Box>
  );
};

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </ChakraProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

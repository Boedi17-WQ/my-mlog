import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase'; // Pastikan file supabase.js sudah dibuat

// Komponen Halaman
import Home from './pages/Home';
import About from './pages/About';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import SignUp from './pages/SignUp';
import CreatePost from './pages/CreatePost';
import UpdatePost from './pages/UpdatePost';
import PostPage from './pages/PostPage';
import Search from './pages/Search';

// Komponen Layout
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

// Komponen Proteksi Rute
import PrivateRoute from './components/PrivateRoute';
import OnlyAdminPrivateRoute from './components/OnlyAdminPrivateRoute';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_KEY);

    // Cek session saat pertama kali load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe ke perubahan state autentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header session={session} />
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/about' element={<About />} />
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/search' element={<Search />} />
        <Route path='/projects' element={<Projects />} />
        <Route path='/post/:postSlug' element={<PostPage />} />

        {/* Protected Routes - Untuk User yang Login */}
        <Route element={<PrivateRoute session={session} />}>
          <Route path='/dashboard' element={<Dashboard />} />
        </Route>

        {/* Admin Only Routes */}
        <Route element={<OnlyAdminPrivateRoute session={session} />}>
          <Route path='/create-post' element={<CreatePost />} />
          <Route path='/update-post/:postId' element={<UpdatePost />} />
        </Route>

        {/* Fallback Route */}
        <Route path='*' element={<Navigate to='/' />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
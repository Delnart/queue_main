import React, { useState, useEffect, createContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TelegramLogin from './components/TelegramLogin.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GroupPage from './pages/GroupPage.jsx';
import SubjectPage from './pages/SubjectPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { AuthContext } from './context/AuthContext.jsx';

const TOKEN_KEY = 'token';
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    // ---- ОСЬ ВИПРАВЛЕННЯ ----
    if (!res.ok) {
      // Якщо статус не 2xx (напр. 400, 403, 404, 500)
      let errorData;
      try {
        // Намагаємось прочитати JSON з помилкою (де є поле "message")
        errorData = await res.json();
      } catch (e) {
        // Якщо тіло помилки порожнє, або не JSON
        errorData = { message: `Помилка ${res.status} ${res.statusText}` };
      }
      
      // ГЕНЕРУЄМО ПОМИЛКУ, яку зловить 'catch' блок
      throw new Error(errorData.message || 'Невідома помилка сервера');
    }
    // ------------------------

    // Якщо все Ок, але тіло відповіді порожнє (напр. 204 No Content)
    try {
      return await res.json();
    } catch (e) {
      return null; // Повертаємо null, а не падаємо
    }
  };

  const fetchUser = async () => {
    setLoading(true);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await apiFetch('/api/auth/me');
      setUser(userData);
    } catch (error) {
      console.error(error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  if (loading) {
    return <div>Завантаження...</div>;
  }

  const authContextValue = { user, setUser, apiFetch, fetchUser, handleLogout };

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={
              user ? <Dashboard /> : <GuestView />
            } />
            <Route path="/group/:groupId" element={
              user ? <GroupPage /> : <Navigate to="/" />
            } />
            <Route path="/subject/:subjectId" element={
              user ? <SubjectPage /> : <Navigate to="/" />
            } />
            <Route path="/profile" element={
              user ? <ProfilePage /> : <Navigate to="/" />
            } />
          </Routes>
        </header>
      </div>
    </AuthContext.Provider>
  );
}

const GuestView = () => (
  <div>
    <h1>Вітаю у системі черг!</h1>
    <p>Будь ласка, увійдіть через Telegram, щоб почати.</p>
    <TelegramLogin />
  </div>
);

export default App;
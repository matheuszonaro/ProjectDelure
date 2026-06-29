import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangProvider } from './contexts/LangContext';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import FavoritesPage from './pages/FavoritesPage';
import GameDetailPage from './pages/GameDetailPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/:id" element={<GameDetailPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}

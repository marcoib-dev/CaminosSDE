import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CategoriasProvider } from './context/CategoriasContext.jsx';
import { TemaProvider } from './context/TemaContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <TemaProvider>
    <BrowserRouter>
      <AuthProvider>
        <CategoriasProvider>
          <App />
        </CategoriasProvider>
      </AuthProvider>
    </BrowserRouter>
  </TemaProvider>
);

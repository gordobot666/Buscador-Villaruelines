'use client';

import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './header.css';
import './globals.css';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const PASSWORD = 'u/886I[dG#07';

  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [top200, setTop200] = useState<any[]>([]);
  const [view, setView] = useState<'top' | 'az'>('top');
  const [darkMode, setDarkMode] = useState(true);
  const [currentLetter, setCurrentLetter] = useState('#');
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState('');
  const [scriptVisible, setScriptVisible] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [counter, setCounter] = useState(0);

  const USERS_PER_PAGE = 200;
  const alphabet = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  const isSymbol = (char: string) => !/[a-zA-Z]/.test(char);

  useEffect(() => {
    document.body.classList.add('dark');
    fetch('/api/buscar')
      .then(res => res.json())
      .then(data => {
        const sortedAZ = [...data].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        setUsers(sortedAZ);
        const sortedTop = [...data].sort((a, b) => b.followers_count - a.followers_count).slice(0, 200);
        setTop200(sortedTop);
        setFilteredUsers(sortedTop);
      });
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    let count = 0;
    const total = users.length;
    const increment = Math.ceil(total / 40);
    const interval = setInterval(() => {
      count += increment;
      if (count >= total) {
        count = total;
        clearInterval(interval);
      }
      setCounter(count);
    }, 15);
    return () => clearInterval(interval);
  }, [users]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark');
  };

  const filterAZ = (letter: string, baseUsers = users) => {
    setCurrentLetter(letter);
    setCurrentPage(1);
    const result = baseUsers.filter((user) => {
      const first = user.name?.[0]?.toUpperCase() || '';
      return letter === '#' ? isSymbol(first) : first === letter;
    });
    setFilteredUsers(result);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const lower = query.toLowerCase();
    const source = view === 'top' ? top200 : users;
    const result = source.filter((u) =>
      [u.name, u.username, u.user_id.toString()].some((x) =>
        x.toLowerCase().includes(lower)
      )
    );
    if (view === 'az') {
      filterAZ(currentLetter, result);
    } else {
      setFilteredUsers(result);
    }
  };

  const paginatedUsers = useMemo(() => {
    if (view === 'top') return filteredUsers;
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage, view]);

  const totalPages = useMemo(() => {
    if (view === 'top') return 1;
    return Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  }, [filteredUsers, view]);

  const exportToExcel = () => {
    const uniqueUsersMap = new Map();
    users.forEach((u) => {
      if (!uniqueUsersMap.has(u.user_id)) {
        uniqueUsersMap.set(u.user_id, u);
      }
    });

    const data = Array.from(uniqueUsersMap.values()).map((u) => ({
      Nombre: u.name,
      Username: u.username,
      ID: u.user_id,
      Seguidores: u.followers_count,
      Perfil: u.profile_url,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Villarruelines');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'Listado_Villarruelines.xlsx');
  };

  const generarScript = async () => {
    try {
      const res = await fetch('/api/buscar');
      const allUsers = await res.json();
      const ids = [...new Set(allUsers.map((u: any) => `"${u.user_id}"`))];

      const script = `(async () => {
  const ids = [${ids.join(',')}];
  const done = JSON.parse(localStorage.getItem('blockedIds') || '[]');
  const logBox = (() => {
    let el = document.getElementById("visual-log");
    if (!el) {
      el = document.createElement("div");
      el.id = "visual-log";
      Object.assign(el.style, {
        position: "fixed", bottom: "0", left: "0", zIndex: "9999",
        backgroundColor: "black", color: "white", padding: "1em",
        maxHeight: "40vh", overflowY: "scroll", fontFamily: "monospace"
      });
      document.body.appendChild(el);
    }
    return el;
  })();
  const log = msg => {
    const div = document.createElement("div");
    div.innerText = msg;
    logBox.appendChild(div);
    setTimeout(() => { div.remove(); }, 8000);
  };
  const getCSRF = () => document.cookie.split("; ").find(x => x.startsWith("ct0="))?.split("=")[1];
  const blockUser = async (userId) => {
    if (done.includes(userId)) {
      log("⛔ Ya estaba bloqueado: " + userId);
      return false;
    }
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-csrf-token": getCSRF(),
      "x-twitter-auth-type": "OAuth2Session",
      "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
    };
    try {
      const res = await fetch("https://x.com/i/api/1.1/blocks/create.json", {
        method: "POST", headers, body: "user_id=" + userId, credentials: "include"
      });
      const data = await res.json();
      if (data.errors?.[0]?.code === 162) {
        log("⛔ Ya estaba bloqueado: " + userId);
      } else if (res.ok) {
        log("✅ Bloqueado: " + userId);
      } else {
        log("❌ Error: " + userId + " - " + data?.errors?.[0]?.message || res.status);
      }
      done.push(userId);
      localStorage.setItem('blockedIds', JSON.stringify(done));
      return true;
    } catch (e) {
      log("❌ Error con " + userId + " - " + e.message);
      return false;
    }
  };
  for (const id of ids) {
    const shouldDelay = await blockUser(id);
    if (shouldDelay) await new Promise(r => setTimeout(r, 5000));
  }
  log("🚀 Proceso terminado.");
})();`;

      setScriptCode(script);
      setScriptVisible(true);
    } catch (error) {
      alert('Error al generar el script');
      console.error(error);
    }
  };

  const copiarScript = async () => {
    await navigator.clipboard.writeText(scriptCode);
    alert('Script copiado al portapapeles');
  };

  if (!authenticated) {
    return (
      <main className="access-wrapper">
        <div className="access-box">
          <h1 className="access-title">🔒 Acceso restringido</h1>
          <input
            type="password"
            placeholder="Contraseña"
            className="access-input"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button
            onClick={() => {
              if (passwordInput === PASSWORD) {
                setAuthenticated(true);
              } else {
                alert('Contraseña incorrecta');
              }
            }}
            className="access-button"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center pt-4 px-4">
      <header className="header">
        <div className="left-buttons">
          <button onClick={exportToExcel} className="btn-download">📥 Descargar Listado</button>
          <button onClick={generarScript} className="btn-script">🛡️ Generar Script</button>
        </div>
        <div className="right-buttons">
          <button onClick={toggleDarkMode} className="icon-mode" title={darkMode ? 'Modo Día' : 'Modo Noche'}>
            {darkMode ? '🌞' : '🌙'}
          </button>
        </div>
      </header>

      <h1 className="title text-center mb-2">Villarruelines en Twitter </h1>

      <form onSubmit={handleSearch} className="search-container">
        <input
          type="text"
          placeholder="Buscar por nombre, username o ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="view-selector">
        <button className={view === 'top' ? 'active-view' : ''} onClick={() => { setView('top'); setFilteredUsers(top200); setQuery(''); }}>
          Top 200 Villarruelines por Seguidores
        </button>
        <button className={view === 'az' ? 'active-view' : ''} onClick={() => { setView('az'); filterAZ(currentLetter); setQuery(''); }}>
          Todos los Villarruelines A-Z
        </button>
      </div>

      {view === 'az' && (
        <div className="alphabet-bar">
          {alphabet.map((char) => (
            <button key={char} className={`alphabet-btn ${char === currentLetter ? 'active' : ''}`} onClick={() => filterAZ(char)}>
              {char}
            </button>
          ))}
        </div>
      )}

      <h2 className="subtitle text-center mb-1">
        {view === 'top' ? 'Top 200 Villarruelines por Seguidores' : 'Todos los Villarruelines A-Z'}
      </h2>
      <p className="contador">Villarruelines en el Sistema: {counter}</p>

      <div className="grid-autofit w-full max-w-7xl mb-10">
        {paginatedUsers.map((user) => (
          <a key={user.user_id} href={user.profile_url} target="_blank" rel="noopener noreferrer" className="user-card">
            <img src={user.avatar_url} alt={user.username} className="avatar" />
            <div className="text-center">
              <p className="user-id">ID: {user.user_id}</p>
              <p className="user-name">{user.name}</p>
              <p className="text-sm">@{user.username}</p>
              <p className="text-xs mt-1">{user.followers_count.toLocaleString()} seguidores</p>
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination mb-10">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Anterior</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)} className={currentPage === i + 1 ? 'active-page' : ''}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Siguiente</button>
        </div>
      )}

      <footer className="footer">
        <a href="https://x.com/kukadox" target="_blank" rel="noopener noreferrer" className="footer-link">
          Kukas DX S.A — Versión 28042025
        </a>
      </footer>

      {scriptVisible && (
        <div className="modal-overlay" onClick={() => setScriptVisible(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Instrucciones para bloquear</h2>
            <ol className="modal-steps">
              <li>
                Abre{' '}
                <a
                  href="https://x.com/settings/blocked/all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-600"
                >
                  https://x.com/settings/blocked/all
                </a>.
              </li>
              <li>Presiona <b>F12</b> y abre la consola.</li>
              <li>Copia y pega este script:</li>
            </ol>
            <pre className="code-block"><code>{scriptCode}</code></pre>
            <div className="flex flex-row gap-4 justify-center items-center flex-wrap">
              <button className="btn-copy btn-blue uniform-btn" onClick={copiarScript}>📋 Copiar Script</button>
              <a href="https://www.youtube.com/watch?v=onytaNtcmT0" target="_blank" rel="noopener noreferrer" className="btn-copy btn-red uniform-btn">▶️ Ver Tutorial</a>
              <a href="https://drive.google.com/file/d/1CFdqPRg_Jdax8Qb3C92SpWJS5SRxZuvi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="btn-copy btn-green uniform-btn">📄 Tutorial PDF</a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

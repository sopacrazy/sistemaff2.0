import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    const [loading, setLoading] = useState(true);

    const applyTheme = (newTheme) => {
        setTheme(newTheme);
        const html = document.documentElement;
        if (newTheme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        localStorage.setItem('theme', newTheme);
    };

    // Load theme for a specific user (or current user if not provided)
    const loadUserTheme = async (username) => {
        const user = username || localStorage.getItem('username');
        if (!user) return; // Se não tem usuário, mantém o atual ou light

        try {
            const res = await axios.get(`${API_BASE_URL}/usuarios/tema/${user}`);
            if (res.data.theme) {
                applyTheme(res.data.theme);
            }
        } catch (error) {
            console.error("Erro ao carregar tema do usuário:", error);
            // Se falhar e tiver algo no localstorage, usa, senão light
            const saved = localStorage.getItem('theme');
            if (saved) applyTheme(saved);
        }
    };

    // Initial load
    useEffect(() => {
        const init = async () => {
            const username = localStorage.getItem('username');
            if (username) {
                await loadUserTheme(username);
            } else {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) applyTheme(savedTheme);
            }
            setLoading(false);
        };
        init();
    }, []);

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);

        const username = localStorage.getItem('username');
        if (username) {
            try {
                await axios.put(`${API_BASE_URL}/usuarios/${username}/tema`, { theme: newTheme });
            } catch (error) {
                console.error("Erro ao salvar tema no servidor:", error);
            }
        }
    };

    const forceTheme = (t) => {
        applyTheme(t);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, forceTheme, loadUserTheme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};

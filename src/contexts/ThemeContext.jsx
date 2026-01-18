// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // 初始化：检测系统时间 + localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      // 自动检测时间（18:00-06:00 为夜间）
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      setDarkMode(isNight);
    }
  }, []);

  // 切换主题时保存到 localStorage
  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
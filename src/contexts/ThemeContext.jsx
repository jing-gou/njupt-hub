// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // themeMode 可选值: 'light', 'dark', 'system'
  const [themeMode, setThemeMode] = useState('system');
  // darkMode 用于组件内部判断最终渲染样式
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // 1. 初始化：从缓存读取用户偏好，默认为 'system'
    const savedMode = localStorage.getItem('themeMode') || 'system';
    setThemeMode(savedMode);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 计算最终应该是深色还是浅色
    const updateDarkMode = () => {
      if (themeMode === 'system') {
        setDarkMode(mediaQuery.matches);
      } else {
        setDarkMode(themeMode === 'dark');
      }
    };

    updateDarkMode();

    // 2. 只有在系统模式下，才监听系统切换
    const handleChange = () => {
      if (themeMode === 'system') {
        setDarkMode(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // 3. 同步到 HTML class (支持 Tailwind dark: 模式)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 设置模式的方法
  const applyThemeMode = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, themeMode, applyThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
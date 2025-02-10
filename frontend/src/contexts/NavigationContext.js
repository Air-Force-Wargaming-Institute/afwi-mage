import React, { createContext, useContext, useState, useEffect } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => useContext(NavigationContext);

const getInitialState = () => {
  try {
    const saved = localStorage.getItem('lastVisitedSubpages');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  return {
    fineTuning: '/fine-tuning/guide',
    multiAgent: '/multi-agent/chat',
    retrieval: '/retrieval/guide',
  };
};

export const NavigationProvider = ({ children }) => {
  const [lastVisitedSubpage, setLastVisitedSubpage] = useState(getInitialState);

  const updateLastVisitedSubpage = (section, path) => {
    setLastVisitedSubpage((prev) => ({ ...prev, [section]: path }));
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('lastVisitedSubpages', JSON.stringify(lastVisitedSubpage));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [lastVisitedSubpage]);

  return (
    <NavigationContext.Provider value={{ lastVisitedSubpage, updateLastVisitedSubpage }}>
      {children}
    </NavigationContext.Provider>
  );
}; 
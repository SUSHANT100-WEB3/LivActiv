import { Slot } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { FilterProvider } from '../components/FilterContext';
import { ThemeProvider } from '../components/ThemeContext';
import { AuthContext } from '../constants/AuthContext';
import { auth } from '../constants/firebase';

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      <ThemeProvider>
        <FilterProvider>
          <Slot />
        </FilterProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

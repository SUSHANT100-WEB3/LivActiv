import React, { createContext, useContext, useState } from 'react';

export type FilterState = {
  sport: string;
  date: Date | null;
  price: 'all' | 'free' | 'paid';
  radius: number;
  city: string;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
};

const FilterContext = createContext<FilterState | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sport, setSport] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [price, setPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [radius, setRadius] = useState(10);
  const [city, setCity] = useState('Phoenix, AZ');

  const setFilters = (filters: Partial<FilterState>) => {
    if (filters.sport !== undefined) setSport(filters.sport);
    if (filters.date !== undefined) setDate(filters.date);
    if (filters.price !== undefined) setPrice(filters.price);
    if (filters.radius !== undefined) setRadius(filters.radius);
    if (filters.city !== undefined) setCity(filters.city);
  };

  const resetFilters = () => {
    setSport('');
    setDate(null);
    setPrice('all');
    setRadius(10);
    setCity('Phoenix, AZ');
  };

  return (
    <FilterContext.Provider value={{ sport, date, price, radius, city, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}; 
import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (event) => {
    setSearchTerm(event.target.value);
    onSearch(event.target.value);
  };

  return (
    <div className="flex justify-center w-full">
      <div className="flex items-center rounded-lg border-2 border-gray-600 bg-gray-700 w-full max-w-2xl">
        <FaSearch className="text-gray-400 mx-3" />
        <input
          className="appearance-none bg-transparent border-none w-full text-white py-3 px-2 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-lg"
          type="text"
          placeholder="Buscar por nombre de plato..."
          value={searchTerm}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default SearchBar;
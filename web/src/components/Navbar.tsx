import React, { useState } from 'react';
import clsx from 'clsx';
import { Menu, X, Search } from 'lucide-react';

interface NavbarProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  onToggleSidebar,
  sidebarOpen
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              📊
            </div>
            <h1 className="text-xl font-bold text-gray-900">Student Analytics</h1>
          </div>
        </div>

        <form onSubmit={handleSearch} className="hidden md:block flex-1 mx-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search student by ID or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </form>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Teacher Dashboard</span>
          <img
            src="https://ui-avatars.com/api/?name=Teacher&background=0D8ABC&color=fff"
            alt="Profile"
            className="w-8 h-8 rounded-full"
          />
        </div>
      </div>
    </nav>
  );
};

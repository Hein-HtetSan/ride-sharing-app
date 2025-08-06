import React from 'react';
import { User, MapPin, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  showProfile?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showProfile = true, 
  showNotifications = true,
  showMenu = false,
  onMenuClick 
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 pt-safe">
          <div className="flex items-center">
            {showMenu && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center ml-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="ml-2 text-lg font-bold text-gray-900">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {showNotifications && (
              <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 relative tap-target">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            )}

            {showProfile && user && (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 tap-target">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-900">
                    {user.username}
                  </span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{user.username}</div>
                    <div className="text-gray-500">{user.phone}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
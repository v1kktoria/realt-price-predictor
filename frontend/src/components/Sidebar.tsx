import React from 'react';
import { PlusCircle, History, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <PlusCircle size={20} />, label: 'Оценка' },
    { path: '/history', icon: <History size={20} />, label: 'История' },
    { path: '/analytics', icon: <PieIcon size={20} />, label: 'Аналитика' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-hex">
          <TrendingUp size={24} color="white" />
        </div>
        <div className="logo-text">
          <span className="logo-brand">RealtAI</span>
          <span className="logo-tag">Smart Estimate</span>
        </div>
      </div>
      
      <nav className="main-nav">
        {menuItems.map((item) => (
          <button 
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} 
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">G</div>
          <div className="user-name">Гость</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

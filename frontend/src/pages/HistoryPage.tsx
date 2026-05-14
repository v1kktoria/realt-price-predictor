import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Maximize2, Home as HomeIcon, Calendar, History as HistoryIcon } from 'lucide-react';

const HistoryPage = () => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('prediction_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const clearHistory = () => {
    if(window.confirm('Очистить историю?')) {
      setHistory([]);
      localStorage.removeItem('prediction_history');
    }
  };

  return (
    <div className="page-wrapper fade-in">
      <div className="page-header-flex">
        <div>
          <h1 className="display-title">История архива</h1>
          <p className="subtitle">Ваши предыдущие оценки и динамика запросов</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="ghost-danger-btn">
            <Trash2 size={18} />
            <span>Удалить всё</span>
          </button>
        )}
      </div>

      <div className="modern-history-grid">
        {history.map(item => (
          <div key={item.id} className="glass-history-card">
            <div className="g-card-top">
              <div className="g-tag">{item.rooms}-к</div>
              <div className="g-date"><Clock size={12} /> {item.date}</div>
            </div>
            <div className="g-price">${item.price.toLocaleString()}</div>
            <div className="g-details">
              <div className="h-spec"><Maximize2 size={14} /> {item.total_area} м²</div>
              <div className="h-spec"><HomeIcon size={14} /> {item.floor} эт.</div>
              <div className="h-spec"><Calendar size={14} /> {item.year_built} г.</div>
            </div>
            <p className="g-desc" title={item.description}>
              {item.description.length > 100 
                ? `${item.description.substring(0, 100)}...` 
                : item.description}
            </p>
          </div>
        ))}
        {history.length === 0 && (
          <div className="history-empty-state">
            <div className="empty-icon"><HistoryIcon size={48} /></div>
            <p>Архив оценок пуст</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;

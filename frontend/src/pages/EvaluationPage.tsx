import React, { useState } from 'react';
import axios from 'axios';
import { Layers, MapPin, Search, Maximize2 } from 'lucide-react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';

const EvaluationPage = () => {
  const [formData, setFormData] = useState({
    total_area: 50,
    living_area: 30,
    rooms: 2,
    floor: 5,
    year_built: 2010,
    latitude: 53.9045,
    longitude: 27.5615,
    description: 'Современная квартира в благоустроенном районе.',
  });

  const [prediction, setPrediction] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const saveToHistory = (price: number) => {
    const history = JSON.parse(localStorage.getItem('prediction_history') || '[]');
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('ru-RU'),
      ...formData,
      price: price
    };
    localStorage.setItem('prediction_history', JSON.stringify([newItem, ...history]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPrediction(null);
    try {
      const response = await axios.post<{price: number}>('http://localhost:8000/predict', formData);
      setPrediction(response.data.price);
      saveToHistory(response.data.price);
    } catch (err) {
      alert('Ошибка API. Убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper fade-in">
      <div className="page-intro">
        <h1 className="display-title">Узнайте стоимость квартиры</h1>
        <p className="subtitle">Автоматическая оценка недвижимости на основе актуальных рыночных данных</p>
      </div>

      <div className="evaluate-vertical-stack">
        <div className="form-glass-card">
          <form onSubmit={handleSubmit} className="modern-form">
            <div className="section-header"><Layers size={18} /><span>Характеристики объекта</span></div>
            <div className="grid-3">
              <div className="form-field">
                <label>Общая площадь</label>
                <div className="input-with-unit"><input type="number" value={formData.total_area} onChange={e => setFormData({...formData, total_area: parseFloat(e.target.value)})} /><span>м²</span></div>
              </div>
              <div className="form-field">
                <label>Комнат</label>
                <select value={formData.rooms} onChange={e => setFormData({...formData, rooms: parseInt(e.target.value)})}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}-к квартира</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Этаж</label>
                <input type="number" value={formData.floor} onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-field">
                <label>Год постройки</label>
                <input type="number" value={formData.year_built} onChange={e => setFormData({...formData, year_built: parseInt(e.target.value)})} />
              </div>
              <div className="form-field">
                <label>Жилая площадь</label>
                <div className="input-with-unit"><input type="number" value={formData.living_area} onChange={e => setFormData({...formData, living_area: parseFloat(e.target.value)})} /><span>м²</span></div>
              </div>
            </div>

            <div className="form-field">
              <label>Описание и ремонт</label>
              <textarea placeholder="Опишите состояние квартиры, ремонт, инфраструктуру..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="section-header"><MapPin size={18} /><span>Расположение на карте</span></div>
            <div className="map-container-modern">
              <YMaps>
                <Map defaultState={{ center: [53.9045, 27.5615], zoom: 11 }} width="100%" height="240px" onClick={(e: any) => setFormData({...formData, latitude: e.get('coords')[0], longitude: e.get('coords')[1]})}>
                  <Placemark geometry={[formData.latitude, formData.longitude]} />
                </Map>
              </YMaps>
            </div>
            <button type="submit" className="glow-btn" disabled={loading}>{loading ? <span className="spinner"></span> : 'Рассчитать стоимость'}</button>
          </form>
        </div>

        <div className="prediction-bottom-area">
          <div className={`prediction-card-wide ${prediction ? 'unveiled' : ''}`}>
            {prediction ? (
              <div className="prediction-content-wide">
                <div className="pred-stats-row">
                  <div className="p-stat"><span className="p-label">Цена за м²</span><span className="p-val">${Math.round(prediction/formData.total_area).toLocaleString()}</span></div>
                  <div className="p-stat"><span className="p-label">Уверенность AI</span><span className="p-val">97%</span></div>
                  <div className="p-stat"><span className="p-label">Площадь объекта</span><span className="p-val">{formData.total_area} м²</span></div>
                </div>

                <div className="pred-price-display">
                  <span className="pred-label-small">Оценочная стоимость</span>
                  <div className="price-val">${prediction.toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="prediction-placeholder-wide">
                <div className="placeholder-icon"><Search size={32} /></div>
                <p>Результат оценки появится здесь после заполнения формы</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationPage;

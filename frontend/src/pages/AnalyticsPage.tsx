import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('http://localhost:8000/analytics');
        if (res.data.error) {
          setError(res.data.error);
        } else {
          setAnalytics(res.data);
        }
      } catch (err) {
        setError("Не удалось загрузить данные с сервера.");
        console.error("Analytics fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="page-wrapper fade-in"><p>Загрузка аналитических данных...</p></div>;
  
  if (error) return (
    <div className="page-wrapper fade-in">
      <div className="analytics-card" style={{borderColor: '#ef4444'}}>
        <h3 style={{color: '#ef4444'}}>Ошибка загрузки</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="glow-btn" style={{width: 'auto', padding: '10px 20px', marginTop: '10px'}}>Попробовать снова</button>
      </div>
    </div>
  );

  const cityData = analytics?.cities || [];
  const roomData = analytics?.rooms || [];
  const m2Data = analytics?.m2_prices || [];

  return (
    <div className="page-wrapper fade-in">
       <div className="page-intro">
        <h1 className="display-title">Аналитика рынка</h1>
        <p className="subtitle">Статистический обзор на основе {analytics?.total_objects || 0} актуальных объявлений</p>
      </div>

      <div className="analytics-layout">
        {/* График 1: Средняя цена по городам */}
        <div className="analytics-card main-chart">
          <div className="card-info">
            <h3>Средняя цена объекта по городам ($)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cityData}>
                <defs>
                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} height={50} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Средняя цена"]}
                />
                <Bar dataKey="price" fill="url(#barGradient1)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* График 2: Квартиры по количеству комнат */}
        <div className="analytics-card">
          <div className="card-info">
            <h3>Квартиры по количеству комнат</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie 
                  data={roomData} 
                  innerRadius={65} outerRadius={90} 
                  paddingAngle={8} dataKey="value"
                  stroke="none"
                  labelLine={false}
                  label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}
                >
                  {roomData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* График 3: Цена за м2 по областям */}
        <div className="analytics-card full-width">
          <div className="card-info">
            <h3>Средняя стоимость м² по областям ($)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={m2Data}>
                <defs>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Цена за м²"]}
                />
                <Bar dataKey="price" fill="url(#barGradient2)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

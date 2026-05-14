import os
import joblib
import pandas as pd
import numpy as np
import re
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from sklearn.cluster import KMeans

app = FastAPI(title="Realt Price Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "best_model.pkl")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "flats_realtby.xlsx")

model = None
kmeans_model = None
coord_stats = {"mean": None, "std": None}

def init_models():
    global model, kmeans_model, coord_stats
    
    try:
        model = joblib.load(MODEL_PATH)
        print("Модель загружена")
    except Exception as e:
        print(f"Ошибка загрузки модели: {e}")

    try:
        df = pd.read_excel(DATA_PATH)
        
        def parse_coordinates(coord_str):
            try:
                if isinstance(coord_str, str):
                    coord_str = coord_str.strip('()[]{}')
                    parts = coord_str.split(',')
                    if len(parts) >= 2:
                        lat = float(parts[0].strip())
                        lon = float(parts[1].strip())
                        if 51.0 <= lat <= 57.0 and 23.0 <= lon <= 33.0:
                            return lat, lon
            except: pass
            return np.nan, np.nan

        def clean_numeric(value):
            if pd.isna(value): return np.nan
            if isinstance(value, (int, float)): return float(value)
            try: return float(re.sub(r'[^\d\.\-]', '', str(value).replace(' ', '').replace(',', '.')))
            except: return np.nan

        df['Цена в $'] = df['Цена в $'].apply(clean_numeric)
        df['Площадь общая'] = df['Площадь общая'].apply(clean_numeric)
        df['Количество комнат'] = df['Количество комнат'].apply(clean_numeric)

        df = df[df['Цена в $'].between(df['Цена в $'].quantile(0.01), df['Цена в $'].quantile(0.98))]
        df = df[df['Площадь общая'].between(df['Площадь общая'].quantile(0.01), df['Площадь общая'].quantile(0.98))]
        df = df[df['Количество комнат'] <= 4]

        coords = df['Координаты'].apply(parse_coordinates)
        df['Широта'] = coords.apply(lambda x: x[0])
        df['Долгота'] = coords.apply(lambda x: x[1])
        
        valid_coords = df[['Широта', 'Долгота']].dropna()
        if len(valid_coords) > 50:
            coord_stats["mean"] = valid_coords.mean()
            coord_stats["std"] = valid_coords.std()
            
            coords_scaled = (valid_coords - coord_stats["mean"]) / coord_stats["std"]
            kmeans_model = KMeans(n_clusters=10, random_state=42, n_init=10)
            kmeans_model.fit(coords_scaled)
            print("Гео-кластеризатор обучен")
    except Exception as e:
        print(f"Ошибка инициализации гео-кластера: {e}")

init_models()

class PredictionRequest(BaseModel):
    total_area: float
    living_area: Optional[float] = None
    rooms: int
    floor: int
    year_built: int
    latitude: float
    longitude: float
    description: str

def extract_nlp_features(text: str):
    if not isinstance(text, str) or not text:
        return {'ремонт_уровень': 0, 'метро_близость': 0, 'паркинг': 0, 'элитность': 0, 'инфраструктура': 0, 'состояние': 0}

    text_lower = text.lower()
    features = {}

    if any(word in text_lower for word in ['евроремонт', 'дизайнерский ремонт', 'евро ремонт', 'элитный ремонт']):
        features['ремонт_уровень'] = 3
    elif any(word in text_lower for word in ['капитальный ремонт', 'полный ремонт', 'основательный ремонт']):
        features['ремонт_уровень'] = 2
    elif any(word in text_lower for word in ['хороший ремонт', 'качественный ремонт', 'свежий ремонт']):
        features['ремонт_уровень'] = 1
    elif any(word in text_lower for word in ['косметический ремонт', 'обычный ремонт', 'стандартный ремонт']):
        features['ремонт_уровень'] = 0
    elif any(word in text_lower for word in ['требует ремонта', 'нужен ремонт', 'под ремонт']):
        features['ремонт_уровень'] = -1
    else:
        features['ремонт_уровень'] = 0

    if any(word in text_lower for word in ['рядом метро', 'близко метро', 'у метро', 'около метро']):
        features['метро_близость'] = 2
    elif 'метро' in text_lower:
        features['метро_близость'] = 1
    else:
        features['метро_близость'] = 0

    features['паркинг'] = 1 if any(word in text_lower for word in ['паркинг', 'гараж', 'машиноместо', 'подземный паркинг']) else 0

    elite_keywords = ['элитный', 'премиум', 'люкс', 'престижный', 'бизнес-класс', 'комфорт-класс']
    features['элитность'] = sum(1 for word in elite_keywords if word in text_lower)

    infra_keywords = ['школа', 'детский сад', 'больница', 'поликлиника', 'супермаркет', 'торговый центр', 'парк', 'сквер', 'остановка', 'транспорт']
    features['инфраструктура'] = sum(1 for word in infra_keywords if word in text_lower)

    if any(word in text_lower for word in ['отличное состояние', 'идеальное состояние', 'прекрасное состояние']):
        features['состояние'] = 2
    elif any(word in text_lower for word in ['хорошее состояние', 'удовлетворительное состояние']):
        features['состояние'] = 1
    elif any(word in text_lower for word in ['нормальное состояние', 'обычное состояние']):
        features['состояние'] = 0
    elif any(word in text_lower for word in ['плохое состояние', 'удовлетворительное']):
        features['состояние'] = -1
    else:
        features['состояние'] = 0

    return features

@app.post("/predict")
async def predict(data: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Модель не загружена. Проверьте путь к best_model.pkl")
    try:
        current_year = datetime.now().year
        age = current_year - max(1900, min(current_year, data.year_built))
        
        geo_cluster = 0
        if kmeans_model is not None and coord_stats["mean"] is not None:
            try:
                point = pd.DataFrame([[data.latitude, data.longitude]], columns=['Широта', 'Долгота'])
                point_scaled = (point - coord_stats["mean"]) / coord_stats["std"]
                geo_cluster = int(kmeans_model.predict(point_scaled)[0])
            except:
                pass

        features = {
            'Площадь общая': data.total_area,
            'Количество комнат': data.rooms,
            'Возраст_здания': age,
            'Этаж': data.floor,
            'Соотношение_жилой_площади': (data.living_area or data.total_area * 0.6) / max(1, data.total_area),
            'Плотность_комнат': data.rooms / max(1, data.total_area),
            'Площадь_x_комнаты': data.total_area * data.rooms,
            'Площадь_квадрат': data.total_area ** 2,
            'Лог_площадь': np.log(max(1, data.total_area)),
            'Площадь_x_возраст': data.total_area * age,
            'Комнаты_x_возраст': data.rooms * age,
            'Новостройка': 1 if age <= 5 else 0,
            'Старое_здание': 1 if age > 30 else 0,
            'Высокий_этаж': 1 if data.floor > 5 else 0,
            'Низкий_этаж': 1 if data.floor <= 2 else 0,
            'Гео_кластер': geo_cluster, 
            'Широта': data.latitude,
            'Долгота': data.longitude
        }
        
        nlp_features = extract_nlp_features(data.description)
        features.update(nlp_features)
        
        cols_order = [
            'Площадь общая', 'Количество комнат', 'Возраст_здания', 'Этаж',
            'Соотношение_жилой_площади', 'Плотность_комнат', 'Площадь_x_комнаты',
            'Площадь_квадрат', 'Лог_площадь', 'Площадь_x_возраст', 'Комнаты_x_возраст',
            'Новостройка', 'Старое_здание', 'Высокий_этаж', 'Низкий_этаж',
            'Гео_кластер', 'Широта', 'Долгота',
            'ремонт_уровень', 'метро_близость', 'паркинг', 'элитность', 'инфраструктура', 'состояние'
        ]
        
        input_df = pd.DataFrame([features])[cols_order]
        prediction = model.predict(input_df)[0]
        
        return {"price": round(float(prediction), 2)}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics")
async def get_analytics():
    try:
        df = pd.read_excel(DATA_PATH)
        
        def clean_val(x):
            try: return float(str(x).replace(' ', '').replace(',', '.'))
            except: return np.nan
        
        df['Цена'] = df['Цена в $'].apply(clean_val)
        df['Комнаты'] = df['Количество комнат'].apply(clean_val)
        df['Площадь'] = df['Площадь общая'].apply(clean_val)
        
        centers = ['Минск', 'Гродно', 'Брест', 'Гомель', 'Витебск', 'Могилев']
        city_col = 'Населенный пункт' if 'Населенный пункт' in df.columns else 'Город'
        df['Город_clean'] = df[city_col].astype(str).str.replace('г. ', '', regex=False).str.strip()
        
        df_clean = df.dropna(subset=['Цена', 'Область', 'Площадь']).copy()
        df_clean['Цена_м2'] = df_clean['Цена'] / df_clean['Площадь']

        df_centers = df_clean[df_clean['Город_clean'].isin(centers)]
        city_stats = df_centers.groupby('Город_clean')['Цена'].mean().round(0).sort_values(ascending=False).to_dict()
        
        room_counts = df_clean['Комнаты'].value_counts().sort_index()
        room_data = [{"name": f"{int(k)}-к.", "value": int(v)} for k, v in room_counts.items() if k < 6]

        m2_region_stats = df_clean.groupby('Область')['Цена_м2'].mean().round(0).sort_values(ascending=False).to_dict()

        return {
            "cities": [{"name": k, "price": v} for k, v in city_stats.items()],
            "rooms": room_data,
            "m2_prices": [{"name": k, "price": v} for k, v in m2_region_stats.items()],
            "total_objects": len(df_clean)
        }
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return {"error": f"Ошибка обработки: {str(e)}"}

@app.get("/")
async def root():
    return {"status": "ok"}

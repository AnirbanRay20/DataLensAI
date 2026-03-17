import pandas as pd
from prophet import Prophet
import json

def generate_forecast():
    # 1. Simulate pulling 2 years of Historical Data from the Node API (or DB directly)
    print("Loading historical data...")
    dates = pd.date_range(start='2022-01-01', end='2024-03-01', freq='MS')
    
    # Generate some realistic-looking cyclical sales data
    historical_data = pd.DataFrame({
        'ds': dates, # Prophet requires the date column to be named 'ds'
        'y': [
            10000, 10500, 12000, 11500, 13000, 13500, 14000, 13800, 15000, 14500, 16000, 20000, # 2022 (Holiday Spike)
            12000, 12500, 14000, 13500, 15000, 15500, 16000, 15800, 17000, 16500, 18000, 22000, # 2023 (Holiday Spike + Growth)
            14000, 14500, 16000 # Early 2024
        ] # Prophet requires the value column to be named 'y'
    })

    print(f"Loaded {len(historical_data)} historical records.")

    # 2. Initialize and Train the Prophet Model
    print("Training forecasting model...")
    # Add built-in seasonality (yearly)
    model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    
    # Fit the model to our historical dataframe
    model.fit(historical_data)

    # 3. Predict the Future (Next 6 months)
    print("Predicting next 6 months...")
    # 'freq=MS' means Month-Start
    future_dates = model.make_future_dataframe(periods=6, freq='MS') 
    forecast = model.predict(future_dates)

    # 4. Format Output for the Node API -> React Dashboard
    # We need to map prophet's 'ds' (date), 'yhat' (prediction), and our original 'y' (actuals)
    
    # Merge forecast with historical data to get actuals side-by-side with predictions
    results = pd.merge(forecast[['ds', 'yhat']], historical_data, on='ds', how='left')
    
    formatted_data = []
    for _, row in results.iterrows():
        formatted_data.append({
            "date": row['ds'].strftime('%Y-%m-%d'),
            "actual": int(row['y']) if pd.notna(row['y']) else None,
            "predicted": int(row['yhat'])
        })

    # Return as JSON
    output_payload = {
        "status": "success",
        "data": formatted_data
    }
    
    print("\n--- FORECAST GENERATED ---")
    print(json.dumps(output_payload, indent=2))
    
    # For now, we just save it to a file, but later FastAPI will return this directly
    with open('mock_forecast_output.json', 'w') as f:
        json.dump(output_payload, f)
        
    print("\nSaved output to ai_service/mock_forecast_output.json")

if __name__ == "__main__":
    generate_forecast()

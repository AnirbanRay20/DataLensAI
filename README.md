# DataLens AI

Conversational AI Business Intelligence Dashboard — ask plain English questions, get instant interactive charts. Powered by Groq AI.

## Quick Start

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Add your API Key from the Groq Console
   ```

5. **Run the app**
   ```bash
   npm run dev
   ```
   Frontend: http://localhost:5173
   Backend: http://localhost:3001

4. **Add the CSV**
   Place your CSV file in the WebPage


## Environment Variables

| Variable | Description |
|---|---|
| GROQ_API_KEY | Your Groq API Key |
| PORT | Backend port (default: 3001) |
| FRONTEND_URL | Frontend URL for CORS (default: http://localhost:5173) |

## Demo Queries

1. `Show total revenue by product category`
2. `Monthly revenue trend for 2023 broken down by customer region`
3. `Compare average discount percentage and average rating across all product categories`

## Authors

**Anirban Ray**
- Email: `anirbanmark1429@gmail.com`
- GitHub: `https://github.com/AnirbanRay20`

**Anusmita Ray Chaudhuri**
- Email: `titiray05@gmail.com`
- GitHub: `https://github.com/anus05`

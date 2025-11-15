from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import httpx
import asyncio
from datetime import datetime
import structlog
from langgraph_service import stock_analysis_agent
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logger = structlog.get_logger()
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

app = FastAPI(
    title="股票分析API",
    description="基于Alpha Vantage API的股票分析服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置Alpha Vantage API
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

# 数据模型
class StockQuote(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: datetime

class StockHistory(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class TechnicalIndicator(BaseModel):
    indicator_type: str
    value: float
    timestamp: datetime

class AnalysisRequest(BaseModel):
    analysis_type: str = "comprehensive"  # technical, fundamental, comprehensive
    time_period: str = "1m"  # 1d, 1w, 1m, 3m, 1y
    portfolio: Optional[Dict[str, Any]] = None

class AnalysisResult(BaseModel):
    symbol: str
    analysis_type: str
    summary: str
    key_metrics: Dict[str, Any]
    recommendation: str
    confidence_score: float
    timestamp: datetime

# Alpha Vantage API服务
class AlphaVantageService:
    def __init__(self):
        self.api_key = ALPHA_VANTAGE_API_KEY
        self.base_url = ALPHA_VANTAGE_BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_quote(self, symbol: str) -> StockQuote:
        """获取股票实时报价"""
        try:
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.api_key
            }
            
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            quote_data = data.get("Global Quote", {})
            
            if not quote_data:
                raise ValueError(f"无法获取股票 {symbol} 的报价数据")
            
            return StockQuote(
                symbol=symbol,
                price=float(quote_data.get("05. price", 0)),
                change=float(quote_data.get("09. change", 0)),
                change_percent=float(quote_data.get("10. change percent", "0%").rstrip("%")),
                volume=int(quote_data.get("06. volume", 0)),
                timestamp=datetime.now()
            )
        except Exception as e:
            logger.error(f"获取股票报价失败: {symbol}", error=str(e))
            raise HTTPException(status_code=500, detail=f"获取股票报价失败: {str(e)}")
    
    async def get_history(self, symbol: str, period: str = "1m") -> List[StockHistory]:
        """获取股票历史数据"""
        try:
            params = {
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "apikey": self.api_key
            }
            
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            time_series = data.get("Time Series (Daily)", {})
            
            if not time_series:
                raise ValueError(f"无法获取股票 {symbol} 的历史数据")
            
            history = []
            for date, values in list(time_series.items())[:100]:  # 获取最近100天数据
                history.append(StockHistory(
                    date=date,
                    open=float(values.get("1. open", 0)),
                    high=float(values.get("2. high", 0)),
                    low=float(values.get("3. low", 0)),
                    close=float(values.get("4. close", 0)),
                    volume=int(values.get("5. volume", 0))
                ))
            
            return history
        except Exception as e:
            logger.error(f"获取股票历史数据失败: {symbol}", error=str(e))
            raise HTTPException(status_code=500, detail=f"获取股票历史数据失败: {str(e)}")
    
    async def get_technical_indicators(self, symbol: str, indicator: str = "SMA") -> List[TechnicalIndicator]:
        """获取技术指标数据"""
        try:
            params = {
                "function": indicator,
                "symbol": symbol,
                "interval": "daily",
                "time_period": "20",
                "series_type": "close",
                "apikey": self.api_key
            }
            
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            tech_data = data.get(f"Technical Analysis: {indicator}", {})
            
            indicators = []
            for date, values in list(tech_data.items())[:30]:  # 获取最近30天数据
                indicators.append(TechnicalIndicator(
                    indicator_type=indicator,
                    value=float(values.get(indicator, 0)),
                    timestamp=datetime.strptime(date, "%Y-%m-%d")
                ))
            
            return indicators
        except Exception as e:
            logger.error(f"获取技术指标失败: {symbol}", error=str(e))
            raise HTTPException(status_code=500, detail=f"获取技术指标失败: {str(e)}")

# 初始化服务
alpha_vantage_service = AlphaVantageService()

# API路由
@app.get("/")
async def root():
    return {"message": "股票分析API服务", "version": "1.0.0", "timestamp": datetime.now()}

@app.get("/api/stocks/{symbol}/quote", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    """获取股票实时报价"""
    logger.info(f"获取股票报价: {symbol}")
    return await alpha_vantage_service.get_quote(symbol.upper())

@app.get("/api/stocks/{symbol}/history", response_model=List[StockHistory])
async def get_stock_history(symbol: str, period: str = "1m"):
    """获取股票历史数据"""
    logger.info(f"获取股票历史数据: {symbol}, 周期: {period}")
    return await alpha_vantage_service.get_history(symbol.upper(), period)

@app.get("/api/stocks/{symbol}/indicators", response_model=List[TechnicalIndicator])
async def get_technical_indicators(symbol: str, indicator: str = "SMA"):
    """获取技术指标数据"""
    logger.info(f"获取技术指标: {symbol}, 指标: {indicator}")
    return await alpha_vantage_service.get_technical_indicators(symbol.upper(), indicator)

@app.post("/api/analysis/{symbol}", response_model=AnalysisResult)
async def analyze_stock(symbol: str, request: AnalysisRequest):
    """智能分析股票（集成LangGraph Agent）"""
    logger.info(f"智能分析股票: {symbol}, 分析类型: {request.analysis_type}")
    
    try:
        # 使用LangGraph Agent进行分析
        result = await stock_analysis_agent.analyze_stock(
            symbol=symbol.upper(),
            analysis_type=request.analysis_type,
            portfolio=request.portfolio
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return AnalysisResult(
            symbol=result["symbol"],
            analysis_type=result["analysis_type"],
            summary=result["summary"],
            key_metrics=result["key_metrics"],
            recommendation=result["recommendation"],
            confidence_score=result["confidence_score"],
            timestamp=datetime.fromisoformat(result["timestamp"])
        )
        
    except Exception as e:
        logger.error(f"智能分析失败: {symbol}", error=str(e))
        raise HTTPException(status_code=500, detail=f"智能分析失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.now()}

# 启动服务
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import httpx
import asyncio
from datetime import datetime
import structlog
# 优先使用 ReAct Agent，失败则回退到 LangGraph Agent
try:
    from backend.react_agent_service import stock_analysis_agent as _react_agent
    stock_analysis_agent = _react_agent
    ACTIVE_AGENT = "react"
except Exception as e:
    # 回退到 LangGraph
    try:
        from backend.langgraph_service import stock_analysis_agent as _lg_agent
        stock_analysis_agent = _lg_agent
        ACTIVE_AGENT = "langgraph"
    except Exception:
        stock_analysis_agent = None
        ACTIVE_AGENT = "none"
    # 记录 React Agent 导入失败原因
    import logging
    logging.getLogger(__name__).warning("React Agent 导入失败，已回退到 LangGraph", exc_info=e)
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logger = structlog.get_logger()
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ANALYSIS_DEBUG = os.getenv("ANALYSIS_DEBUG", "true").lower() == "true"

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
    detailed_analysis: Optional[Dict[str, Any]] = None
    debug: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    question: str
    portfolio: Optional[Dict[str, Any]] = None

class ChatReply(BaseModel):
    content: str
    timestamp: datetime
    debug: Optional[Dict[str, Any]] = None

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

            # 回退：如报价为空，尝试从日线数据获取最近收盘价
            if not quote_data:
                try:
                    hist_params = {
                        "function": "TIME_SERIES_DAILY",
                        "symbol": symbol,
                        "apikey": self.api_key
                    }
                    hist_resp = await self.client.get(self.base_url, params=hist_params)
                    hist_resp.raise_for_status()
                    hist = hist_resp.json().get("Time Series (Daily)", {})
                    if hist:
                        latest_date = sorted(hist.keys())[-1]
                        latest = hist[latest_date]
                        return StockQuote(
                            symbol=symbol,
                            price=float(latest.get("4. close", 0)),
                            change=0.0,
                            change_percent=0.0,
                            volume=int(latest.get("5. volume", 0)),
                            timestamp=datetime.now()
                        )
                except Exception:
                    # 忽略回退失败，按默认值返回
                    pass

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
            # 降级返回默认值，避免 500
            return StockQuote(
                symbol=symbol,
                price=0.0,
                change=0.0,
                change_percent=0.0,
                volume=0,
                timestamp=datetime.now()
            )
    
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
            # 降级返回空列表，避免 500
            return []
    
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
        if stock_analysis_agent is None:
            raise HTTPException(status_code=503, detail="分析服务不可用")
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
            timestamp=datetime.fromisoformat(result["timestamp"]),
            detailed_analysis=result.get("detailed_analysis"),
            debug=(result.get("detailed_analysis") if ANALYSIS_DEBUG else None)
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
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=PORT, reload=True)
@app.post("/api/chat/{symbol}", response_model=ChatReply)
async def chat_with_agent(symbol: str, request: ChatRequest):
    logger.info(f"自由对话: {symbol}")
    try:
        if stock_analysis_agent is None:
            raise HTTPException(status_code=503, detail="分析服务不可用")
        result = await stock_analysis_agent.answer_question(
            symbol=symbol.upper(),
            question=request.question,
            portfolio=request.portfolio
        )
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return ChatReply(
            content=result["content"],
            timestamp=datetime.fromisoformat(result["timestamp"]),
            debug=(result if ANALYSIS_DEBUG else None)
        )
    except Exception as e:
        logger.error(f"自由对话失败: {symbol}", error=str(e))
        raise HTTPException(status_code=500, detail=f"自由对话失败: {str(e)}")

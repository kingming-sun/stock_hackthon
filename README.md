# 股票分析平台

基于React + Python + LangGraph的股票分析平台，集成Alpha Vantage API和MCP工具。

## 技术架构

### 前端
- React 18 + TypeScript
- Tailwind CSS
- Axios

### 后端
- FastAPI + Python 3.11
- 直接调用Alpha Vantage API
- LangGraph集成（开发中）

## 快速开始

### 环境要求
- Node.js 18+
- Python 3.11+
- Alpha Vantage API密钥

### 安装依赖

前端：
```bash
cd frontend
npm install
npm run dev
```

后端：
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 环境变量

创建 `.env` 文件：
```
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

## API文档

后端启动后访问：http://localhost:8000/docs

## 功能特性

- ✅ 股票实时报价
- ✅ 股票历史数据
- ✅ 技术指标数据
- 🚧 LangGraph智能分析（开发中）
- 🚧 MCP工具集成（开发中）

## 部署

支持Docker容器化部署，详见Dockerfile。
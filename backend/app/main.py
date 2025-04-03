from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
import os
from typing import List
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection string to MSSQL
conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=TLPRODSQL;DATABASE=AIS;Trusted_Connection=yes;"
)

@app.get("/live")
def get_live_data():
    query = """
    SELECT *
    FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY mmsi ORDER BY timestamp DESC) as rn
        FROM [AIS].[Spire].[Vessel]
    ) latest
    WHERE rn = 1
    """
    try:
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            columns = [column[0] for column in cursor.description]
            data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

@app.get("/historical")
def get_historical_data(
    mmsi: str = Query(...),
    start: str = Query((datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d")),
    end: str = Query(datetime.utcnow().strftime("%Y-%m-%d"))
):
    query = """
    SELECT *
    FROM [AIS].[Spire].[Vessel]
    WHERE mmsi = ?
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
    """
    try:
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            cursor.execute(query, (mmsi, start, end))
            columns = [column[0] for column in cursor.description]
            data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}
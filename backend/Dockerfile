FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render sets $PORT at runtime; EXPOSE 8000 is documentation/default only.
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
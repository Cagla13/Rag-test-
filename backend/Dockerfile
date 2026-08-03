
FROM python:3.11-slim


RUN apt-get update && apt-get install -y \
    build-essential \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt


COPY frontend ./frontend
COPY backend ./backend

WORKDIR /app/backend

RUN mkdir -p basvurular && chmod 777 basvurular

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
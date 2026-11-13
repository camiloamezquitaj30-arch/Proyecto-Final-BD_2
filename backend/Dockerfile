# Imagen oficial y ligera de Python (variante "slim": Debian mínimo)
FROM python:3.12-slim

# Logs sin buffer: los print() aparecen al instante en docker logs
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Primero SOLO las dependencias: si requirements.txt no cambia,
# Docker reutiliza esta capa en caché y el build tarda segundos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Después el código. En desarrollo, el volumen ./backend:/app del compose
# lo reemplaza por tu carpeta; sin ese volumen la imagen funciona sola
COPY . .

# Documenta el puerto interno de Flask (el publicado lo define docker-compose)
EXPOSE 5000

# Comando por defecto para arrancar Flask
CMD ["python", "app.py"]

FROM python:3.11-slim

WORKDIR /usr/share/app

COPY index.html .

EXPOSE 3000

CMD ["python", "-m", "http.server", "3000"]

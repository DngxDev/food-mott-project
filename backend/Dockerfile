# Đổi khung sườn sang bản bullseye mới hơn
FROM python:3.9-slim-bullseye

# Cài đặt Microsoft ODBC Driver cho Linux (Cập nhật link tải cho Debian 11)
RUN apt-get update && apt-get install -y curl apt-transport-https gnupg2 \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 unixodbc-dev g++

WORKDIR /app
COPY . /app

RUN pip install -r requirements.txt

# Chạy Backend
CMD ["gunicorn", "-b", "0.0.0.0:10000", "app:app"]
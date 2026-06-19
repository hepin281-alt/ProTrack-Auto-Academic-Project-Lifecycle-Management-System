FROM python:3.9

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . .

# Updated to bind to PORT environment variable for Render compatibility
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

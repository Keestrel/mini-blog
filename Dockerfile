FROM python:3.14.6

WORKDIR /app

COPY .  .

RUN pip install -r requirements.txt

CMD [ "python", "main.py", "--host", "0.0.0.0", "--port", "8000", "--reload" ]
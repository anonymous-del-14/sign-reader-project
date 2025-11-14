version: "3.8"

services:
  backend:
    build:
      context: ./backend
    container_name: sign-backend
    env_file:
      - ./.env.compose
    environment:
      - INDICTRANS_URL=http://indictrans2:5000
      - TRANSLATOR=indictrans2
      - TESS_LANGS=eng,hin,ben,kan,tel,mar,tam,mal
    ports:
      - "5000:5000"
    depends_on:
      - indictrans2
    restart: unless-stopped

  indictrans2:
    build:
      context: ./indictrans2   # if you have a Dockerfile for IndicTrans2 here
    container_name: indictrans2
    ports:
      - "5002:5000"            # host 5002 -> container 5000 (change if needed)
    environment:
      - SOME_INDICTRANS_ENV=1  # any env your IndicTrans2 needs
    restart: unless-stopped



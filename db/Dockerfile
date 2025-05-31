FROM postgres:15-alpine

COPY seed_scripts/* /docker-entrypoint-initdb.d/
COPY seed_data/* /docker-entrypoint-initdb.d/
CREATE DATABASE nordic_startups;

\c nordic_startups;
   
-- columns: id,company,location,website,founded,employees,industries,stage,description
CREATE TABLE startups (
    id INT PRIMARY KEY,
    company TEXT NOT NULL,
    location TEXT,
    website TEXT,
    founded TEXT,
    employees TEXT,
    industries TEXT,
    stage TEXT,
    description TEXT
);
   
-- copied to the container in Dockerfile
\copy startups FROM '/docker-entrypoint-initdb.d/nordic_startups.csv' WITH (FORMAT csv, HEADER true);
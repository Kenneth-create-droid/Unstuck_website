-- now we will create our users table to make sure evertyhing is well

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    people_helped INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT id, firstname, lastname, email, people_helped
FROM users
ORDER BY id;





SELECT id, firstname, lastname, email, people_helped
FROM users
ORDER BY id ASC;
SELECT * FROM users;



DELETE FROM users
WHERE email = 'kenneth.nnah@ontariotechu.net';



TRUNCATE TABLE users RESTART IDENTITY;


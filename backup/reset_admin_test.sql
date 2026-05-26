UPDATE users SET password = '$2b$10$9dd.h4PyDmy4viEGYRSHzOaqCJtK9yxOuLmvTfLRmolyHyMs2/SO6' WHERE email = 'admin@local';
SELECT email, password FROM users WHERE email = 'admin@local';

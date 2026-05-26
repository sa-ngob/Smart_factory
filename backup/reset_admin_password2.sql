UPDATE users SET password = '$2b$10$DzMrPCD82NEKr5.G2BquUeHRBVjhMu60GFdSSf3PdXcZJi4lcAhDi' WHERE email = 'admin@local';
SELECT email, password FROM users WHERE email = 'admin@local';

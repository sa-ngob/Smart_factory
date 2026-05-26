UPDATE users SET password = '$2b$10$iQULO0zuLvSJ8mTdh6s/AeXlekYfcNowVSNRjivDN.Rr1z2d2KeRi' WHERE email = 'admin@local';
SELECT email, password FROM users WHERE email = 'admin@local';

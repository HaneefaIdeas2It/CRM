-- Update admin password to a known working hash (password: Admin12345)
UPDATE users 
SET "passwordHash" = '$2a$12$zw9teYkB3EDwamOa.xzZn.08nEbKpPQZG.R6HVhZoCeFkxsEOGEue'
WHERE email = 'admin@demo.com';


CREATE DATABASE IF NOT EXISTS Minecraft_Dashboard; -- Create database if not exists

USE Minecraft_Dashboard;

CREATE TABLE IF NOT EXISTS accounts (
	username VARCHAR(25) PRIMARY KEY,
	email: VARCHAR(40), -- The user's email address
	hash VARCHAR(70), -- The user's password in hashed form
	discord BIGINT, -- The user's Discord account ID
	permissions BIGINT NOT NULL DEFAULT 0 -- 
);


CREATE TABLE IF NOT EXISTS recovry ( -- List of accounts that have forgotten their passwords. An email containing a code (hashed in the database) has been sent to them; they will then need to enter it to change their passwords.
	email  VARCHAR(40) PRIMARY KEY,
	code  VARCHAR(64), -- The code is hashed
	expireAt BIGINT, -- Upon expiration, they must submit a new change request.
	attempts TINYINT DEFAULT 0, -- After 5 attempts they must submit another change request
	FOREIGN KEY (email) REFERENCES accounts(email) ON DELETE CASCADE -- If the user's account is deleted, the request is also deleted.
);

CREATE TABLE IF NOT EXISTS connections (
	username VARCHAR(25) PRIMARY KEY,
	code VARCHAR(64) OR NULL DEFAULT NULL
	code_expire_in BIGINT OR NULL DEFAULT NULL,
	FOREIGN KEY (username) REFERENCES accounts(username) ON DELETE CASCADE
);
-- ips => { hash: string, last-connection: timestamp, ip: 192.168.0.1 }[]

CREATE TABLE IF NOT EXISTS user_ip (
	id BIGINT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(25),
	ip VARCHAR(39),
	ip_hash VARCHAR(70),
	os VARCHAR()
	last_connection BIGINT,
	location POINT NOT NULL,
	UNIQUE KEY uniq_user_ip (username, ip_hash)
	FOREIGN KEY (username) REFERENCES account(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mods (
	id VARCHAR(8) PRIMARY KEY,
	name VARCHAR(50),
	version VARCHAR(25)
);

DELIMITER $$

CREATE TRIGGER IF NOT EXISTS after_account_creation
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
	INSERT INTO permissions (username) VALUES (NEW.username);
	INSERT INTO connections (username) VALUES (NEW.username);
END$$

-- CREATE TRIGGER IF NOT EXISTS after_account_delete
-- AFTER DELETE ON accounts
-- FOR EACH ROW
-- BEGIN
-- 	DELETE FROM permissions WHERE username = OLD.username;
-- 	DELETE FROM connections WHERE username = OLD.username;
-- 	DELETE FROM recovry WHERE email = OLD.email;
-- END$$

SELECT * FROM accounts WHERE discord = '542703093981380628'

ALTER TABLE mods ADD maintained BOOLEAN DEFAULT 1;

SELECT * FROM mods WHERE id = "NTi7d3Xc" AND maintained = 1 LIMIT 1;
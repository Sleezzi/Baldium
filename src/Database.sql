CREATE DATABASE IF NOT EXISTS Baldium; -- Create database if not exists

USE Baldium; -- Use the database created earlier

CREATE TABLE IF NOT EXISTS accounts (
	id BIGINT PRIMARY KEY AUTO_INCREMENT,
	username VARCHAR(25),
	email VARCHAR(40) UNIQUE NOT NULL, -- The user's email address
	hash VARCHAR(70) NOT NULL, -- The user's password in hashed form
	discord BIGINT, -- The user's Discord account ID
	permissions BIGINT NOT NULL DEFAULT 0, -- User permissions; See https://wiki.sleezzi.fr/en/baldium/account/permissions
	UNIQUE KEY uniq_user (username, email, discord)
);

CREATE TABLE IF NOT EXISTS recovry ( -- List of accounts that have forgotten their passwords. An email containing a code (hashed in the database) has been sent to them; they will then need to enter it to change their passwords.
	email VARCHAR(40) PRIMARY KEY NOT NULL,
	code VARCHAR(64) NOT NULL, -- The code is hashed
	expireAt BIGINT NOT NULL, -- Upon expiration, they must submit a new change request.
	attempts TINYINT DEFAULT 0, -- After 5 attempts they must submit another change request
	FOREIGN KEY (email) REFERENCES accounts(email) ON DELETE CASCADE -- If the user's account is deleted, the request is also deleted.
);

CREATE TABLE IF NOT EXISTS connections ( -- This table is used when a user logs in from a new location. A verification email is sent to them.
	email VARCHAR(40) PRIMARY KEY, -- the account email
	code VARCHAR(64) DEFAULT NULL, -- The hashed version of the code
	code_expire_in BIGINT DEFAULT NULL, -- The code expires after 5 minutes.
	attempts TINYINT DEFAULT 0,
	FOREIGN KEY (email) REFERENCES accounts(email) ON DELETE CASCADE -- When the user deletes their account, it is also deleted here.
);

CREATE TABLE IF NOT EXISTS user_ip ( -- This table contains all the data recorded on user connections. Users can have up to 5 saved locations; the oldest connection is deleted. When they reset their passwords, all the data linked to them is deleted.
	id BIGINT AUTO_INCREMENT PRIMARY KEY, -- The ID is generated automatically
	userId BIGINT NOT NULL, -- The userId linked to the account
	ip VARCHAR(39) NOT NULL, -- The IP address the user connected to is censored and looks like "192.*.*.1" or "1:*:*:1"
	ip_hash VARCHAR(70) NOT NULL, -- The IP address the user connected to, it hashed
	navigators VARCHAR(70) NOT NULL,
	model VARCHAR(40) DEFAULT "Unknown",
	os VARCHAR(40) NOT NULL,
	last_connection BIGINT NOT NULL, -- The timestamp of the last connection
	longitude DECIMAL(9,6), -- The connection coordinates, found from the IP address
	latitude DECIMAL(9,6), -- The connection coordinates, found from the IP address
	UNIQUE KEY uniq_user_ip (userId, ip_hash), -- Indicates that there cannot be multiple connections with the same IP address and userId.
	FOREIGN KEY (userId) REFERENCES accounts(id) ON DELETE CASCADE -- When the user deletes their account, it is also deleted here.
);

CREATE TABLE IF NOT EXISTS mods ( -- This table contains the list of mods installed on the server.
	id VARCHAR(8) PRIMARY KEY, -- The modrinth ID of the mod
	name VARCHAR(50), -- The mod's name is given by the user when it is added.
	version VARCHAR(25) -- The mod version
);

DROP TRIGGER IF EXISTS after_account_creation;

DELIMITER $$

CREATE TRIGGER after_account_creation
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
	INSERT INTO connections (email) VALUES (NEW.email);
END$$
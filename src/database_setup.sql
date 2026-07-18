CREATE DATABASE IF NOT EXISTS Baldium; -- Create database if not exists

USE Baldium; -- Use the database created earlier

CREATE TABLE IF NOT EXISTS accounts (
	id BIGINT PRIMARY KEY AUTO_INCREMENT,
	username VARCHAR(25),
	email VARCHAR(40) UNIQUE NOT NULL, -- The user's email address
	hash VARCHAR(70) NOT NULL, -- The user's password in hashed form
	discord BIGINT DEFAULT NULL, -- The user's Discord account ID
	permissions BIGINT NOT NULL DEFAULT 0, -- User permissions; See https://wiki.sleezzi.fr/en/baldium/account/permissions
	UNIQUE KEY uniq_user (username, email, discord),
	UNIQUE KEY uniq_discord (discord)
);
CREATE TABLE IF NOT EXISTS discord (
	id BIGINT PRIMARY KEY NOT NULL,
	refresh_token VARCHAR(128),
	access_token VARCHAR(128),
	FOREIGN KEY (id) REFERENCES accounts(discord) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS mods ( -- This table contains the list of mods installed on the server.
	id VARCHAR(8) PRIMARY KEY, -- The modrinth ID of the mod
	version VARCHAR(32) -- The mod version
);

CREATE TABLE IF NOT EXISTS mod_dependencies (
	mod_id VARCHAR(8) NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
	dependency_id VARCHAR(8) NOT NULL REFERENCES mods(id) ON DELETE RESTRICT
);

DELIMITER $$

CREATE TRIGGER after_account_creation
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
	INSERT INTO connections (email) VALUES (NEW.email);
END$$

CREATE TRIGGER after_account_discord_insert
AFTER INSERT ON accounts
FOR EACH ROW
BEGIN
	IF NEW.discord IS NOT NULL THEN
		INSERT INTO discord (id) VALUES (NEW.discord)
		ON DUPLICATE KEY UPDATE id = NEW.discord;
	END IF;
END$$

CREATE TRIGGER after_account_discord_update
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
	IF NEW.discord IS NOT NULL AND (OLD.discord IS NULL OR OLD.discord <> NEW.discord) THEN
		INSERT INTO discord (id) VALUES (NEW.discord)
		ON DUPLICATE KEY UPDATE id = NEW.discord;
	END IF;
END$$

-- WITH RECURSIVE dep_tree AS (
-- 	-- Point de départ : les dépendances directes
-- 	SELECT dependency_id, dep_type, 1 AS depth
-- 	FROM mod_dependencies
-- 	WHERE mod_id = '9eGKb6K1'

-- 	UNION ALL

-- 	-- Récursion : les dépendances des dépendances
-- 	SELECT d.dependency_id, d.dep_type, dt.depth + 1
-- 	FROM mod_dependencies d
-- 	JOIN dep_tree dt ON d.mod_id = dt.dependency_id
-- )
-- SELECT DISTINCT dep_tree.dependency_id, mods.version, dep_tree.dep_type, dep_tree.depth
-- FROM dep_tree
-- JOIN mods ON mods.id = dep_tree.dependency_id
-- ORDER BY dep_tree.depth;


SELECT access_token FROM discord WHERE id = 542703093981380628 LIMIT;
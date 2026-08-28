#!/bin/bash
set -e

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
	CREATE USER IF NOT EXISTS \`${MYSQL_API_USER}\`@\`%\` IDENTIFIED WITH caching_sha2_password BY '${MYSQL_API_PASSWORD}';
	GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE_NAME}\`.* TO \`${MYSQL_API_USER}\`@\`%\`;
	FLUSH PRIVILEGES;
EOSQL

echo "User api created"
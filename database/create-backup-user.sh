#!/bin/bash
set -e

# User permissions are specified in the `database_setup.sql` file so that they are added after the `backup` table is created.

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
	CREATE USER IF NOT EXISTS \`backup\`@\`%\` IDENTIFIED WITH caching_sha2_password BY '${MYSQL_BACKUP_PASSWORD}';
	FLUSH PRIVILEGES;
EOSQL

echo "User backup created"
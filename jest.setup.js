process.env.VERSION                  = "1.12.2";
process.env.MODLOADER                = "neoforge";
process.env.SERVER_PATH              = "/server";
process.env.LOGS_PATH                = "/logs";
process.env.LOGS_LIFETIME            = 30;
process.env.DATABASE_USER            = "system";
process.env.DATABASE_HOST            = "super_db";
process.env.DATABASE_NAME            = "Minecraft_Dashboard";
process.env.DATABASE_PASSWORD        = "password1234";
process.env.DATABASE_PORT            = 3306;
process.env.MAIL                     = "test@sleezzi.fr";
process.env.MAIL_NAME                = "play.sleezzi.fr";
process.env.MAIL_PASSWORD            = "password1234";
process.env.MAIL_PORT                = 995;
process.env.MAIL_HOST                = "ssl0.ovh.net";
process.env.MINECRAFT_IP             = "minecraft";
process.env.MINECRAFT_PORT           = 25575;
process.env.MINECRAFT_PASSWORD       = "password1234";


// TEST VAR
process.env.ACCOUNT_ID         = "1";
process.env.ACCOUNT_USERNAME         = "sleezzi";
process.env.ACCOUNT_EMAIL            = "test@sleezzi.fr";
process.env.ACCOUNT_IP               = "192.168.0.1";
process.env.ACCOUNT_PERMISSION       = "8";

const { default: connections } = require("./src/components/connections");

connections.set(process.env.ACCOUNT_USERNAME, {
	send: () => {},
	close: () => {},
	permissions: process.env.ACCOUNT_PERMISSION
});
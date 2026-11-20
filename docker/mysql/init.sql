-- Create migration user with elevated permissions
CREATE USER IF NOT EXISTS 'pth_migrate'@'%' IDENTIFIED BY 'pth_migrate_pass';
GRANT ALL PRIVILEGES ON pak_tele_health.* TO 'pth_migrate'@'%';

-- Runtime user has restricted permissions (no DROP, ALTER, CREATE)
-- The default pth_app user created by MYSQL_USER already has full privileges
-- In production, restrict to SELECT, INSERT, UPDATE, DELETE only
FLUSH PRIVILEGES;

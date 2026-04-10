SELECT 'CREATE DATABASE neo_tasks_bank'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'neo_tasks_bank')\gexec

SELECT 'CREATE DATABASE coding_board_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'coding_board_db')\gexec

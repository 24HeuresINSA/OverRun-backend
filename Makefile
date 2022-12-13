help:
		@echo ""
		@echo "usage: make COMMAND"
		@echo ""
		@echo "init 			Initialise l'environnement de développement"
		@echo ""
		@echo "---Base de données---"
		@echo "db_start			Lance la base de donnée MariaDB sur le port 3306"
		@echo "db_stop			Stop la base de donnée"
		@echo "db_clean 		Supprime la base de donnnée"
		@echo "db_status		Affiche l'état de la base de donnée"
		@echo "db_migrate		Migrate les models dans le base de donnée"
		@echo "db_bash  		OUvre un terminal bash dans le conteneur Mysql"

init:
		npm install

db_start:
		@echo "Lancement de MariaDB et adminer (port 8080)..."
		docker-compose up -d db adminer

db_status:
		@echo "Status des services MariDB et adminer..."
		docker-compose ps | grep 'backend_db\|backend_adminer'

db_migrate:
		npx prisma format
		npx prisma db push

db_down:
		docker-compose down

db_bash:
		docker-compose exec db bash

# Niramay Self-Healing Platform - One-Command Setup

.PHONY: setup backend frontend run clean

setup:
	@echo "Installing dependencies..."
	cd backend && pip install -r requirements.txt
	cd frontend && npm install
	@echo "Setup complete. Please configure .env in the backend folder."

run:
	@echo "Starting Niramay Self-Healing Platform..."
	@make -j 2 run-backend run-frontend

run-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf frontend/dist
	@echo "Cleaned up temporary files."

help:
	@echo "Niramay Platform Makefile"
	@echo "-------------------------"
	@echo "make setup       - Install backend and frontend dependencies"
	@echo "make run         - Run both backend and frontend servers"
	@echo "make run-backend - Run only the backend API server"
	@echo "make run-frontend- Run only the frontend dashboard"
	@echo "make clean       - Remove cached files and build artifacts"
